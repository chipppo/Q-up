import os
import django
import sys
import boto3
import logging
import time
from pathlib import Path
from botocore.exceptions import ClientError

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Fix Django logging - create tmp directory if it doesn't exist
log_dir = os.path.join('C:\\', 'tmp')
if not os.path.exists(log_dir):
    try:
        os.makedirs(log_dir)
    except:
        # If we can't create the directory, modify Django settings to use a different log path
        os.environ['DJANGO_LOG_FILE'] = os.path.join(os.getcwd(), 'django-debug.log')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.conf import settings
from django.db.models import Q, F
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.core.files import File
from base.models import MyUser, Post, Game, RankTier, Message, Chat  # Add all models with image fields

def get_s3_client():
    """Create and return an S3 client using settings"""
    return boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME
    )

def scan_all_local_media():
    """Scan for all media files in the MEDIA_ROOT directory"""
    if not os.path.exists(settings.MEDIA_ROOT):
        logger.error(f"Media root directory does not exist: {settings.MEDIA_ROOT}")
        return []
    
    media_files = []
    for root, dirs, files in os.walk(settings.MEDIA_ROOT):
        for file in files:
            # Skip temporary files and hidden files
            if file.startswith('.') or file.startswith('~') or file.endswith('.tmp'):
                continue
                
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, settings.MEDIA_ROOT)
            media_files.append(rel_path)
    
    logger.info(f"Found {len(media_files)} media files in {settings.MEDIA_ROOT}")
    return media_files

