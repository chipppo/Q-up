from storages.backends.s3boto3 import S3Boto3Storage

class MediaStorage(S3Boto3Storage):
    """
    Storage class for media files (user uploaded content)
    Stores files in the 'media' directory on S3
    """
    location = 'media'
    file_overwrite = False
    default_acl = 'public-read'

class StaticStorage(S3Boto3Storage):
    """
    Storage class for static files (CSS, JS, etc.)
    Stores files in the 'static' directory on S3
    """
    location = 'static'
    file_overwrite = True
    default_acl = 'public-read' 