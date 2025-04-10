#!/usr/bin/env python3
import subprocess
import sys
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def setup():
    """Install required packages and set up environment"""
    logger.info("Setting up environment...")
    
    # Make sure pip is available
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "--version"])
    except:
        logger.error("pip is not available. Please install pip first.")
        return False
    
    # Install required packages
    packages = ['boto3', 'django', 'pillow', 'python-dotenv', 'djangorestframework']
    logger.info(f"Installing packages: {', '.join(packages)}")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--user"] + packages)
    except Exception as e:
        logger.error(f"Failed to install packages: {str(e)}")
        return False
    
    # Add user local bin to PATH
    local_bin = os.path.expanduser("~/.local/bin")
    if local_bin not in os.environ.get("PATH", ""):
        os.environ["PATH"] = f"{local_bin}:{os.environ.get('PATH', '')}"
    
    # Add user local site-packages to PYTHONPATH and sys.path directly
    python_version = f"python{sys.version_info.major}.{sys.version_info.minor}"
    site_packages = os.path.expanduser(f"~/.local/lib/{python_version}/site-packages")
    if site_packages not in sys.path:
        sys.path.insert(0, site_packages)
    
    if "PYTHONPATH" not in os.environ:
        os.environ["PYTHONPATH"] = site_packages
    elif site_packages not in os.environ["PYTHONPATH"]:
        os.environ["PYTHONPATH"] = f"{site_packages}:{os.environ['PYTHONPATH']}"
    
    # Add current directory to PYTHONPATH
    current_dir = os.path.dirname(os.path.abspath(__file__))
    if current_dir not in sys.path:
        sys.path.insert(0, current_dir)
    parent_dir = os.path.dirname(current_dir)
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)
    
    logger.info("Environment set up successfully")
    return True

def upload_to_s3():
    """Upload media files to S3"""
    logger.info("Starting S3 upload...")
    
    # Set up Django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    
    # Set specific bucket if needed
    os.environ['AWS_STORAGE_BUCKET_NAME'] = 'qup-media-files-0'
    
    try:
        import django
        django.setup()
        
        from django.conf import settings
        import boto3
        from pathlib import Path
        from django.core.files.storage import default_storage
        
        # Import models
        try:
            from base.models import MyUser, Post, Game, RankTier, Message
        except ImportError as e:
            logger.error(f"Error importing models: {str(e)}")
            logger.info("Continuing without database updates, only uploading files")
            update_db = False
        else:
            update_db = True
        
        # Create S3 client
        s3 = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        
        # Log AWS settings
        logger.info(f"AWS region: {settings.AWS_S3_REGION_NAME}")
        logger.info(f"S3 bucket: {settings.AWS_STORAGE_BUCKET_NAME}")
        logger.info(f"Media root: {settings.MEDIA_ROOT}")
        
        # Test S3 connection
        try:
            response = s3.list_buckets()
            buckets = [b['Name'] for b in response['Buckets']]
            logger.info(f"Connected to S3. Available buckets: {buckets}")
            if settings.AWS_STORAGE_BUCKET_NAME not in buckets:
                logger.warning(f"Target bucket '{settings.AWS_STORAGE_BUCKET_NAME}' not found!")
                logger.info("Please check your AWS credentials and bucket name")
                return False
        except Exception as e:
            logger.error(f"Failed to connect to S3: {str(e)}")
            return False
            
        # Scan for local media files
        media_root = Path(settings.MEDIA_ROOT)
        if not media_root.exists():
            logger.error(f"Media root directory not found: {media_root}")
            return False
            
        logger.info(f"Scanning {media_root} for media files...")
        media_files = []
        for path in media_root.rglob('*'):
            if path.is_file() and not path.name.startswith('.'):
                media_files.append(path)
        
        logger.info(f"Found {len(media_files)} files")
        
        # Upload files to S3
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
                        settings.AWS_STORAGE_BUCKET_NAME,
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
        
        # Skip database updates if we couldn't import models
        if not update_db:
            logger.info("Skipping database updates due to model import errors")
            return True
        
        # Check for image fields in database and update them
        logger.info("Updating database references...")
        
        db_updates = 0
        
        # Update user avatars
        for user in MyUser.objects.exclude(avatar='').exclude(avatar__isnull=True):
            if hasattr(user.avatar, 'name') and not user.avatar.name.startswith('media/'):
                old_path = user.avatar.name
                new_path = f"media/profile_pics/{os.path.basename(old_path)}"
                user.avatar.name = new_path
                user.save(update_fields=['avatar'])
                db_updates += 1
                logger.info(f"Updated user avatar: {old_path} -> {new_path}")
        
        # Update post images
        for post in Post.objects.exclude(image='').exclude(image__isnull=True):
            if hasattr(post.image, 'name') and not post.image.name.startswith('media/'):
                old_path = post.image.name
                new_path = f"media/post_images/{os.path.basename(old_path)}"
                post.image.name = new_path
                post.save(update_fields=['image'])
                db_updates += 1
                logger.info(f"Updated post image: {old_path} -> {new_path}")
        
        # Update game logos
        for game in Game.objects.exclude(logo='').exclude(logo__isnull=True):
            if hasattr(game.logo, 'name') and not game.logo.name.startswith('media/'):
                old_path = game.logo.name
                new_path = f"media/game_logos/{os.path.basename(old_path)}"
                game.logo.name = new_path
                game.save(update_fields=['logo'])
                db_updates += 1
                logger.info(f"Updated game logo: {old_path} -> {new_path}")
        
        # Update rank icons
        for rank in RankTier.objects.exclude(icon='').exclude(icon__isnull=True):
            if hasattr(rank.icon, 'name') and not rank.icon.name.startswith('media/'):
                old_path = rank.icon.name
                new_path = f"media/rank_icons/{os.path.basename(old_path)}"
                rank.icon.name = new_path
                rank.save(update_fields=['icon'])
                db_updates += 1
                logger.info(f"Updated rank icon: {old_path} -> {new_path}")
        
        # Update message images
        for message in Message.objects.exclude(image='').exclude(image__isnull=True):
            if hasattr(message.image, 'name') and not message.image.name.startswith('media/'):
                old_path = message.image.name
                new_path = f"media/message_images/{os.path.basename(old_path)}"
                message.image.name = new_path
                message.save(update_fields=['image'])
                db_updates += 1
                logger.info(f"Updated message image: {old_path} -> {new_path}")
        
        logger.info(f"Database update complete: {db_updates} references updated")
        
        logger.info("\nFIX WRONG URLS")
        logger.info("To fix 'eu-north-1b' URLs in the database, run:")
        logger.info("UPDATE your_table SET your_field = REPLACE(your_field, 'eu-north-1b', 'eu-north-1') WHERE your_field LIKE '%eu-north-1b%';")
        
        return True
        
    except ImportError as e:
        logger.error(f"Import error: {str(e)}")
        logger.error("Make sure Django and other packages are correctly installed.")
        return False
    except Exception as e:
        logger.error(f"Error during upload: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    logger.info("=== Simple S3 Upload Tool ===")
    
    if not setup():
        logger.error("Setup failed. Exiting.")
        sys.exit(1)
    
    if not upload_to_s3():
        logger.error("Upload failed. Exiting.")
        sys.exit(1)
    
    logger.info("Upload completed successfully!") 