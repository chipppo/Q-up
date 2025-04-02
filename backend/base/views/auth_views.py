from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from ..models import MyUser
from ..serializers import (
    RegisterUserSerializer,
    MyTokenObtainPairSerializer
)

"""
Authentication views for handling user registration and login.
These views issue JWT tokens that the frontend uses to authenticate requests.
"""

class RegisterUserView(APIView):
    """
    Registers a new user and gives them JWT tokens.
    
    This is how new users sign up - they send their info and we create
    an account for them. We also send back tokens so they're immediately
    logged in after registering.
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, format=None):
        """
        POST handler for user registration.
        
        Args:
            request: Contains the user's registration data (username, email, password, etc.)
            
        Returns:
            JWT access and refresh tokens if successful, or error messages if not
        """
        serializer = RegisterUserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()  # Create and save the user
            # Generate JWT tokens for the newly registered user
            refresh = RefreshToken.for_user(user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginUserView(TokenObtainPairView):
    """
    Handles user login and issues JWT tokens.
    
    This is how existing users log in - they send their username/password
    and we verify them and send back tokens they can use to access protected endpoints.
    
    We use a custom token serializer that adds extra data to the response.
    """
    serializer_class = MyTokenObtainPairSerializer  # Use the custom serializer 