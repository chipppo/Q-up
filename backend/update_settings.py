import os
import re
import logging
import fileinput
import sys

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def update_django_settings():
    """
    Update Django settings.py to add the S3 URL redirect middleware
    """
    # Find settings.py
    settings_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend', 'settings.py')
    
    if not os.path.exists(settings_path):
        logger.error(f"Settings file not found: {settings_path}")
        return False
    
    logger.info(f"Found settings file: {settings_path}")
    
    # Read current settings content
    with open(settings_path, 'r') as f:
        content = f.read()
    
    # Check if middleware import is already there
    middleware_import = "from s3_url_handler import register_redirect_middleware"
    
    if middleware_import in content:
        logger.info("Middleware import already present in settings.py")
    else:
        # Find a good place to add the import
        import_section_pattern = r"(from django\.conf.*?\n)"
        import_match = re.search(import_section_pattern, content)
        
        if import_match:
            # Add import after the last import in the section
            insert_pos = import_match.end()
            new_content = (
                content[:insert_pos] + 
                f"\n# S3 URL redirect middleware import\n{middleware_import}\n" +
                content[insert_pos:]
            )
            content = new_content
            logger.info("Added middleware import to settings.py")
        else:
            logger.error("Could not find a suitable location to add the import")
            return False
    
    # Check if middleware registration is already there
    middleware_registration = "MIDDLEWARE = register_redirect_middleware(MIDDLEWARE)"
    
    if middleware_registration in content:
        logger.info("Middleware registration already present in settings.py")
    else:
        # Find MIDDLEWARE list
        middleware_pattern = r"(MIDDLEWARE\s*=\s*\[.*?\])"
        middleware_match = re.search(middleware_pattern, content, re.DOTALL)
        
        if middleware_match:
            # Add middleware registration after the MIDDLEWARE list
            insert_pos = middleware_match.end()
            new_content = (
                content[:insert_pos] + 
                f"\n\n# Register S3 URL redirect middleware\n{middleware_registration}\n" +
                content[insert_pos:]
            )
            content = new_content
            logger.info("Added middleware registration to settings.py")
        else:
            logger.error("Could not find MIDDLEWARE list in settings.py")
            return False
    
    # Write the updated content back
    with open(settings_path, 'w') as f:
        f.write(content)
    
    logger.info("Successfully updated settings.py")
    return True

if __name__ == "__main__":
    logger.info("Updating Django settings.py to add S3 URL redirect middleware...")
    if update_django_settings():
        logger.info("Settings updated successfully!")
    else:
        logger.error("Failed to update settings")
        sys.exit(1) 