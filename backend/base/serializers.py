from rest_framework import serializers
from .models import MyUser

class UserSerializer(serializers.ModelSerializer):
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()

    class Meta:
        model = MyUser
        fields = [
            'id', 'username', 'display_name', 'email', 'avatar_url', 'followers_count', 
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


class MyTokenObtainPairSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')

        if not username or not password:
            raise serializers.ValidationError('Username and password are required')

        user = MyUser.objects.filter(username=username).first()

        if user and user.check_password(password):
            return {'user': user}
        raise serializers.ValidationError('Invalid credentials')


class MyTokenRefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate(self, attrs):
        refresh_token = attrs.get('refresh')

        if not refresh_token:
            raise serializers.ValidationError('Refresh token is required')

        # Implement the validation logic for refresh token if needed
        return attrs
