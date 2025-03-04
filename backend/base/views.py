from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Q
from django.core.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import JsonResponse
from .models import Game, MyUser, GameStats, RankSystem
from .serializers import (
    UserSerializer,
    RegisterUserSerializer,
    MyTokenObtainPairSerializer,
    GameStatsSerializer,
    FollowSerializer,
    PasswordChangeSerializer,
    AvatarUploadSerializer,
    GameSerializer,
    RankSystemSerializer,
)
import json
from django.core.validators import validate_email
from datetime import datetime

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


class RefreshTokenView(TokenRefreshView):
    """
    Refresh JWT access token using the provided refresh token.
    """
    pass  # Using the default TokenRefreshView from rest_framework_simplejwt


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

            # Handle JSON fields
            json_fields = ['active_hours', 'language_preference', 'platforms', 'social_links']
            for field in json_fields:
                if field in request.data:
                    try:
                        if isinstance(request.data[field], str):
                            setattr(user, field, json.loads(request.data[field]))
                        else:
                            setattr(user, field, request.data[field])
                    except json.JSONDecodeError:
                        return Response(
                            {field: "Invalid JSON format"},
                            status=status.HTTP_400_BAD_REQUEST
                        )

            # Handle other fields
            editable_fields = [
                'display_name', 'bio', 'timezone', 'timezone_offset',
                'date_of_birth', 'mic_available'
            ]

            for field in editable_fields:
                if field in request.data:
                    if field == 'date_of_birth':
                        try:
                            date_str = request.data[field]
                            if date_str:
                                date_obj = datetime.strptime(date_str, '%d/%m/%Y').date()
                                setattr(user, field, date_obj)
                        except ValueError:
                            return Response(
                                {"date_of_birth": "Invalid date format. Use DD/MM/YYYY"},
                                status=status.HTTP_400_BAD_REQUEST
                            )
                    elif field == 'mic_available':
                        setattr(user, field, request.data[field].lower() == 'true')
                    elif field == 'timezone_offset':
                        try:
                            offset = int(request.data[field])
                            if -12 <= offset <= 14:
                                setattr(user, field, offset)
                            else:
                                return Response(
                                    {"timezone_offset": "Must be between -12 and +14"},
                                    status=status.HTTP_400_BAD_REQUEST
                                )
                        except ValueError:
                            return Response(
                                {"timezone_offset": "Must be a number"},
                                status=status.HTTP_400_BAD_REQUEST
                            )
                    else:
                        setattr(user, field, request.data[field])

            # Handle avatar upload
            if 'avatar' in request.FILES:
                if user.avatar:
                    user.avatar.delete(save=False)
                user.avatar = request.FILES['avatar']

            try:
                user.full_clean()
                user.save()
                serializer = UserSerializer(user)
                return Response(serializer.data)
            except ValidationError as e:
                return Response(e.message_dict, status=status.HTTP_400_BAD_REQUEST)

        except MyUser.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
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
        if request.user.username != username:
            return Response(
                {"detail": "You can only upload your own avatar."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = AvatarUploadSerializer(data=request.FILES)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Delete old avatar if it exists
        if request.user.avatar:
            request.user.avatar.delete(save=False)

        # Save new avatar
        request.user.avatar = serializer.validated_data['avatar']
        request.user.save()

        return Response({
            "detail": "Avatar updated successfully",
            "avatar_url": request.build_absolute_uri(request.user.avatar.url)
        })


class FollowUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        serializer = FollowSerializer(data={'username': username})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        to_follow = MyUser.objects.get(username=username)
        if to_follow == request.user:
            return Response(
                {"detail": "You cannot follow yourself."},
                status=status.HTTP_400_BAD_REQUEST
            )

        request.user.following.add(to_follow)
        return Response({"detail": f"You are now following {username}"})

class UnfollowUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        serializer = FollowSerializer(data={'username': username})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        to_unfollow = MyUser.objects.get(username=username)
        request.user.following.remove(to_unfollow)
        return Response({"detail": f"You have unfollowed {username}"})

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

    def get(self, request, username):
        try:
            user = MyUser.objects.get(username=username)
            following = user.following.all()
            serializer = UserSerializer(following, many=True)
            return Response(serializer.data)
        except MyUser.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )

class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        if request.user.username != username:
            return Response(
                {"detail": "You can only change your own password."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = PasswordChangeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Verify old password
        if not request.user.check_password(serializer.validated_data['old_password']):
            return Response(
                {"detail": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Set new password
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()

        return Response({"detail": "Password successfully updated."})

class GameListView(APIView):
    """
    Retrieve a list of games.
    """
    def get(self, request):
        games = Game.objects.all()
        serializer = GameSerializer(games, many=True)
        return Response(serializer.data)

class RankingSystemListView(APIView):
    def get(self, request, game_id):
        try:
            ranking_systems = RankSystem.objects.filter(game_id=game_id)
            serializer = RankSystemSerializer(ranking_systems, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)