def migrate_model_field(model, field_name, s3_folder):
    """Generic function to migrate image fields for any model"""
    count = 0
    errors = 0
    updated = 0
    already_s3 = 0
    
    logger.info(f"Migrating {field_name} for {model.__name__}...")
    
    # Get all objects with non-empty fields
    objects = model.objects.exclude(**{field_name: ''}).exclude(**{field_name: None})
    total = objects.count()
    logger.info(f"Found {total} objects with {field_name} field")
    
    for obj in objects:
        field = getattr(obj, field_name)
        
        if not field:
            continue
            
        # Check if it's already an S3 URL or path
        field_name_val = field.name if hasattr(field, 'name') else str(field)
        
        if field_name_val.startswith('media/'):
            # Already likely an S3 path
            already_s3 += 1
            continue
            
        if field_name_val.startswith('http'):
            # Already a URL
            already_s3 += 1
            continue
        
        # Construct local path - handle both relative and absolute paths
        if os.path.isabs(field_name_val):
            local_path = field_name_val
        else:
            local_path = os.path.join(settings.MEDIA_ROOT, field_name_val)
        
        # If path doesn't exist, try alternate path construction
        if not os.path.exists(local_path):
            basename = os.path.basename(field_name_val)
            local_path = os.path.join(settings.MEDIA_ROOT, basename)
            
        if not os.path.exists(local_path):
            alt_path = os.path.join(settings.MEDIA_ROOT, s3_folder, basename)
            if os.path.exists(alt_path):
                local_path = alt_path
                
        # If still doesn't exist, log error and continue
        if not os.path.exists(local_path):
            logger.error(f"File not found for {model.__name__} id={getattr(obj, 'id', 'N/A')}: {field_name_val} -> {local_path}")
            errors += 1
            continue
            
        try:
            # Prepare S3 path ensuring consistent folder structure
            filename = os.path.basename(local_path)
            s3_path = f"media/{s3_folder}/{filename}"
            
            logger.info(f"Migrating {field_name} for {model.__name__} id={getattr(obj, 'id', 'N/A')}: {local_path} -> S3:{s3_path}")
            
            # Check if object already exists in S3
            s3 = get_s3_client()
            try:
                s3.head_object(
                    Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                    Key=s3_path
                )
                logger.info(f"Object already exists in S3: {s3_path}")
                
                # Update model to point to the S3 path anyway
                setattr(obj, field_name, s3_path)
                obj.save(update_fields=[field_name])
                updated += 1
                
            except ClientError as e:
                # Object doesn't exist, upload it
                with open(local_path, 'rb') as file:
                    content_type = 'application/octet-stream'
                    if filename.lower().endswith(('.jpg', '.jpeg')):
                        content_type = 'image/jpeg'
                    elif filename.lower().endswith('.png'):
                        content_type = 'image/png'
                    elif filename.lower().endswith('.gif'):
                        content_type = 'image/gif'
                    elif filename.lower().endswith('.webp'):
                        content_type = 'image/webp'
                    
                    # Upload to S3 with retry mechanism
                    max_retries = 3
                    retry_count = 0
                    while retry_count < max_retries:
                        try:
                            s3.upload_fileobj(
                                file,
                                settings.AWS_STORAGE_BUCKET_NAME,
                                s3_path,
                                ExtraArgs={
                                    'ContentType': content_type,
                                    'ACL': 'public-read'  # Make sure the file is publicly accessible
                                }
                            )
                            break
                        except Exception as upload_error:
                            retry_count += 1
                            if retry_count >= max_retries:
                                raise
                            logger.warning(f"Upload attempt {retry_count} failed, retrying in 2 seconds...")
                            time.sleep(2)
                            file.seek(0)  # Reset file position for retry
                
                # Update model to point to S3
                setattr(obj, field_name, s3_path)
                obj.save(update_fields=[field_name])
                count += 1
                
                # Verify the upload
                try:
                    s3.head_object(
                        Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                        Key=s3_path
                    )
                    logger.info(f"Verified upload successful: {s3_path}")
                except Exception as verify_error:
                    logger.error(f"Failed to verify upload: {str(verify_error)}")
        
        except Exception as e:
            logger.error(f"Error migrating {field_name} for {model.__name__} id={getattr(obj, 'id', 'N/A')}: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            errors += 1
    
    logger.info(f"Migration summary for {model.__name__}.{field_name}:")
    logger.info(f"- Total objects: {total}")
    logger.info(f"- Newly migrated: {count}")
    logger.info(f"- Updated references: {updated}")
    logger.info(f"- Already on S3: {already_s3}")
    logger.info(f"- Errors: {errors}")
    
    return count

def migrate_all_media():
    """Migrate all local media files to S3 with improved detection and error handling"""
    logger.info("====== IMPROVED MEDIA MIGRATION TOOL ======")
    logger.info(f"AWS region in settings: {settings.AWS_S3_REGION_NAME}")
    logger.info(f"S3 bucket: {settings.AWS_STORAGE_BUCKET_NAME}")
    logger.info(f"Local media root: {settings.MEDIA_ROOT}")
    
    # Check if media root exists
    if not os.path.exists(settings.MEDIA_ROOT):
        logger.error(f"Media root directory does not exist: {settings.MEDIA_ROOT}")
        return
    
    # Check if S3 credentials are available
    if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
        logger.error("AWS credentials not found in settings")
        return
    
    # Test S3 connection
    try:
        s3 = get_s3_client()
        response = s3.list_buckets()
        logger.info(f"S3 connection successful. Available buckets: {[b['Name'] for b in response['Buckets']]}")
        
        # Check if our bucket exists
        if not any(b['Name'] == settings.AWS_STORAGE_BUCKET_NAME for b in response['Buckets']):
            logger.warning(f"Bucket {settings.AWS_STORAGE_BUCKET_NAME} not found in your account")
            
            # Try to create the bucket
            try:
                logger.info(f"Attempting to create bucket {settings.AWS_STORAGE_BUCKET_NAME}...")
                s3.create_bucket(
                    Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                    CreateBucketConfiguration={
                        'LocationConstraint': settings.AWS_S3_REGION_NAME
                    }
                )
                logger.info(f"Successfully created bucket {settings.AWS_STORAGE_BUCKET_NAME}")
            except Exception as e:
                logger.error(f"Failed to create bucket: {str(e)}")
                logger.error("Please create the bucket manually and run this script again")
                return
    except Exception as e:
        logger.error(f"S3 connection failed: {str(e)}")
        return
    
    # Scan for all local media files
    all_local_files = scan_all_local_media()
    
    # Migrate model fields
    counts = {
        'user_avatars': migrate_model_field(MyUser, 'avatar', 'profile_pics'),
        'post_images': migrate_model_field(Post, 'image', 'post_images'),
        'game_logos': migrate_model_field(Game, 'logo', 'game_logos'),
        'rank_icons': migrate_model_field(RankTier, 'icon', 'rank_icons'),
        'message_images': migrate_model_field(Message, 'image', 'message_images')
    }
    
    # Calculate totals
    total_migrated = sum(counts.values())
    
    logger.info("\n====== MIGRATION SUMMARY ======")
    logger.info(f"Total files migrated: {total_migrated}")
    for category, count in counts.items():
        logger.info(f"- {category.replace('_', ' ').title()}: {count}")
    
    # Check for orphaned files
    logger.info("\n====== CHECKING FOR ORPHANED MEDIA ======")
    # This would list local files that weren't migrated but could be 
    # implemented in a future version
    
    logger.info("\nMigration completed!")

if __name__ == "__main__":
    migrate_all_media() 