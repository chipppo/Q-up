from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Q
from django.core.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import JsonResponse
from .models import Game, MyUser, GameStats, RankSystem, RankTier, PlayerGoal, GameRanking, Post, Like, Comment, Chat, Message
from .serializers import (
    UserSerializer,
    RegisterUserSerializer,
    MyTokenObtainPairSerializer,
    GameStatsSerializer,
    FollowSerializer,
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
    ChatSerializer,
    MessageSerializer
)
import json
from django.core.validators import validate_email
from datetime import datetime
from django.db.models import Count
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from django.http import Http404
from django.utils.dateparse import parse_datetime

# Публичен достъп до профили
class UserDetailView(APIView):
    """
    Извличане на профилна информация по потребителско име.
    Тази крайна точка е публична.
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, username, format=None):
        try:
            user = MyUser.objects.get(username=username)
            serializer = UserSerializer(user)
            return Response(serializer.data)
        except MyUser.DoesNotExist:
            return Response({"detail": "Потребителят не е намерен."}, status=status.HTTP_404_NOT_FOUND)


# Създаване на нов акаунт
class RegisterUserView(APIView):
    """
    Регистриране на нов потребител и предоставяне на JWT токени.
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


# Влизане в системата
class LoginUserView(TokenObtainPairView):
    """
    Вход и получаване на JWT токени.
    """
    serializer_class = MyTokenObtainPairSerializer  # Use the custom serializer


