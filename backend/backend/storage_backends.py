from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage
import logging
import traceback
import boto3
import os
import io

logger = logging.getLogger(__name__)

class StaticStorage(S3Boto3Storage):
    location = 'static'
    default_acl = None  # Don't set ACL, rely on bucket policy

class MediaStorage(S3Boto3Storage):
    location = 'media'
    default_acl = None  # Don't set ACL, rely on bucket policy
    file_overwrite = False
    
    def _clean_name(self, name):
        """
        Clean the file name to ensure it follows AWS S3 naming conventions.
        """
        # First pass the name through the parent's _clean_name if it exists
        try:
            name = super()._clean_name(name)
        except AttributeError:
            # If parent doesn't have _clean_name, do basic cleaning
            pass
            
        # Clean the name for S3
        import os
        name = os.path.normpath(name).replace('\\', '/')
        
        # Remove any leading slashes or drive letters (Windows)
        name = name.lstrip('/').lstrip('\\')
        if ':' in name:
            name = name.split(':', 1)[1]
            
        # Handle any double slashes
        while '//' in name:
            name = name.replace('//', '/')
            
        return name
    
    def exists(self, name):
        """
        Check if a file exists in S3 storage.
        Uses proper error handling to check if a file exists in S3.
        """
        try:
            name = self._clean_name(name)
            s3_key = self._normalize_name(name)
            # Actually check if file exists by attempting a HEAD request
            self.connection.meta.client.head_object(Bucket=self.bucket_name, Key=s3_key)
            logger.info(f"S3 exists check: File {name} exists in bucket {self.bucket_name}")
            return True
        except Exception as e:
            # For any error, return False to force an upload attempt
            logger.info(f"S3 exists check: File {name} does not exist in bucket {self.bucket_name} or error: {str(e)}")
            return False
    
    def _normalize_name(self, name):
        """
        Normalize the file name to S3 key format
        """
        name = self._clean_name(name)
        
        # If there's a location (subdirectory), prepend it
        if self.location:
            return f"{self.location.rstrip('/')}/{name}"
        return name
    
    def _save(self, name, content):
        """
        Save the file to S3 with improved error handling and proper byte content management
        """
        logger.info(f"Attempting to save file to S3: {name}")
        try:
            # Clean and normalize the name first
            cleaned_name = self._clean_name(name)
            normalized_name = self._normalize_name(cleaned_name)
            
            logger.info(f"Cleaned name: {cleaned_name}, Normalized name: {normalized_name}")
            
            # Ensure the content is at the beginning
            if hasattr(content, 'seek'):
                content.seek(0)
            
            # Get the binary content correctly
            content_file = content
            content_bytes = None
            
            if hasattr(content, 'read'):
                try:
                    content_bytes = content.read()
                    # If content is empty, log and raise error
                    if not content_bytes:
                        logger.error(f"Empty content received for file: {name}")
                        raise ValueError("File content is empty")
                    
                    # Create a new BytesIO object for upload
                    content_file = io.BytesIO(content_bytes)
                    
                except Exception as e:
                    logger.error(f"Error reading file content for {name}: {str(e)}")
                    raise
            
            # Use direct upload with boto3 for better control
            try:
                bucket_name = self.bucket_name
                s3_key = normalized_name
                
                logger.info(f"S3 upload details - Bucket: {bucket_name}, Key: {s3_key}")
                
                # Get S3 client with proper config
                s3_client = boto3.client(
                    's3',
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_S3_REGION_NAME,
                    verify=getattr(settings, 'AWS_S3_VERIFY', True)
                )
                
                # Determine content type based on file extension
                content_type = getattr(content_file, 'content_type', None)
                if not content_type:
                    if name.lower().endswith(('.jpg', '.jpeg')):
                        content_type = 'image/jpeg'
                    elif name.lower().endswith('.png'):
                        content_type = 'image/png'
                    elif name.lower().endswith('.gif'):
                        content_type = 'image/gif'
                    else:
                        content_type = 'application/octet-stream'
                
                # Log content type
                logger.info(f"Content type for {name}: {content_type}")
                
                # Prepare for upload without ACL
                extra_args = {
                    'ContentType': content_type
                }
                
                # Reset file position
                content_file.seek(0)
                
                # Log upload attempt
                logger.info(f"Uploading file to S3: {s3_key} (size: {len(content_bytes) if content_bytes else 'unknown'})")
                
                # Upload file to S3 using upload_fileobj for more reliable uploads
                s3_client.upload_fileobj(
                    content_file,
                    bucket_name,
                    s3_key,
                    ExtraArgs=extra_args
                )
                
                logger.info(f"Successfully uploaded file to S3: {name} -> {s3_key}")
                
                # Generate direct S3 URL
                s3_url = f"https://{bucket_name}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{s3_key}"
                logger.info(f"Direct S3 URL: {s3_url}")
                
                # Verify upload was successful
                try:
                    s3_client.head_object(Bucket=bucket_name, Key=s3_key)
                    logger.info(f"Verified file exists in S3: {s3_key}")
                except Exception as e:
                    logger.error(f"Failed to verify file exists in S3 after upload: {str(e)}")
                    # Continue anyway since the upload might have been successful
                
                return cleaned_name
            except Exception as e:
                logger.error(f"Failed to upload file to S3: {name}")
                logger.error(f"Error: {str(e)}")
                logger.error(traceback.format_exc())
                raise
        except Exception as e:
            logger.error(f"Error in _save method for {name}: {str(e)}")
            logger.error(traceback.format_exc())
            raise
    
    def url(self, name, **kwargs):
        """
        Returns the URL where the contents of the file can be accessed.
        """
        try:
            name = self._clean_name(name)
            s3_key = self._normalize_name(name)
            
            # Generate direct URL
            direct_url = f"https://{self.bucket_name}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{s3_key}"
            logger.debug(f"Direct S3 URL for {name}: {direct_url}")
            
            return direct_url
        except Exception as e:
            logger.error(f"Error generating URL for {name}: {str(e)}")
            
            # Return a direct URL as fallback
            try:
                # Try to create a basic direct URL as fallback
                if self.location:
                    path = f"{self.location}/{name}"
                else:
                    path = name
                
                direct_url = f"https://{self.bucket_name}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{path}"
                logger.info(f"Using direct S3 URL as fallback: {direct_url}")
                return direct_url
            except:
                # If all else fails, return a relative URL
                return f"/media/{name}"

