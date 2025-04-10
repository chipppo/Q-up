import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection
import json

def fix_s3_urls_in_db():
    print("Starting comprehensive S3 URL fix...")
    
    # Direct database fix for SQLite
    with connection.cursor() as cursor:
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'django_%';")
        tables = cursor.fetchall()
        
        total_fixed = 0
        
        for table in tables:
            table_name = table[0]
            print(f"Processing table: {table_name}")
            
            # Get all columns for this table
            cursor.execute(f"PRAGMA table_info({table_name});")
            columns = cursor.fetchall()
            
            for col in columns:
                col_name = col[1]
                col_type = col[2].lower()
                
                # Skip the JSON field check for columns with reserved names
                if col_name in ['order', 'group', 'default', 'where', 'from', 'index', 'table']:
                    print(f"  Skipping reserved column name: {col_name}")
                    continue
                
                # Only look at text/char columns that might contain URLs
                if 'text' in col_type or 'char' in col_type or 'varchar' in col_type:
                    print(f"  Checking column: {col_name}")
                    
                    # Find records with the wrong URL
                    cursor.execute(f"SELECT id, \"{col_name}\" FROM \"{table_name}\" WHERE \"{col_name}\" LIKE '%eu-north-1b%';")
                    rows = cursor.fetchall()
                    
                    row_count = len(rows)
                    if row_count > 0:
                        print(f"    Found {row_count} records with bad URLs")
                        
                        for row in rows:
                            row_id = row[0]
                            old_value = row[1]
                            
                            if old_value and 'eu-north-1b' in old_value:
                                # Fix the URL
                                new_value = old_value.replace('eu-north-1b', 'eu-north-1')
                                
                                # Update the record
                                cursor.execute(f"UPDATE \"{table_name}\" SET \"{col_name}\" = ? WHERE id = ?;", 
                                             [new_value, row_id])
                                total_fixed += 1
                                print(f"    Fixed URL in {table_name}.{col_name} for id={row_id}")
    
    print(f"Fixed a total of {total_fixed} URLs in the database")

    # Direct check of model fields that are known to contain image URLs
    from base.models import MyUser, Post, Game, RankTier, Message
    
    # Check user avatars
    for user in MyUser.objects.filter(avatar__isnull=False):
        if user.avatar and hasattr(user.avatar, 'name') and 'eu-north-1b' in user.avatar.name:
            old_name = user.avatar.name
            new_name = old_name.replace('eu-north-1b', 'eu-north-1')
            user.avatar.name = new_name
            user.save(update_fields=['avatar'])
            print(f"Fixed user avatar URL for user {user.username}")
            total_fixed += 1
    
    # Check post images
    for post in Post.objects.filter(image__isnull=False):
        if post.image and hasattr(post.image, 'name') and 'eu-north-1b' in post.image.name:
            old_name = post.image.name
            new_name = old_name.replace('eu-north-1b', 'eu-north-1')
            post.image.name = new_name
            post.save(update_fields=['image'])
            print(f"Fixed post image URL for post {post.id}")
            total_fixed += 1
    
    # Check game logos
    for game in Game.objects.filter(logo__isnull=False):
        if game.logo and hasattr(game.logo, 'name') and 'eu-north-1b' in game.logo.name:
            old_name = game.logo.name
            new_name = old_name.replace('eu-north-1b', 'eu-north-1')
            game.logo.name = new_name
            game.save(update_fields=['logo'])
            print(f"Fixed game logo URL for game {game.name}")
            total_fixed += 1
    
    # Check rank tier icons
    for rank in RankTier.objects.filter(icon__isnull=False):
        if rank.icon and hasattr(rank.icon, 'name') and 'eu-north-1b' in rank.icon.name:
            old_name = rank.icon.name
            new_name = old_name.replace('eu-north-1b', 'eu-north-1')
            rank.icon.name = new_name
            rank.save(update_fields=['icon'])
            print(f"Fixed rank icon URL for rank {rank.name}")
            total_fixed += 1
    
    # Check message images
    for message in Message.objects.filter(image__isnull=False):
        if message.image and hasattr(message.image, 'name') and 'eu-north-1b' in message.image.name:
            old_name = message.image.name
            new_name = old_name.replace('eu-north-1b', 'eu-north-1')
            message.image.name = new_name
            message.save(update_fields=['image'])
            print(f"Fixed message image URL for message {message.id}")
            total_fixed += 1
    
    print(f"Total URLs fixed: {total_fixed}")
    print("URL fix operation completed!")

if __name__ == "__main__":
    fix_s3_urls_in_db()

