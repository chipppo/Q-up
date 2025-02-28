from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Q
from django.core.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import JsonResponse
from .models import Game, MyUser, GameStats
from .serializers import (
    UserSerializer,
    RegisterUserSerializer,
    MyTokenObtainPairSerializer,
    MyTokenRefreshSerializer,
    GameSerializer,
    GameStatsSerializer,
)

class UserDetailView(APIView):
    """
    Retrieve user profile information by username.
    This endpoint is public.
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, username, format=None):
        try:
            user = MyUser.objects.get(username=username)
            serializer = UserSerializer(user)
            return Response(serializer.data)
        except MyUser.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)


class RegisterUserView(APIView):
    """
    Register a new user and provide JWT tokens.
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, format=None):
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
    Login and obtain JWT tokens.
    """
    serializer_class = MyTokenObtainPairSerializer  # Use the custom serializer


class RefreshTokenView(APIView):
    """
    Refresh JWT access token using the provided refresh token.
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, format=None):
        serializer = MyTokenRefreshSerializer(data=request.data)
        if serializer.is_valid():
            refresh_token = serializer.validated_data['refresh']
            try:
                refresh = RefreshToken(refresh_token)
                return Response({
                    'access': str(refresh.access_token)
                })
            except Exception as e:
                return Response({"detail": "Invalid refresh token."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UpdateProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, username, format=None):
        try:
            user = MyUser.objects.get(username=username)
            if user != request.user:  # Ensure the logged-in user is updating their own profile
                return Response({"detail": "You can only edit your own profile."}, status=status.HTTP_403_FORBIDDEN)
            serializer = UserSerializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except MyUser.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)


class GameStatsListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, username, format=None):
        try:
            user = MyUser.objects.get(username=username)
            game_stats = GameStats.objects.filter(user=user)
            serializer = GameStatsSerializer(game_stats, many=True)
            return Response(serializer.data)
        except MyUser.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)


class GameStatsUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, username, game_id, format=None):
        try:
            user = MyUser.objects.get(username=username)
            if user != request.user:
                return Response({"detail": "You can only update your own game stats."}, status=status.HTTP_403_FORBIDDEN)
            
            game = Game.objects.get(id=game_id)
            game_stats, created = GameStats.objects.get_or_create(user=user, game=game)
            
            # Update fields
            game_stats.hours_played = request.data.get('hours_played', game_stats.hours_played)
            game_stats.rank = request.data.get('rank', game_stats.rank)
            game_stats.achievements = request.data.get('achievements', game_stats.achievements)
            game_stats.goals = request.data.get('goals', game_stats.goals)
            game_stats.save()
            
            serializer = GameStatsSerializer(game_stats)
            return Response(serializer.data)
        except (MyUser.DoesNotExist, Game.DoesNotExist):
            return Response({"detail": "User or game not found."}, status=status.HTTP_404_NOT_FOUND)
        

class SearchView(APIView):
    def get(self, request, format=None):
        query = request.query_params.get("q", "")
        users = MyUser.objects.filter(
            Q(username__icontains=query) | Q(display_name__icontains=query)
        )
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

class UploadAvatarView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]  # Use this to handle file uploads

    def post(self, request, username, format=None):
        try:
            user = MyUser.objects.get(username=username)
            if user != request.user:  # Ensure the user is updating their own avatar
                return Response({"detail": "You can only upload your own avatar."}, status=status.HTTP_403_FORBIDDEN)

            avatar = request.FILES.get("avatar")  # Getting the file from the request

            if avatar:
                # Save the avatar (using the correct field name: avatar)
                user.avatar = avatar
                user.save()

                # Now we can get the URL of the avatar
                avatar_url = user.avatar.url  # This will give the URL of the avatar file

                return Response({"avatar_url": avatar_url})
            return Response({"detail": "No avatar file provided."}, status=status.HTTP_400_BAD_REQUEST)
        except MyUser.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)


class UpdateProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, username, format=None):
        try:
            user = MyUser.objects.get(username=username)
            if user != request.user:  # Ensure the logged-in user is updating their own profile
                return Response({"detail": "You can only edit your own profile."}, status=status.HTTP_403_FORBIDDEN)
            serializer = UserSerializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except MyUser.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)