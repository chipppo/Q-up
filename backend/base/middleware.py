import logging
import traceback
from django.http import JsonResponse

logger = logging.getLogger(__name__)

class S3UploadMiddleware:
    """
    Middleware that catches and logs S3 upload errors, ensuring uploaded files 
    are properly handled even if there are errors.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
    def __call__(self, request):
        # Process the request
        response = self.get_response(request)
        return response
    
    def process_exception(self, request, exception):
        """
        Handle exceptions that occur during S3 uploads
        """
        # Only process exceptions for upload requests
        if request.method == 'POST' and request.FILES and 'boto' in str(exception).lower():
            logger.error("S3 upload error detected in middleware")
            logger.error(f"Exception: {str(exception)}")
            logger.error(traceback.format_exc())
            
            # Log request details for debugging
            logger.error(f"Upload request details:")
            logger.error(f"  Path: {request.path}")
            logger.error(f"  Content-Type: {request.content_type}")
            logger.error(f"  FILES: {list(request.FILES.keys())}")
            
            # Return a clear error response
            return JsonResponse({
                'error': 'File upload failed',
                'detail': str(exception),
                'message': 'There was a problem uploading your file to the storage service.'
            }, status=500)
        
        # For other exceptions, let Django handle them
        return None 