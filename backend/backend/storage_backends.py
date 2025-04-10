from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage
import logging
import traceback
import boto3

logger = logging.getLogger(__name__)

class StaticStorage(S3Boto3Storage):
    location = 'static'
    default_acl = 'public-read'

class MediaStorage(S3Boto3Storage):
    location = 'media'
    default_acl = 'public-read'
    file_overwrite = False
    
    def exists(self, name):
        """
        Check if a file exists in S3 storage.
        Uses proper error handling to check if a file exists in S3.
        """
        try:
            # Actually check if file exists by attempting a HEAD request
            self.connection.meta.client.head_object(Bucket=self.bucket_name, Key=self._normalize_name(self._clean_name(name)))
            logger.info(f"S3 exists check: File {name} exists in bucket {self.bucket_name}")
            return True
        except Exception as e:
            # For any error, return False to force an upload attempt
            logger.info(f"S3 exists check: File {name} does not exist in bucket {self.bucket_name} or error: {str(e)}")
            return False
    
    def _save(self, name, content):
        """
        Save and upload the file to S3
        """
        try:
            # First, try the standard S3Boto3Storage save method
            cleaned_name = self._clean_name(name)
            name = self._normalize_name(cleaned_name)
            
            logger.info(f"S3 SAVE: Attempting to save {name} to bucket {self.bucket_name}")
            
            # Get content type and ensure content is at file start
            content_type = getattr(content, 'content_type', None)
            if hasattr(content, 'seek') and callable(content.seek):
                content.seek(0)
            
            # Read all content bytes into memory to ensure we have the complete file
            content_bytes = content.read()
            
            # If we got no content, this is a problem
            if not content_bytes or len(content_bytes) == 0:
                logger.error(f"S3 SAVE ERROR: Empty file content for {name}")
                raise ValueError(f"Empty file content for {name}")
                
            # Reset the file pointer after reading
            if hasattr(content, 'seek') and callable(content.seek):
                content.seek(0)
                
            logger.info(f"S3 SAVE: Read {len(content_bytes)} bytes from file")
            
            # Create parameters dictionary 
            params = {
                'Bucket': self.bucket_name,
                'Key': name,
                'Body': content_bytes,
            }
            
            # Add content type if available
            if content_type:
                params['ContentType'] = content_type
                logger.info(f"S3 SAVE: Content type: {content_type}")
            
            # Use raw boto3 to upload directly, with clear logs
            s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )
            
            # Attempt upload
            logger.info(f"S3 SAVE: Uploading content to s3://{self.bucket_name}/{name}")
            s3_client.put_object(**params)
            
            # Verify upload
            try:
                s3_client.head_object(Bucket=self.bucket_name, Key=name)
                logger.info(f"S3 SAVE: Successfully uploaded and verified file at s3://{self.bucket_name}/{name}")
                
                # Generate URL
                url = f"https://{self.bucket_name}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{name}"
                logger.info(f"S3 SAVE: File public URL: {url}")
            except Exception as e:
                logger.error(f"S3 SAVE: File uploaded but not verifiable: {str(e)}")
                raise  # Re-raise to prevent database entry creation if the file didn't upload properly
            
            return cleaned_name
        except Exception as e:
            logger.error(f"S3 SAVE ERROR for {name}: {str(e)}")
            logger.error(traceback.format_exc())
            # Re-raise the exception - Django should handle this by not creating DB entry
            raise
            
    def url(self, name, parameters=None, expire=None):
        """
        Generate a URL for the file - this overrides the default to handle errors
        """
        try:
            url = super().url(name, parameters, expire)
            logger.info(f"S3 URL generated for {name}: {url}")
            return url
        except Exception as e:
            logger.error(f"S3 URL generation error for file {name}: {str(e)}")
            logger.error(traceback.format_exc())
            # Provide a fallback URL that might work
            cleaned_name = self._clean_name(name)
            normalized_name = self._normalize_name(cleaned_name)
            return f"https://{self.bucket_name}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{normalized_name}"

def debug_s3_connection():
    import boto3
    from django.conf import settings
    logger.info(f"S3 Connection Debug - AWS_ACCESS_KEY_ID exists: {bool(settings.AWS_ACCESS_KEY_ID)}")
    logger.info(f"S3 Connection Debug - AWS_SECRET_ACCESS_KEY exists: {bool(settings.AWS_SECRET_ACCESS_KEY)}")
    logger.info(f"S3 Connection Debug - AWS_STORAGE_BUCKET_NAME: {settings.AWS_STORAGE_BUCKET_NAME}")

    try:
        s3 = boto3.client('s3',
                       aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                       aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                       region_name=settings.AWS_S3_REGION_NAME)
        buckets = s3.list_buckets()
        logger.info(f"S3 Connection Debug - Connection successful, buckets: {[b['Name'] for b in buckets['Buckets']]}")
        
        # Test upload
        try:
            s3.put_object(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key="test-upload.txt",
                Body=b"This is a test upload from debug function",
                ContentType="text/plain"
            )
            logger.info("S3 Connection Debug - Test upload successful")
        except Exception as e:
            logger.error(f"S3 Connection Debug - Test upload failed: {str(e)}")
        
        return True
    except Exception as e:
        logger.error(f"S3 Connection Debug - Error: {str(e)}")
        logger.error(traceback.format_exc())
        return False

# Only run debug connection tests when first loaded
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
