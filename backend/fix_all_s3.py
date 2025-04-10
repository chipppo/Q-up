import os
import django
import sys
import json
import boto3
import logging
import argparse
from botocore.exceptions import ClientError

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.conf import settings
from django.db import connection
from base.models import MyUser, Post, Game, RankTier, Message, Chat

def get_s3_client():
    """Create and return an S3 client using settings"""
    return boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME
    )

def fix_s3_objects():
    """Fix object keys in S3 bucket that contain incorrect region"""
    logger.info("Starting S3 object key fix...")
    
    if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
        logger.error("AWS credentials not found in settings")
        return
    
    try:
        s3 = get_s3_client()
        bucket = settings.AWS_STORAGE_BUCKET_NAME
        
        # List all objects in the bucket
        paginator = s3.get_paginator('list_objects_v2')
        page_iterator = paginator.paginate(Bucket=bucket)
        
        fixed_count = 0
        
        for page in page_iterator:
            if 'Contents' not in page:
                continue
            
            for obj in page['Contents']:
                key = obj['Key']
                
                # Look for the incorrect region format in the key
                if 'eu-north-1b' in key:
                    # Create the corrected key
                    new_key = key.replace('eu-north-1b', 'eu-north-1')
                    
                    logger.info(f"Fixing S3 object: {key} -> {new_key}")
                    
                    # Copy the object with the corrected key
                    s3.copy_object(
                        CopySource={'Bucket': bucket, 'Key': key},
                        Bucket=bucket,
                        Key=new_key
                    )
                    
                    # Delete the original object with incorrect key
                    s3.delete_object(Bucket=bucket, Key=key)
                    
                    fixed_count += 1
        
        logger.info(f"Fixed {fixed_count} S3 object keys")
    
    except Exception as e:
        logger.error(f"Error fixing S3 objects: {str(e)}")

def fix_database_urls():
    """Fix URLs in all text fields across the database"""
    logger.info("Starting database URL fix...")
    
    total_fixed = 0
    
    try:
        # Direct database fix for all tables
        with connection.cursor() as cursor:
            # Get all tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'django_%';")
            tables = cursor.fetchall()
            
            for table in tables:
                table_name = table[0]
                logger.info(f"Processing table: {table_name}")
                
                # Get all columns for this table
                cursor.execute(f"PRAGMA table_info({table_name});")
                columns = cursor.fetchall()
                
                for col in columns:
                    col_name = col[1]
                    col_type = col[2].lower()
                    
                    # Skip reserved column names
                    if col_name in ['order', 'group', 'default', 'where', 'from', 'index', 'table']:
                        logger.info(f"  Skipping reserved column name: {col_name}")
                        continue
                    
                    # Only process text-type columns
                    if 'text' in col_type or 'char' in col_type or 'varchar' in col_type or 'json' in col_type:
                        logger.info(f"  Checking column: {col_name}")
                        
                        # Find records with the incorrect URL pattern
                        cursor.execute(f"SELECT id, \"{col_name}\" FROM \"{table_name}\" WHERE \"{col_name}\" LIKE '%eu-north-1b%';")
                        rows = cursor.fetchall()
                        
                        row_count = len(rows)
                        if row_count > 0:
                            logger.info(f"    Found {row_count} records with incorrect URLs")
                            
                            for row in rows:
                                row_id = row[0]
                                old_value = row[1]
                                
                                if old_value and 'eu-north-1b' in old_value:
                                    # Fix the URL
                                    new_value = old_value.replace('eu-north-1b', 'eu-north-1')
                                    
                                    # Handle JSON fields specially
                                    if col_type == 'json' and old_value.startswith('{'):
                                        try:
                                            json_data = json.loads(old_value)
                                            json_str = json.dumps(json_data)
                                            if 'eu-north-1b' in json_str:
                                                new_value = json_str.replace('eu-north-1b', 'eu-north-1')
                                        except json.JSONDecodeError:
                                            # Not valid JSON, treat as regular text
                                            pass
                                    
                                    # Update the record
                                    cursor.execute(f"UPDATE \"{table_name}\" SET \"{col_name}\" = ? WHERE id = ?;", 
                                                 [new_value, row_id])
                                    total_fixed += 1
                                    logger.info(f"    Fixed URL in {table_name}.{col_name} for id={row_id}")
        
        logger.info(f"Fixed a total of {total_fixed} URLs in the database")
    
    except Exception as e:
        logger.error(f"Error fixing database URLs: {str(e)}")

