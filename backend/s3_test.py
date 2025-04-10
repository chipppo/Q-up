"""
S3 Debug Testing Utility

This script tests both direct S3 connectivity using boto3 and Django's file storage system.
It helps diagnose issues with uploading files to S3 by performing a variety of tests and
showing detailed error messages.

Run this script from the command line with:
python s3_test.py
"""

import os
import sys
import django
import traceback
import logging
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

# Load environment variables first
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(dotenv_path):
    logger.info(f"Loading environment variables from {dotenv_path}")
    load_dotenv(dotenv_path)
    # Print environment variables for debugging
    for env_var in ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_STORAGE_BUCKET_NAME', 'AWS_S3_REGION_NAME']:
        # Only show first/last two characters of secrets for security
        if env_var == 'AWS_ACCESS_KEY_ID' and os.environ.get(env_var):
            value = f"{os.environ.get(env_var)[:2]}...{os.environ.get(env_var)[-2:]}"
        elif env_var == 'AWS_SECRET_ACCESS_KEY' and os.environ.get(env_var):
            value = f"{os.environ.get(env_var)[:2]}...{os.environ.get(env_var)[-2:]}"
        else:
            value = os.environ.get(env_var)
        logger.info(f"{env_var}: {value}")
else:
    logger.error(f"No .env file found at {dotenv_path}")
    logger.error("Make sure you have a .env file with your AWS credentials")
    sys.exit(1)

# Initialize Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

def test_direct_s3_upload():
    """Test direct upload to S3 using boto3"""
    logger.info("\n=== Testing Direct S3 Upload with boto3 ===")
    
    try:
        import boto3
        
        # Create S3 client
        logger.info("Creating S3 client...")
        s3 = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        
        # Test connection by listing buckets
        logger.info("Testing connection by listing buckets...")
        buckets = s3.list_buckets()
        logger.info(f"Found buckets: {[b['Name'] for b in buckets['Buckets']]}")
        
        # Check if our bucket exists
        if settings.AWS_STORAGE_BUCKET_NAME not in [b['Name'] for b in buckets['Buckets']]:
            logger.error(f"Bucket {settings.AWS_STORAGE_BUCKET_NAME} not found in your account!")
            logger.error("Make sure your bucket exists and your credentials have access to it")
            return False
        
        # Upload test object
        test_key = "test-upload-direct.txt"
        logger.info(f"Uploading test file to s3://{settings.AWS_STORAGE_BUCKET_NAME}/{test_key}")
        
        s3.put_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=test_key,
            Body=b"This is a test upload from the S3 test script",
            ContentType="text/plain"
        )
        
        # Verify upload
        logger.info("Verifying upload...")
        response = s3.get_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=test_key
        )
        
        logger.info(f"File upload successful. Content-Type: {response['ContentType']}")
        
        # Generate public URL 
        url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{test_key}"
        logger.info(f"File should be accessible at: {url}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error in direct S3 upload test: {str(e)}")
        logger.error(traceback.format_exc())
        return False

def test_django_storage():
    """Test Django's default_storage system"""
    logger.info("\n=== Testing Django Storage System ===")
    
    try:
        # Check storage backend
        logger.info(f"Django DEFAULT_FILE_STORAGE: {settings.DEFAULT_FILE_STORAGE}")
        
        if 's3boto3' not in settings.DEFAULT_FILE_STORAGE.lower():
            logger.warning("Not using S3 storage backend. Check settings.py configuration.")
        
        # Use Django's default_storage to save a file
        test_file_path = "test-django-storage.txt"
        logger.info(f"Uploading test file to {test_file_path}")
        
        content = ContentFile(b"This is a test file from Django's storage system")
        file_path = default_storage.save(test_file_path, content)
        
        # Check if file exists
        logger.info(f"File saved as: {file_path}")
        logger.info(f"File exists: {default_storage.exists(file_path)}")
        
        # Get file URL
        url = default_storage.url(file_path)
        logger.info(f"File URL: {url}")
        
        # Try reading the file back
        try:
            content = default_storage.open(file_path).read()
            logger.info(f"Could read file content, length: {len(content)} bytes")
        except Exception as e:
            logger.error(f"Error reading file: {str(e)}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error in Django storage test: {str(e)}")
        logger.error(traceback.format_exc())
        return False

def run_all_tests():
    """Run all tests and report results"""
    direct_result = test_direct_s3_upload()
    django_result = test_django_storage()
    
    print("\n=== Test Results Summary ===")
    print(f"Direct S3 Upload: {'SUCCESS' if direct_result else 'FAILED'}")
    print(f"Django Storage: {'SUCCESS' if django_result else 'FAILED'}")
    
    if direct_result and not django_result:
        print("\nDIAGNOSIS: S3 credentials work but Django isn't configured correctly.")
        print("Check your settings.py configuration for DEFAULT_FILE_STORAGE.")
    elif not direct_result:
        print("\nDIAGNOSIS: S3 credentials or bucket access issues.")
        print("1. Verify your AWS credentials in .env file")
        print("2. Check bucket exists and permissions are correct")
        print("3. Make sure your IAM user has the right policies")
    elif direct_result and django_result:
        print("\nDIAGNOSIS: S3 configuration appears to be working correctly.")
        print("If you still have issues with file uploads, check:")
        print("1. Form configurations in your views")
        print("2. CSRF and authentication for upload requests")
        print("3. Browser console for any JavaScript errors")
        print("4. Django view code for proper file handling")

if __name__ == "__main__":
    print("S3 Configuration Test")
    print("-" * 50)
    run_all_tests() 