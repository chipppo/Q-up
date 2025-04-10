from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import MyUser, Game, GameStats, RankSystem, RankTier, PlayerGoal, GameRanking, Post, Like, Comment, Message, Chat
import json
import logging

"""
Serializers for the Q-up platform.

These convert our Python models into JSON for the API and back again.
Think of them as translators between what the database understands
and what the frontend (React) needs to work with.
"""

# Сериализатор за потребителски данни - преобразува модела в JSON за API
class UserSerializer(serializers.ModelSerializer):
    """
    Handles user profile data conversion.
    
    Includes extra calculated fields like follower counts
    and URLs for the avatar image.
    """
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    date_of_birth = serializers.DateField(format='%d/%m/%Y', input_formats=['%d/%m/%Y'], required=False)
    active_hours = serializers.ListField(child=serializers.CharField(), required=False)
    language_preference = serializers.ListField(child=serializers.CharField(), required=False)
    platforms = serializers.ListField(child=serializers.CharField(), required=False)
    social_links = serializers.ListField(child=serializers.CharField(), required=False)
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = MyUser
        fields = [
            'id', 'username', 'display_name', 'email', 'avatar', 'avatar_url',
            'followers_count', 'following_count', 'active_hours',
            'language_preference', 'platforms', 'mic_available',
            'social_links', 'created_at', 'is_active', 'timezone',
            'timezone_offset', 'date_of_birth', 'bio'
        ]

    # Връща брой последователи
    def get_followers_count(self, obj):
        """Returns how many people follow this user"""
        return obj.followers.count()

    # Връща брой профили, които потребителят следва
    def get_following_count(self, obj):
        """Returns how many people this user follows"""
        return obj.following.count()

    # Връща URL на аватара или път към стандартен аватар
    def get_avatar_url(self, obj):
        """
        Gets the URL for the user's avatar or returns a default
        if they haven't uploaded one
        """
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        # Return a reliable default avatar URL that doesn't depend on media files
        return 'https://ui-avatars.com/api/?name=' + obj.username[0].upper()

    # Валидация на полето active_hours - проверява дали е списък
    def validate_active_hours(self, value):
        """
        Makes sure active_hours is a valid list.
        Tries to convert string JSON into a list if needed.
        """
        if not isinstance(value, list):
            if isinstance(value, str):
                try:
                    value = json.loads(value)
                except json.JSONDecodeError:
                    raise serializers.ValidationError("Invalid format for active_hours")
            else:
                raise serializers.ValidationError("active_hours must be an array")
        return value

    # Валидация на часовата зона - проверява дали е в допустимите граници
    def validate_timezone_offset(self, value):
        """Checks if timezone offset is within valid range (-12 to +14)"""
        if not -12 <= value <= 14:
            raise serializers.ValidationError("Timezone offset must be between -12 and +14")
        return value


# Сериализатор за регистрация на нов потребител
class RegisterUserSerializer(serializers.ModelSerializer):
    """
    Handles new user registration.
    
    Takes care of securely setting the password when creating a new account.
    """
    password = serializers.CharField(write_only=True)

    class Meta:
        model = MyUser
        fields = [
            'username', 'email', 'password', 'display_name', 
            'active_hours', 'language_preference', 'platforms', 'mic_available', 
            'social_links', 'timezone', 'date_of_birth'
        ]

    # Създава нов потребител със сигурна парола
    def create(self, validated_data):
        """
        Creates a new user with a properly hashed password.
        Django handles the password hashing for security.
        """
        password = validated_data.pop('password')
        user = MyUser(**validated_data)
        user.set_password(password)
        user.save()
        return user


