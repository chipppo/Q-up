from .auth_views import (
    RegisterUserView,
    LoginUserView
)

from .user_views import (
    UserDetailView,
    UpdateProfileView,
    UploadAvatarView,
    FollowUserView,
    UnfollowUserView,
    FollowersListView,
    FollowingListView,
    MutualFollowersView
)

from .game_views import (
    GameListView,
    GameStatsListView,
    GameStatsUpdateView,
    RankingSystemListView,
    RankTierListView,
    PlayerGoalListView,
    PlayerGoalDetailView
)

from .social_views import (
    PostListView,
    UserPostsView,
    PostDetailView,
    LikeView,
    LikesListView,
    CommentView,
    CommentRepliesView,
    AllPostsView
)

from .chat_views import (
    ChatListView,
    ChatDetailView,
    ChatReadView,
    MessageListView,
    MessageDetailView,
    MessageReplyView,
    MessageStatusView
)

from .search_views import SearchView

from .password_views import (
    PasswordResetRequestView,
    PasswordResetConfirmView
) 
# Add test S3 upload view
from django.http import JsonResponse
from rest_framework.decorators import api_view
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
def test_s3_upload(request):
    """Test endpoint for S3 upload"""
    try:
        logger.error("Starting S3 test upload...")
        from django.conf import settings
        import boto3
        
        # Check settings
        logger.error(f"AWS settings check - Key exists: {bool(settings.AWS_ACCESS_KEY_ID)}")
        logger.error(f"AWS settings check - Bucket: {settings.AWS_STORAGE_BUCKET_NAME}")
        logger.error(f"AWS settings check - Region: {settings.AWS_S3_REGION_NAME}")
        
        # Test direct boto3 upload
        s3 = boto3.client('s3',
                       aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                       aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                       region_name=settings.AWS_S3_REGION_NAME)
        
        test_content = b"This is a test upload via direct boto3 call"
        s3.put_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key="test-direct-boto3.txt",
            Body=test_content
        )
        logger.error("Direct boto3 upload succeeded")
        
        # Test through Django storage
        from django.core.files.base import ContentFile
        from django.core.files.storage import default_storage
        path = default_storage.save('test-django-storage.txt', ContentFile(b"This is a test upload via Django storage"))
        logger.error(f"Django storage upload - path: {path}")
        
        return JsonResponse({
            "status": "success",
            "message": "Test uploads completed successfully",
            "direct_boto3": True,
            "django_storage": True,
            "django_path": path
        })
    except Exception as e:
        logger.error(f"Test upload failed: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return JsonResponse({
            "status": "error",
            "message": str(e)
        }, status=500)
