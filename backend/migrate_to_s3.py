import os
from django.core.files.storage import default_storage
from django.conf import settings
import django
from dotenv import load_dotenv # Import load_dotenv

# Load environment variables from .env file BEFORE setting up Django
dotenv_path = os.path.join(os.path.dirname(__file__), '.env') # Assumes .env is in the same directory
if os.path.exists(dotenv_path):
    print("Loading environment variables from .env file...")
    load_dotenv(dotenv_path)
    # --- Add Debug Print Statements --- 
    print(f"DEBUG: AWS_ACCESS_KEY_ID from os.environ = {os.environ.get('AWS_ACCESS_KEY_ID')}")
    print(f"DEBUG: AWS_STORAGE_BUCKET_NAME from os.environ = {os.environ.get('AWS_STORAGE_BUCKET_NAME')}")
    # --- End Debug Print Statements ---
else:
    print("Warning: .env file not found. Script might not have AWS credentials.")


# Initialize Django (Now uses env vars loaded by dotenv)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

def migrate_files_to_s3():
    """
    Migrate all files from local MEDIA_ROOT to S3 bucket
    Preserves directory structure
    """
    # Check if MEDIA_ROOT is defined and is a local path (needed for local migration)
    if not settings.MEDIA_ROOT or not os.path.isdir(settings.MEDIA_ROOT):
         # Attempt to get the local media root if S3 settings are active
         local_media_root = os.path.join(settings.BASE_DIR, 'media')
         if not os.path.isdir(local_media_root):
              print(f"Error: Local media directory not found at {settings.MEDIA_ROOT} or {local_media_root}")
              print("Ensure the 'media' directory exists in Q-up/backend/ and contains your files.")
              return
         media_root = local_media_root
         print(f"Using local media path: {media_root}")
    else:
         media_root = settings.MEDIA_ROOT
         print(f"Using configured MEDIA_ROOT: {media_root}")


    count = 0
    
    print(f"Starting migration of files from {media_root} to S3 bucket '{settings.AWS_STORAGE_BUCKET_NAME}'...")
    
    # Check if default_storage is configured for S3
    if not hasattr(settings, 'DEFAULT_FILE_STORAGE') or 's3boto3' not in settings.DEFAULT_FILE_STORAGE.lower():
        print("Error: DEFAULT_FILE_STORAGE is not configured for S3 in settings.py.")
        print("Make sure AWS environment variables are set correctly and settings.py configures S3.")
        return

    for root, dirs, files in os.walk(media_root):
        for file in files:
            local_path = os.path.join(root, file)
            # Get path relative to MEDIA_ROOT for S3 key
            relative_path = os.path.relpath(local_path, media_root)
            # Ensure forward slashes for S3 keys, especially on Windows
            s3_key = relative_path.replace('\\\\', '/') 
            
            print(f"Migrating: {relative_path} to S3 key: {s3_key}")
            
            try:
                # Open file and save to S3 via default storage
                with open(local_path, 'rb') as f:
                    default_storage.save(s3_key, f)
                count += 1
                print(f"✓ Migrated {s3_key} to S3")
            except Exception as e:
                print(f"✗ Error migrating {s3_key}: {str(e)}")
    
    print(f"Migration complete. {count} files migrated to S3.")

if __name__ == "__main__":
    migrate_files_to_s3() 