# Сериализатор за JWT токен при вход в системата
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Creates JWT tokens for user authentication.
    
    Adds the username to the token response for easy identification.
    """
    def validate(self, attrs):
        """Adds extra info to the token response"""
        data = super().validate(attrs)
        data['username'] = self.user.username
        return data


# Сериализатор за игри
class GameSerializer(serializers.ModelSerializer):
    """Simple serializer for game data including name, description and logo"""
    class Meta:
        model = Game
        fields = ['id', 'name', 'description', 'logo']


# Сериализатор за системи за класиране
class RankSystemSerializer(serializers.ModelSerializer):
    """
    Handles data for ranking systems like CS2's levels or LoL's tiers.
    Supports both numeric (ELO points) and tier-based systems.
    """
    class Meta:
        model = RankSystem
        fields = ['id', 'name', 'is_numeric', 'max_numeric_value', 'increment', 'game']


# Сериализатор за нива на ранг
class RankTierSerializer(serializers.ModelSerializer):
    """
    Handles individual rank tier data like 'Gold', 'Platinum', etc.
    Used only for non-numeric ranking systems.
    """
    class Meta:
        model = RankTier
        fields = ['id', 'name', 'order', 'icon']


# Сериализатор за цели на играчите
class PlayerGoalSerializer(serializers.ModelSerializer):
    """
    Serializes player goal data - why people play games 
    (competitive, casual, etc.)
    """
    class Meta:
        model = PlayerGoal
        fields = ['id', 'name', 'description']


# Сериализатор за ранг на играч
class GameRankingSerializer(serializers.ModelSerializer):
    """
    Handles a player's rank in a specific game and ranking system.
    Includes related data for rank system and tier.
    """
    rank_system = RankSystemSerializer(read_only=True)
    rank = RankTierSerializer(read_only=True)

    class Meta:
        model = GameRanking
        fields = ['id', 'rank_system', 'rank', 'numeric_rank']


# Сериализатор за статистики на играч за игра
class GameStatsSerializer(serializers.ModelSerializer):
    """
    Manages a user's stats for a specific game.
    
    Includes nested data for the game itself, player goals,
    and all their rankings in different systems.
    """
    game = GameSerializer(read_only=True)
    player_goal = PlayerGoalSerializer(read_only=True)
    rankings = GameRankingSerializer(many=True, read_only=True)

    class Meta:
        model = GameStats
        fields = ['id', 'user', 'game', 'hours_played', 'player_goal', 'rankings']
        read_only_fields = ['id', 'user']

    # Валидация - часовете не могат да са отрицателни
    def validate_hours_played(self, value):
        """Makes sure hours_played isn't negative - you can't play negative hours!"""
        if value < 0:
            raise serializers.ValidationError("Hours played cannot be negative")
        return value

    # Създаване на запис за статистика с рангове
    def create(self, validated_data):
        """
        Creates game stats with associated rankings.
        
        This handles the complex creation of a player's game stats
        along with their rankings in different systems for that game.
        """
        rankings_data = self.context.get('rankings', [])
        game_stats = GameStats.objects.create(**validated_data)
        
        for ranking_data in rankings_data:
            # Extract rank_system_id - it might be an ID or an object
            rank_system_id = ranking_data.get('rank_system')
            if isinstance(rank_system_id, dict) and 'id' in rank_system_id:
                rank_system_id = rank_system_id['id']
                
            # Extract rank_id - it might be an ID or an object
            rank_id = ranking_data.get('rank')
            if isinstance(rank_id, dict) and 'id' in rank_id:
                rank_id = rank_id['id']
                
            numeric_rank = ranking_data.get('numeric_rank')
            
            GameRanking.objects.create(
                game_stats=game_stats,
                rank_system_id=rank_system_id,
                rank_id=rank_id,
                numeric_rank=numeric_rank
            )
        
        return game_stats

    # Обновяване на игрова статистика и рангове
    def update(self, instance, validated_data):
        """
        Updates game stats and rankings.
        
        This handles the complex update of a player's game stats
        along with their rankings in different systems.
        """
        rankings_data = self.context.get('rankings', [])
        
        # Update GameStats fields
        instance.hours_played = validated_data.get('hours_played', instance.hours_played)
        
        # Handle player_goal - it might be an ID or an object
        player_goal = validated_data.get('player_goal')
        if player_goal is not None:
            if isinstance(player_goal, int):
                instance.player_goal_id = player_goal
            else:
                instance.player_goal = player_goal
        
        instance.save()

        # Update rankings
        existing_rankings = {ranking.rank_system_id: ranking for ranking in instance.rankings.all()}
        
        for ranking_data in rankings_data:
            # Extract rank_system_id - it might be an ID or an object
            rank_system_id = ranking_data.get('rank_system')
            if isinstance(rank_system_id, dict) and 'id' in rank_system_id:
                rank_system_id = rank_system_id['id']
                
            # Extract rank_id - it might be an ID or an object
            rank_id = ranking_data.get('rank')
            if isinstance(rank_id, dict) and 'id' in rank_id:
                rank_id = rank_id['id']
                
            numeric_rank = ranking_data.get('numeric_rank')
            
            if rank_system_id in existing_rankings:
                # Update existing ranking
                ranking = existing_rankings[rank_system_id]
                ranking.numeric_rank = numeric_rank
                ranking.rank_id = rank_id
                ranking.save()
                del existing_rankings[rank_system_id]
            else:
                # Create new ranking
                GameRanking.objects.create(
                    game_stats=instance,
                    rank_system_id=rank_system_id,
                    rank_id=rank_id,
                    numeric_rank=numeric_rank
                )
        
        # Delete rankings that weren't included in the update
        for ranking in existing_rankings.values():
            ranking.delete()
        
        return instance


# Сериализатор за последване на потребител
class FollowSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)

    # Проверява дали потребителят съществува
    def validate_username(self, value):
        try:
            MyUser.objects.get(username=value)
            return value
        except MyUser.DoesNotExist:
            raise serializers.ValidationError("User not found")


# Сериализатор за качване на аватар
class AvatarUploadSerializer(serializers.Serializer):
    avatar = serializers.ImageField(required=True)

    # Валидация на типа на файла
    def validate_avatar(self, value):
        if value.content_type not in ['image/jpeg', 'image/png', 'image/gif']:
            raise serializers.ValidationError(
                "Invalid file type. Please upload a JPEG, PNG, or GIF."
            )
        return value


# New serializers for social features

# Сериализатор за коментари
class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    reply_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = ['id', 'user', 'post', 'text', 'parent', 'created_at', 'updated_at', 'reply_count']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
    
    # Връща брой отговори на коментара
    def get_reply_count(self, obj):
        return obj.replies.count()

# Сериализатор за отговори на коментар
class ReplySerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Comment
        fields = ['id', 'user', 'post', 'text', 'parent', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'post', 'parent']

    # Създава отговор към съществуващ коментар
    def create(self, validated_data):
        # Get the parent comment from the context
        parent = self.context.get('parent')
        if not parent:
            raise serializers.ValidationError({'parent': 'Parent comment is required'})
        
        # Set the post from the parent comment
        validated_data['post'] = parent.post
        validated_data['parent'] = parent
        
        # Create the reply
        return super().create(validated_data)

    # Адаптира данните за отговор с пълен URL към аватара
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        user_data = representation.get('user', {})
        if user_data and user_data.get('avatar'):
            user_data['avatar'] = self.context['request'].build_absolute_uri(user_data['avatar'])
        return representation

# Сериализатор за харесвания
class LikeSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Like
        fields = ['id', 'user', 'post', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

# Сериализатор за постове
class PostSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    liked_by_current_user = serializers.SerializerMethodField()
    game = GameSerializer(read_only=True)
    
    class Meta:
        model = Post
        fields = ['id', 'user', 'image', 'caption', 'created_at', 'updated_at', 
                 'likes_count', 'comments_count', 'liked_by_current_user', 'game']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'likes_count', 'comments_count']
    
    # Връща брой харесвания на поста
    def get_likes_count(self, obj):
        return obj.likes.count()
    
    # Връща брой коментари на поста
    def get_comments_count(self, obj):
        return obj.comments.count()
    
    # Проверява дали текущият потребител е харесал поста
    def get_liked_by_current_user(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False

# Сериализатор за детайли на пост с коментари и харесвания
class PostDetailSerializer(PostSerializer):
    comments = serializers.SerializerMethodField()
    likes = serializers.SerializerMethodField()
    
    class Meta(PostSerializer.Meta):
        fields = PostSerializer.Meta.fields + ['comments', 'likes']
    
    # Връща коментарите към поста (само най-горно ниво)
    def get_comments(self, obj):
        # Only get top-level comments (no parent)
        comments = obj.comments.filter(parent=None)
        return CommentSerializer(comments, many=True, context=self.context).data
    
    # Връща списък с потребители, харесали поста
    def get_likes(self, obj):
        # Return the users who liked this post
        likes = obj.likes.all()
        return LikeSerializer(likes, many=True, context=self.context).data

# Сериализатор за съобщения в чат
class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    replies_count = serializers.SerializerMethodField()
    parent_sender = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    parent_message = serializers.SerializerMethodField()
    file_info = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'chat', 'sender', 'content', 'image',
            'parent', 'is_read', 'is_delivered',
            'created_at', 'updated_at', 'replies_count', 
            'parent_sender', 'parent_message', 'file_info'
        ]
        read_only_fields = [
            'id', 'chat', 'sender', 'created_at', 
            'updated_at', 'replies_count', 'parent_sender'
        ]
    
    def get_replies_count(self, obj):
        return obj.replies.count()
    
    def get_parent_sender(self, obj):
        if obj.parent and obj.parent.sender:
            return obj.parent.sender.username
        return None
    
    def get_image(self, obj):
        if obj.image:
            try:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.image.url)
                return obj.image.url
            except Exception as e:
                print(f"Error getting image URL: {str(e)}")
                return None
        return None
    
    def get_file_info(self, obj):
        """Get file metadata like name, type, and if it's an image"""
        if not obj.image:
            return None
            
        is_image = False
        if obj.file_type and obj.file_type.startswith('image/'):
            is_image = True
        elif not obj.file_type and obj.image:
            # Try to guess from file extension
            file_ext = obj.image.name.lower().split('.')[-1] if '.' in obj.image.name else ''
            image_extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
            is_image = file_ext in image_extensions
            
        return {
            'name': obj.file_name or obj.image.name.split('/')[-1],
            'type': obj.file_type or 'application/octet-stream',
            'is_image': is_image,
            'size': obj.image.size if hasattr(obj.image, 'size') else None
        }

    # Return information about the parent message
    def get_parent_message(self, obj):
        if obj.parent:
            return {
                'id': obj.parent.id,
                'content': obj.parent.content,
                'sender': obj.parent.sender.username,
                'created_at': obj.parent.created_at
            }
        return None

    # Validation - must have text or file
    def validate(self, data):
        # Make chat field optional since we'll set it in the view
        if 'chat' not in data:
            data.pop('chat', None)
            
        # Allow empty content if image is provided
        if not data.get('content') and not data.get('image'):
            if self.context.get('request') and self.context['request'].FILES.get('image'):
                # Image is being uploaded but not in data yet
                return data
            raise serializers.ValidationError("Either content or image must be provided")
        return data

# Сериализатор за чатове
class ChatSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Chat
        fields = ['id', 'participants', 'created_at', 'updated_at', 'last_message', 'unread_count']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    # Връща последното съобщение в чата
    def get_last_message(self, obj):
        try:
            last_message = obj.messages.order_by('-created_at').first()
            if last_message:
                return {
                    'id': last_message.id,
                    'content': last_message.content[:50] + '...' if len(last_message.content) > 50 else last_message.content,
                    'sender': last_message.sender.username,
                    'created_at': last_message.created_at,
                    'has_image': bool(last_message.image),
                    'has_file': bool(hasattr(last_message, 'file') and last_message.file)
                }
            return None
        except Exception as e:
            print(f"Error in get_last_message: {str(e)}")
            return None
    
    # Връща брой непрочетени съобщения за текущия потребител
    def get_unread_count(self, obj):
        try:
            user = self.context.get('request').user
            if not user or not user.is_authenticated:
                return 0
                
            # Count unread messages sent by others
            unread_count = obj.messages.filter(
                is_read=False
            ).exclude(
                sender=user
            ).count()
            
            return unread_count
            
        except Exception as e:
            return 0