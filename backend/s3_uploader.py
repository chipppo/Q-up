import os
import boto3
import logging
import django
from pathlib import Path
from botocore.exceptions import ClientError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configure Django to access settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.conf import settings

def get_s3_client():
    """Create an S3 client with proper credentials"""
    return boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME
    )

def test_s3_connection():
    """Test S3 connection and bucket access"""
    try:
        s3 = get_s3_client()
        response = s3.list_buckets()
        bucket_names = [bucket['Name'] for bucket in response['Buckets']]
        
        logger.info(f"S3 connection successful. Available buckets: {bucket_names}")
        
        if settings.AWS_STORAGE_BUCKET_NAME not in bucket_names:
            logger.warning(f"Warning: Bucket '{settings.AWS_STORAGE_BUCKET_NAME}' not found in your account")
            return False
            
        # Test bucket access
        s3.list_objects_v2(Bucket=settings.AWS_STORAGE_BUCKET_NAME, MaxKeys=1)
        logger.info(f"Successfully accessed bucket: {settings.AWS_STORAGE_BUCKET_NAME}")
        return True
        
    except Exception as e:
        logger.error(f"S3 connection error: {str(e)}")
        return False

def upload_file_to_s3(local_path, s3_key):
    """Upload a single file to S3 with proper content type detection"""
    try:
        if not os.path.exists(local_path):
            logger.error(f"File not found: {local_path}")
            return False
            
        s3 = get_s3_client()
        filename = os.path.basename(local_path)
        
        # Determine content type based on file extension
        content_type = 'application/octet-stream'
        if filename.lower().endswith(('.jpg', '.jpeg')):
            content_type = 'image/jpeg'
        elif filename.lower().endswith('.png'):
            content_type = 'image/png'
        elif filename.lower().endswith('.gif'):
            content_type = 'image/gif'
        elif filename.lower().endswith('.webp'):
            content_type = 'image/webp'
        
        # Upload file to S3
        with open(local_path, 'rb') as file_data:
            s3.upload_fileobj(
                file_data,
                settings.AWS_STORAGE_BUCKET_NAME,
                s3_key,
                ExtraArgs={
                    'ContentType': content_type
                }
            )
        
        logger.info(f"Successfully uploaded: {local_path} -> s3://{settings.AWS_STORAGE_BUCKET_NAME}/{s3_key}")
        return True
        
    except Exception as e:
        logger.error(f"Error uploading {local_path}: {str(e)}")
        return False

def upload_directory_to_s3(local_dir, s3_prefix):
    """Upload all files in a directory to S3"""
    if not os.path.exists(local_dir):
        logger.error(f"Directory not found: {local_dir}")
        return 0
        
    count = 0
    errors = 0
    
    for root, dirs, files in os.walk(local_dir):
        for filename in files:
            # Skip hidden files and temporary files
            if filename.startswith('.') or filename.endswith('.tmp'):
                continue
                
            local_path = os.path.join(root, filename)
            # Create S3 key preserving directory structure
            rel_path = os.path.relpath(local_path, local_dir)
            s3_key = f"{s3_prefix}/{rel_path}".replace('\\', '/')
            
            if upload_file_to_s3(local_path, s3_key):
                count += 1
            else:
                errors += 1
    
    logger.info(f"Directory upload complete: {local_dir} -> s3://{settings.AWS_STORAGE_BUCKET_NAME}/{s3_prefix}")
    logger.info(f"Uploaded: {count} files, Errors: {errors}")
    return count

def upload_all_media():
    """Upload all media directories to S3"""
    logger.info("===== S3 MEDIA UPLOADER =====")
    logger.info(f"AWS Region: {settings.AWS_S3_REGION_NAME}")
    logger.info(f"S3 Bucket: {settings.AWS_STORAGE_BUCKET_NAME}")
    logger.info(f"Local Media Root: {settings.MEDIA_ROOT}")
    
    # Check if media root exists
    if not os.path.exists(settings.MEDIA_ROOT):
        logger.error(f"Media root directory does not exist: {settings.MEDIA_ROOT}")
        return False
    
    # Test S3 connection
    if not test_s3_connection():
        logger.error("S3 connection failed. Check your credentials and bucket.")
        return False
    
    # Upload each media directory separately
    total_uploaded = 0
    
    # Also handle the root level media directories
    media_dirs = [
        ('media', 'media'),
        ('chat_images', 'media/chat_images'),
        ('post_images', 'media/post_images'),
        ('profile_pics', 'media/profile_pics')
    ]
    
    # Upload files from each directory
    for local_dir_name, s3_prefix in media_dirs:
        local_dir = os.path.join('Q-up', 'backend', local_dir_name)
        if os.path.exists(local_dir):
            logger.info(f"Uploading files from {local_dir} to {s3_prefix}")
            count = upload_directory_to_s3(local_dir, s3_prefix)
            total_uploaded += count
    
    # Upload from media subdirectories
    for subdir in os.listdir(settings.MEDIA_ROOT):
        subdir_path = os.path.join(settings.MEDIA_ROOT, subdir)
        if os.path.isdir(subdir_path):
            s3_prefix = f"media/{subdir}"
            logger.info(f"Uploading files from {subdir_path} to {s3_prefix}")
            count = upload_directory_to_s3(subdir_path, s3_prefix)
            total_uploaded += count
    
    logger.info(f"Total files uploaded: {total_uploaded}")
    return True

if __name__ == "__main__":
    upload_all_media() 