# AWS S3 Configuration - Add these settings to your settings.py file
# Make sure to replace the placeholder values with your actual AWS credentials

# Add 'storages' to INSTALLED_APPS
# INSTALLED_APPS = [
#     ...
#     'storages',
#     ...
# ]

# AWS S3 Settings
AWS_ACCESS_KEY_ID = 'your-access-key-id'  # Set from environment variable
AWS_SECRET_ACCESS_KEY = 'your-secret-access-key'  # Set from environment variable
AWS_STORAGE_BUCKET_NAME = 'your-bucket-name'  # e.g., qup-media-files
AWS_S3_REGION_NAME = 'your-region'  # e.g., 'us-east-1'
AWS_S3_FILE_OVERWRITE = False
AWS_DEFAULT_ACL = 'public-read'
AWS_S3_SIGNATURE_VERSION = 's3v4'

# Optional: Custom domain if using CloudFront CDN
# AWS_S3_CUSTOM_DOMAIN = 'your-cloudfront-domain.cloudfront.net'

# URLs for media and static files
AWS_S3_OBJECT_PARAMETERS = {
    'CacheControl': 'max-age=86400',
}

# Use custom storage backends
DEFAULT_FILE_STORAGE = 'backend.storage_backends.MediaStorage'
STATICFILES_STORAGE = 'backend.storage_backends.StaticStorage'

# Important: In production, set DEBUG = False
# DEBUG = False

# Optional: Security configuration for production
# SECURE_SSL_REDIRECT = True
# SESSION_COOKIE_SECURE = True
# CSRF_COOKIE_SECURE = True
# SECURE_BROWSER_XSS_FILTER = True
# SECURE_CONTENT_TYPE_NOSNIFF = True

# How to use with environment variables (recommended for production):
# import os
# AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
# AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
# AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME')
# AWS_S3_REGION_NAME = os.environ.get('AWS_S3_REGION_NAME') 