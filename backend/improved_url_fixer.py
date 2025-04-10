import os
import django
import sys
import json
import boto3
import logging
import re
from pathlib import Path
from botocore.exceptions import ClientError

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Fix Django logging - create tmp directory if it doesn't exist
log_dir = os.path.join('C:\\', 'tmp')
if not os.path.exists(log_dir):
    try:
        os.makedirs(log_dir)
    except:
        # If we can't create the directory, modify Django settings to use a different log path
        os.environ['DJANGO_LOG_FILE'] = os.path.join(os.getcwd(), 'django-debug.log')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.conf import settings
from django.db import connection
from django.db.models import Q, F
from base.models import MyUser, Post, Game, RankTier, Message, Chat  # Add all models with image fields

def get_s3_client():
    """Create and return an S3 client using settings"""
    return boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME
    )

def fix_s3_objects():
    """Fix object keys in S3 bucket that contain incorrect region formats"""
    logger.info("Starting S3 object key fix...")
    
    if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
        logger.error("AWS credentials not found in settings")
        return 0
    
    fixed_count = 0
    
    try:
        s3 = get_s3_client()
        bucket = settings.AWS_STORAGE_BUCKET_NAME
        
        # List all objects in the bucket
        paginator = s3.get_paginator('list_objects_v2')
        page_iterator = paginator.paginate(Bucket=bucket)
        
        for page in page_iterator:
            if 'Contents' not in page:
                continue
            
            for obj in page['Contents']:
                key = obj['Key']
                
                # Look for all incorrect region formats
                if 'eu-north-1b' in key:
                    # Create the corrected key
                    new_key = key.replace('eu-north-1b', 'eu-north-1')
                    
                    logger.info(f"Fixing S3 object: {key} -> {new_key}")
                    
                    try:
                        # Check if the corrected key already exists
                        try:
                            s3.head_object(Bucket=bucket, Key=new_key)
                            logger.warning(f"Target key already exists: {new_key}")
                            
                            # Compare objects to see if they're the same
                            src_metadata = s3.head_object(Bucket=bucket, Key=key)
                            dst_metadata = s3.head_object(Bucket=bucket, Key=new_key)
                            
                            if src_metadata.get('ContentLength') == dst_metadata.get('ContentLength'):
                                logger.info(f"Source and destination have same size, deleting source: {key}")
                                s3.delete_object(Bucket=bucket, Key=key)
                                fixed_count += 1
                            else:
                                logger.warning(f"Source and destination have different sizes, keeping both for manual review")
                                
                        except ClientError:
                            # Target doesn't exist, proceed with copy
                            s3.copy_object(
                                CopySource={'Bucket': bucket, 'Key': key},
                                Bucket=bucket,
                                Key=new_key,
                                ACL='public-read'
                            )
                            
                            # Verify the copy worked
                            s3.head_object(Bucket=bucket, Key=new_key)
                            
                            # Delete the original object with incorrect key
                            s3.delete_object(Bucket=bucket, Key=key)
                            fixed_count += 1
                    
                    except Exception as e:
                        logger.error(f"Error fixing S3 object {key}: {str(e)}")
        
        logger.info(f"Fixed {fixed_count} S3 object keys")
    
    except Exception as e:
        logger.error(f"Error fixing S3 objects: {str(e)}")
    
    return fixed_count

