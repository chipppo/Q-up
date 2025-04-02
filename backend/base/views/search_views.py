from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import Q
from ..models import MyUser
from ..serializers import UserSerializer

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