from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    UserDetailView,
    RegisterUserView,
    LoginUserView,
    UpdateProfileView,
    GameStatsListView,
    GameStatsUpdateView,
    SearchView,
    UploadAvatarView,
    FollowUserView,
    UnfollowUserView,
    FollowersListView,
    FollowingListView,
    ChangePasswordView,
    GameListView,
    RankingSystemListView,
    RankTierListView,
    PlayerGoalListView,
    PostListView,
    UserPostsView,
    PostDetailView,
    LikeView,
    LikesListView,
    CommentView,
    CommentRepliesView,
)

urlpatterns = [
    path('users/<str:username>/', UserDetailView.as_view(), name='user-detail'),
    path('register/', RegisterUserView.as_view(), name='register'),
    path('login/', LoginUserView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('users/<str:username>/update/', UpdateProfileView.as_view(), name='update-profile'),
    path('users/<str:username>/game-stats/', GameStatsListView.as_view(), name='game-stats'),
    path('users/<str:username>/game-stats/<int:game_id>/', GameStatsUpdateView.as_view(), name='update-game-stats'),
    path('search/', SearchView.as_view(), name='search'),
    path('users/<str:username>/avatar/', UploadAvatarView.as_view(), name='upload-avatar'),
    path('users/<str:username>/follow/', FollowUserView.as_view(), name='follow-user'),
    path('users/<str:username>/unfollow/', UnfollowUserView.as_view(), name='unfollow-user'),
    path('users/<str:username>/followers/', FollowersListView.as_view(), name='followers-list'),
    path('users/<str:username>/following/', FollowingListView.as_view(), name='following-list'),
    path('users/<str:username>/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('games/', GameListView.as_view(), name='game-list'),
    path('games/<int:game_id>/ranking-systems/', RankingSystemListView.as_view(), name='ranking-systems'),
    path('ranking-systems/<int:rank_system_id>/tiers/', RankTierListView.as_view(), name='rank-tiers'),
    path('player-goals/', PlayerGoalListView.as_view(), name='player-goals'),
    path('posts/', PostListView.as_view(), name='post-list'),
    path('users/<str:username>/posts/', UserPostsView.as_view(), name='user-posts'),
    path('posts/<int:post_id>/', PostDetailView.as_view(), name='post-detail'),
    path('posts/<int:post_id>/like/', LikeView.as_view(), name='post-like'),
    path('posts/<int:post_id>/likes/', LikesListView.as_view(), name='post-likes-list'),
    path('posts/<int:post_id>/comments/', CommentView.as_view(), name='post-comments'),
    path('comments/<int:comment_id>/', CommentView.as_view(), name='comment-detail'),
    path('comments/<int:comment_id>/replies/', CommentRepliesView.as_view(), name='comment-replies'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)