import os
import boto3
import io
import django
import logging
import sys
import traceback
from pathlib import Path

# Configure logging to console
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# Set up Django to access settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.conf import settings

def test_s3_connection():
    """Test basic S3 connection by listing buckets"""
    try:
        logger.info("Testing S3 connection...")
        s3 = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
        )
        
        # List buckets to verify credentials
        response = s3.list_buckets()
        buckets = [bucket['Name'] for bucket in response['Buckets']]
        logger.info(f"Connected to S3 successfully! Available buckets: {', '.join(buckets)}")
        
        # Check that our target bucket exists
        if settings.AWS_STORAGE_BUCKET_NAME in buckets:
            logger.info(f"✅ Target bucket '{settings.AWS_STORAGE_BUCKET_NAME}' exists")
        else:
            logger.error(f"❌ Target bucket '{settings.AWS_STORAGE_BUCKET_NAME}' not found!")
            
        return True
    except Exception as e:
        logger.error(f"❌ S3 connection test failed: {str(e)}")
        logger.error(traceback.format_exc())
        return False

def test_direct_upload():
    """Test direct upload to S3 with ACL permissions"""
    try:
        logger.info("Testing direct upload to S3...")
        s3 = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
        )
        
        # Create a test content to upload
        test_content = b"This is a test upload to verify S3 permissions"
        file_obj = io.BytesIO(test_content)
        
        # Upload with public-read ACL
        test_key = f"media/test/test_upload_{os.urandom(4).hex()}.txt"
        
        logger.info(f"Uploading test file to {test_key}")
        
        try:
            # First attempt: with ACL
            s3.upload_fileobj(
                file_obj,
                settings.AWS_STORAGE_BUCKET_NAME,
                test_key,
                ExtraArgs={
                    'ContentType': 'text/plain',
                    'ACL': 'public-read'
                }
            )
            logger.info(f"✅ Test upload with ACL successful!")
            
            # Generate the public URL
            url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{test_key}"
            logger.info(f"File should be accessible at: {url}")
            
            return True
        except Exception as acl_error:
            logger.error(f"❌ Upload with ACL failed: {str(acl_error)}")
            
            # Try without ACL as fallback
            file_obj.seek(0)  # Reset file position
            no_acl_key = f"{test_key}-no-acl"
            
            try:
                logger.info("Attempting upload without ACL...")
                s3.upload_fileobj(
                    file_obj,
                    settings.AWS_STORAGE_BUCKET_NAME,
                    no_acl_key,
                    ExtraArgs={
                        'ContentType': 'text/plain',
                    }
                )
                logger.info(f"✅ Test upload without ACL successful!")
                
                # Generate the URL
                url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{no_acl_key}"
                logger.info(f"File should be accessible at: {url}")
                
                return True
            except Exception as no_acl_error:
                logger.error(f"❌ Upload without ACL also failed: {str(no_acl_error)}")
                return False
    except Exception as e:
        logger.error(f"❌ Test upload failed: {str(e)}")
        logger.error(traceback.format_exc())
        return False

def test_image_upload():
    """Test uploading an image file to S3"""
    try:
        logger.info("Testing image upload to S3...")
        
        # Create a simple 1x1 pixel black PNG
        # This is a valid small PNG file
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
        
        image_file = io.BytesIO(png_data)
        
        s3 = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
        )
        
        # Test key for the image
        test_key = f"media/test/test_image_{os.urandom(4).hex()}.png"
        
        logger.info(f"Uploading test image to {test_key}")
        
        try:
            # First attempt: with ACL
            s3.upload_fileobj(
                image_file,
                settings.AWS_STORAGE_BUCKET_NAME,
                test_key,
                ExtraArgs={
                    'ContentType': 'image/png',
                    'ACL': 'public-read'
                }
            )
            logger.info(f"✅ Test image upload with ACL successful!")
            
            # Generate the public URL
            url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{test_key}"
            logger.info(f"Image should be accessible at: {url}")
            
            return True
        except Exception as acl_error:
            logger.error(f"❌ Image upload with ACL failed: {str(acl_error)}")
            
            # Try without ACL as fallback
            image_file.seek(0)  # Reset file position
            no_acl_key = f"{test_key}-no-acl"
            
            try:
                logger.info("Attempting image upload without ACL...")
                s3.upload_fileobj(
                    image_file,
                    settings.AWS_STORAGE_BUCKET_NAME,
                    no_acl_key,
                    ExtraArgs={
                        'ContentType': 'image/png',
                    }
                )
                logger.info(f"✅ Test image upload without ACL successful!")
                
                # Generate the URL
                url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{no_acl_key}"
                logger.info(f"Image should be accessible at: {url}")
                
                return True
            except Exception as no_acl_error:
                logger.error(f"❌ Image upload without ACL also failed: {str(no_acl_error)}")
                return False
    except Exception as e:
        logger.error(f"❌ Test image upload failed: {str(e)}")
        logger.error(traceback.format_exc())
        return False

def print_s3_config():
    """Print S3 configuration settings"""
    logger.info("=== S3 Configuration ===")
    logger.info(f"AWS_ACCESS_KEY_ID: {'*' * 5 + settings.AWS_ACCESS_KEY_ID[-4:] if settings.AWS_ACCESS_KEY_ID else 'Not set'}")
    logger.info(f"AWS_SECRET_ACCESS_KEY: {'*' * 30 if settings.AWS_SECRET_ACCESS_KEY else 'Not set'}")
    logger.info(f"AWS_STORAGE_BUCKET_NAME: {settings.AWS_STORAGE_BUCKET_NAME}")
    logger.info(f"AWS_S3_REGION_NAME: {settings.AWS_S3_REGION_NAME}")
    logger.info(f"AWS_DEFAULT_ACL: {getattr(settings, 'AWS_DEFAULT_ACL', 'Not set')}")
    logger.info(f"AWS_LOCATION: {getattr(settings, 'AWS_LOCATION', 'Not set')}")
    logger.info(f"DEFAULT_FILE_STORAGE: {getattr(settings, 'DEFAULT_FILE_STORAGE', 'Not set')}")
    logger.info("=====================")

if __name__ == "__main__":
    print_s3_config()
    connection_ok = test_s3_connection()
    
    if connection_ok:
        test_direct_upload()
        test_image_upload()
    else:
        logger.error("Skipping upload tests because connection failed")
        
    logger.info("Tests completed. Examine the output for any errors.") 