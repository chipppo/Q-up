#!/usr/bin/env python
import os
import sys
import logging
import argparse
import time
import traceback
import importlib
import subprocess

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('s3_fix_log.txt')
    ]
)
logger = logging.getLogger(__name__)

def check_prerequisites():
    """Check if all necessary libraries are installed"""
    required_packages = ['boto3', 'django', 'pillow', 'python-dotenv']
    missing_packages = []
    
    for package in required_packages:
        try:
            importlib.import_module(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        logger.error(f"Missing required packages: {', '.join(missing_packages)}")
        logger.info("Installing missing packages...")
        
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install"] + missing_packages)
            logger.info("Successfully installed missing packages")
        except Exception as e:
            logger.error(f"Failed to install packages: {str(e)}")
            logger.error("Please install the following packages manually:")
            for package in missing_packages:
                logger.error(f"  pip install {package}")
            return False
    
    return True

def run_script(script_name, description):
    """Import and run a script module"""
    logger.info(f"\n{'='*20} RUNNING: {description} {'='*20}\n")
    
    try:
        # Try to import the module
        module = importlib.import_module(script_name)
        
        # If it has a main function, call it
        if hasattr(module, 'main'):
            module.main()
        # Otherwise assume the script runs on import
        
        logger.info(f"\n{'='*20} COMPLETED: {description} {'='*20}\n")
        return True
    except Exception as e:
        logger.error(f"Error running {script_name}: {str(e)}")
        logger.error(traceback.format_exc())
        return False

def main():
    parser = argparse.ArgumentParser(description='Complete S3 fix and migration tool')
    parser.add_argument('--migrate-only', action='store_true', help='Only run the migration script')
    parser.add_argument('--fix-only', action='store_true', help='Only run the URL fixes')
    parser.add_argument('--middleware-only', action='store_true', help='Only install the redirect middleware')
    args = parser.parse_args()
    
    logger.info("====== COMPLETE S3 FIX AND MIGRATION TOOL ======")
    
    # Check prerequisites
    if not check_prerequisites():
        logger.error("Failed to meet prerequisites. Please fix the issues and try again.")
        return 1
    
    # Track overall success
    success = True
    
    # Register the middleware (unless only migration requested)
    if not args.migrate_only and not args.fix_only:
        if not run_script('update_settings', 'Registering S3 URL Redirect Middleware'):
            logger.warning("Failed to register middleware, but continuing with other fixes")
            success = False
    elif args.middleware_only:
        if not run_script('update_settings', 'Registering S3 URL Redirect Middleware'):
            logger.error("Failed to register middleware")
            return 1
        else:
            return 0  # Exit after middleware installation if that's all that was requested
    
    # Fix incorrect URLs (unless only migration requested)
    if not args.migrate_only:
        if not run_script('improved_url_fixer', 'Fixing Incorrect S3 URLs'):
            logger.warning("URL fixing had some issues, but continuing with migration")
            success = False
    elif args.fix_only:
        if not run_script('improved_url_fixer', 'Fixing Incorrect S3 URLs'):
            logger.error("URL fixing failed")
            return 1
        else:
            return 0  # Exit after fixes if that's all that was requested
    
    # Migrate local files to S3 (unless only fixes requested)
    if not args.fix_only and not args.middleware_only:
        if not run_script('improved_migration', 'Migrating Local Media to S3'):
            logger.error("Migration failed")
            success = False
    
    if success:
        logger.info("\n====== ALL OPERATIONS COMPLETED SUCCESSFULLY ======")
        logger.info("\nRecommended next steps:")
        logger.info("1. Restart your Django server to apply the middleware changes")
        logger.info("2. Rebuild your frontend if URL fixes were made")
        logger.info("3. Clear browser caches")
        return 0
    else:
        logger.warning("\n====== OPERATIONS COMPLETED WITH SOME ISSUES ======")
        logger.warning("Check the log file for details on what went wrong")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 