#!/usr/bin/env python3
import os
import sys
import sqlite3
import logging
import subprocess
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database file path - change this if needed
DB_PATH = "db.sqlite3"

def find_database():
    """Find the SQLite database file"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    
    # Try several common locations
    possible_paths = [
        os.path.join(script_dir, DB_PATH),
        os.path.join(project_dir, DB_PATH),
        os.path.join(script_dir, 'backend', DB_PATH),
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            logger.info(f"Found database at {path}")
            return path
    
    # Ask user if not found
    logger.warning("Database not found in common locations")
    db_path = input("Enter the path to your SQLite database file (db.sqlite3): ")
    if db_path and os.path.exists(db_path):
        return db_path
    
    return None

def fix_database_urls():
    """Fix URLs in the database using direct SQL queries"""
    logger.info("Starting to fix URLs in database...")
    
    # Find database
    db_path = find_database()
    if not db_path:
        logger.error("Database file not found")
        return False
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        tables = cursor.fetchall()
        
        total_fixes = 0
        
        for table in tables:
            table_name = table[0]
            logger.info(f"Checking table: {table_name}")
            
            try:
                # Get columns for this table
                cursor.execute(f"PRAGMA table_info({table_name})")
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
                    try:
                        cursor.execute(
                            f"UPDATE \"{table_name}\" SET \"{column_name}\" = replace(\"{column_name}\", 'eu-north-1b', 'eu-north-1') "
                            f"WHERE \"{column_name}\" LIKE '%eu-north-1b%'"
                        )
                        rows_affected = cursor.rowcount
                        if rows_affected > 0:
                            logger.info(f"    Fixed {rows_affected} instances in {table_name}.{column_name}")
                            total_fixes += rows_affected
                    except Exception as e:
                        logger.error(f"Error updating {table_name}.{column_name}: {str(e)}")
                    
                    # Fix doubled region
                    try:
                        cursor.execute(
                            f"UPDATE \"{table_name}\" SET \"{column_name}\" = replace(\"{column_name}\", 's3.eu-north-1.eu-north-1', 's3.eu-north-1') "
                            f"WHERE \"{column_name}\" LIKE '%s3.eu-north-1.eu-north-1%'"
                        )
                        rows_affected = cursor.rowcount
                        if rows_affected > 0:
                            logger.info(f"    Fixed {rows_affected} doubled region instances in {table_name}.{column_name}")
                            total_fixes += rows_affected
                    except Exception as e:
                        logger.error(f"Error updating doubled region in {table_name}.{column_name}: {str(e)}")
                    
                    # Fix doubled domain
                    try:
                        cursor.execute(
                            f"UPDATE \"{table_name}\" SET \"{column_name}\" = replace(\"{column_name}\", 'amazonaws.com.amazonaws.com', 'amazonaws.com') "
                            f"WHERE \"{column_name}\" LIKE '%amazonaws.com.amazonaws.com%'"
                        )
                        rows_affected = cursor.rowcount
                        if rows_affected > 0:
                            logger.info(f"    Fixed {rows_affected} doubled domain instances in {table_name}.{column_name}")
                            total_fixes += rows_affected
                    except Exception as e:
                        logger.error(f"Error updating doubled domain in {table_name}.{column_name}: {str(e)}")
            
            except Exception as e:
                logger.error(f"Error processing table {table_name}: {str(e)}")
                continue
        
        # Commit changes and close connection
        conn.commit()
        conn.close()
        
        logger.info(f"Database URL fixing complete. Fixed {total_fixes} URLs.")
        return True
    
    except Exception as e:
        logger.error(f"Error fixing database URLs: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    logger.info("=== Direct SQL URL Fixer ===")
    
    if fix_database_urls():
        logger.info("URL fixing completed successfully.")
    else:
        logger.error("URL fixing failed.")
        sys.exit(1) 