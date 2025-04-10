from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
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
            serializer = UserSerializer(user, context={'request': request})
            return Response(serializer.data)
        except MyUser.DoesNotExist:
            return Response({"detail": "Потребителят не е намерен."}, status=status.HTTP_404_NOT_FOUND)


class UpdateProfileView(APIView):
    """
    Updates the user's profile with new information.
    Only the authenticated user can update their own profile.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def patch(self, request, username, format=None):
        """Handle PATCH requests for backward compatibility with frontend"""
        return self.update_profile(request, username)
        
    def put(self, request, username, format=None):
        """Handle PUT requests"""
        return self.update_profile(request, username)
        
    def update_profile(self, request, username):
        """
        Common method to update a user's profile that works with both PATCH and PUT requests.
        
        Args:
            request: The HTTP request
            username: The username of the profile to update
            
        Returns:
            Updated profile data or error response
        """
        try:
            user = MyUser.objects.get(username=username)
            
            # Only allow users to edit their own profile (unless they're staff)
            if request.user != user and not request.user.is_staff:
                return Response(
                    {"detail": "Не можете да редактирате чужд профил!"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Handle JSON or form data
            data = None
            if request.content_type == 'application/json':
                data = request.data
            else:
                # Convert form data to dict
                data = dict(request.data.items())
            
            # Special fields that need preprocessing
            date_fields = ['date_of_birth']
            list_fields = ['active_hours', 'language_preference', 'platforms', 'social_links']
            
            # Process date fields
            for field in date_fields:
                if field in data and data[field]:
                    try:
                        # Parse date from frontend format (DD/MM/YYYY)
                        date_value = datetime.strptime(data[field], '%d/%m/%Y').date()
                        data[field] = date_value
                    except ValueError:
                        return Response(
                            {"detail": f"Невалиден формат на дата за {field}. Използвайте ДД/ММ/ГГГГ."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
            
            # Process JSON list fields
            for field in list_fields:
                if field in data:
                    # If the field is a string representation of list
                    if isinstance(data[field], str):
                        try:
                            data[field] = json.loads(data[field])
                        except json.JSONDecodeError:
                            # If not valid JSON, treat as comma-separated values
                            if data[field]:
                                data[field] = [item.strip() for item in data[field].split(',')]
                            else:
                                data[field] = []
           
           #Debug avatar upload
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Avatar upload - Request method: {request.method}")
            logger.error(f"Avatar upload - Content-Type: {request.content_type}")
            logger.error(f"Avatar upload - FILES keys: {list(request.FILES.keys())}")
            logger.error(f"Avatar upload - POST keys: {list(request.data.keys())}")
            logger.error(f"Avatar upload - Headers: {dict(request.headers)}")

            # Handle avatar upload
            if 'avatar' in request.FILES:
                logger.error(f"Avatar found in request.FILES - Name: {request.FILES['avatar'].name}, Size: {request.FILES['avatar'].size}")
                try:
                    if user.avatar:
                        logger.error(f"Deleting existing avatar: {user.avatar.name}")
                        user.avatar.delete(save=False)
                    user.avatar = request.FILES['avatar']
                    logger.error(f"Avatar assigned to user model: {user.avatar.name}")
                    
                    # Try accessing the file to verify it was uploaded to storage
                    try:
                        from django.core.files.storage import default_storage
                        if default_storage.exists(user.avatar.name):
                            logger.error(f"File exists in storage at: {user.avatar.name}")
                            logger.error(f"File URL: {user.avatar.url}")
                        else:
                            logger.error(f"File doesn't exist in storage: {user.avatar.name}")
                    except Exception as e:
                        logger.error(f"Error checking file existence: {str(e)}")
                        import traceback
                        logger.error(traceback.format_exc())
                except Exception as e:
                    logger.error(f"Error handling avatar: {str(e)}")
                    import traceback
                    logger.error(traceback.format_exc())
            else:
                logger.error("No avatar found in request.FILES")

            try:
                user.full_clean()
                user.save()
                logger.error(f"User saved successfully. Avatar URL: {user.avatar.url if user.avatar else 'None'}")
                serializer = UserSerializer(user, context={'request': request})
                return Response(serializer.data)
            except ValidationError as e:
                logger.error(f"Validation error: {e.message_dict}")
                return Response(e.message_dict, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error(f"Error saving user: {str(e)}")
                import traceback
                logger.error(traceback.format_exc())
                return Response(
                    {"detail": str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )

        except MyUser.DoesNotExist:
            return Response(
                {"detail": "Потребителят не е намерен."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
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