def fix_database_urls():
    """Fix URLs in all text fields across the database"""
    logger.info("Starting database URL fix...")
    
    total_fixed = 0
    
    try:
        # Get all tables
        with connection.cursor() as cursor:
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'django_%' AND name NOT LIKE 'auth_%';")
            tables = cursor.fetchall()
        
        for table in tables:
            table_name = table[0]
            logger.info(f"Processing table: {table_name}")
            
            # Get all columns for this table
            with connection.cursor() as cursor:
                cursor.execute(f"PRAGMA table_info(`{table_name}`);")
                columns = cursor.fetchall()
            
            for col in columns:
                col_id, col_name, col_type = col[0], col[1], col[2].lower()
                
                # Skip reserved column names and non-text columns
                if col_name in ['order', 'group', 'default', 'where', 'from', 'index', 'table']:
                    continue
                
                if not ('text' in col_type or 'char' in col_type or 'varchar' in col_type or 'json' in col_type):
                    continue
                
                logger.info(f"  Checking column: {col_name}")
                
                # Find records with incorrect URL patterns - using parameterized query
                safe_col_name = col_name.replace('"', '""')
                with connection.cursor() as cursor:
                    # Look for both the original issue and any other URL issues
                    cursor.execute(
                        f'SELECT id, "{safe_col_name}" FROM "{table_name}" WHERE '
                        f'"{safe_col_name}" LIKE ? OR '
                        f'"{safe_col_name}" LIKE ? OR '
                        f'"{safe_col_name}" LIKE ?',
                        ['%eu-north-1b%', '%s3.eu-north-1.eu-north-1%', '%amazonaws.com.amazonaws.com%']
                    )
                    rows = cursor.fetchall()
                
                for row in rows:
                    row_id, old_value = row[0], row[1]
                    
                    if not old_value:
                        continue
                        
                    new_value = old_value
                    
                    # Apply all necessary URL fixes
                    if 'eu-north-1b' in new_value:
                        new_value = new_value.replace('eu-north-1b', 'eu-north-1')
                        
                    # Fix doubled region
                    if 's3.eu-north-1.eu-north-1' in new_value:
                        new_value = new_value.replace('s3.eu-north-1.eu-north-1', 's3.eu-north-1')
                        
                    # Fix doubled domain
                    if 'amazonaws.com.amazonaws.com' in new_value:
                        new_value = new_value.replace('amazonaws.com.amazonaws.com', 'amazonaws.com')
                    
                    # Only update if there was a change
                    if new_value != old_value:
                        # Handle JSON fields specially
                        if col_type == 'json' and old_value.startswith('{'):
                            try:
                                json_data = json.loads(old_value)
                                # Recursively fix URLs in JSON
                                fixed_data = fix_urls_in_json(json_data)
                                new_value = json.dumps(fixed_data)
                            except json.JSONDecodeError:
                                # Not valid JSON, already handled with string replacement
                                pass
                        
                        with connection.cursor() as cursor:
                            cursor.execute(
                                f'UPDATE "{table_name}" SET "{safe_col_name}" = ? WHERE id = ?',
                                [new_value, row_id]
                            )
                            total_fixed += 1
                            logger.info(f"    Fixed URL in {table_name}.{col_name} for id={row_id}")
        
        logger.info(f"Fixed a total of {total_fixed} URLs in the database")
    
    except Exception as e:
        logger.error(f"Error fixing database URLs: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
    
    return total_fixed

def fix_urls_in_json(data):
    """Recursively fix URLs in JSON data"""
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, (dict, list)):
                data[key] = fix_urls_in_json(value)
            elif isinstance(value, str):
                if 'eu-north-1b' in value:
                    data[key] = value.replace('eu-north-1b', 'eu-north-1')
                if 's3.eu-north-1.eu-north-1' in value:
                    data[key] = value.replace('s3.eu-north-1.eu-north-1', 's3.eu-north-1')
                if 'amazonaws.com.amazonaws.com' in value:
                    data[key] = value.replace('amazonaws.com.amazonaws.com', 'amazonaws.com')
    elif isinstance(data, list):
        for i, item in enumerate(data):
            if isinstance(item, (dict, list)):
                data[i] = fix_urls_in_json(item)
            elif isinstance(item, str):
                if 'eu-north-1b' in item:
                    data[i] = item.replace('eu-north-1b', 'eu-north-1')
                if 's3.eu-north-1.eu-north-1' in item:
                    data[i] = item.replace('s3.eu-north-1.eu-north-1', 's3.eu-north-1')
                if 'amazonaws.com.amazonaws.com' in item:
                    data[i] = item.replace('amazonaws.com.amazonaws.com', 'amazonaws.com')
    return data