def fix_model_fields():
    """Fix file fields in Django models"""
    logger.info("Starting model field fix...")
    total_fixed = 0
    
    # Fix MyUser avatars
    for user in MyUser.objects.all():
        if user.avatar and hasattr(user.avatar, 'name') and 'eu-north-1b' in user.avatar.name:
            old_name = user.avatar.name
            new_name = old_name.replace('eu-north-1b', 'eu-north-1')
            user.avatar.name = new_name
            user.save(update_fields=['avatar'])
            logger.info(f"Fixed user avatar URL for user {user.username}")
            total_fixed += 1
    
    # Fix Post images
    for post in Post.objects.all():
        if post.image and hasattr(post.image, 'name') and 'eu-north-1b' in post.image.name:
            old_name = post.image.name
            new_name = old_name.replace('eu-north-1b', 'eu-north-1')
            post.image.name = new_name
            post.save(update_fields=['image'])
            logger.info(f"Fixed post image URL for post {post.id}")
            total_fixed += 1
    
    # Fix Game logos
    for game in Game.objects.all():
        if game.logo and hasattr(game.logo, 'name') and 'eu-north-1b' in game.logo.name:
            old_name = game.logo.name
            new_name = old_name.replace('eu-north-1b', 'eu-north-1')
            game.logo.name = new_name
            game.save(update_fields=['logo'])
            logger.info(f"Fixed game logo URL for game {game.name}")
            total_fixed += 1
    
    # Fix RankTier icons
    for rank in RankTier.objects.all():
        if rank.icon and hasattr(rank.icon, 'name') and 'eu-north-1b' in rank.icon.name:
            old_name = rank.icon.name
            new_name = old_name.replace('eu-north-1b', 'eu-north-1')
            rank.icon.name = new_name
            rank.save(update_fields=['icon'])
            logger.info(f"Fixed rank icon URL for rank {rank.name}")
            total_fixed += 1
    
    # Fix Message images
    for message in Message.objects.all():
        if message.image and hasattr(message.image, 'name') and 'eu-north-1b' in message.image.name:
            old_name = message.image.name
            new_name = old_name.replace('eu-north-1b', 'eu-north-1')
            message.image.name = new_name
            message.save(update_fields=['image'])
            logger.info(f"Fixed message image URL for message {message.id}")
            total_fixed += 1
    
    logger.info(f"Fixed a total of {total_fixed} model fields")

def fix_cached_frontend_files():
    """Function to suggest how to fix cached frontend files"""
    logger.info("\nFrontend Cache Fix Instructions:")
    logger.info("1. Clear browser cache for all users")
    logger.info("2. Add a version parameter to your frontend build")
    logger.info("3. If you have CDN caching, invalidate the cache for the affected files")
    logger.info("4. Ensure the frontend formatImageUrl function handles both formats or redirects")
    logger.info("5. Consider adding a redirect rule for old URLs to new URLs")

def main():
    parser = argparse.ArgumentParser(description='Fix S3 URLs in the Q-up application')
    parser.add_argument('--all', action='store_true', help='Run all fix operations')
    parser.add_argument('--database', action='store_true', help='Fix URLs in database')
    parser.add_argument('--models', action='store_true', help='Fix URLs in model fields')
    parser.add_argument('--s3', action='store_true', help='Fix S3 object keys')
    
    args = parser.parse_args()
    
    # Default to all if no specific options provided
    run_all = args.all or not (args.database or args.models or args.s3)
    
    logger.info("=== Q-up S3 URL Fix Tool ===")
    logger.info(f"AWS region in settings: {settings.AWS_S3_REGION_NAME}")
    
    if run_all or args.database:
        fix_database_urls()
    
    if run_all or args.models:
        fix_model_fields()
    
    if run_all or args.s3:
        fix_s3_objects()
    
    fix_cached_frontend_files()
    
    logger.info("URL fix operation completed!")

if __name__ == "__main__":
    main() 