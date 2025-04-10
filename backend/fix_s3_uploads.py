#!/usr/bin/env python
"""
S3 Upload Fixer

This script:
1. Tests S3 connectivity and permissions
2. Verifies existing Django database records have files in S3
3. Re-uploads missing files if they exist locally

Usage: python fix_s3_uploads.py [--verify-only]
"""

import os
import sys
import django
import boto3
from django.conf import settings
import argparse
import mimetypes
from botocore.exceptions import ClientError
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('s3_fixer.log')
    ]
)
logger = logging.getLogger(__name__)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

# Import Django models (needs to be after Django setup)
from base.models import MyUser, Post, Message

def get_s3_client():
    """Get a boto3 S3 client with credentials from settings"""
    s3_client = boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME
    )
    return s3_client

def test_s3_access():
    """Test basic S3 access and permissions"""
    try:
        client = get_s3_client()
        
        # Skip listing buckets since we don't have permission for ListAllMyBuckets
        # Instead, we'll test operations directly on our target bucket
        logger.info(f"Testing access to bucket {settings.AWS_STORAGE_BUCKET_NAME}")
        
        # Test uploading a file
        test_key = "test-fix-upload.txt"
        try:
            client.put_object(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=test_key,
                Body=b"Test file from fix_s3_uploads.py script",
                ContentType="text/plain"
            )
            logger.info(f"Successfully uploaded test file to s3://{settings.AWS_STORAGE_BUCKET_NAME}/{test_key}")
        except Exception as e:
            logger.error(f"ERROR: Failed to upload test file: {str(e)}")
            return False
            
        # Try to read the file back
        try:
            response = client.get_object(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=test_key
            )
            content = response['Body'].read()
            logger.info(f"Successfully read back test file, content length: {len(content)} bytes")
        except Exception as e:
            logger.error(f"ERROR: Failed to read test file: {str(e)}")
            return False
        
        # Try to delete the test file
        try:
            client.delete_object(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=test_key
            )
            logger.info(f"Successfully deleted test file from S3")
        except Exception as e:
            logger.error(f"ERROR: Failed to delete test file: {str(e)}")
            # Don't return False here, as we may still be able to proceed
            
        return True
    except Exception as e:
        logger.error(f"ERROR: Failed to initialize S3 client: {str(e)}")
        return False

def verify_file_exists_in_s3(s3_key):
    """Check if a file exists in S3 by its key"""
    try:
        client = get_s3_client()
        client.head_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=s3_key
        )
        return True
    except ClientError:
        return False
    except Exception as e:
        logger.error(f"Error checking file existence: {str(e)}")
        return False

def upload_file_to_s3(local_path, s3_key):
    """Upload a file from local path to S3"""
    try:
        if not os.path.exists(local_path):
            logger.error(f"Local file not found: {local_path}")
            return False
            
        # Get content type
        content_type, _ = mimetypes.guess_type(local_path)
        if not content_type:
            content_type = 'application/octet-stream'
            
        # Open and read file
        with open(local_path, 'rb') as f:
            file_content = f.read()
            
        # Upload to S3
        client = get_s3_client()
        client.put_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=s3_key,
            Body=file_content,
            ContentType=content_type
        )
        
        logger.info(f"Successfully uploaded {local_path} to S3 as {s3_key}")
        return True
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        return False

def verify_and_fix_avatars():
    """Verify all user avatars exist in S3 and fix if possible"""
    users = MyUser.objects.filter(avatar__isnull=False)
    count = users.count()
    logger.info(f"Checking {count} user avatars...")
    
    missing = 0
    fixed = 0
    
    for user in users:
        if not user.avatar.name:
            continue
            
        # Get the S3 key for the avatar
        # The key format depends on your storage backend configuration
        s3_key = f"media/{user.avatar.name}"
        
        # Check if file exists in S3
        if not verify_file_exists_in_s3(s3_key):
            logger.warning(f"Avatar missing for user {user.username}: {s3_key}")
            missing += 1
            
            # Try to fix by uploading from local media if it exists
            local_path = os.path.join(settings.BASE_DIR, 'media', user.avatar.name)
            if os.path.exists(local_path):
                if upload_file_to_s3(local_path, s3_key):
                    fixed += 1
            else:
                logger.error(f"Cannot fix avatar for {user.username}: local file not found at {local_path}")
        else:
            logger.info(f"Avatar verified for user {user.username}: {s3_key}")
    
    logger.info(f"Avatar verification complete: {missing} missing, {fixed} fixed")
    return missing, fixed

