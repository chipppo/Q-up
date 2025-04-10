from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage
import logging
import traceback

logger = logging.getLogger(__name__)

class StaticStorage(S3Boto3Storage):
    location = 'static'
    default_acl = 'public-read'

class MediaStorage(S3Boto3Storage):
    location = 'media'
    default_acl = 'public-read'
    file_overwrite = False
    
    def exists(self, name):
        # Skip the existence check to avoid permission issues
        return False
    
    def _save(self, name, content):
        try:
            return super()._save(name, content)
        except Exception as e:
            logger.error(f"S3 save error for file {name}: {str(e)}")
            logger.error(traceback.format_exc())
            raise
            
    def url(self, name, parameters=None, expire=None):
        try:
            return super().url(name, parameters, expire)
        except Exception as e:
            logger.error(f"S3 URL generation error for file {name}: {str(e)}")
            logger.error(traceback.format_exc())
            # Return a fallback URL or raise the exception
            raise

def debug_s3_connection():
    import boto3
    from django.conf import settings
    logger.error(f"S3 Connection Debug - AWS_ACCESS_KEY_ID exists: {bool(settings.AWS_ACCESS_KEY_ID)}")
    logger.error(f"S3 Connection Debug - AWS_SECRET_ACCESS_KEY exists: {bool(settings.AWS_SECRET_ACCESS_KEY)}")
    logger.error(f"S3 Connection Debug - AWS_STORAGE_BUCKET_NAME: {settings.AWS_STORAGE_BUCKET_NAME}")

    try:
        s3 = boto3.client('s3',
                       aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                       aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                       region_name=settings.AWS_S3_REGION_NAME)
        buckets = s3.list_buckets()
        logger.error(f"S3 Connection Debug - Connection successful, buckets: {[b['Name'] for b in buckets['Buckets']]}")
        
        # Test upload
        try:
            s3.put_object(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key="test-upload.txt",
                Body="This is a test upload from debug function"
            )
            logger.error("S3 Connection Debug - Test upload successful")
        except Exception as e:
            logger.error(f"S3 Connection Debug - Test upload failed: {str(e)}")
        
        return True
    except Exception as e:
        logger.error(f"S3 Connection Debug - Error: {str(e)}")
        logger.error(traceback.format_exc())
        return False

# Call the debug function
debug_s3_connection()

# Test direct file upload
try:
    logger.error("STORAGE TEST: Starting direct file upload test")
    test_key = "direct-test-file.txt"
    
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        logger.error("STORAGE TEST: AWS credentials found")
        import boto3
        
        s3 = boto3.client('s3',
                        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                        region_name=settings.AWS_S3_REGION_NAME)
        
        # Perform a direct upload
        s3.put_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=test_key,
            Body=b"This is a direct test upload from the storage_backends.py file",
            ContentType="text/plain"
        )
        
        logger.error(f"STORAGE TEST: Successfully uploaded test file to S3 at {test_key}")
        
        # Check permissions by testing a public URL
        url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{test_key}"
        logger.error(f"STORAGE TEST: Test file should be available at {url}")
    else:
        logger.error("STORAGE TEST: AWS credentials missing")
except Exception as e:
    logger.error(f"STORAGE TEST: Error in direct test: {str(e)}")
    logger.error(traceback.format_exc())
