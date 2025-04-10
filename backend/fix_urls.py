#!/usr/bin/env python3
import os
import sys
import logging
import django
from django.db import connection

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def setup_environment():
    """Set up the Django environment"""
    # Add user local site-packages to PYTHONPATH
    python_version = f"python{sys.version_info.major}.{sys.version_info.minor}"
    site_packages = os.path.expanduser(f"~/.local/lib/{python_version}/site-packages")
    if "PYTHONPATH" not in os.environ:
        os.environ["PYTHONPATH"] = site_packages
    elif site_packages not in os.environ["PYTHONPATH"]:
        os.environ["PYTHONPATH"] = f"{site_packages}:{os.environ['PYTHONPATH']}"
    
    # Set up Django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    
    try:
        import django
        django.setup()
        return True
    except ImportError:
        logger.error("Django not found. Make sure it's installed correctly.")
        return False

def fix_database_urls():
    """Fix URLs in the database using SQL queries"""
    logger.info("Starting to fix URLs in database...")
    
    if not setup_environment():
        return False
    
    try:
        # Get all tables from the database
        with connection.cursor() as cursor:
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'django_%';")
            tables = cursor.fetchall()
        
        total_fixes = 0
        
        for table in tables:
            table_name = table[0]
            logger.info(f"Checking table: {table_name}")
            
            # Get columns for this table
            with connection.cursor() as cursor:
                cursor.execute(f"PRAGMA table_info({table_name});")
                columns = cursor.fetchall()
            
            for column in columns:
                column_name = column[1]
                column_type = column[2].lower()
                
                # Skip non-text columns
                if not ('text' in column_type or 'char' in column_type or 'varchar' in column_type):
                    continue
                
                # Skip system columns
                if column_name in ['id', 'created_at', 'updated_at', 'password']:
                    continue
                
                logger.info(f"  Checking column: {column_name}")
                
                # Fix eu-north-1b URLs
                with connection.cursor() as cursor:
                    cursor.execute(
                        f"UPDATE {table_name} SET {column_name} = replace({column_name}, 'eu-north-1b', 'eu-north-1') "
                        f"WHERE {column_name} LIKE '%eu-north-1b%';"
                    )
                    rows_affected = cursor.rowcount
                    if rows_affected > 0:
                        logger.info(f"    Fixed {rows_affected} instances in {table_name}.{column_name}")
                        total_fixes += rows_affected
                
                # Fix doubled region
                with connection.cursor() as cursor:
                    cursor.execute(
                        f"UPDATE {table_name} SET {column_name} = replace({column_name}, 's3.eu-north-1.eu-north-1', 's3.eu-north-1') "
                        f"WHERE {column_name} LIKE '%s3.eu-north-1.eu-north-1%';"
                    )
                    rows_affected = cursor.rowcount
                    if rows_affected > 0:
                        logger.info(f"    Fixed {rows_affected} doubled region instances in {table_name}.{column_name}")
                        total_fixes += rows_affected
                
                # Fix doubled domain
                with connection.cursor() as cursor:
                    cursor.execute(
                        f"UPDATE {table_name} SET {column_name} = replace({column_name}, 'amazonaws.com.amazonaws.com', 'amazonaws.com') "
                        f"WHERE {column_name} LIKE '%amazonaws.com.amazonaws.com%';"
                    )
                    rows_affected = cursor.rowcount
                    if rows_affected > 0:
                        logger.info(f"    Fixed {rows_affected} doubled domain instances in {table_name}.{column_name}")
                        total_fixes += rows_affected
        
        logger.info(f"Database URL fixing complete. Fixed {total_fixes} URLs.")
        return True
    
    except Exception as e:
        logger.error(f"Error fixing database URLs: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    logger.info("=== Simple URL Fixer ===")
    
    if fix_database_urls():
        logger.info("URL fixing completed successfully.")
    else:
        logger.error("URL fixing failed.")
        sys.exit(1) 