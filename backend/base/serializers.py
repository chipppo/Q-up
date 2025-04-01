from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import MyUser, Game, GameStats, RankSystem, RankTier, PlayerGoal, GameRanking, Post, Like, Comment, Message, Chat
import json

# Сериализатор за потребителски данни - преобразува модела в JSON за API
class UserSerializer(serializers.ModelSerializer):
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
        return obj.followers.count()

    # Връща брой профили, които потребителят следва
    def get_following_count(self, obj):
        return obj.following.count()

    # Връща URL на аватара или път към стандартен аватар
    def get_avatar_url(self, obj):
        if obj.avatar:
            return obj.avatar.url
        return '/media/default/default-avatar.svg'

    # Валидация на полето active_hours - проверява дали е списък
    def validate_active_hours(self, value):
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
        if not -12 <= value <= 14:
            raise serializers.ValidationError("Timezone offset must be between -12 and +14")
        return value


# Сериализатор за регистрация на нов потребител
class RegisterUserSerializer(serializers.ModelSerializer):
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
        password = validated_data.pop('password')
        user = MyUser(**validated_data)
        user.set_password(password)
        user.save()
        return user


# Сериализатор за JWT токен при вход в системата
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['username'] = self.user.username
        return data


# Сериализатор за игри
class GameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        fields = ['id', 'name', 'description', 'logo']


# Сериализатор за системи за класиране
class RankSystemSerializer(serializers.ModelSerializer):
    class Meta:
        model = RankSystem
        fields = ['id', 'name', 'is_numeric', 'max_numeric_value', 'increment', 'game']


# Сериализатор за нива на ранг
class RankTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = RankTier
        fields = ['id', 'name', 'order', 'icon']


# Сериализатор за цели на играчите
class PlayerGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlayerGoal
        fields = ['id', 'name', 'description']


# Сериализатор за ранг на играч
class GameRankingSerializer(serializers.ModelSerializer):
    rank_system = RankSystemSerializer(read_only=True)
    rank = RankTierSerializer(read_only=True)

    class Meta:
        model = GameRanking
        fields = ['id', 'rank_system', 'rank', 'numeric_rank']


# Сериализатор за статистики на играч за игра
class GameStatsSerializer(serializers.ModelSerializer):
    game = GameSerializer(read_only=True)
    player_goal = PlayerGoalSerializer(read_only=True)
    rankings = GameRankingSerializer(many=True, read_only=True)

    class Meta:
        model = GameStats
        fields = ['id', 'user', 'game', 'hours_played', 'player_goal', 'rankings']
        read_only_fields = ['id', 'user']

    # Валидация - часовете не могат да са отрицателни
    def validate_hours_played(self, value):
        if value < 0:
            raise serializers.ValidationError("Hours played cannot be negative")
        return value

    # Създаване на запис за статистика с рангове
    def create(self, validated_data):
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

    class Meta:
        model = Message
        fields = [
            'id', 'chat', 'sender', 'content', 'image',
            'parent', 'is_edited', 'is_read', 'is_delivered',
            'created_at', 'updated_at', 'replies_count', 
            'parent_sender', 'parent_message'
        ]
        read_only_fields = [
            'id', 'sender', 'is_edited', 'is_read', 'is_delivered',
            'created_at', 'updated_at', 'replies_count', 
            'parent_sender', 'parent_message'
        ]

    # Връща брой отговори на съобщението
    def get_replies_count(self, obj):
        return obj.replies.count()

    # Връща потребителя, изпратил родителското съобщение
    def get_parent_sender(self, obj):
        if obj.parent:
            return obj.parent.sender.username
        return None
    
    # Връща пълен URL към снимката в съобщението
    def get_image(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
    
    # Връща информация за родителското съобщение
    def get_parent_message(self, obj):
        if obj.parent:
            return {
                'id': obj.parent.id,
                'content': obj.parent.content,
                'sender': obj.parent.sender.username,
                'created_at': obj.parent.created_at
            }
        return None

    # Валидация - трябва да има текст или снимка
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