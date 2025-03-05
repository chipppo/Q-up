from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Q
from django.core.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import JsonResponse
from .models import Game, MyUser, GameStats, RankSystem, RankTier, PlayerGoal, GameRanking, Post, Like, Comment
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
    RankTierSerializer,
    PlayerGoalSerializer,
    GameRankingSerializer,
    PostSerializer,
    PostDetailSerializer,
    CommentSerializer,
    ReplySerializer,
    LikeSerializer,
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


class GameListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        games = Game.objects.all()
        serializer = GameSerializer(games, many=True)
        return Response(serializer.data)


class GameStatsListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, username, format=None):
        try:
            user = MyUser.objects.get(username=username)
            game_stats = GameStats.objects.filter(user=user)
            serializer = GameStatsSerializer(game_stats, many=True)
            return Response(serializer.data)
        except MyUser.DoesNotExist:
            return Response({'detail': 'User not found'}, status=404)

    def post(self, request, username):
        try:
            user = MyUser.objects.get(username=username)
            
            # Check if the user is trying to add stats for their own profile
            if request.user != user:
                return Response({'detail': 'You can only add game stats to your own profile'}, status=403)
            
            # Get the game instance
            game_id = request.data.get('game_id')
            try:
                game = Game.objects.get(id=game_id)
            except Game.DoesNotExist:
                return Response({'detail': 'Game not found'}, status=404)
            
            # Check if stats already exist for this game
            if GameStats.objects.filter(user=user, game=game).exists():
                return Response({'detail': 'Stats for this game already exist'}, status=400)

            # Get player goal if provided
            player_goal_id = request.data.get('player_goal')
            player_goal = None
            if player_goal_id:
                try:
                    player_goal = PlayerGoal.objects.get(id=player_goal_id)
                except PlayerGoal.DoesNotExist:
                    return Response({'detail': 'Player goal not found'}, status=404)
            
            # Create the game stats
            game_stats = GameStats.objects.create(
                user=user,
                game=game,
                hours_played=request.data.get('hours_played', 0),
                player_goal=player_goal
            )
            
            # Handle rankings if provided
            rankings_data = request.data.get('rankings', [])
            for ranking_data in rankings_data:
                try:
                    rank_system = RankSystem.objects.get(id=ranking_data.get('rank_system_id'))
                    GameRanking.objects.create(
                        game_stats=game_stats,
                        rank_system=rank_system,
                        rank_id=ranking_data.get('rank_id'),
                        numeric_rank=ranking_data.get('numeric_rank')
                    )
                except RankSystem.DoesNotExist:
                    continue
            
            serializer = GameStatsSerializer(game_stats)
            return Response(serializer.data, status=201)
            
        except MyUser.DoesNotExist:
            return Response({'detail': 'User not found'}, status=404)


class GameStatsUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, username, game_id):
        try:
            user = MyUser.objects.get(username=username)
            game_stats = GameStats.objects.get(user=user, game_id=game_id)
            serializer = GameStatsSerializer(game_stats)
            return Response(serializer.data)
        except (MyUser.DoesNotExist, GameStats.DoesNotExist):
            return Response({'detail': 'Stats not found'}, status=404)

    def patch(self, request, username, game_id):
        try:
            user = MyUser.objects.get(username=username)
            
            # Check if the user is trying to update their own stats
            if request.user != user:
                return Response({'detail': 'You can only update your own game stats'}, status=403)
            
            game_stats = GameStats.objects.get(user=user, game_id=game_id)
            
            # Update hours played if provided
            if 'hours_played' in request.data:
                game_stats.hours_played = request.data['hours_played']

            # Update player goal if provided
            if 'player_goal' in request.data:
                player_goal_id = request.data['player_goal']
                if player_goal_id is None:
                    game_stats.player_goal = None
                else:
                    try:
                        player_goal = PlayerGoal.objects.get(id=player_goal_id)
                        game_stats.player_goal = player_goal
                    except PlayerGoal.DoesNotExist:
                        return Response({'detail': 'Player goal not found'}, status=404)

            # Save the changes
            game_stats.save()
            
            # Update rankings if provided
            if 'rankings' in request.data:
                rankings_data = request.data['rankings']
                
                # Remove existing rankings
                game_stats.rankings.all().delete()
                
                # Create new rankings
                for ranking_data in rankings_data:
                    try:
                        rank_system = RankSystem.objects.get(id=ranking_data.get('rank_system_id'))
                        GameRanking.objects.create(
                            game_stats=game_stats,
                            rank_system=rank_system,
                            rank_id=ranking_data.get('rank_id'),
                            numeric_rank=ranking_data.get('numeric_rank')
                        )
                    except RankSystem.DoesNotExist:
                        continue
            
            serializer = GameStatsSerializer(game_stats)
            return Response(serializer.data)
            
        except MyUser.DoesNotExist:
            return Response({'detail': 'User not found'}, status=404)
        except GameStats.DoesNotExist:
            return Response({'detail': 'Stats not found'}, status=404)

    def delete(self, request, username, game_id):
        try:
            user = MyUser.objects.get(username=username)
            
            # Check if the user is trying to delete their own stats
            if request.user != user:
                return Response({'detail': 'You can only delete your own game stats'}, status=403)
            
            game_stats = GameStats.objects.get(user=user, game_id=game_id)
            game_stats.delete()
            return Response(status=204)
            
        except (MyUser.DoesNotExist, GameStats.DoesNotExist):
            return Response({'detail': 'Stats not found'}, status=404)


class SearchView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, format=None):
        query = request.query_params.get("q", "")
        
        # Start with a base queryset
        users = MyUser.objects.all()
        
        # Apply text search if query is provided
        if query:
            users = users.filter(
                Q(username__icontains=query) | 
                Q(display_name__icontains=query) |
                Q(bio__icontains=query)
            )
        
        # Filter by platforms
        platforms = request.query_params.get("platforms")
        if platforms:
            platform_list = platforms.split(",")
            # Filter users who have at least one of the specified platforms
            platform_users = []
            for user in users:
                if any(platform in user.platforms for platform in platform_list):
                    platform_users.append(user.id)
            users = users.filter(id__in=platform_users)
        
        # Filter by languages
        languages = request.query_params.get("languages")
        if languages:
            language_list = languages.split(",")
            # Filter users who have at least one of the specified languages
            language_users = []
            for user in users:
                if any(language in user.language_preference for language in language_list):
                    language_users.append(user.id)
            users = users.filter(id__in=language_users)
        
        # Filter by active hours
        active_hours = request.query_params.get("active_hours")
        if active_hours:
            hours_list = active_hours.split(",")
            
            # The hours are already in UTC from the frontend
            # We need to convert them to each user's local time for comparison
            active_users = []
            
            for user in users:
                user_timezone_offset = user.timezone_offset
                
                # Convert the requested hours to the user's timezone
                user_local_hours = []
                for hour in hours_list:
                    if hour:  # Skip empty strings
                        hour_parts = hour.split(':')
                        if len(hour_parts) == 2:
                            hour_num = int(hour_parts[0])
                            minute_str = hour_parts[1]
                            
                            # Convert UTC hour to user's local hour
                            local_hour = (hour_num + user_timezone_offset) % 24
                            local_hour_str = f"{local_hour:02d}:{minute_str}"
                            user_local_hours.append(local_hour_str)
                
                # Check if any of the user's active hours match the converted search hours
                if any(hour in user.active_hours for hour in user_local_hours):
                    active_users.append(user.id)
            
            if hours_list:  # Only apply filter if we have valid hours
                users = users.filter(id__in=active_users)
        
        # Filter by mic availability
        mic_available = request.query_params.get("mic_available")
        if mic_available is not None:
            mic_bool = mic_available.lower() == 'true'
            users = users.filter(mic_available=mic_bool)
        
        # Filter by games
        games = request.query_params.get("games")
        if games:
            game_ids = games.split(",")
            # Find users who play these games
            users = users.filter(game_stats__game__id__in=game_ids).distinct()
        
        # Filter by player goals
        player_goals = request.query_params.get("player_goals")
        if player_goals:
            goal_ids = player_goals.split(",")
            # Find users who have these player goals
            users = users.filter(game_stats__player_goal__id__in=goal_ids).distinct()
        
        # Filter by minimum hours played
        min_hours_played = request.query_params.get("min_hours_played")
        if min_hours_played and min_hours_played.isdigit():
            # Find users who have played at least this many hours in any game
            users = users.filter(game_stats__hours_played__gte=int(min_hours_played)).distinct()
        
        # Serialize and return the filtered users
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

class RankingSystemListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, game_id):
        try:
            ranking_systems = RankSystem.objects.filter(game_id=game_id)
            serializer = RankSystemSerializer(ranking_systems, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class RankTierListView(APIView):
    """
    Retrieve rank tiers for a specific ranking system.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, rank_system_id):
        try:
            rank_tiers = RankTier.objects.filter(rank_system_id=rank_system_id).order_by('order')
            serializer = RankTierSerializer(rank_tiers, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class PlayerGoalListView(APIView):
    """
    List and create player goals.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            player_goals = PlayerGoal.objects.all()
            serializer = PlayerGoalSerializer(player_goals, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        """Create a new player goal"""
        if not request.user.is_staff:  # Only staff can create player goals
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = PlayerGoalSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PlayerGoalDetailView(APIView):
    """
    Retrieve, update or delete a player goal.
    """
    permission_classes = [permissions.IsAdminUser]  # Only admin users can modify player goals

    def get(self, request, goal_id):
        try:
            goal = PlayerGoal.objects.get(id=goal_id)
            serializer = PlayerGoalSerializer(goal)
            return Response(serializer.data)
        except PlayerGoal.DoesNotExist:
            return Response({"detail": "Player goal not found"}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, goal_id):
        try:
            goal = PlayerGoal.objects.get(id=goal_id)
            serializer = PlayerGoalSerializer(goal, data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except PlayerGoal.DoesNotExist:
            return Response({"detail": "Player goal not found"}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, goal_id):
        try:
            goal = PlayerGoal.objects.get(id=goal_id)
            goal.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except PlayerGoal.DoesNotExist:
            return Response({"detail": "Player goal not found"}, status=status.HTTP_404_NOT_FOUND)

# New views for social features

class PostListView(APIView):
    """
    List all posts or create a new post.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get(self, request):
        """Get all posts from users the current user follows + their own posts"""
        following_users = request.user.following.all()
        posts = Post.objects.filter(
            Q(user=request.user) | Q(user__in=following_users)
        ).select_related('user', 'game').order_by('-created_at')
        
        # Add pagination
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 20))
        start = (page - 1) * limit
        end = start + limit
        
        # Slice the queryset for pagination
        paginated_posts = posts[start:end]
        
        serializer = PostSerializer(paginated_posts, many=True, context={'request': request})
        return Response(serializer.data)
    
    def post(self, request):
        """Create a new post"""
        serializer = PostSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            # Handle game reference if provided
            game_id = request.data.get('game')
            game = None
            if game_id:
                try:
                    game = Game.objects.get(id=game_id)
                except Game.DoesNotExist:
                    return Response(
                        {"detail": "Game not found."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            post = serializer.save(user=request.user, game=game)
            return Response(
                PostSerializer(post, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserPostsView(APIView):
    """
    List all posts by a specific user.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, username):
        try:
            user = MyUser.objects.get(username=username)
            posts = Post.objects.filter(user=user).select_related('user', 'game').order_by('-created_at')
            serializer = PostSerializer(posts, many=True, context={'request': request})
            return Response(serializer.data)
        except MyUser.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )

class PostDetailView(APIView):
    """
    Retrieve, update or delete a post.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
            serializer = PostDetailSerializer(post, context={'request': request})
            return Response(serializer.data)
        except Post.DoesNotExist:
            return Response(
                {"detail": "Post not found."},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def patch(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
            
            # Check if the user is the owner of the post
            if post.user != request.user:
                return Response(
                    {"detail": "You can only update your own posts."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            serializer = PostSerializer(post, data=request.data, partial=True, context={'request': request})
            if serializer.is_valid():
                # Handle game reference if provided
                game_id = request.data.get('game')
                if game_id:
                    try:
                        game = Game.objects.get(id=game_id)
                        post.game = game
                    except Game.DoesNotExist:
                        return Response(
                            {"detail": "Game not found."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                
                post = serializer.save()
                return Response(PostSerializer(post, context={'request': request}).data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Post.DoesNotExist:
            return Response(
                {"detail": "Post not found."},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def delete(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
            
            # Check if the user is the owner of the post
            if post.user != request.user:
                return Response(
                    {"detail": "You can only delete your own posts."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            post.delete()
            return Response(
                {"detail": "Post deleted successfully."},
                status=status.HTTP_204_NO_CONTENT
            )
        except Post.DoesNotExist:
            return Response(
                {"detail": "Post not found."},
                status=status.HTTP_404_NOT_FOUND
            )

class LikeView(APIView):
    """
    Like or unlike a post.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
            
            # Check if the user already liked this post
            like, created = Like.objects.get_or_create(user=request.user, post=post)
            
            if created:
                return Response(
                    {"detail": "Post liked successfully."},
                    status=status.HTTP_201_CREATED
                )
            else:
                return Response(
                    {"detail": "You already liked this post."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Post.DoesNotExist:
            return Response(
                {"detail": "Post not found."},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def delete(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
            
            # Try to find and delete the like
            try:
                like = Like.objects.get(user=request.user, post=post)
                like.delete()
                return Response(
                    {"detail": "Post unliked successfully."},
                    status=status.HTTP_204_NO_CONTENT
                )
            except Like.DoesNotExist:
                return Response(
                    {"detail": "You haven't liked this post."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Post.DoesNotExist:
            return Response(
                {"detail": "Post not found."},
                status=status.HTTP_404_NOT_FOUND
            )

class LikesListView(APIView):
    """
    List all users who liked a post.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
            likes = Like.objects.filter(post=post).select_related('user')
            serializer = LikeSerializer(likes, many=True)
            return Response(serializer.data)
        except Post.DoesNotExist:
            return Response(
                {"detail": "Post not found."},
                status=status.HTTP_404_NOT_FOUND
            )

class CommentView(APIView):
    """
    Create, update or delete a comment.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
            
            # Check if this is a reply to another comment
            parent_id = request.data.get('parent')
            parent = None
            if parent_id:
                try:
                    parent = Comment.objects.get(id=parent_id, post=post)
                except Comment.DoesNotExist:
                    return Response(
                        {"detail": "Parent comment not found."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Create the comment
            comment = Comment.objects.create(
                user=request.user,
                post=post,
                text=request.data.get('text', ''),
                parent=parent
            )
            
            if parent:
                serializer = ReplySerializer(comment)
            else:
                serializer = CommentSerializer(comment)
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Post.DoesNotExist:
            return Response(
                {"detail": "Post not found."},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def delete(self, request, comment_id):
        try:
            comment = Comment.objects.get(id=comment_id)
            
            # Check if the user is the owner of the comment
            if comment.user != request.user:
                return Response(
                    {"detail": "You can only delete your own comments."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            comment.delete()
            return Response(
                {"detail": "Comment deleted successfully."},
                status=status.HTTP_204_NO_CONTENT
            )
        except Comment.DoesNotExist:
            return Response(
                {"detail": "Comment not found."},
                status=status.HTTP_404_NOT_FOUND
            )

class CommentRepliesView(APIView):
    """
    List all replies to a comment.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, comment_id):
        try:
            comment = Comment.objects.get(id=comment_id)
            replies = comment.replies.all().order_by('created_at')
            serializer = ReplySerializer(replies, many=True, context={'request': request})
            return Response(serializer.data)
        except Comment.DoesNotExist:
            return Response({'detail': 'Comment not found'}, status=404)
        except Exception as e:
            return Response({'detail': str(e)}, status=500)