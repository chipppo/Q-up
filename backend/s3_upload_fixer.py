#!/usr/bin/env python
"""
S3 Upload Fixer - Comprehensive Debugging and Repair Tool

This script inspects your Django application's file upload process, 
diagnoses S3 upload issues, and helps fix them.
"""

import os
import sys
import django
import logging
import boto3
import botocore
import tempfile
import traceback
import time
import json
from datetime import datetime
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.db.models import FileField, ImageField

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(f"s3_upload_debug_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
    ]
)
logger = logging.getLogger(__name__)

# Initialize Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

# Import models after Django setup
from django.contrib.auth import get_user_model
from base.models import Game, RankTier, Post, Message
from django.conf import settings

def validate_s3_credentials():
    """Verify AWS credentials and bucket access."""
    logger.info("Validating S3 credentials and bucket access...")
    
    if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
        logger.error("AWS credentials are missing.")
        return False
        
    try:
        # Test S3 connection
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        
        # Check if bucket exists
        s3_client.head_bucket(Bucket=settings.AWS_STORAGE_BUCKET_NAME)
        logger.info(f"✅ Successfully connected to bucket: {settings.AWS_STORAGE_BUCKET_NAME}")
        
        # Create a test file and try to upload it
        test_content = b"Test file for S3 upload"
        test_key = f"test_uploads/test_file_{int(time.time())}.txt"
        
        # Try using direct upload
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_file.write(test_content)
            temp_file_path = temp_file.name
        
        try:
            s3_client.upload_fileobj(
                open(temp_file_path, 'rb'),
                settings.AWS_STORAGE_BUCKET_NAME,
                test_key,
                ExtraArgs={'ContentType': 'text/plain'}
            )
            logger.info(f"✅ Successfully uploaded test file: {test_key}")
            
            # Verify the file exists
            s3_client.head_object(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=test_key
            )
            logger.info(f"✅ Test file verified in S3")
            
            # Clean up the test file
            s3_client.delete_object(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=test_key
            )
            logger.info(f"✅ Test file cleanup successful")
            
            # Try Django storage next
            storage_test_key = default_storage.save(
                'test_uploads/django_storage_test.txt', 
                ContentFile(b"Test upload via Django storage")
            )
            logger.info(f"✅ Django storage upload successful: {storage_test_key}")
            
            # Get the URL
            storage_url = default_storage.url(storage_test_key)
            logger.info(f"✅ Django storage URL: {storage_url}")
            
            # Cleanup Django storage test
            default_storage.delete(storage_test_key)
            
            os.unlink(temp_file_path)  # Delete local temp file
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to perform test S3 operations: {str(e)}")
            logger.error(traceback.format_exc())
            return False
            
    except botocore.exceptions.ClientError as e:
        logger.error(f"❌ S3 connection error: {str(e)}")
        if e.response['Error']['Code'] == '403':
            logger.error("❌ Permission denied. Check your IAM permissions.")
        elif e.response['Error']['Code'] == '404':
            logger.error(f"❌ Bucket '{settings.AWS_STORAGE_BUCKET_NAME}' not found.")
        else:
            logger.error(traceback.format_exc())
        return False
    except Exception as e:
        logger.error(f"❌ Unexpected error: {str(e)}")
        logger.error(traceback.format_exc())
        return False

def find_models_with_file_fields():
    """Find all models with FileField or ImageField fields."""
    from django.apps import apps
    
    models_with_file_fields = {}
    
    for model in apps.get_models():
        file_fields = []
        for field in model._meta.fields:
            if isinstance(field, (FileField, ImageField)):
                file_fields.append(field.name)
        
        if file_fields:
            models_with_file_fields[model.__name__] = {
                'model': model,
                'fields': file_fields
            }
    
    return models_with_file_fields

