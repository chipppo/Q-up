from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import MyUser, Game, GameStats
import json

class UserSerializer(serializers.ModelSerializer):
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    date_of_birth = serializers.DateField(format='%d/%m/%Y', input_formats=['%d/%m/%Y'], required=False)
    active_hours = serializers.ListField(child=serializers.CharField(), required=False)
    language_preference = serializers.ListField(child=serializers.CharField(), required=False)
    platforms = serializers.ListField(child=serializers.CharField(), required=False)
    social_links = serializers.ListField(child=serializers.CharField(), required=False)

    class Meta:
        model = MyUser
        fields = [
            'id', 'username', 'display_name', 'email', 'avatar', 
            'followers_count', 'following_count', 'active_hours',
            'language_preference', 'platforms', 'mic_available',
            'social_links', 'created_at', 'is_active', 'timezone',
            'timezone_offset', 'date_of_birth', 'bio'
        ]

    def get_followers_count(self, obj):
        return obj.followers.count()

    def get_following_count(self, obj):
        return obj.following.count()

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

    def validate_timezone_offset(self, value):
        if not -12 <= value <= 14:
            raise serializers.ValidationError("Timezone offset must be between -12 and +14")
        return value


class RegisterUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = MyUser
        fields = [
            'username', 'email', 'password', 'display_name', 'avatar_url', 
            'active_hours', 'language_preference', 'platforms', 'mic_available', 
            'social_links', 'timezone', 'date_of_birth'
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = MyUser(**validated_data)
        user.set_password(password)
        user.save()
        return user


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['username'] = self.user.username
        return data


class GameStatsSerializer(serializers.ModelSerializer):
    game = serializers.StringRelatedField()  # This will just show the game name
    rank_system = serializers.StringRelatedField()
    rank = serializers.StringRelatedField()
    player_goal = serializers.StringRelatedField()

    class Meta:
        model = GameStats
        fields = ['id', 'user', 'game', 'hours_played', 'rank_system', 'rank', 'numeric_rank', 'player_goal']
        read_only_fields = ['id', 'user']

    def validate_hours_played(self, value):
        if value < 0:
            raise serializers.ValidationError("Hours played cannot be negative")
        return value

    def validate_rank(self, value):
        if value < 0:
            raise serializers.ValidationError("Rank cannot be negative")
        return value


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)

    def validate_new_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long")
        return value


class FollowSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)

    def validate_username(self, value):
        try:
            MyUser.objects.get(username=value)
            return value
        except MyUser.DoesNotExist:
            raise serializers.ValidationError("User not found")


class AvatarUploadSerializer(serializers.Serializer):
    avatar = serializers.ImageField(required=True)

    def validate_avatar(self, value):
        if value.content_type not in ['image/jpeg', 'image/png', 'image/gif']:
            raise serializers.ValidationError(
                "Invalid file type. Please upload a JPEG, PNG, or GIF."
            )
        return value