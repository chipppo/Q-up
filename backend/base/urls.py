# backend/base/urls.py
from django.urls import path
from .views import (
    UserDetailView, RegisterUserView, LoginUserView,
    RefreshTokenView, UpdateProfileView, GameStatsListView, GameStatsUpdateView,
    SearchView,
)

urlpatterns = [
    path('user_data/<str:username>/', UserDetailView.as_view(), name='user-detail'),
    path('user_data/<str:username>/update/', UpdateProfileView.as_view(), name='update-profile'),
    path('user_data/<str:username>/game_stats/', GameStatsListView.as_view(), name='game-stats-list'),  # Add this
    path('user_data/<str:username>/game_stats/<int:game_id>/', GameStatsUpdateView.as_view(), name='update-game-stats'),  # Add this
    path('register/', RegisterUserView.as_view(), name='register'),
    path('login/', LoginUserView.as_view(), name='login'),
    path('refresh_token/', RefreshTokenView.as_view(), name='refresh_token'),
    path("search/", SearchView.as_view(), name="search")
]