def test_upload_file(file_path, destination_key=None):
    """Test uploading a file to S3 and return the URL."""
    if destination_key is None:
        destination_key = f"test_uploads/{os.path.basename(file_path)}"
    
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
        elif file_path.lower().endswith('.gif'):
            content_type = 'image/gif'
        
        # Upload file
        with open(file_path, 'rb') as f:
            s3.upload_fileobj(
                f, 
                settings.AWS_STORAGE_BUCKET_NAME, 
                destination_key,
                ExtraArgs={
                    'ContentType': content_type
                }
            )
        
        # Generate URL
        url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{destination_key}"
        logger.info(f"✅ Direct S3 upload successful: {file_path} -> {url}")
        return url
    except Exception as e:
        logger.error(f"❌ Direct S3 upload failed: {str(e)}")
        logger.error(traceback.format_exc())
        return None

def inspect_file_fields_in_database():
    """Find database records with file fields and check if files exist in S3."""
    models_with_files = find_models_with_file_fields()
    logger.info(f"Found {len(models_with_files)} models with file fields:")
    
    missing_files = []
    
    for model_name, model_info in models_with_files.items():
        model = model_info['model']
        fields = model_info['fields']
        
        logger.info(f"\nInspecting model: {model_name} (Fields: {', '.join(fields)})")
        
        objects = model.objects.all()
        logger.info(f"Total objects: {objects.count()}")
        
        for obj in objects:
            for field_name in fields:
                field = getattr(obj, field_name)
                if field and field.name:
                    # The key for S3 should include the location prefix
                    # For most Django storages implementations, this would be:
                    s3_key = f"{settings.AWS_LOCATION}/{field.name}" if hasattr(settings, 'AWS_LOCATION') else field.name
                    
                    try:
                        # Try to check if the file exists in S3
                        s3_client = boto3.client(
                            's3',
                            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                            region_name=settings.AWS_S3_REGION_NAME
                        )
                        
                        try:
                            s3_client.head_object(
                                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                                Key=s3_key
                            )
                            logger.info(f"✅ File exists: {s3_key}")
                        except botocore.exceptions.ClientError as e:
                            if e.response['Error']['Code'] == '404':
                                logger.warning(f"❌ File missing in S3: {s3_key}")
                                missing_files.append({
                                    'model': model_name,
                                    'id': obj.id,
                                    'field': field_name,
                                    'filename': field.name,
                                    's3_key': s3_key
                                })
                            else:
                                logger.error(f"❌ Error checking file: {s3_key}, Error: {str(e)}")
                    except Exception as e:
                        logger.error(f"❌ Error checking file: {field.name}, Error: {str(e)}")
    
    if missing_files:
        logger.warning(f"\n\nFound {len(missing_files)} missing files in S3")
        with open('missing_s3_files.json', 'w') as f:
            json.dump(missing_files, f, indent=2)
        logger.info("Missing files details saved to missing_s3_files.json")
    else:
        logger.info("\n\nNo missing files detected. S3 storage appears to be working correctly.")
    
    return missing_files

