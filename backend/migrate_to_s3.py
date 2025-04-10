import os
import django
import sys
import boto3
import logging
from pathlib import Path
from botocore.exceptions import ClientError

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.core.files import File
from base.models import MyUser, Post, Game, RankTier, Message

def get_s3_client():
    """Create and return an S3 client using settings"""
    return boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME
    )

def migrate_user_avatars():
    """Migrate user avatar images from local storage to S3"""
    logger.info("Migrating user avatars...")
    count = 0
    
    for user in MyUser.objects.all():
        if user.avatar and not user.avatar.name.startswith('http'):
            # Check if it's a local file (not already on S3)
            local_path = os.path.join(settings.MEDIA_ROOT, str(user.avatar))
            if os.path.exists(local_path):
                try:
                    # Prepare S3 path
                    filename = os.path.basename(local_path)
                    s3_path = f"media/profile_pics/{filename}"
                    
                    logger.info(f"Migrating avatar for user {user.username}: {local_path} -> S3:{s3_path}")
                    
                    # Upload to S3
                    with open(local_path, 'rb') as file:
                        content_type = 'image/jpeg'
                        if filename.lower().endswith('.png'):
                            content_type = 'image/png'
                        elif filename.lower().endswith('.gif'):
                            content_type = 'image/gif'
                        
                        s3 = get_s3_client()
                        s3.upload_fileobj(
                            file,
                            settings.AWS_STORAGE_BUCKET_NAME,
                            s3_path,
                            ExtraArgs={'ContentType': content_type}
                        )
                    
                    # Update the model to point to S3
                    user.avatar = s3_path
                    user.save(update_fields=['avatar'])
                    count += 1
                    
                except Exception as e:
                    logger.error(f"Error migrating avatar for user {user.username}: {str(e)}")
    
    logger.info(f"Migrated {count} user avatars")
    return count

def migrate_post_images():
    """Migrate post images from local storage to S3"""
    logger.info("Migrating post images...")
    count = 0
    
    for post in Post.objects.all():
        if post.image and not post.image.name.startswith('http'):
            # Check if it's a local file
            local_path = os.path.join(settings.MEDIA_ROOT, str(post.image))
            if os.path.exists(local_path):
                try:
                    # Prepare S3 path
                    filename = os.path.basename(local_path)
                    s3_path = f"media/post_images/{filename}"
                    
                    logger.info(f"Migrating image for post {post.id}: {local_path} -> S3:{s3_path}")
                    
                    # Upload to S3
                    with open(local_path, 'rb') as file:
                        content_type = 'image/jpeg'
                        if filename.lower().endswith('.png'):
                            content_type = 'image/png'
                        elif filename.lower().endswith('.gif'):
                            content_type = 'image/gif'
                        
                        s3 = get_s3_client()
                        s3.upload_fileobj(
                            file,
                            settings.AWS_STORAGE_BUCKET_NAME,
                            s3_path,
                            ExtraArgs={'ContentType': content_type}
                        )
                    
                    # Update the model to point to S3
                    post.image = s3_path
                    post.save(update_fields=['image'])
                    count += 1
                    
                except Exception as e:
                    logger.error(f"Error migrating image for post {post.id}: {str(e)}")
    
    logger.info(f"Migrated {count} post images")
    return count

def migrate_game_logos():
    """Migrate game logo images from local storage to S3"""
    logger.info("Migrating game logos...")
    count = 0
    
    for game in Game.objects.all():
        if game.logo and not game.logo.name.startswith('http'):
            # Check if it's a local file
            local_path = os.path.join(settings.MEDIA_ROOT, str(game.logo))
            if os.path.exists(local_path):
                try:
                    # Prepare S3 path
                    filename = os.path.basename(local_path)
                    s3_path = f"media/game_logos/{filename}"
                    
                    logger.info(f"Migrating logo for game {game.name}: {local_path} -> S3:{s3_path}")
                    
                    # Upload to S3
                    with open(local_path, 'rb') as file:
                        content_type = 'image/jpeg'
                        if filename.lower().endswith('.png'):
                            content_type = 'image/png'
                        elif filename.lower().endswith('.gif'):
                            content_type = 'image/gif'
                        
                        s3 = get_s3_client()
                        s3.upload_fileobj(
                            file,
                            settings.AWS_STORAGE_BUCKET_NAME,
                            s3_path,
                            ExtraArgs={'ContentType': content_type}
                        )
                    
                    # Update the model to point to S3
                    game.logo = s3_path
                    game.save(update_fields=['logo'])
                    count += 1
                    
                except Exception as e:
                    logger.error(f"Error migrating logo for game {game.name}: {str(e)}")
    
    logger.info(f"Migrated {count} game logos")
    return count

