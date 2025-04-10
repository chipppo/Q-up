#!/usr/bin/env python
import os
import sys
import logging
import boto3
import django
import argparse
from botocore.exceptions import ClientError

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.conf import settings
from base.models import MyUser, Post, Message

def get_s3_client():
    """Create and return an S3 client using settings from Django"""
    try:
        client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
            verify=getattr(settings, 'AWS_S3_VERIFY', True)
        )
        return client
    except Exception as e:
        logger.error(f"Failed to create S3 client: {str(e)}")
        return None

def test_s3_access():
    """Test S3 connection and permissions"""
    logger.info("Testing S3 connectivity and permissions...")
    
    # Check if S3 settings are configured
    if not hasattr(settings, 'AWS_ACCESS_KEY_ID') or not settings.AWS_ACCESS_KEY_ID:
        logger.error("AWS_ACCESS_KEY_ID is not configured in settings")
        return False
    
    if not hasattr(settings, 'AWS_SECRET_ACCESS_KEY') or not settings.AWS_SECRET_ACCESS_KEY:
        logger.error("AWS_SECRET_ACCESS_KEY is not configured in settings")
        return False
    
    if not hasattr(settings, 'AWS_STORAGE_BUCKET_NAME') or not settings.AWS_STORAGE_BUCKET_NAME:
        logger.error("AWS_STORAGE_BUCKET_NAME is not configured in settings")
        return False
    
    # Get S3 client
    s3_client = get_s3_client()
    if not s3_client:
        return False
    
    try:
        # Test listing objects in the bucket
        logger.info(f"Testing access to bucket: {settings.AWS_STORAGE_BUCKET_NAME}")
        response = s3_client.list_objects_v2(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            MaxKeys=1
        )
        logger.info("Successfully accessed S3 bucket")
        
        # Test uploading a small object
        test_key = "test-upload.txt"
        logger.info(f"Testing upload to S3 bucket with key: {test_key}")
        s3_client.put_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=test_key,
            Body=b"This is a test upload from fix_s3_uploads.py",
            ContentType="text/plain",
            ACL="public-read"
        )
        logger.info("Successfully uploaded test file to S3")
        
        # Test downloading the object
        logger.info(f"Testing download from S3 bucket with key: {test_key}")
        s3_client.get_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=test_key
        )
        logger.info("Successfully downloaded test file from S3")
        
        return True
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code')
        error_message = e.response.get('Error', {}).get('Message')
        logger.error(f"S3 access test failed with error: {error_code} - {error_message}")
        if error_code == 'AccessDenied':
            logger.error("Access denied. Check your AWS credentials and bucket permissions.")
        elif error_code == 'NoSuchBucket':
            logger.error(f"Bucket {settings.AWS_STORAGE_BUCKET_NAME} does not exist.")
        return False
    except Exception as e:
        logger.error(f"S3 access test failed with unexpected error: {str(e)}")
        return False

def verify_file_exists_in_s3(key):
    """Check if a file exists in S3 bucket"""
    s3_client = get_s3_client()
    if not s3_client:
        return False
    
    try:
        s3_client.head_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=key
        )
        return True
    except ClientError as e:
        if e.response['Error']['Code'] == '404':
            return False
        else:
            logger.error(f"Error checking if file exists in S3: {str(e)}")
            return False
    except Exception as e:
        logger.error(f"Unexpected error checking if file exists in S3: {str(e)}")
        return False

def upload_file_to_s3(local_path, s3_key):
    """Upload a file from local path to S3"""
    if not os.path.exists(local_path):
        logger.error(f"Local file not found: {local_path}")
        return False
    
    s3_client = get_s3_client()
    if not s3_client:
        return False
    
    try:
        # Determine content type based on file extension
        content_type = 'application/octet-stream'
        if local_path.lower().endswith(('.jpg', '.jpeg')):
            content_type = 'image/jpeg'
        elif local_path.lower().endswith('.png'):
            content_type = 'image/png'
        elif local_path.lower().endswith('.gif'):
            content_type = 'image/gif'
        
        with open(local_path, 'rb') as file:
            s3_client.upload_fileobj(
                file,
                settings.AWS_STORAGE_BUCKET_NAME,
                s3_key,
                ExtraArgs={
                    'ContentType': content_type,
                    'ACL': 'public-read'
                }
            )
        logger.info(f"Successfully uploaded {local_path} to S3 as {s3_key}")
        return True
    except Exception as e:
        logger.error(f"Failed to upload {local_path} to S3: {str(e)}")
        return False

