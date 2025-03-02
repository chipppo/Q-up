from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import MyUser, Game, GameStats

class UserSerializer(serializers.ModelSerializer):
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()

    class Meta:
        model = MyUser
        fields = [
            'id', 'username', 'display_name', 'email', 'avatar', 'followers_count', 
            'following_count', 'active_hours', 'language_preference', 'platforms',
            'mic_available', 'social_links', 'created_at', 'is_active', 'timezone', 
            'date_of_birth'
        ]

    def get_followers_count(self, obj):
        return obj.followers.count()

    def get_following_count(self, obj):
        return obj.following.count()


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
        user.set_password(password)  # Securely store the password
        user.save()
        return user


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)  # Use the parent class's validation logic
        # Add custom data to the response if needed
        data['username'] = self.user.username
        return data


class MyTokenRefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate(self, attrs):
        refresh_token = attrs.get('refresh')
        if not refresh_token:
            raise serializers.ValidationError('Refresh token is required')
        return attrs


class GameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        fields = ['id', 'name', 'description']


class GameStatsSerializer(serializers.ModelSerializer):
    game = GameSerializer(read_only=True)

    class Meta:
        model = GameStats
        fields = ['id', 'user', 'game', 'hours_played', 'rank', 'goals', 'achievements']