def migrate_rank_icons():
    """Migrate rank tier icon images from local storage to S3"""
    logger.info("Migrating rank tier icons...")
    count = 0
    
    for rank in RankTier.objects.all():
        if rank.icon and not rank.icon.name.startswith('http'):
            # Check if it's a local file
            local_path = os.path.join(settings.MEDIA_ROOT, str(rank.icon))
            if os.path.exists(local_path):
                try:
                    # Prepare S3 path
                    filename = os.path.basename(local_path)
                    s3_path = f"media/rank_icons/{filename}"
                    
                    logger.info(f"Migrating icon for rank {rank.name}: {local_path} -> S3:{s3_path}")
                    
                    # Upload to S3
                    with open(local_path, 'rb') as file:
                        content_type = 'image/jpeg'
                        if filename.lower().endswith('.png'):
                            content_type = 'image/png'
                        elif filename.lower().endswith('.gif'):
                            content_type = 'image/gif'
                        
                        s3 = get_s3_client()
                        s3.upload_fileobj(
                            file,
                            settings.AWS_STORAGE_BUCKET_NAME,
                            s3_path,
                            ExtraArgs={'ContentType': content_type}
                        )
                    
                    # Update the model to point to S3
                    rank.icon = s3_path
                    rank.save(update_fields=['icon'])
                    count += 1
                    
                except Exception as e:
                    logger.error(f"Error migrating icon for rank {rank.name}: {str(e)}")
    
    logger.info(f"Migrated {count} rank icons")
    return count

def migrate_message_images():
    """Migrate message attachment images from local storage to S3"""
    logger.info("Migrating message images...")
    count = 0
    
    for message in Message.objects.all():
        if message.image and not message.image.name.startswith('http'):
            # Check if it's a local file
            local_path = os.path.join(settings.MEDIA_ROOT, str(message.image))
            if os.path.exists(local_path):
                try:
                    # Prepare S3 path
                    filename = os.path.basename(local_path)
                    s3_path = f"media/message_images/{filename}"
                    
                    logger.info(f"Migrating image for message {message.id}: {local_path} -> S3:{s3_path}")
                    
                    # Upload to S3
                    with open(local_path, 'rb') as file:
                        content_type = 'image/jpeg'
                        if filename.lower().endswith('.png'):
                            content_type = 'image/png'
                        elif filename.lower().endswith('.gif'):
                            content_type = 'image/gif'
                        
                        s3 = get_s3_client()
                        s3.upload_fileobj(
                            file,
                            settings.AWS_STORAGE_BUCKET_NAME,
                            s3_path,
                            ExtraArgs={'ContentType': content_type}
                        )
                    
                    # Update the model to point to S3
                    message.image = s3_path
                    message.save(update_fields=['image'])
                    count += 1
                    
                except Exception as e:
                    logger.error(f"Error migrating image for message {message.id}: {str(e)}")
    
    logger.info(f"Migrated {count} message images")
    return count

def migrate_all_media():
    """Migrate all local media files to S3"""
    logger.info("Starting migration of local media to S3...")
    logger.info(f"AWS region in settings: {settings.AWS_S3_REGION_NAME}")
    logger.info(f"S3 bucket: {settings.AWS_STORAGE_BUCKET_NAME}")
    logger.info(f"Local media root: {settings.MEDIA_ROOT}")
    
    # Check if S3 credentials are available
    if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
        logger.error("AWS credentials not found in settings")
        return
    
    # Test S3 connection
    try:
        s3 = get_s3_client()
        s3.list_buckets()
        logger.info("S3 connection successful")
    except Exception as e:
        logger.error(f"S3 connection failed: {str(e)}")
        return
    
    # Migrate all media types
    avatar_count = migrate_user_avatars()
    post_count = migrate_post_images()
    game_count = migrate_game_logos()
    rank_count = migrate_rank_icons()
    message_count = migrate_message_images()
    
    total = avatar_count + post_count + game_count + rank_count + message_count
    logger.info(f"Migration completed. Total files migrated: {total}")
    logger.info(f"- User avatars: {avatar_count}")
    logger.info(f"- Post images: {post_count}")
    logger.info(f"- Game logos: {game_count}")
    logger.info(f"- Rank icons: {rank_count}")
    logger.info(f"- Message images: {message_count}")

if __name__ == "__main__":
    migrate_all_media() 