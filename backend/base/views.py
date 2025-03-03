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
            game_stats = GameStats.objects.filter(user=user).prefetch_related(
                'rankings', 'rankings__rank_system', 'rankings__rank', 'game', 'player_goal'
            )
            serializer = GameStatsSerializer(game_stats, many=True)
            return Response(serializer.data)
        except MyUser.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, username):
        if request.user.username != username:
            return Response(
                {"detail": "You can only add your own game stats."},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            # Extract rankings data
            rankings_data = request.data.pop('rankings', [])
            
            # Handle game ID - it might be an ID or an object
            game_data = request.data.get('game')
            if isinstance(game_data, dict) and 'id' in game_data:
                request.data['game'] = game_data['id']
                
            # Handle player_goal - it might be an ID or an object
            player_goal = request.data.get('player_goal')
            if isinstance(player_goal, dict) and 'id' in player_goal:
                request.data['player_goal'] = player_goal['id']
            
            # Create GameStats instance
            serializer = GameStatsSerializer(
                data=request.data,
                context={'rankings': rankings_data}
            )
            
            if serializer.is_valid():
                game_stats = serializer.save(user=request.user)
                return Response(GameStatsSerializer(game_stats).data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class GameStatsUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, username, game_id):
        try:
            game_stats = GameStats.objects.prefetch_related(
                'rankings', 'rankings__rank_system', 'rankings__rank', 'game', 'player_goal'
            ).get(
                user__username=username,
                game_id=game_id
            )
            serializer = GameStatsSerializer(game_stats)
            return Response(serializer.data)
        except GameStats.DoesNotExist:
            return Response(
                {"detail": "Game stats not found."},
                status=status.HTTP_404_NOT_FOUND
            )

    def patch(self, request, username, game_id):
        try:
            if request.user.username != username:
                return Response(
                    {"detail": "You can only update your own game stats."},
                    status=status.HTTP_403_FORBIDDEN
                )

            game_stats = GameStats.objects.get(user=request.user, game_id=game_id)
            
            # Extract rankings data
            rankings_data = request.data.pop('rankings', [])
            
            # Handle player_goal - it might be an ID or an object
            player_goal = request.data.get('player_goal')
            if isinstance(player_goal, dict) and 'id' in player_goal:
                request.data['player_goal'] = player_goal['id']
            
            serializer = GameStatsSerializer(
                game_stats,
                data=request.data,
                partial=True,
                context={'rankings': rankings_data}
            )
            
            if serializer.is_valid():
                game_stats = serializer.save()
                return Response(GameStatsSerializer(game_stats).data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except GameStats.DoesNotExist:
            return Response(
                {"detail": "Game stats not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SearchView(APIView):
    permission_classes = [permissions.AllowAny]

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
    Retrieve all player goals.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            player_goals = PlayerGoal.objects.all()
            serializer = PlayerGoalSerializer(player_goals, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

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
        
        serializer = PostSerializer(posts, many=True, context={'request': request})
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
            replies = Comment.objects.filter(parent=comment).select_related('user')
            serializer = ReplySerializer(replies, many=True)
            return Response(serializer.data)
        except Comment.DoesNotExist:
            return Response(
                {"detail": "Comment not found."},
                status=status.HTTP_404_NOT_FOUND
            )