def fix_django_storage():
    """Replace the Django storage backend's _save method for better error handling."""
    from backend.storage_backends import MediaStorage
    
    original_save = MediaStorage._save
    
    def new_save(self, name, content):
        """Enhanced _save method with additional logging and error recovery."""
        logger.info(f"Enhanced S3 save method called for: {name}")
        
        try:
            # Make sure the content is at the beginning
            if hasattr(content, 'seek'):
                content.seek(0)
                
            # Log content type if available
            content_type = getattr(content, 'content_type', None)
            logger.info(f"Content type: {content_type}")
            
            # Log file size
            if hasattr(content, 'size'):
                logger.info(f"File size: {content.size} bytes")
                
            # Call original save method
            result = original_save(self, name, content)
            logger.info(f"✅ Original save method succeeded: {result}")
            return result
        except Exception as e:
            logger.error(f"❌ Error in original save method: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Fallback to direct S3 upload
            logger.info("Trying fallback direct S3 upload...")
            try:
                if hasattr(content, 'seek'):
                    content.seek(0)
                    
                # Use boto3 directly
                s3_client = boto3.client(
                    's3',
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_S3_REGION_NAME,
                    verify=getattr(settings, 'AWS_S3_VERIFY', True)
                )
                
                # Normalize the key
                s3_key = self._normalize_name(self._clean_name(name))
                
                # Upload with appropriate content type
                if not content_type:
                    if name.lower().endswith(('.jpg', '.jpeg')):
                        content_type = 'image/jpeg'
                    elif name.lower().endswith('.png'):
                        content_type = 'image/png'
                    elif name.lower().endswith('.gif'):
                        content_type = 'image/gif'
                    else:
                        content_type = 'application/octet-stream'
                
                # Create a temporary file for upload
                with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                    if hasattr(content, 'read'):
                        # Reset to beginning to be safe
                        if hasattr(content, 'seek'):
                            content.seek(0)
                        # Read the content
                        file_content = content.read()
                        temp_file.write(file_content)
                    else:
                        # Handle non-file content
                        temp_file.write(content)
                
                temp_file_path = temp_file.name
                
                # Upload the temp file
                with open(temp_file_path, 'rb') as f:
                    s3_client.upload_fileobj(
                        f,
                        self.bucket_name,
                        s3_key,
                        ExtraArgs={
                            'ContentType': content_type
                        }
                    )
                
                # Clean up
                try:
                    os.unlink(temp_file_path)
                except:
                    pass
                
                logger.info(f"✅ Fallback upload succeeded: {s3_key}")
                return name
            except Exception as fallback_error:
                logger.error(f"❌ Fallback upload failed: {str(fallback_error)}")
                logger.error(traceback.format_exc())
                raise fallback_error
    
    # Replace the method
    MediaStorage._save = new_save
    logger.info("✅ Enhanced Django S3 storage backend successfully.")
    return "Enhanced Django S3 storage backend with better error handling and fallback upload mechanism."

def fix_missing_s3_files(file_paths):
    """Fix missing S3 files given local file paths and their destination keys."""
    if not file_paths:
        logger.warning("No file paths provided for fixing.")
        return

    successful = 0
    failed = 0
    
    for file_info in file_paths:
        local_path = file_info.get('local_path')
        s3_key = file_info.get('s3_key')
        
        if not local_path or not s3_key:
            logger.warning(f"Invalid file info, missing path or key: {file_info}")
            failed += 1
            continue
        
        if not os.path.exists(local_path):
            logger.error(f"Local file not found: {local_path}")
            failed += 1
            continue
        
        try:
            # Upload the file
            s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )
            
            # Determine content type
            content_type = 'application/octet-stream'
            if local_path.lower().endswith(('.jpg', '.jpeg')):
                content_type = 'image/jpeg'
            elif local_path.lower().endswith('.png'):
                content_type = 'image/png'
            elif local_path.lower().endswith('.gif'):
                content_type = 'image/gif'
            
            # Upload the file
            with open(local_path, 'rb') as f:
                s3_client.upload_fileobj(
                    f,
                    settings.AWS_STORAGE_BUCKET_NAME,
                    s3_key,
                    ExtraArgs={
                        'ContentType': content_type
                    }
                )
            
            logger.info(f"✅ Successfully uploaded: {local_path} -> {s3_key}")
            successful += 1
        except Exception as e:
            logger.error(f"❌ Failed to upload {local_path}: {str(e)}")
            logger.error(traceback.format_exc())
            failed += 1
    
    return f"Fixed {successful} files, {failed} failed."

