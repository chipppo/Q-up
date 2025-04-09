from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from ..models import MyUser
from ..serializers import (
    UserSerializer,
    FollowSerializer,
    AvatarUploadSerializer,
)
import json
from django.core.exceptions import ValidationError
from datetime import datetime
from django.db.models import Q

"""
This module handles all the user-related API endpoints like:
- Getting user profiles
- Updating profiles
- Avatar uploads
- Following/unfollowing users
- Getting followers and following lists
"""

class UserDetailView(APIView):
    """
    Gets a user's profile info by username.
    This endpoint is public so anyone can view profiles.
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, username, format=None):
        """
        GET method to retrieve a user's profile.
        
        Args:
            request: The HTTP request
            username: The username to look up
            
        Returns:
            User profile data or 404 if user not found
        """
        try:
            user = MyUser.objects.get(username=username)
            serializer = UserSerializer(user)
            return Response(serializer.data)
        except MyUser.DoesNotExist:
            return Response({"detail": "Потребителят не е намерен."}, status=status.HTTP_404_NOT_FOUND)


class UpdateProfileView(APIView):
    """
    Updates a user's profile information.
    Users can only update their own profiles.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request, username):
        """
        PATCH method to update profile data.
        Handles complex fields like JSON arrays and date formatting.
        
        Args:
            request: Contains all the updated profile data
            username: Username of profile to update
            
        Returns:
            Updated profile data or error messages
        """
        try:
            user = MyUser.objects.get(username=username)
            if user != request.user:
                return Response(
                    {"detail": "Можете да редактирате само собствения си профил."},
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
                            {field: "Невалиден JSON формат"},
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
                                {"date_of_birth": "Невалиден формат на дата. Използвайте ДД/ММ/ГГГГ"},
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
                                    {"timezone_offset": "Трябва да бъде между -12 и +14"},
                                    status=status.HTTP_400_BAD_REQUEST
                                )
                        except ValueError:
                            return Response(
                                {"timezone_offset": "Трябва да бъде число"},
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
                {"detail": "Потребителят не е намерен."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class UploadAvatarView(APIView):
    """
    Special endpoint just for uploading profile pictures.
    This is separate from the main profile update to make avatar
    uploads easier and faster.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, username):
        """
        POST method to upload a new avatar image.
        
        Args:
            request: Contains the image file
            username: User to update
            
        Returns:
            Success message with the avatar URL or error
        """
        if request.user.username != username:
            return Response(
                {"detail": "Можете да качвате само своя аватар."},
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
            "detail": "Аватарът е актуализиран успешно",
            "avatar_url": request.build_absolute_uri(request.user.avatar.url)
        })


class FollowUserView(APIView):
    """
    Lets users follow other users.
    Works like following on Instagram or Twitter.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        """
        POST method to follow another user.
        
        Args:
            request: The HTTP request
            username: User to follow
            
        Returns:
            Success message or error
        """
        serializer = FollowSerializer(data={'username': username})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        to_follow = MyUser.objects.get(username=username)
        if to_follow == request.user:
            return Response(
                {"detail": "Не можете да следвате себе си."},
                status=status.HTTP_400_BAD_REQUEST
            )

        request.user.following.add(to_follow)
        return Response({"detail": f"Вече следвате {username}"})


class UnfollowUserView(APIView):
    """
    Lets users unfollow other users they're currently following.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        """
        POST method to unfollow a user.
        
        Args:
            request: The HTTP request
            username: User to unfollow
            
        Returns:
            Success message or error
        """
        serializer = FollowSerializer(data={'username': username})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        to_unfollow = MyUser.objects.get(username=username)
        request.user.following.remove(to_unfollow)
        return Response({"detail": f"Спряхте да следвате {username}"})


class FollowersListView(APIView):
    """
    Gets a list of users who follow a specific user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, username):
        """
        GET method to list a user's followers.
        
        Args:
            request: The HTTP request
            username: User whose followers to get
            
        Returns:
            List of followers or error
        """
        try:
            user = MyUser.objects.get(username=username)
            followers = user.followers.all()
            serializer = UserSerializer(followers, many=True)
            return Response(serializer.data)
        except MyUser.DoesNotExist:
            return Response(
                {"detail": "Потребителят не е намерен."},
                status=status.HTTP_404_NOT_FOUND
            )


class FollowingListView(APIView):
    """
    Gets a list of users that a specific user is following.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, username):
        """
        GET method to list users the specified user is following.
        
        Args:
            request: The HTTP request
            username: User whose following list to get
            
        Returns:
            List of users being followed or error
        """
        try:
            user = MyUser.objects.get(username=username)
            following = user.following.all()
            serializer = UserSerializer(following, many=True)
            return Response(serializer.data)
        except MyUser.DoesNotExist:
            return Response(
                {"detail": "Потребителят не е намерен."},
                status=status.HTTP_404_NOT_FOUND
            )


class MutualFollowersView(APIView):
    """
    Finds mutual followers between users - basically people who 
    both follow each other. This is useful for finding friends
    who also follow you back.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, username):
        """
        GET method to search for mutual followers.
        
        Args:
            request: The HTTP request with search query
            username: User to find mutual followers for
            
        Returns:
            List of mutual followers matching search query
        """
        try:
            # Get the user
            try:
                user = MyUser.objects.get(username=username)
            except MyUser.DoesNotExist:
                return Response(
                    {"detail": "Потребителят не е намерен"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get the search query
            query = request.query_params.get('q', '').strip()
            if not query:
                return Response([])

            try:
                # Get mutual followers
                followers = user.followers.all()
                print(f"Found {followers.count()} followers")
                
                following = user.following.all()
                print(f"Found {following.count()} following")
                
                # Use filter instead of intersection for better compatibility
                mutual = followers.filter(pk__in=following.values_list('pk', flat=True))
                print(f"Found {mutual.count()} mutual followers")

                # Filter by search query
                mutual = mutual.filter(
                    Q(username__icontains=query) |
                    Q(display_name__icontains=query)
                )
                print(f"Found {mutual.count()} matches for query '{query}'")

                serializer = UserSerializer(mutual, many=True, context={'request': request})
                return Response(serializer.data)
            except Exception as inner_e:
                print(f"Inner error in MutualFollowersView: {str(inner_e)}")
                raise
        except Exception as e:
            print(f"Error in MutualFollowersView.get: {str(e)}")
            return Response(
                {"detail": "Неуспешно търсене на взаимни последователи"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 