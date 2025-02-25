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
)

urlpatterns = [
    path('user_data/<str:username>/', UserDetailView.as_view(), name='user-detail'),
    path('register/', RegisterUserView.as_view(), name='register'),
    path('login/', LoginUserView.as_view(), name='login'),
    path('refresh_token/', RefreshTokenView.as_view(), name='refresh-token'),
    path('user_data/<str:username>/update/', UpdateProfileView.as_view(), name='update-profile'),
    path('user_data/<str:username>/game_stats/', GameStatsListView.as_view(), name='game-stats-list'),
    path('user_data/<str:username>/game_stats/<int:game_id>/', GameStatsUpdateView.as_view(), name='game-stats-update'),
    path('search/', SearchView.as_view(), name='search'),
    path('user_data/<str:username>/upload_avatar/', UploadAvatarView.as_view(), name='upload-avatar'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)