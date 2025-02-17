from django.urls import path
from .views import UserDetailView, RegisterUserView, LoginUserView, RefreshTokenView

urlpatterns = [
    # Endpoint for user profile retrieval by username
    path('user_data/<str:username>/', UserDetailView.as_view(), name='user-detail'),
    
    # Endpoint for user registration
    path('register/', RegisterUserView.as_view(), name='register'),
    
    # Endpoint for user login (JWT token generation)
    path('login/', LoginUserView.as_view(), name='login'),
    
    # Endpoint for refreshing JWT access token using refresh token
    path('refresh_token/', RefreshTokenView.as_view(), name='refresh_token'),
]
