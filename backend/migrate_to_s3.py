import os
from django.core.files.storage import default_storage
from django.conf import settings
import django

# Initialize Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

def migrate_files_to_s3():
    """
    Migrate all files from local MEDIA_ROOT to S3 bucket
    Preserves directory structure
    """
    media_root = settings.MEDIA_ROOT
    count = 0
    
    print(f"Starting migration of files from {media_root} to S3...")
    
    for root, dirs, files in os.walk(media_root):
        for file in files:
            local_path = os.path.join(root, file)
            # Get path relative to MEDIA_ROOT
            relative_path = os.path.relpath(local_path, media_root)
            
            print(f"Migrating: {relative_path}")
            
            try:
                # Open file and save to S3 via default storage
                with open(local_path, 'rb') as f:
                    default_storage.save(relative_path, f)
                count += 1
                print(f"✓ Migrated {relative_path} to S3")
            except Exception as e:
                print(f"✗ Error migrating {relative_path}: {str(e)}")
    
    print(f"Migration complete. {count} files migrated to S3.")

if __name__ == "__main__":
    migrate_files_to_s3() 