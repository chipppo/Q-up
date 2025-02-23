from django.db import models
from django.contrib.auth.models import AbstractUser

class MyUser(AbstractUser):
    
    # Profile fields
    avatar_url = models.URLField(max_length=255, blank=True, null=True)  # For storing the URL of the profile picture.
    display_name = models.CharField(max_length=150, blank=True, null=True)  # Display name field
    email = models.EmailField(unique=True)  # Email must be unique for each user
    password = models.CharField(max_length=255)  # Password field (Django handles it securely)
    
    # Followers (Instagram-like)
    followers = models.ManyToManyField('self', symmetrical=False, related_name='following', blank=True)
    
    # Active hours
    active_hours = models.JSONField(default=dict, blank=True, null=True)  # For storing timezone and hours info.
    
    # Language preferences
    language_preference = models.JSONField(default=list, blank=True, null=True)  # Languages user prefers
    
    # Platforms
    platforms = models.JSONField(default=list, blank=True, null=True)  # Platforms user is on, like mobile, web, etc.
    
    # Mic availability
    mic_available = models.BooleanField(default=True)  # Whether the user has a mic available
    
    # Social links (Instagram, Twitter, etc.)
    social_links = models.JSONField(default=list, blank=True, null=True)  # For storing social links like Twitter, Instagram
    
    # Metadata fields
    created_at = models.DateTimeField(auto_now_add=True)  # When the user account was created
    
    # A flag to indicate if the user is active or not
    is_active = models.BooleanField(default=True)
    
    # User's timezone (this will allow you to track their timezone)
    timezone = models.CharField(max_length=50, blank=True, null=True)
    
    # Date of Birth (optional)
    date_of_birth = models.DateField(null=True, blank=True)
    
    def __str__(self):
        return self.username  # Display the username in admin or when printed

class Game(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

# backend/base/models.py
class GameStats(models.Model):
    user = models.ForeignKey(MyUser, on_delete=models.CASCADE, related_name='game_stats')
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='stats')
    hours_played = models.IntegerField(default=0)
    rank = models.CharField(max_length=255, blank=True, null=True)
    achievements = models.JSONField(default=list, blank=True, null=True)
    goals = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('user', 'game')  # Ensure each user has only one entry per game

    def __str__(self):
        return f"{self.user.username} - {self.game.name}"


    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