# Debug functions for direct S3 testing
def test_s3_connection():
    """Test S3 connection using boto3 directly"""
    try:
        s3 = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        response = s3.list_buckets()
        buckets = [bucket['Name'] for bucket in response['Buckets']]
        
        logger.info(f"Successfully connected to S3. Available buckets: {buckets}")
        if settings.AWS_STORAGE_BUCKET_NAME in buckets:
            logger.info(f"Bucket {settings.AWS_STORAGE_BUCKET_NAME} exists")
        else:
            logger.warning(f"Bucket {settings.AWS_STORAGE_BUCKET_NAME} not found")
            
        return True
    except Exception as e:
        logger.error(f"S3 connection test failed: {str(e)}")
        logger.error(traceback.format_exc())
        return False

def test_s3_direct_upload(file_path, s3_key=None):
    """Test direct upload to S3 using boto3"""
    if not os.path.exists(file_path):
        logger.error(f"Test file not found: {file_path}")
        return False
    
    if s3_key is None:
        s3_key = f"test_uploads/{os.path.basename(file_path)}"
    
    try:
        s3 = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        
        # Determine content type
        content_type = 'application/octet-stream'
        if file_path.lower().endswith(('.jpg', '.jpeg')):
            content_type = 'image/jpeg'
        elif file_path.lower().endswith('.png'):
            content_type = 'image/png'
        
        # Upload file
        with open(file_path, 'rb') as f:
            s3.upload_fileobj(
                f, 
                settings.AWS_STORAGE_BUCKET_NAME, 
                s3_key,
                ExtraArgs={
                    'ContentType': content_type
                }
            )
        
        # Generate URL
        url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{s3_key}"
        logger.info(f"Direct S3 upload successful: {file_path} -> {url}")
        return url
    except Exception as e:
        logger.error(f"Direct S3 upload failed: {str(e)}")
        logger.error(traceback.format_exc())
        return False

def debug_s3_connection():
    """Debug connection to S3 bucket and list available buckets"""
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

# Test direct file upload
def test_direct_upload():
    """Test direct upload to S3 without going through Django storage"""
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

# Only run these debug tests when the module is first loaded
debug_s3_connection()
test_direct_upload()

# Debug utility for testing S3 connection
def test_s3_connection():
    """
    Test the S3 connection and bucket access.
    Returns True if connection is successful, False otherwise.
    """
    try:
        logger.info("Testing S3 connection...")
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
            verify=getattr(settings, 'AWS_S3_VERIFY', True)
        )
        
        # Test if we can list objects in the bucket
        s3_client.list_objects_v2(Bucket=settings.AWS_STORAGE_BUCKET_NAME, MaxKeys=1)
        
        logger.info("S3 connection test successful!")
        return True
    except Exception as e:
        logger.error(f"S3 connection test failed: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return False

# Direct upload test for debugging
def test_direct_upload_to_s3(file_path, key_name):
    """
    Test direct upload to S3 bypassing Django storage
    """
    try:
        logger.info(f"Testing direct upload to S3: {file_path} -> {key_name}")
        
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
            verify=getattr(settings, 'AWS_S3_VERIFY', True)
        )
        
        with open(file_path, 'rb') as file:
            content_type = 'application/octet-stream'
            if file_path.lower().endswith('.jpg') or file_path.lower().endswith('.jpeg'):
                content_type = 'image/jpeg'
            elif file_path.lower().endswith('.png'):
                content_type = 'image/png'
            
            s3_client.upload_fileobj(
                file,
                settings.AWS_STORAGE_BUCKET_NAME,
                f"media/{key_name}",
                ExtraArgs={
                    'ContentType': content_type
                }
            )
        
        logger.info(f"Direct upload test successful: {key_name}")
        
        # Generate URL
        url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/media/{key_name}"
        logger.info(f"File URL: {url}")
        
        return url
    except Exception as e:
        logger.error(f"Direct upload test failed: {str(e)}")
        logger.error(traceback.format_exc())
        return None
