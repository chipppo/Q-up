import os
import boto3
from dotenv import load_dotenv
from pathlib import Path
import mimetypes

print("S3 Direct Media Migration Tool")
print("=============================")

# Load environment variables from .env file
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(dotenv_path):
    print("Loading environment variables from .env file...")
    load_dotenv(dotenv_path)
else:
    print("Warning: .env file not found!")

# Get AWS credentials and S3 details from environment variables
aws_access_key = os.environ.get('AWS_ACCESS_KEY_ID')
aws_secret_key = os.environ.get('AWS_SECRET_ACCESS_KEY')
bucket_name = os.environ.get('AWS_STORAGE_BUCKET_NAME')
region_name = os.environ.get('AWS_S3_REGION_NAME')

# Display loaded settings (mask secret key)
print(f"AWS Access Key ID: {aws_access_key[:4]}...{aws_access_key[-4:] if aws_access_key else ''}")
print(f"Bucket Name: {bucket_name}")
print(f"Region: {region_name}")

if not (aws_access_key and aws_secret_key and bucket_name and region_name):
    print("Error: Missing required AWS credentials or S3 details in environment variables!")
    print("Please check your .env file and ensure all required variables are set:")
    print("  - AWS_ACCESS_KEY_ID")
    print("  - AWS_SECRET_ACCESS_KEY")
    print("  - AWS_STORAGE_BUCKET_NAME")
    print("  - AWS_S3_REGION_NAME")
    exit(1)

# Create S3 client
print("Creating S3 client...")
s3_client = boto3.client(
    's3',
    aws_access_key_id=aws_access_key,
    aws_secret_access_key=aws_secret_key,
    region_name=region_name
)

# Define paths
BASE_DIR = Path(__file__).resolve().parent
MEDIA_DIR = os.path.join(BASE_DIR, 'media')

# Check if media directory exists
if not os.path.exists(MEDIA_DIR):
    print(f"Error: Media directory not found at {MEDIA_DIR}")
    print("Please ensure the 'media' directory exists in the Q-up/backend folder.")
    exit(1)

print(f"Found media directory at {MEDIA_DIR}")

# Function to get correct content type for file
def get_content_type(file_path):
    content_type, _ = mimetypes.guess_type(file_path)
    if content_type is None:
        # Default to binary if we can't detect the type
        return 'application/octet-stream'
    return content_type

# Migrate files
def migrate_files_to_s3():
    count = 0
    error_count = 0
    
    print(f"Starting migration of files from {MEDIA_DIR} to S3 bucket '{bucket_name}'...")
    
    for root, dirs, files in os.walk(MEDIA_DIR):
        for file in files:
            local_path = os.path.join(root, file)
            # Get path relative to MEDIA_DIR for S3 key
            relative_path = os.path.relpath(local_path, MEDIA_DIR)
            # Ensure forward slashes for S3 keys, especially on Windows
            s3_key = f"media/{relative_path.replace(os.path.sep, '/')}"
            
            print(f"Migrating: {relative_path} to S3 key: {s3_key}")
            
            try:
                # Get content type
                content_type = get_content_type(local_path)
                
                # Upload file to S3
                with open(local_path, 'rb') as f:
                    s3_client.upload_fileobj(
                        f, 
                        bucket_name, 
                        s3_key,
                        ExtraArgs={
                            'ContentType': content_type,
                        }
                    )
                count += 1
                print(f"✓ Migrated {s3_key} to S3")
            except Exception as e:
                error_count += 1
                print(f"✗ Error migrating {s3_key}: {str(e)}")
    
    print(f"Migration complete. {count} files migrated to S3. {error_count} errors.")

if __name__ == "__main__":
    # Test connection to S3
    try:
        print("Testing connection to S3...")
        s3_client.head_bucket(Bucket=bucket_name)
        print("Connection successful!")
        
        # Run migration
        migrate_files_to_s3()
        
    except Exception as e:
        print(f"Error connecting to S3: {str(e)}")
        print("Please check your AWS credentials and S3 bucket details.")
        exit(1) 