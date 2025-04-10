from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage
import logging
import traceback
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

class StaticStorage(S3Boto3Storage):
    location = 'static'
    default_acl = 'public-read'

class MediaStorage(S3Boto3Storage):
    location = 'media'
    file_overwrite = False
    
    def exists(self, name):
        try:
            # Actually check if file exists by attempting a HEAD request
            self.connection.meta.client.head_object(Bucket=self.bucket_name, Key=self._normalize_name(self._clean_name(name)))
            logger.error(f"S3 exists check: File {name} exists in bucket {self.bucket_name}")
            return True
        except ClientError as e:
            if e.response['ResponseMetadata']['HTTPStatusCode'] == 404:
                logger.error(f"S3 exists check: File {name} does not exist in bucket {self.bucket_name}")
                return False
            logger.error(f"S3 exists error for {name}: {str(e)}")
            # For any other error, return False to force an upload attempt
            return False
    
    def _save(self, name, content):
        """
        Save and upload the file to S3
        """
        try:
            # First, try the standard S3Boto3Storage save method
            cleaned_name = self._clean_name(name)
            name = self._normalize_name(cleaned_name)
            
            logger.error(f"S3 SAVE: Attempting to save {name} to bucket {self.bucket_name}")
            
            # Get content type and ensure content is at file start
            content_type = getattr(content, 'content_type', None)
            if hasattr(content, 'seek') and callable(content.seek):
                content.seek(0)
            
            # Create parameters dictionary 
            params = {
                'Bucket': self.bucket_name,
                'Key': name,
                'Body': content,
            }
            
            # Add content type if available
            if content_type:
                params['ContentType'] = content_type
                logger.error(f"S3 SAVE: Content type: {content_type}")
            
            # Use raw boto3 to upload directly, with clear logs
            s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )
            
            # Attempt upload
            logger.error(f"S3 SAVE: Uploading content to s3://{self.bucket_name}/{name}")
            s3_client.put_object(**params)
            
            # Verify upload
            try:
                s3_client.head_object(Bucket=self.bucket_name, Key=name)
                logger.error(f"S3 SAVE: Successfully uploaded and verified file at s3://{self.bucket_name}/{name}")
                
                # Generate URL
                url = f"https://{self.bucket_name}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{name}"
                logger.error(f"S3 SAVE: File public URL: {url}")
            except ClientError as e:
                logger.error(f"S3 SAVE: File uploaded but not verifiable: {str(e)}")
            
            return cleaned_name
        except Exception as e:
            logger.error(f"S3 SAVE ERROR for {name}: {str(e)}")
            logger.error(traceback.format_exc())
            # Re-raise to let Django handle the error
            raise
            
    def url(self, name, parameters=None, expire=None):
        try:
            url = super().url(name, parameters, expire)
            logger.error(f"S3 URL generated for {name}: {url}")
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

# Test direct S3 access
try:
    logger.error("DEBUG: Testing direct S3 access")
    s3_client = boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME
    )
    
    # Try creating a test file directly (not via Django)
    test_key = "test-direct-upload.txt"
    logger.error(f"DEBUG: Attempting to upload test file to s3://{settings.AWS_STORAGE_BUCKET_NAME}/{test_key}")
    
    try:
        s3_client.put_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=test_key,
            Body=b"This is a direct test upload from storage_backends.py",
            ContentType="text/plain"
        )
        logger.error(f"DEBUG: Direct upload succeeded!")
    except Exception as e:
        logger.error(f"DEBUG: Direct upload failed: {str(e)}")
        logger.error(traceback.format_exc())
    
    # List available buckets
    logger.error("DEBUG: Listing available S3 buckets")
    try:
        response = s3_client.list_buckets()
        buckets = [bucket['Name'] for bucket in response['Buckets']]
        logger.error(f"DEBUG: Available buckets: {buckets}")
    except Exception as e:
        logger.error(f"DEBUG: Unable to list buckets: {str(e)}")
        
except Exception as e:
    logger.error(f"DEBUG: S3 client initialization failed: {str(e)}")
    logger.error(traceback.format_exc())