class RefreshTokenView(TokenRefreshView):
    """
    Обновяване на JWT токен за достъп чрез предоставения опресняващ токен.
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


# Списък игри
class GameListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        games = Game.objects.all()
        serializer = GameSerializer(games, many=True)
        return Response(serializer.data)


# Игрови статистики на потребител
class GameStatsListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, username, format=None):
        try:
            user = MyUser.objects.get(username=username)
            game_stats = GameStats.objects.filter(user=user)
            serializer = GameStatsSerializer(game_stats, many=True)
            return Response(serializer.data)
        except MyUser.DoesNotExist:
            return Response({'detail': 'Потребителят не е намерен'}, status=404)

    def post(self, request, username):
        try:
            user = MyUser.objects.get(username=username)
            
            # Check if the user is trying to add stats for their own profile
            if request.user != user:
                return Response({'detail': 'Можете да добавяте статистики само към собствения си профил'}, status=403)
            
            # Get the game instance
            game_id = request.data.get('game_id')
            try:
                game = Game.objects.get(id=game_id)
            except Game.DoesNotExist:
                return Response({'detail': 'Играта не е намерена'}, status=404)
            
            # Check if stats already exist for this game
            if GameStats.objects.filter(user=user, game=game).exists():
                return Response({'detail': 'Статистиките за тази игра вече съществуват'}, status=400)

            # Get player goal if provided
            player_goal_id = request.data.get('player_goal')
            player_goal = None
            if player_goal_id:
                try:
                    player_goal = PlayerGoal.objects.get(id=player_goal_id)
                except PlayerGoal.DoesNotExist:
                    return Response({'detail': 'Целта на играча не е намерена'}, status=404)
            
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
            return Response({'detail': 'Потребителят не е намерен'}, status=404)


# Статистика за конкретна игра
class GameStatsUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, username, game_id):
        try:
            user = MyUser.objects.get(username=username)
            game_stats = GameStats.objects.get(user=user, game_id=game_id)
            serializer = GameStatsSerializer(game_stats)
            return Response(serializer.data)
        except (MyUser.DoesNotExist, GameStats.DoesNotExist):
            return Response({'detail': 'Статистиките не са намерени'}, status=404)

    def patch(self, request, username, game_id):
        try:
            user = MyUser.objects.get(username=username)
            
            # Check if the user is trying to update their own stats
            if request.user != user:
                return Response({'detail': 'Можете да актуализирате само собствените си статистики'}, status=403)
            
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
                        return Response({'detail': 'Целта на играча не е намерена'}, status=404)

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
            return Response({'detail': 'Потребителят не е намерен'}, status=404)
        except GameStats.DoesNotExist:
            return Response({'detail': 'Статистиките не са намерени'}, status=404)

    def delete(self, request, username, game_id):
        try:
            user = MyUser.objects.get(username=username)
            
            # Check if the user is trying to delete their own stats
            if request.user != user:
                return Response({'detail': 'Можете да изтривате само собствените си статистики'}, status=403)
            
            game_stats = GameStats.objects.get(user=user, game_id=game_id)
            game_stats.delete()
            return Response(status=204)
            
        except (MyUser.DoesNotExist, GameStats.DoesNotExist):
            return Response({'detail': 'Статистиките не са намерени'}, status=404)


# Търсене с филтри
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
        if min_hours_played:
            try:
                min_hours = int(float(min_hours_played))
                # Find users who have played at least this many hours in any game
                users = users.filter(game_stats__hours_played__gte=min_hours).distinct()
            except (ValueError, TypeError):
                # If conversion fails, ignore this filter
                pass
        
        # Filter by game-specific minimum hours played
        for param, value in request.query_params.items():
            if param.startswith('min_hours_game_'):
                try:
                    game_id = param.replace('min_hours_game_', '')
                    min_hours = int(float(value))
                    # Find users who have played at least this many hours in this specific game
                    print(f"Filtering by game {game_id} with min hours {min_hours}")
                    users = users.filter(
                        game_stats__game__id=game_id,
                        game_stats__hours_played__gte=min_hours
                    ).distinct()
                    print(f"Users count after hours filter: {users.count()}")
                except (ValueError, TypeError):
                    # If conversion fails, ignore this filter
                    pass
        
        # Filter by game-specific goals
        for param, value in request.query_params.items():
            if param.startswith('goals_game_'):
                try:
                    game_id = param.replace('goals_game_', '')
                    goal_ids = value.split(',')
                    print(f"Filtering by game {game_id} with goals {goal_ids}")
                    
                    # Use OR between different goals for the same game
                    # A user matches if they have ANY of the selected goals for this game
                    game_goals_filter = Q()
                    for goal_id in goal_ids:
                        game_goals_filter |= Q(game_stats__game__id=game_id, game_stats__player_goal__id=goal_id)
                    
                    # This creates an AND between previously filtered users (which may include hours filter)
                    # and the goals filter
                    users = users.filter(game_goals_filter).distinct()
                    print(f"Users count after goals filter: {users.count()}")
                except Exception as e:
                    print(f"Error processing game goals filter: {e}")
                    # If any error occurs, ignore this filter
                    pass
        
        # Serialize and return the filtered users
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

class UploadAvatarView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, username):
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
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
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
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        serializer = FollowSerializer(data={'username': username})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        to_unfollow = MyUser.objects.get(username=username)
        request.user.following.remove(to_unfollow)
        return Response({"detail": f"Спряхте да следвате {username}"})

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
                {"detail": "Потребителят не е намерен."},
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
                {"detail": "Потребителят не е намерен."},
                status=status.HTTP_404_NOT_FOUND
            )

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
    Извличане на ранг нива за конкретна ранкинг система.
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
    Списък и създаване на цели за играчи.
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
        """Създаване на нова цел за играч"""
        if not request.user.is_staff:  # Only staff can create player goals
            return Response({"detail": "Достъпът е отказан"}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = PlayerGoalSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PlayerGoalDetailView(APIView):
    """
    Извличане, актуализиране или изтриване на цел за играч.
    """
    permission_classes = [permissions.IsAdminUser]  # Only admin users can modify player goals

    def get(self, request, goal_id):
        try:
            goal = PlayerGoal.objects.get(id=goal_id)
            serializer = PlayerGoalSerializer(goal)
            return Response(serializer.data)
        except PlayerGoal.DoesNotExist:
            return Response({"detail": "Целта на играча не е намерена"}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, goal_id):
        try:
            goal = PlayerGoal.objects.get(id=goal_id)
            serializer = PlayerGoalSerializer(goal, data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except PlayerGoal.DoesNotExist:
            return Response({"detail": "Целта на играча не е намерена"}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, goal_id):
        try:
            goal = PlayerGoal.objects.get(id=goal_id)
            goal.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except PlayerGoal.DoesNotExist:
            return Response({"detail": "Целта на играча не е намерена"}, status=status.HTTP_404_NOT_FOUND)

# New views for social features

class PostListView(APIView):
    """
    Списък на всички публикации или създаване на нова публикация.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get(self, request):
        """Получаване на всички публикации от потребители, които текущият потребител следва + собствените му публикации"""
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
        """Създаване на нова публикация"""
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
                        {"detail": "Играта не е намерена."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            post = serializer.save(user=request.user, game=game)
            return Response(
                PostSerializer(post, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Постове на потребител
class UserPostsView(APIView):
    """
    Списък на всички публикации от конкретен потребител.
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
                {"detail": "Потребителят не е намерен."},
                status=status.HTTP_404_NOT_FOUND
            )

# Работа с пост
class PostDetailView(APIView):
    """
    Извличане, актуализиране или изтриване на публикация.
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
                {"detail": "Публикацията не е намерена."},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def patch(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
            
            # Check if the user is the owner of the post
            if post.user != request.user:
                return Response(
                    {"detail": "Можете да актуализирате само собствените си публикации."},
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
                            {"detail": "Играта не е намерена."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                
                post = serializer.save()
                return Response(PostSerializer(post, context={'request': request}).data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Post.DoesNotExist:
            return Response(
                {"detail": "Публикацията не е намерена."},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def delete(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
            
            # Check if the user is the owner of the post
            if post.user != request.user:
                return Response(
                    {"detail": "Можете да изтривате само собствените си публикации."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            post.delete()
            return Response(
                {"detail": "Публикацията е изтрита успешно."},
                status=status.HTTP_204_NO_CONTENT
            )
        except Post.DoesNotExist:
            return Response(
                {"detail": "Публикацията не е намерена."},
                status=status.HTTP_404_NOT_FOUND
            )

# Лайкване на пост
class LikeView(APIView):
    """
    Харесване или отказ от харесване на публикация.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
            
            # Check if the user already liked this post
            like, created = Like.objects.get_or_create(user=request.user, post=post)
            
            if created:
                return Response(
                    {"detail": "Публикацията е харесана успешно."},
                    status=status.HTTP_201_CREATED
                )
            else:
                return Response(
                    {"detail": "Вече сте харесали тази публикация."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Post.DoesNotExist:
            return Response(
                {"detail": "Публикацията не е намерена."},
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
                    {"detail": "Отказахте харесването успешно."},
                    status=status.HTTP_204_NO_CONTENT
                )
            except Like.DoesNotExist:
                return Response(
                    {"detail": "Не сте харесали тази публикация."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Post.DoesNotExist:
            return Response(
                {"detail": "Публикацията не е намерена."},
                status=status.HTTP_404_NOT_FOUND
            )

# Потребители харесали пост
class LikesListView(APIView):
    """
    Списък на всички потребители, харесали публикация.
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
                {"detail": "Публикацията не е намерена."},
                status=status.HTTP_404_NOT_FOUND
            )

class CommentView(APIView):
    """
    Създаване, актуализиране или изтриване на коментар.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
            
            # Проверка дали това е отговор на друг коментар
            parent_id = request.data.get('parent')
            parent = None
            if parent_id:
                try:
                    parent = Comment.objects.get(id=parent_id, post=post)
                except Comment.DoesNotExist:
                    return Response(
                        {"detail": "Родителският коментар не е намерен."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Създаване на коментара
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
                {"detail": "Публикацията не е намерена."},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def delete(self, request, comment_id):
        try:
            comment = Comment.objects.get(id=comment_id)
            
            # Проверка дали потребителят е собственик на коментара
            if comment.user != request.user:
                return Response(
                    {"detail": "Можете да изтривате само собствените си коментари."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            comment.delete()
            return Response(
                {"detail": "Коментарът е изтрит успешно."},
                status=status.HTTP_204_NO_CONTENT
            )
        except Comment.DoesNotExist:
            return Response(
                {"detail": "Коментарът не е намерен."},
                status=status.HTTP_404_NOT_FOUND
            )

class CommentRepliesView(APIView):
    """
    Преглед за списък с отговори на коментар и създаване на нови отговори.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, comment_id):
        try:
            comment = Comment.objects.get(id=comment_id)
            replies = Comment.objects.filter(parent=comment).order_by('-created_at')
            serializer = ReplySerializer(replies, many=True, context={'request': request})
            return Response(serializer.data)
        except Comment.DoesNotExist:
            return Response({'error': 'Коментарът не е намерен'}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, comment_id):
        try:
            comment = Comment.objects.get(id=comment_id)
            serializer = ReplySerializer(data=request.data, context={'request': request, 'parent': comment})
            if serializer.is_valid():
                serializer.save(user=request.user)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Comment.DoesNotExist:
            return Response({'error': 'Коментарът не е намерен'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ChatListView(APIView):
    """
    Списък на всички чатове или създаване на нов чат.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            # Get all chats where the user is a participant
            chats = Chat.objects.filter(participants=request.user).prefetch_related(
                'participants',
                'messages'
            ).order_by('-updated_at')

            # Serialize the chats
            serializer = ChatSerializer(chats, many=True, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            print(f"Error in ChatListView.get: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'detail': 'Неуспешно извличане на чатове'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request):
        try:
            # Get the username of the other participant
            other_username = request.data.get('username')
            if not other_username:
                return Response(
                    {'detail': 'Името на потребителя е задължително'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get the other user
            try:
                other_user = MyUser.objects.get(username=other_username)
            except MyUser.DoesNotExist:
                return Response(
                    {'detail': 'Потребителят не е намерен'},
                status=status.HTTP_404_NOT_FOUND
            )

            # Check if the user is trying to chat with themselves
            if other_user == request.user:
                return Response(
                    {'detail': 'Не можете да създадете чат със себе си'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if chat already exists between these users
            existing_chats = Chat.objects.filter(participants=request.user).filter(participants=other_user)
            
            if existing_chats.exists():
                existing_chat = existing_chats.first()
                serializer = ChatSerializer(existing_chat, context={'request': request})
                return Response(serializer.data)

            # Create new chat
            chat = Chat.objects.create()
            chat.participants.add(request.user, other_user)
            chat.save()
            
            serializer = ChatSerializer(chat, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            print(f"Error in ChatListView.post: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'detail': 'Неуспешно създаване на чат'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ChatDetailView(APIView):
    """
    Извличане или изтриване на чат.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, chat_id):
        try:
            print(f"DEBUG: Fetching chat {chat_id} for user {request.user.username}")
            # Check if the user is a participant in the chat
            try:
                chat = Chat.objects.get(id=chat_id, participants=request.user)
            except Chat.DoesNotExist:
                return Response(
                    {'detail': 'Чатът не е намерен или не сте участник'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            serializer = ChatSerializer(chat, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            print(f"ERROR in ChatDetailView.get: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'detail': f'Неуспешно извличане на чат: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def delete(self, request, chat_id):
        try:
            print(f"DEBUG: Deleting chat {chat_id} for user {request.user.username}")
            # Check if the user is a participant in the chat
            try:
                chat = Chat.objects.get(id=chat_id, participants=request.user)
            except Chat.DoesNotExist:
                return Response(
                    {'detail': 'Чатът не е намерен или не сте участник'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            chat.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            print(f"ERROR in ChatDetailView.delete: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'detail': f'Неуспешно изтриване на чат: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class MessageListView(APIView):
    """
    Списък на всички съобщения в чат или създаване на ново съобщение.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request, chat_id):
        try:
            # Pagination parameters
            limit = int(request.query_params.get('limit', 20))  # Default 20 messages
            before_id = request.query_params.get('before_id')  # Message ID to load messages before
            after_timestamp = request.query_params.get('after_timestamp')  # Timestamp to load messages after
            
            chat = Chat.objects.get(id=chat_id, participants=request.user)
            
            # Start with all messages in this chat
            messages_query = chat.messages.all()
            
            # Filter messages before the given ID if specified
            if before_id:
                try:
                    before_message = Message.objects.get(id=before_id)
                    messages_query = messages_query.filter(created_at__lt=before_message.created_at)
                except Message.DoesNotExist:
                    pass
            
            # Filter messages after the given timestamp if specified
            if after_timestamp:
                try:
                    # Parse the timestamp and convert to timezone-aware datetime if needed
                    from django.utils.dateparse import parse_datetime
                    from django.utils import timezone
                    
                    # Try to parse the timestamp
                    parsed_timestamp = parse_datetime(after_timestamp)
                    
                    # Make it timezone-aware if it's not
                    if parsed_timestamp and timezone.is_naive(parsed_timestamp):
                        parsed_timestamp = timezone.make_aware(parsed_timestamp)
                    
                    if parsed_timestamp:
                        # Add slight buffer to avoid missing messages created at the exact same timestamp
                        # This provides a 0.1 second buffer
                        messages_query = messages_query.filter(created_at__gte=parsed_timestamp)
                    else:
                        # If parsing fails, try direct comparison (this works with some formats)
                        messages_query = messages_query.filter(created_at__gt=after_timestamp)
                except Exception as e:
                    print(f"Error parsing timestamp: {e}")
                    # Attempt a direct string comparison as a fallback
                    messages_query = messages_query.filter(created_at__gt=after_timestamp)
            
            # Get messages in the appropriate order and limit the result
            if after_timestamp:
                # For newer messages, use ascending order (oldest to newest)
                messages = messages_query.order_by('created_at')[:limit]
            else:
                # For older messages, use descending order (newest to oldest) and reverse for display
                messages = messages_query.order_by('-created_at')[:limit]
                messages = list(reversed(messages))
            
            serializer = MessageSerializer(messages, many=True, context={'request': request})
            return Response(serializer.data)
        except Chat.DoesNotExist:
            return Response(
                {'detail': 'Чатът не е намерен или не сте участник'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'detail': f'Неуспешно извличане на съобщения: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request, chat_id):
        try:
            # Check if the user is a participant in the chat
            chat = Chat.objects.get(id=chat_id, participants=request.user)
            
            # Create the message directly
            message = Message(
                chat=chat,
                sender=request.user
            )
            
            # Handle content
            if 'content' in request.data:
                message.content = request.data['content']
                
            # Handle image
            if 'image' in request.FILES:
                message.image = request.FILES['image']
            
            # Handle file (use the same image field for files)
            if 'file' in request.FILES:
                message.image = request.FILES['file']
                
            # Handle parent message (for replies)
            if 'parent' in request.data:
                try:
                    parent_id = request.data['parent']
                    parent_message = Message.objects.get(id=parent_id, chat=chat)
                    message.parent = parent_message
                except Exception:
                    # Continue without setting parent if it fails
                    pass
                
            # Validate that at least content or image is provided
            if not message.content and not message.image:
                return Response(
                    {'detail': 'Трябва да се предостави съдържание, изображение или файл'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Save the message
            message.save()
            
            # Update chat's updated_at timestamp
            chat.save()
            
            serialized_message = MessageSerializer(message, context={'request': request}).data
            
            return Response(
                serialized_message,
                status=status.HTTP_201_CREATED
            )
                
        except Chat.DoesNotExist:
            return Response(
                {'detail': 'Чатът не е намерен или не сте участник'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'detail': f'Неуспешно създаване на съобщение: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class MessageDetailView(APIView):
    """
    Извличане, актуализиране или изтриване на съобщение.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_object(self, message_id):
        try:
            return Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            raise Http404
    
    def get(self, request, message_id):
        message = self.get_object(message_id)
        
        # Check if user is a participant in the chat
        if request.user not in message.chat.participants.all():
            return Response({"detail": "Нямате разрешение да преглеждате това съобщение."}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = MessageSerializer(message, context={'request': request})
        return Response(serializer.data)
    
    def patch(self, request, message_id):
        message = self.get_object(message_id)
        
        # Check if the user is the sender of the message
        if message.sender != request.user:
            return Response({"detail": "Можете да редактирате само собствените си съобщения."}, status=status.HTTP_403_FORBIDDEN)
        
        # The 24-hour time limit check has been removed as requested
        
        serializer = MessageSerializer(message, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            message.is_edited = True  # Mark as edited
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, message_id):
        message = self.get_object(message_id)
        
        # Check if the user is the sender or if they're in the chat
        if message.sender != request.user and request.user not in message.chat.participants.all():
            return Response({"detail": "Нямате разрешение да изтриете това съобщение."}, 
                           status=status.HTTP_403_FORBIDDEN)
        
        message.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class MessageReplyView(APIView):
    """
    Списък на всички отговори на съобщение или създаване на нов отговор.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, message_id):
        try:
            parent_message = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            raise Http404
        
        # Check if user is a participant in the chat
        if request.user not in parent_message.chat.participants.all():
            return Response({"detail": "Нямате разрешение да преглеждате отговорите на това съобщение."}, 
                           status=status.HTTP_403_FORBIDDEN)
        
        replies = Message.objects.filter(parent=parent_message)
        serializer = MessageSerializer(replies, many=True, context={'request': request})
        return Response(serializer.data)
        
    def post(self, request, message_id):
        try:
            parent_message = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            raise Http404
            
        # Check if user is a participant in the chat
        if request.user not in parent_message.chat.participants.all():
            return Response({"detail": "Нямате разрешение да отговаряте на това съобщение."}, 
                           status=status.HTTP_403_FORBIDDEN)
                           
        # Create a new message as a reply
        serializer = MessageSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(
                sender=request.user,
                chat=parent_message.chat,
                parent=parent_message
            )
            
            # Update the chat's updated_at timestamp
            parent_message.chat.save()
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MessageStatusView(APIView):
    """
    Актуализиране на статуса за прочитане на съобщение.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, message_id):
        try:
            message = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            raise Http404
            
        # Check if user is a participant in the chat but not the sender
        if request.user not in message.chat.participants.all():
            return Response({"detail": "Нямате разрешение да актуализирате състоянието на това съобщение."}, 
                           status=status.HTTP_403_FORBIDDEN)
                           
        if request.user == message.sender:
            return Response({"detail": "Не можете да отбележите собствените си съобщения като прочетени."}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Mark as read
        message.is_read = True
        message.save()
        
        return Response({"detail": "Съобщението е отбелязано като прочетено."}, status=status.HTTP_200_OK)

class ChatReadView(APIView):
    """
    Маркиране на всички съобщения в чат като прочетени за текущия потребител.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, chat_id):
        try:
            chat = Chat.objects.get(id=chat_id, participants=request.user)
            
            # Find all unread messages in this chat sent by other users
            unread_messages = Message.objects.filter(
                chat=chat,
                is_read=False
            ).exclude(sender=request.user)
            
            # Mark all as read
            updated_count = unread_messages.update(is_read=True)
            
            return Response(
                {"detail": f"Маркирани {updated_count} съобщения като прочетени."}, 
                status=status.HTTP_200_OK
            )
            
        except Chat.DoesNotExist:
            return Response(
                {'detail': 'Чатът не е намерен или не сте участник'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            print(f"Error in ChatReadView.post: {str(e)}")
            return Response(
                {'detail': f'Неуспешно отбелязване на съобщения като прочетени: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class MutualFollowersView(APIView):
    """
    Търсене на взаимни последователи.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, username):
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

class PasswordResetRequestView(APIView):
    """
    Заявка за имейл за нулиране на парола.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response(
                {'detail': 'Имейлът е задължителен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = MyUser.objects.get(email=email)
        except MyUser.DoesNotExist:
            # We return success even if the email doesn't exist for security
            return Response({'detail': 'Имейлът за възстановяване на паролата е изпратен, ако имейлът съществува'})

        # Generate token and URL
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # Build reset URL (frontend URL)
        reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"

        # Email content
        subject = 'Password Reset for Q-up'
        message = f'''
        Hello {user.username},

        You've requested to reset your password. Please click the link below to reset it:

        {reset_url}

        If you didn't request this, you can safely ignore this email.

        Best regards,
        The Q-up Team
        '''

        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            return Response({'detail': 'Имейлът за нулиране на паролата е изпратен'})
        except Exception as e:
            print(f"Error sending email: {str(e)}")
            return Response(
                {'detail': 'Неуспешно изпращане на имейл за нулиране'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class PasswordResetConfirmView(APIView):
    """
    Потвърждаване на нулирането на парола и задаване на нова парола.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, uidb64, token):
        try:
            # Decode the user ID
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = MyUser.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, MyUser.DoesNotExist):
            return Response(
                {'detail': 'Невалидна връзка за нулиране'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check the token is valid
        if not default_token_generator.check_token(user, token):
            return Response(
                {'detail': 'Невалидна или изтекла връзка за нулиране'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get the new password
        new_password = request.data.get('new_password')
        if not new_password:
            return Response(
                {'detail': 'Необходима е нова парола'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Set the new password
        user.set_password(new_password)
        user.save()

        return Response({'detail': 'Паролата е нулирана успешно'})