def verify_and_fix_user_avatars(fix=True):
    """Verify that all user avatars exist in S3 and upload missing ones if fix=True"""
    logger.info("Verifying user avatars...")
    missing_count = 0
    fixed_count = 0
    
    users = MyUser.objects.exclude(avatar='')
    total = users.count()
    logger.info(f"Checking {total} user avatars")
    
    for i, user in enumerate(users, 1):
        if i % 10 == 0:
            logger.info(f"Progress: {i}/{total} users checked")
        
        # Skip if avatar is empty
        if not user.avatar:
            continue
        
        # Get S3 key for the avatar
        s3_key = str(user.avatar)
        if not s3_key.startswith('media/'):
            s3_key = f"media/{s3_key}"
        
        # Check if file exists in S3
        if not verify_file_exists_in_s3(s3_key):
            missing_count += 1
            logger.warning(f"Missing avatar for user {user.username}: {s3_key}")
            
            if fix:
                # Try to find local file
                local_path = os.path.join(settings.MEDIA_ROOT, str(user.avatar))
                if os.path.exists(local_path):
                    if upload_file_to_s3(local_path, s3_key):
                        fixed_count += 1
                else:
                    logger.error(f"Local avatar file not found: {local_path}")
    
    logger.info(f"User avatar verification complete: {missing_count} missing, {fixed_count} fixed")
    return missing_count, fixed_count

def verify_and_fix_post_images(fix=True):
    """Verify that all post images exist in S3 and upload missing ones if fix=True"""
    logger.info("Verifying post images...")
    missing_count = 0
    fixed_count = 0
    
    posts = Post.objects.exclude(image='')
    total = posts.count()
    logger.info(f"Checking {total} post images")
    
    for i, post in enumerate(posts, 1):
        if i % 10 == 0:
            logger.info(f"Progress: {i}/{total} posts checked")
        
        # Skip if image is empty
        if not post.image:
            continue
        
        # Get S3 key for the image
        s3_key = str(post.image)
        if not s3_key.startswith('media/'):
            s3_key = f"media/{s3_key}"
        
        # Check if file exists in S3
        if not verify_file_exists_in_s3(s3_key):
            missing_count += 1
            logger.warning(f"Missing image for post {post.id}: {s3_key}")
            
            if fix:
                # Try to find local file
                local_path = os.path.join(settings.MEDIA_ROOT, str(post.image))
                if os.path.exists(local_path):
                    if upload_file_to_s3(local_path, s3_key):
                        fixed_count += 1
                else:
                    logger.error(f"Local post image file not found: {local_path}")
    
    logger.info(f"Post image verification complete: {missing_count} missing, {fixed_count} fixed")
    return missing_count, fixed_count

def verify_and_fix_message_images(fix=True):
    """Verify that all message images exist in S3 and upload missing ones if fix=True"""
    logger.info("Verifying message images...")
    missing_count = 0
    fixed_count = 0
    
    messages = Message.objects.exclude(image='')
    total = messages.count()
    logger.info(f"Checking {total} message images")
    
    for i, message in enumerate(messages, 1):
        if i % 10 == 0:
            logger.info(f"Progress: {i}/{total} messages checked")
        
        # Skip if image is empty
        if not message.image:
            continue
        
        # Get S3 key for the image
        s3_key = str(message.image)
        if not s3_key.startswith('media/'):
            s3_key = f"media/{s3_key}"
        
        # Check if file exists in S3
        if not verify_file_exists_in_s3(s3_key):
            missing_count += 1
            logger.warning(f"Missing image for message {message.id}: {s3_key}")
            
            if fix:
                # Try to find local file
                local_path = os.path.join(settings.MEDIA_ROOT, str(message.image))
                if os.path.exists(local_path):
                    if upload_file_to_s3(local_path, s3_key):
                        fixed_count += 1
                else:
                    logger.error(f"Local message image file not found: {local_path}")
    
    logger.info(f"Message image verification complete: {missing_count} missing, {fixed_count} fixed")
    return missing_count, fixed_count

def main():
    parser = argparse.ArgumentParser(description='Verify and fix S3 uploads')
    parser.add_argument('--verify-only', action='store_true', help='Only verify files, do not upload missing ones')
    args = parser.parse_args()
    
    # Test S3 access first
    logger.info("Starting S3 upload verification and fix script")
    if not test_s3_access():
        logger.error("S3 access test failed, cannot continue")
        return 1
    
    # Verify and fix files
    fix_mode = not args.verify_only
    mode_str = "verification and fix" if fix_mode else "verification only"
    logger.info(f"Running in {mode_str} mode")
    
    total_missing = 0
    total_fixed = 0
    
    # Check user avatars
    user_missing, user_fixed = verify_and_fix_user_avatars(fix=fix_mode)
    total_missing += user_missing
    total_fixed += user_fixed
    
    # Check post images
    post_missing, post_fixed = verify_and_fix_post_images(fix=fix_mode)
    total_missing += post_missing
    total_fixed += post_fixed
    
    # Check message images
    message_missing, message_fixed = verify_and_fix_message_images(fix=fix_mode)
    total_missing += message_missing
    total_fixed += message_fixed
    
    # Summary
    logger.info("=== S3 Verification Summary ===")
    logger.info(f"Total missing files: {total_missing}")
    if fix_mode:
        logger.info(f"Total files fixed: {total_fixed}")
        if total_missing > total_fixed:
            logger.warning(f"Could not fix {total_missing - total_fixed} missing files")
    
    return 0

if __name__ == '__main__':
    sys.exit(main()) 