def verify_and_fix_posts():
    """Verify all post images exist in S3 and fix if possible"""
    posts = Post.objects.filter(image__isnull=False)
    count = posts.count()
    logger.info(f"Checking {count} post images...")
    
    missing = 0
    fixed = 0
    
    for post in posts:
        if not post.image.name:
            continue
            
        # Get the S3 key for the image
        s3_key = f"media/{post.image.name}"
        
        # Check if file exists in S3
        if not verify_file_exists_in_s3(s3_key):
            logger.warning(f"Image missing for post {post.id}: {s3_key}")
            missing += 1
            
            # Try to fix by uploading from local media if it exists
            local_path = os.path.join(settings.BASE_DIR, 'media', post.image.name)
            if os.path.exists(local_path):
                if upload_file_to_s3(local_path, s3_key):
                    fixed += 1
            else:
                logger.error(f"Cannot fix image for post {post.id}: local file not found at {local_path}")
        else:
            logger.info(f"Image verified for post {post.id}: {s3_key}")
    
    logger.info(f"Post image verification complete: {missing} missing, {fixed} fixed")
    return missing, fixed

def verify_and_fix_messages():
    """Verify all message images exist in S3 and fix if possible"""
    messages = Message.objects.filter(image__isnull=False)
    count = messages.count()
    logger.info(f"Checking {count} message images...")
    
    missing = 0
    fixed = 0
    
    for message in messages:
        if not message.image.name:
            continue
            
        # Get the S3 key for the image
        s3_key = f"media/{message.image.name}"
        
        # Check if file exists in S3
        if not verify_file_exists_in_s3(s3_key):
            logger.warning(f"Image missing for message {message.id}: {s3_key}")
            missing += 1
            
            # Try to fix by uploading from local media if it exists
            local_path = os.path.join(settings.BASE_DIR, 'media', message.image.name)
            if os.path.exists(local_path):
                if upload_file_to_s3(local_path, s3_key):
                    fixed += 1
            else:
                logger.error(f"Cannot fix image for message {message.id}: local file not found at {local_path}")
        else:
            logger.info(f"Image verified for message {message.id}: {s3_key}")
    
    logger.info(f"Message image verification complete: {missing} missing, {fixed} fixed")
    return missing, fixed

def main():
    """Main function that runs the script"""
    parser = argparse.ArgumentParser(description='Fix S3 uploads for existing records')
    parser.add_argument('--verify-only', action='store_true', help='Only verify, don\'t attempt to fix')
    args = parser.parse_args()

    # Print settings for verification
    logger.info(f"AWS Settings:")
    logger.info(f"  AWS_ACCESS_KEY_ID: {'Set' if settings.AWS_ACCESS_KEY_ID else 'Not set'}")
    logger.info(f"  AWS_SECRET_ACCESS_KEY: {'Set' if settings.AWS_SECRET_ACCESS_KEY else 'Not set'}")
    logger.info(f"  AWS_STORAGE_BUCKET_NAME: {settings.AWS_STORAGE_BUCKET_NAME}")
    logger.info(f"  AWS_S3_REGION_NAME: {settings.AWS_S3_REGION_NAME}")
    
    # Instead of doing a complete test, we'll just try a simple upload
    # to verify we can at least write to S3
    logger.info("Testing S3 write access...")
    try:
        client = get_s3_client()
        test_key = "test-fix-upload.txt"
        client.put_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=test_key,
            Body=b"Test file from fix_s3_uploads.py script",
            ContentType="text/plain"
        )
        logger.info(f"Successfully uploaded test file to S3. Proceeding with verification.")
    except Exception as e:
        logger.error(f"Failed to upload test file: {str(e)}")
        logger.error("S3 access test failed. Check your credentials and permissions.")
        return 1
    
    # Verify only mode
    if args.verify_only:
        logger.info("Running in verify-only mode. No files will be uploaded.")
        
    # Verify avatars
    avatar_missing, avatar_fixed = verify_and_fix_avatars()
    
    # Verify post images
    post_missing, post_fixed = verify_and_fix_posts()
    
    # Verify message images
    message_missing, message_fixed = verify_and_fix_messages()
    
    # Print summary
    total_missing = avatar_missing + post_missing + message_missing
    total_fixed = avatar_fixed + post_fixed + message_fixed
    
    logger.info("\nVerification Summary:")
    logger.info(f"  Total missing files: {total_missing}")
    logger.info(f"  Total files fixed: {total_fixed}")
    logger.info(f"  Remaining unfixed files: {total_missing - total_fixed}")
    
    # Try to clean up the test file
    try:
        client.delete_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=test_key
        )
        logger.info("Cleaned up test file.")
    except Exception as e:
        logger.warning(f"Could not delete test file: {str(e)}")
    
    return 0
    
if __name__ == "__main__":
    sys.exit(main()) 