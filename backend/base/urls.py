from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from .views import (
    UserDetailView,
    RegisterUserView,
    LoginUserView,
    RefreshTokenView,
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
)

urlpatterns = [
    path('user_data/<str:username>/', UserDetailView.as_view(), name='user-detail'),
    path('user_data/<str:username>/update/', UpdateProfileView.as_view(), name='update-profile'),
    path('user_data/<str:username>/game_stats/<int:game_id>/', GameStatsUpdateView.as_view(), name='update-game-stats'),
    path('follow/<str:username>/', FollowUserView.as_view(), name='follow-user'),
    path('unfollow/<str:username>/', UnfollowUserView.as_view(), name='unfollow-user'),
    path('register/', RegisterUserView.as_view(), name='register'),
    path('login/', LoginUserView.as_view(), name='login'),
    path('refresh_token/', RefreshTokenView.as_view(), name='refresh-token'),
    path('user_data/<str:username>/game_stats/', GameStatsListView.as_view(), name='game-stats-list'),
    path('search/', SearchView.as_view(), name='search'),
    path('user_data/<str:username>/upload_avatar/', UploadAvatarView.as_view(), name='upload-avatar'),
    path('user_data/<str:username>/followers/', FollowersListView.as_view(), name='followers-list'),
    path('user_data/<str:username>/following/', FollowingListView.as_view(), name='following-list'),
    path('user_data/<str:username>/change_password/', 
         ChangePasswordView.as_view(), 
         name='change-password'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)