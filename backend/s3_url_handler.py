import re
import logging
from django.http import HttpResponseRedirect
from django.conf import settings

logger = logging.getLogger(__name__)

class S3UrlRedirectMiddleware:
    """
    Middleware to detect and redirect legacy S3 URLs with incorrect region format
    This handles incoming requests that might contain the wrong S3 region format
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        # One-time configuration and initialization
        self.s3_url_pattern = re.compile(r'(https?://[^/]+\.s3\.)(eu-north-1b)(\.amazonaws\.com/.+)')
        self.s3_double_region_pattern = re.compile(r'(https?://[^/]+\.s3\.)(eu-north-1\.eu-north-1)(\.amazonaws\.com/.+)')
        self.s3_double_domain_pattern = re.compile(r'(https?://[^/]+\.s3\.[^/]+\.amazonaws\.com)(\.amazonaws\.com)(/.*)')
    
    def __call__(self, request):
        # Check if this is an image request with a problematic S3 URL
        path = request.path_info
        
        # Handle direct S3 URL redirects
        if 'eu-north-1b' in path or 's3.eu-north-1.eu-north-1' in path or '.amazonaws.com.amazonaws.com' in path:
            fixed_path = path
            
            # Fix incorrect region format
            fixed_path = fixed_path.replace('eu-north-1b', 'eu-north-1')
            
            # Fix doubled region
            fixed_path = fixed_path.replace('s3.eu-north-1.eu-north-1', 's3.eu-north-1')
            
            # Fix doubled domain
            fixed_path = fixed_path.replace('.amazonaws.com.amazonaws.com', '.amazonaws.com')
            
            if fixed_path != path:
                logger.info(f"Redirecting legacy S3 URL: {path} -> {fixed_path}")
                return HttpResponseRedirect(fixed_path)
        
        # Check query parameters for S3 URLs
        for key, value in request.GET.items():
            if isinstance(value, str) and ('eu-north-1b' in value or 's3.eu-north-1.eu-north-1' in value or '.amazonaws.com.amazonaws.com' in value):
                # We found a problematic URL in the query params, but we can't easily redirect
                # Just log it for informational purposes
                logger.info(f"Found problematic S3 URL in query param {key}: {value}")
        
        response = self.get_response(request)
        return response

def register_redirect_middleware(app_list=None):
    """
    Helper function to register the middleware in settings.py
    
    This function can be imported and called from settings.py:
    
    from s3_url_handler import register_redirect_middleware
    MIDDLEWARE = register_redirect_middleware(MIDDLEWARE)
    """
    if app_list is None:
        from django.conf import settings
        app_list = settings.MIDDLEWARE
    
    # Add our middleware if it's not already there
    middleware_path = 's3_url_handler.S3UrlRedirectMiddleware'
    if middleware_path not in app_list:
        # Insert before the CommonMiddleware (which handles redirects)
        try:
            common_idx = app_list.index('django.middleware.common.CommonMiddleware')
            app_list.insert(common_idx, middleware_path)
        except ValueError:
            # If CommonMiddleware is not found, append to the end
            app_list.append(middleware_path)
    
    return app_list 