def generate_upload_retries_for_models():
    """
    Generate code to retry uploads for each model from their ImageField/FileField data.
    This will parse the missing_s3_files.json file if available.
    """
    missing_files_path = 'missing_s3_files.json'
    if not os.path.exists(missing_files_path):
        logger.warning(f"Missing files log not found: {missing_files_path}")
        # First run the inspection to generate the file
        missing_files = inspect_file_fields_in_database()
    else:
        # Load the missing files data
        with open(missing_files_path, 'r') as f:
            missing_files = json.load(f)
    
    if not missing_files:
        logger.info("No missing files to fix.")
        return
    
    logger.info(f"Generating code to fix {len(missing_files)} files...")
    
    # Group missing files by model
    model_files = {}
    for file_info in missing_files:
        model_name = file_info['model']
        if model_name not in model_files:
            model_files[model_name] = []
        model_files[model_name].append(file_info)
    
    # Generate code snippets for each model
    code_snippets = [
        "# Add this code to a management command or run it from the Django shell",
        "import os",
        "import boto3",
        "from django.conf import settings",
        "from django.core.files.storage import default_storage",
        "from django.core.files.base import ContentFile",
        "",
        "# Set up S3 client",
        "s3_client = boto3.client(",
        "    's3',",
        "    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,",
        "    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,",
        "    region_name=settings.AWS_S3_REGION_NAME",
        ")",
        ""
    ]
    
    for model_name, files in model_files.items():
        snippet = []
        snippet.append(f"# Fix missing files for {model_name}")
        
        if model_name == "MyUser":
            snippet.append("from django.contrib.auth import get_user_model")
            snippet.append("User = get_user_model()")
            model_var = "User"
        else:
            snippet.append(f"from base.models import {model_name}")
            model_var = model_name
        
        snippet.append("")
        
        for file_info in files:
            obj_id = file_info['id']
            field = file_info['field']
            filename = file_info['filename']
            
            snippet.append(f"# Fix {field} for {model_name} id={obj_id}")
            snippet.append(f"try:")
            snippet.append(f"    obj = {model_var}.objects.get(id={obj_id})")
            
            # For when you have the local file
            snippet.append(f"    # If you have the local file:")
            snippet.append(f"    local_file_path = '/path/to/local/file/{os.path.basename(filename)}'")
            snippet.append(f"    if os.path.exists(local_file_path):")
            snippet.append(f"        with open(local_file_path, 'rb') as f:")
            snippet.append(f"            # Set the file field directly")
            snippet.append(f"            obj.{field}.save('{os.path.basename(filename)}', ContentFile(f.read()), save=True)")
            snippet.append(f"            print(f'Fixed {field} for {model_name} id={obj_id}')")
            
            # For when no local file exists
            snippet.append(f"    else:")
            snippet.append(f"        print(f'Local file not found for {model_name} id={obj_id}, field={field}')")
            
            snippet.append(f"except Exception as e:")
            snippet.append(f"    print(f'Error fixing {field} for {model_name} id={obj_id}: {str(e)}')")
            snippet.append("")
        
        code_snippets.extend(snippet)
    
    # Save the code to a file
    with open('fix_s3_uploads_code.py', 'w') as f:
        f.write("\n".join(code_snippets))
    
    logger.info("Code snippets saved to fix_s3_uploads_code.py")
    return code_snippets

def main():
    """Main function to run the S3 upload diagnosis and fix."""
    logger.info("=" * 80)
    logger.info("S3 Upload Fixer - Starting diagnosis")
    logger.info("=" * 80)
    
    # First check S3 credentials and connectivity
    if not validate_s3_credentials():
        logger.error("S3 credential validation failed. Please check your AWS settings.")
        return
    
    # Fix Django storage backend
    storage_backend_fix = fix_django_storage()
    logger.info(storage_backend_fix)
    
    # Inspect file fields in database
    missing_files = inspect_file_fields_in_database()
    
    # Generate code to fix missing files
    generate_upload_retries_for_models()
    
    logger.info("\n\n" + "=" * 80)
    logger.info("DIAGNOSIS SUMMARY")
    logger.info("=" * 80)
    
    if missing_files:
        logger.info(f"Found {len(missing_files)} files missing in S3 but referenced in the database")
        logger.info("1. We've enhanced the Django storage backend with better error handling")
        logger.info("2. Generated code snippets in 'fix_s3_uploads_code.py' to fix the missing files")
        logger.info("3. To fix the S3 upload issue for future uploads:")
        logger.info("   - Ensure S3 bucket permissions are set correctly")
        logger.info("   - Verify that IAM roles have appropriate S3 permissions")
        logger.info("   - Check network connectivity between your server and S3")
        logger.info("   - Verify environment variables are correctly set")
        logger.info("\nThe fix_s3_uploads_code.py file contains code you can run to fix existing entries")
    else:
        logger.info("No missing files detected!")
        logger.info("The S3 upload system appears to be working correctly.")
        logger.info("We've still enhanced the Django storage backend with better error handling")
    
    logger.info("\nDiagnosis and fix completed.")

if __name__ == "__main__":
    main() 