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
import json
from django.core.validators import validate_email

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
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request, username):
        try:
            user = MyUser.objects.get(username=username)
            if user != request.user:
                return Response(
                    {"detail": "You can only edit your own profile."},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Handle all editable fields
            editable_fields = [
                'display_name', 'bio', 'timezone', 'date_of_birth',
                'language_preference', 'platforms', 'mic_available',
                'social_links', 'active_hours'
            ]

            for field in editable_fields:
                if field in request.data:
                    # Handle list fields
                    if field in ['language_preference', 'platforms', 'social_links']:
                        if isinstance(request.data[field], str):
                            try:
                                value = json.loads(request.data[field])
                                setattr(user, field, value)
                            except json.JSONDecodeError:
                                pass
                        else:
                            setattr(user, field, request.data[field])
                    else:
                        setattr(user, field, request.data[field])

            user.save()
            serializer = UserSerializer(user)
            return Response(serializer.data)

        except MyUser.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValidationError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


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

    def patch(self, request, username, game_id):
        try:
            if request.user.username != username:
                return Response(
                    {"detail": "You can only update your own game stats."},
                    status=status.HTTP_403_FORBIDDEN
                )

            game_stats = GameStats.objects.get(user=request.user, game_id=game_id)
            serializer = GameStatsSerializer(game_stats, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except GameStats.DoesNotExist:
            return Response(
                {"detail": "Game stats not found."},
                status=status.HTTP_404_NOT_FOUND
            )


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
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, username):
        try:
            user = MyUser.objects.get(username=username)
            if user != request.user:
                return Response({"detail": "You can only upload your own avatar."},
                             status=status.HTTP_403_FORBIDDEN)

            avatar = request.FILES.get("avatar")
            if not avatar:
                return Response({"detail": "No avatar file provided."},
                             status=status.HTTP_400_BAD_REQUEST)

            # Validate file type
            allowed_types = ['image/jpeg', 'image/png', 'image/gif']
            if avatar.content_type not in allowed_types:
                return Response({"detail": "Invalid file type. Please upload a JPEG, PNG, or GIF."},
                             status=status.HTTP_400_BAD_REQUEST)

            # Delete old avatar if it exists
            if user.avatar:
                user.avatar.delete(save=False)

            # Save new avatar
            user.avatar = avatar
            user.save()

            return Response({
                "detail": "Avatar updated successfully",
                "avatar_url": request.build_absolute_uri(user.avatar.url)
            })

        except MyUser.DoesNotExist:
            return Response({"detail": "User not found."},
                          status=status.HTTP_404_NOT_FOUND)


class FollowUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        try:
            to_follow = MyUser.objects.get(username=username)
            if to_follow == request.user:
                return Response(
                    {"detail": "You cannot follow yourself."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            request.user.following.add(to_follow)
            return Response({"detail": f"You are now following {username}"})

        except MyUser.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )

class UnfollowUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        try:
            to_unfollow = MyUser.objects.get(username=username)
            request.user.following.remove(to_unfollow)
            return Response({"detail": f"You have unfollowed {username}"})

        except MyUser.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )

class FollowersListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, username):
        try:
            user = MyUser.objects.get(username=username)
            followers = user.followers.all()
            serializer = UserSerializer(followers, many=True)
            return Response(serializer.data)
        except MyUser.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )

class FollowingListView(APIView):
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

class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        if request.user.username != username:
            return Response(
                {"detail": "You can only change your own password."},
                status=status.HTTP_403_FORBIDDEN
            )

        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response(
                {"detail": "Both old and new passwords are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify old password
        if not request.user.check_password(old_password):
            return Response(
                {"detail": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Set new password
        request.user.set_password(new_password)
        request.user.save()

        return Response({"detail": "Password successfully updated."})