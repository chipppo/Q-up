from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from ..models import Game, MyUser, GameStats, RankSystem, RankTier, PlayerGoal, GameRanking
from ..serializers import (
    GameSerializer,
    GameStatsSerializer,
    RankSystemSerializer,
    RankTierSerializer,
    PlayerGoalSerializer
)

"""
Views for handling games, player stats, ranking systems and goals.

These endpoints let users track which games they play, their ranks,
and how many hours they've spent playing.
"""

class GameListView(APIView):
    """
    Simple view for listing all games in the system.
    Anyone can view the list of available games.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """
        GET handler to retrieve all games.
        
        Returns:
            List of all games with their info
        """
        games = Game.objects.all()
        serializer = GameSerializer(games, many=True)
        return Response(serializer.data)


class GameStatsListView(APIView):
    """
    Handles getting a user's game stats and adding new games to their profile.
    Users need to be logged in to access this.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, username, format=None):
        """
        GET handler to retrieve all game stats for a user.
        
        Args:
            request: The HTTP request
            username: Username to get stats for
            
        Returns:
            List of all game stats for the specified user
        """
        try:
            user = MyUser.objects.get(username=username)
            game_stats = GameStats.objects.filter(user=user)
            serializer = GameStatsSerializer(game_stats, many=True)
            return Response(serializer.data)
        except MyUser.DoesNotExist:
            return Response({'detail': 'Потребителят не е намерен'}, status=404)

    def post(self, request, username):
        """
        POST handler to add a new game to a user's profile.
        
        Users can only add games to their own profile. This creates
        initial stats for a game including hours played and rankings.
        
        Args:
            request: Contains game data, hours played, rankings
            username: User to add the game for
            
        Returns:
            The created game stats or error messages
        """
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


class GameStatsUpdateView(APIView):
    """
    Handles updating, retrieving or deleting game stats for a specific game.
    
    This is for managing the details of a single game in a user's profile,
    like updating their rank or hours played.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, username, game_id):
        """
        GET handler to retrieve stats for a specific game.
        
        Args:
            request: The HTTP request
            username: User to get stats for
            game_id: Game to get stats for
            
        Returns:
            Game stats for the specific user and game
        """
        try:
            user = MyUser.objects.get(username=username)
            game_stats = GameStats.objects.get(user=user, game_id=game_id)
            serializer = GameStatsSerializer(game_stats)
            return Response(serializer.data)
        except (MyUser.DoesNotExist, GameStats.DoesNotExist):
            return Response({'detail': 'Статистиките не са намерени'}, status=404)

    def patch(self, request, username, game_id):
        """
        PATCH handler to update game stats.
        
        Users can update things like their hours played, rank,
        and goals for a specific game. They can only update their
        own stats.
        
        Args:
            request: Contains updated game data
            username: User to update stats for
            game_id: Game to update stats for
            
        Returns:
            Updated game stats or error messages
        """
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
        """
        DELETE handler to remove a game from a user's profile.
        
        Users can only delete games from their own profile.
        
        Args:
            request: The HTTP request
            username: User to delete game from
            game_id: Game to delete
            
        Returns:
            204 No Content if successful or error message
        """
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


class RankingSystemListView(APIView):
    """
    Lists all ranking systems for a specific game.
    
    For example, CS2 might have both the old ranks system (Silver, Gold Nova)
    and the new Premier rating system.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, game_id):
        """
        GET handler to retrieve all ranking systems for a game.
        
        Args:
            request: The HTTP request
            game_id: Game to get ranking systems for
            
        Returns:
            List of ranking systems for the game
        """
        try:
            ranking_systems = RankSystem.objects.filter(game_id=game_id)
            serializer = RankSystemSerializer(ranking_systems, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RankTierListView(APIView):
    """
    Gets all rank tiers for a specific ranking system.
    
    For example, for League of Legends this would return
    Iron, Bronze, Silver, Gold, Platinum, etc.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, rank_system_id):
        """
        GET handler to retrieve all rank tiers for a ranking system.
        
        Args:
            request: The HTTP request
            rank_system_id: Ranking system to get tiers for
            
        Returns:
            List of rank tiers ordered by their rank
        """
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