def fix_model_fields():
    """Fix file fields in Django models with more robust checking"""
    logger.info("Starting model field fix...")
    total_fixed = 0
    
    # Dictionary to track progress for each model and field
    results = {}
    
    # Define models and their image fields
    models_and_fields = [
        (MyUser, 'avatar'),
        (Post, 'image'),
        (Game, 'logo'),
        (RankTier, 'icon'),
        (Message, 'image')
    ]
    
    for model, field_name in models_and_fields:
        fixed_count = 0
        examined_count = 0
        error_count = 0
        
        # Query objects that might have problematic URLs
        objects = model.objects.filter(**{f"{field_name}__contains": 'eu-north-1b'})
        
        logger.info(f"Found {objects.count()} {model.__name__} objects with potential URL issues")
        
        for obj in objects:
            examined_count += 1
            field = getattr(obj, field_name)
            
            if not field:
                continue
                
            if hasattr(field, 'name'):
                old_name = field.name
                # Apply all necessary URL fixes
                new_name = old_name
                
                if 'eu-north-1b' in new_name:
                    new_name = new_name.replace('eu-north-1b', 'eu-north-1')
                    
                if 's3.eu-north-1.eu-north-1' in new_name:
                    new_name = new_name.replace('s3.eu-north-1.eu-north-1', 's3.eu-north-1')
                    
                if 'amazonaws.com.amazonaws.com' in new_name:
                    new_name = new_name.replace('amazonaws.com.amazonaws.com', 'amazonaws.com')
                
                if new_name != old_name:
                    try:
                        field.name = new_name
                        obj.save(update_fields=[field_name])
                        fixed_count += 1
                        logger.info(f"Fixed {field_name} URL for {model.__name__} id={obj.id}: {old_name} -> {new_name}")
                    except Exception as e:
                        error_count += 1
                        logger.error(f"Error fixing {field_name} for {model.__name__} id={obj.id}: {str(e)}")
        
        results[model.__name__] = {
            'field': field_name,
            'examined': examined_count,
            'fixed': fixed_count,
            'errors': error_count
        }
        
        total_fixed += fixed_count
    
    # Log results
    logger.info("\n==== MODEL FIELD FIX SUMMARY ====")
    for model_name, data in results.items():
        logger.info(f"{model_name}.{data['field']}:")
        logger.info(f"  - Examined: {data['examined']}")
        logger.info(f"  - Fixed: {data['fixed']}")
        logger.info(f"  - Errors: {data['errors']}")
    
    logger.info(f"Fixed a total of {total_fixed} model fields")
    return total_fixed

def fix_frontend_files():
    """Fix URLs in frontend files"""
    logger.info("Starting frontend file fix...")
    
    # Get frontend directory
    frontend_dir = os.path.join(os.path.dirname(settings.BASE_DIR), 'frontend')
    
    if not os.path.exists(frontend_dir):
        logger.error(f"Frontend directory not found: {frontend_dir}")
        return 0
    
    total_fixed = 0
    
    # List of frontend file extensions to check
    extensions = ['.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.html']
    
    # Walk through frontend directory
    for root, dirs, files in os.walk(frontend_dir):
        for file in files:
            if any(file.endswith(ext) for ext in extensions):
                file_path = os.path.join(root, file)
                try:
                    # Read file
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Check for problematic URLs
                    if 'eu-north-1b' in content or 's3.eu-north-1.eu-north-1' in content or 'amazonaws.com.amazonaws.com' in content:
                        # Apply fixes
                        new_content = content
                        new_content = new_content.replace('eu-north-1b', 'eu-north-1')
                        new_content = new_content.replace('s3.eu-north-1.eu-north-1', 's3.eu-north-1')
                        new_content = new_content.replace('amazonaws.com.amazonaws.com', 'amazonaws.com')
                        
                        # Write fixed content
                        if new_content != content:
                            with open(file_path, 'w', encoding='utf-8') as f:
                                f.write(new_content)
                            total_fixed += 1
                            logger.info(f"Fixed URLs in frontend file: {os.path.relpath(file_path, frontend_dir)}")
                
                except Exception as e:
                    logger.error(f"Error fixing frontend file {file_path}: {str(e)}")
    
    logger.info(f"Fixed a total of {total_fixed} frontend files")
    return total_fixed

