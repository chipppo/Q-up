#!/usr/bin/env python3
import os
import sys
import logging
import subprocess
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# S3 Configuration - EDIT THESE VALUES
AWS_ACCESS_KEY_ID = ""     # Add your AWS Access Key
AWS_SECRET_ACCESS_KEY = "" # Add your AWS Secret Key
AWS_STORAGE_BUCKET_NAME = "qup-media-files-0"
AWS_S3_REGION_NAME = "eu-north-1"

# Local media directory
MEDIA_DIR = "media"  # Change if your media is in a different folder

def install_dependencies():
    """Install required packages"""
    logger.info("Installing required packages...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "boto3"])
        logger.info("Successfully installed boto3")
        return True
    except Exception as e:
        logger.error(f"Failed to install packages: {str(e)}")
        logger.info("Continuing anyway - boto3 might already be installed")
        return False

def get_aws_credentials():
    """Get AWS credentials from environment or settings file"""
    global AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
    
    # Try to get credentials from environment
    if not AWS_ACCESS_KEY_ID:
        AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID', '')
    
    if not AWS_SECRET_ACCESS_KEY:
        AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY', '')
    
    # If still empty, try to read from Django settings
    if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY:
        try:
            # Try to read from settings.py
            settings_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend', 'settings.py')
            
            if os.path.exists(settings_path):
                logger.info(f"Reading settings from {settings_path}")
                with open(settings_path, 'r') as f:
                    settings_content = f.read()
                
                # Extract AWS credentials from settings
                import re
                aws_key_match = re.search(r"AWS_ACCESS_KEY_ID\s*=\s*os\.environ\.get\(['\"](.*?)['\"],?\s*['\"]?(.*?)['\"]?\)", settings_content)
                if aws_key_match:
                    env_var = aws_key_match.group(1)
                    default_val = aws_key_match.group(2)
                    
                    AWS_ACCESS_KEY_ID = os.environ.get(env_var, default_val)
                    if not AWS_ACCESS_KEY_ID and default_val:
                        AWS_ACCESS_KEY_ID = default_val
                
                aws_secret_match = re.search(r"AWS_SECRET_ACCESS_KEY\s*=\s*os\.environ\.get\(['\"](.*?)['\"],?\s*['\"]?(.*?)['\"]?\)", settings_content)
                if aws_secret_match:
                    env_var = aws_secret_match.group(1)
                    default_val = aws_secret_match.group(2)
                    
                    AWS_SECRET_ACCESS_KEY = os.environ.get(env_var, default_val)
                    if not AWS_SECRET_ACCESS_KEY and default_val:
                        AWS_SECRET_ACCESS_KEY = default_val
        except Exception as e:
            logger.error(f"Error reading settings: {str(e)}")
    
    # Ask for credentials if still missing
    if not AWS_ACCESS_KEY_ID:
        AWS_ACCESS_KEY_ID = input("Enter AWS Access Key ID: ")
    
    if not AWS_SECRET_ACCESS_KEY:
        AWS_SECRET_ACCESS_KEY = input("Enter AWS Secret Access Key: ")
    
    return AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY

def upload_directory_to_s3():
    """Upload all files from media directory to S3"""
    # Check AWS credentials
    if not get_aws_credentials():
        logger.error("Failed to get AWS credentials")
        return False
    
    logger.info(f"Using AWS region: {AWS_S3_REGION_NAME}")
    logger.info(f"Using S3 bucket: {AWS_STORAGE_BUCKET_NAME}")
    
    # Find the media directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    media_path = os.path.join(script_dir, MEDIA_DIR)
    
    # Check if media directory exists at script level
    if not os.path.exists(media_path):
        # Try at project level
        media_path = os.path.join(project_dir, MEDIA_DIR)
        if not os.path.exists(media_path):
            logger.error(f"Media directory not found at {media_path}")
            return False
    
    logger.info(f"Found media directory at {media_path}")
    
    # Create S3 client
    try:
        import boto3
        s3 = boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_S3_REGION_NAME
        )
        
        # Test connection
        s3.list_buckets()
        logger.info("Connected to S3 successfully")
    except Exception as e:
        logger.error(f"Failed to connect to S3: {str(e)}")
        return False
    
    # Scan for files
    media_root = Path(media_path)
    media_files = []
    
    for path in media_root.rglob('*'):
        if path.is_file() and not path.name.startswith('.'):
            media_files.append(path)
    
    logger.info(f"Found {len(media_files)} files to upload")
    
    # Upload files
    uploaded = 0
    errors = 0
    
    for file_path in media_files:
        rel_path = file_path.relative_to(media_root)
        s3_key = f"media/{rel_path}"
        
        try:
            logger.info(f"Uploading {rel_path} to S3:{s3_key}")
            
            # Determine content type
            content_type = 'application/octet-stream'
            if file_path.suffix.lower() in ['.jpg', '.jpeg']:
                content_type = 'image/jpeg'
            elif file_path.suffix.lower() == '.png':
                content_type = 'image/png'
            elif file_path.suffix.lower() == '.gif':
                content_type = 'image/gif'
            
            # Upload to S3
            with open(file_path, 'rb') as f:
                s3.upload_fileobj(
                    f,
                    AWS_STORAGE_BUCKET_NAME,
                    s3_key,
                    ExtraArgs={
                        'ContentType': content_type,
                        'ACL': 'public-read'
                    }
                )
            
            uploaded += 1
            
        except Exception as e:
            logger.error(f"Error uploading {rel_path}: {str(e)}")
            errors += 1
    
    logger.info(f"Upload complete: {uploaded} files uploaded, {errors} errors")
    
    if uploaded > 0:
        logger.info("\n=== NEXT STEPS ===")
        logger.info("1. To update database references, run the Django shell command:")
        logger.info("   python manage.py shell")
        logger.info("2. In the shell, run these commands to update database references:")
        logger.info("   from base.models import MyUser, Post, Game, RankTier, Message")
        logger.info("   for user in MyUser.objects.all():")
        logger.info("       if user.avatar and not user.avatar.name.startswith('media/'):")
        logger.info("           user.avatar.name = f'media/profile_pics/{os.path.basename(user.avatar.name)}'")
        logger.info("           user.save()")
        
        logger.info("\n3. To fix incorrect URLs in database, run SQL commands:")
        logger.info("   UPDATE your_table SET your_field = REPLACE(your_field, 'eu-north-1b', 'eu-north-1')")
        logger.info("   WHERE your_field LIKE '%eu-north-1b%';")
    
    return uploaded > 0

if __name__ == "__main__":
    logger.info("=== Direct S3 Upload Tool ===")
    
    install_dependencies()
    
    if upload_directory_to_s3():
        logger.info("Upload completed successfully!")
    else:
        logger.error("Upload failed.")
        sys.exit(1) 