def ensure_correct_frontend_formatter():
    """Ensure the frontend image URL formatter is correct"""
    logger.info("Checking frontend image URL formatter...")
    
    formatter_file = os.path.join(
        os.path.dirname(settings.BASE_DIR), 
        'frontend', 'src', 'utils', 'formatters.js'
    )
    
    if not os.path.exists(formatter_file):
        logger.error(f"Formatter file not found: {formatter_file}")
        return False
    
    try:
        with open(formatter_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if the formatter already has the necessary fix
        if 'eu-north-1b' in content and 'replace(' in content:
            logger.info("Frontend formatter already has URL fixing code")
            return True
        
        # If not, add the fix
        formatter_code = """
/**
 * Formats image URLs by ensuring they have the correct base URL
 * and fixes any incorrect S3 region formats (eu-north-1b → eu-north-1)
 * 
 * @function formatImageUrl
 * @param {string|null} url - The image URL to format
 * @returns {string|null} The formatted URL or null if no URL provided
 */
export const formatImageUrl = (url) => {
  if (!url) return null;
  
  // Handle already fully-qualified URLs
  if (url.startsWith('http')) {
    // Fix incorrect region format in existing URLs
    if (url.includes('eu-north-1b')) {
      return url.replace('eu-north-1b', 'eu-north-1');
    }
    
    // Fix doubled region if present
    if (url.includes('s3.eu-north-1.eu-north-1')) {
      return url.replace('s3.eu-north-1.eu-north-1', 's3.eu-north-1');
    }
    
    // Fix doubled domain if present
    if (url.includes('amazonaws.com.amazonaws.com')) {
      return url.replace('amazonaws.com.amazonaws.com', 'amazonaws.com');
    }
    
    return url;
  }
  
  // Handle relative URLs by adding the API base URL
  return `${API.defaults.baseURL}${url}`;
};
"""
        
        # Look for the existing formatImageUrl function
        import re
        pattern = r'export\s+const\s+formatImageUrl\s*=.*?};'
        if re.search(pattern, content, re.DOTALL):
            # Replace the existing function
            new_content = re.sub(pattern, formatter_code.strip(), content, flags=re.DOTALL)
            
            with open(formatter_file, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            logger.info("Updated frontend formatImageUrl function with improved URL fixing")
            return True
        else:
            logger.warning("Could not find formatImageUrl function to update")
            return False
        
    except Exception as e:
        logger.error(f"Error ensuring correct frontend formatter: {str(e)}")
        return False

def clear_frontend_caches():
    """Display instructions for clearing frontend caches"""
    logger.info("\n==== FRONTEND CACHE CLEARING INSTRUCTIONS ====")
    logger.info("To ensure the fixes take effect in the frontend, follow these steps:")
    logger.info("1. Rebuild your frontend application with:")
    logger.info("   cd ../frontend && npm run build")
    logger.info("\n2. For development environments:")
    logger.info("   - Clear your browser cache (Ctrl+Shift+Delete in most browsers)")
    logger.info("   - Restart your development server")
    logger.info("\n3. For production environments:")
    logger.info("   - Implement cache-busting by adding a version parameter to your static assets")
    logger.info("   - Update your deployment to include the new build")
    logger.info("   - If using CDN, invalidate the cache for affected files")
    
def main():
    logger.info("====== IMPROVED URL FIXER TOOL ======")
    logger.info(f"Using AWS region: {settings.AWS_S3_REGION_NAME}")
    logger.info(f"S3 bucket: {settings.AWS_STORAGE_BUCKET_NAME}")
    
    # Fix S3 objects
    s3_fixed = fix_s3_objects()
    
    # Fix model fields
    model_fixed = fix_model_fields()
    
    # Fix database URLs
    db_fixed = fix_database_urls()
    
    # Fix frontend files
    frontend_fixed = fix_frontend_files()
    
    # Ensure correct frontend formatter
    formatter_updated = ensure_correct_frontend_formatter()
    
    # Print summary
    logger.info("\n====== FIX SUMMARY ======")
    logger.info(f"S3 objects fixed: {s3_fixed}")
    logger.info(f"Model fields fixed: {model_fixed}")
    logger.info(f"Database URLs fixed: {db_fixed}")
    logger.info(f"Frontend files fixed: {frontend_fixed}")
    logger.info(f"Frontend formatter updated: {'Yes' if formatter_updated else 'No'}")
    
    # Display cache clearing instructions
    clear_frontend_caches()
    
    logger.info("\nURL fix operation completed!")

if __name__ == "__main__":
    main() 