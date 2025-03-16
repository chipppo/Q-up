from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
import os

class MyUser(AbstractUser):
    
    # Profile fields
    avatar = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    display_name = models.CharField(max_length=150, blank=True, null=True)  # Display name field
    email = models.EmailField(unique=True)  # Email must be unique for each user
    password = models.CharField(max_length=255)  # Password field (Django handles it securely)
    
    # Followers (Instagram-like)
    followers = models.ManyToManyField('self', symmetrical=False, related_name='following', blank=True)
    
    # Active hours (stored as array of hours)
    active_hours = models.JSONField(
        default=list,
        blank=True,
        help_text="Array of active hours in 24-hour format (e.g., ['00:00', '01:00'])"
    )
    
    # Language preferences
    language_preference = models.JSONField(
        default=list,
        blank=True,
        help_text="Array of preferred languages"
    )
    
    # Platforms
    platforms = models.JSONField(
        default=list,
        blank=True,
        help_text="Array of gaming platforms"
    )
    
    # Mic availability
    mic_available = models.BooleanField(default=True)  # Whether the user has a mic available
    
    # Social links (Instagram, Twitter, etc.)
    social_links = models.JSONField(
        default=list,
        blank=True,
        help_text="Array of social media links"
    )
    
    # Metadata fields
    created_at = models.DateTimeField(auto_now_add=True)  # When the user account was created
    
    # A flag to indicate if the user is active or not
    is_active = models.BooleanField(default=True)
    
    # Timezone settings
    timezone = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="User's timezone (e.g., 'UTC', 'America/New_York')"
    )
    timezone_offset = models.IntegerField(
        default=0,
        help_text="Timezone offset in hours from UTC"
    )
    
    # Date of Birth (optional)
    date_of_birth = models.DateField(null=True, blank=True)
    
    def clean(self):
        super().clean()
        # Validate date of birth
        if self.date_of_birth and self.date_of_birth > timezone.now().date():
            raise ValidationError({'date_of_birth': 'Date of birth cannot be in the future'})
            
        # Ensure JSON fields are arrays
        if not isinstance(self.active_hours, list):
            self.active_hours = []
        if not isinstance(self.language_preference, list):
            self.language_preference = []
        if not isinstance(self.platforms, list):
            self.platforms = []
        if not isinstance(self.social_links, list):
            self.social_links = []
            
        # Validate timezone offset
        if self.timezone_offset < -12 or self.timezone_offset > 14:
            raise ValidationError({'timezone_offset': 'Timezone offset must be between -12 and +14'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.username  # Display the username in admin or when printed

class Game(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    logo = models.ImageField(
        upload_to='game_logos/', 
        null=True, 
        blank=True,
        help_text="Upload game logo (JPEG, PNG, or GIF)"
    )

    def clean(self):
        super().clean()
        if self.logo:
            if not self.logo.name.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                raise ValidationError({'logo': 'Only PNG, JPG, JPEG or GIF files are allowed.'})

    def __str__(self):
        return self.name

    def delete(self, *args, **kwargs):
        if self.logo:
            self.logo.delete()
        super().delete(*args, **kwargs)

class RankSystem(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='rank_systems')
    name = models.CharField(max_length=100)
    is_numeric = models.BooleanField(
        default=False,
        help_text="Check if this is a points-based system (like CS2 Premier)"
    )
    max_numeric_value = models.IntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Maximum value for numeric ranks"
    )
    increment = models.IntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(1)],
        help_text="Step size for numeric ranks (e.g., 1000 for CS2 Premier)"
    )

    def clean(self):
        super().clean()
        if self.is_numeric:
            if not self.max_numeric_value:
                raise ValidationError({'max_numeric_value': 'Maximum value is required for numeric rank systems'})
            if not self.increment:
                raise ValidationError({'increment': 'Increment is required for numeric rank systems'})
        elif not self.is_numeric and (self.max_numeric_value or self.increment):
            raise ValidationError('Non-numeric rank systems should not have max value or increment')

    def __str__(self):
        return f"{self.game.name} - {self.name}"

    class Meta:
        verbose_name = 'Rank System'
        verbose_name_plural = 'Rank Systems'
        unique_together = ('game', 'name')

class RankTier(models.Model):
    rank_system = models.ForeignKey(RankSystem, on_delete=models.CASCADE, related_name='ranks')
    name = models.CharField(max_length=100)
    order = models.IntegerField(
        validators=[MinValueValidator(1)],
        help_text="Position in the ranking system (1 being lowest)"
    )
    icon = models.ImageField(
        upload_to='rank_icons/',
        null=True,
        blank=True,
        help_text="Upload rank icon (JPEG, PNG, or GIF)"
    )

    def clean(self):
        super().clean()
        if self.rank_system.is_numeric:
            raise ValidationError('Cannot create tier ranks for numeric rank systems')
        if self.icon:
            if not self.icon.name.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                raise ValidationError({'icon': 'Only PNG, JPG, JPEG or GIF files are allowed.'})

    def __str__(self):
        return f"{self.rank_system.game.name} - {self.name}"

    def delete(self, *args, **kwargs):
        if self.icon:
            self.icon.delete()
        super().delete(*args, **kwargs)

    class Meta:
        ordering = ['rank_system', 'order']
        unique_together = ('rank_system', 'order')

class PlayerGoal(models.Model):
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Name of the player goal (e.g., 'Competitive', 'Casual')"
    )
    description = models.TextField(
        help_text="Detailed description of what this player goal means"
    )

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = 'Player Goal'
        verbose_name_plural = 'Player Goals'

class GameStats(models.Model):
    user = models.ForeignKey(MyUser, on_delete=models.CASCADE, related_name='game_stats')
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='stats')
    hours_played = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Total hours played in this game"
    )
    player_goal = models.ForeignKey(
        PlayerGoal, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )

    def __str__(self):
        return f"{self.user.username} - {self.game.name}"

    class Meta:
        verbose_name = 'Game Stats'
        verbose_name_plural = 'Game Stats'
        unique_together = ('user', 'game')

class GameRanking(models.Model):
    game_stats = models.ForeignKey(GameStats, on_delete=models.CASCADE, related_name='rankings')
    rank_system = models.ForeignKey(
        RankSystem, 
        on_delete=models.CASCADE, 
        related_name='player_rankings'
    )
    rank = models.ForeignKey(
        RankTier, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    numeric_rank = models.IntegerField(
        null=True, 
        blank=True,
        help_text="Points for numeric ranking systems (e.g., CS2 Premier points)"
    )

    def clean(self):
        super().clean()
        if not self.rank_system:
            if self.rank or self.numeric_rank:
                raise ValidationError('Cannot set rank without a rank system')
            return

        if self.rank_system.is_numeric:
            if self.rank:
                raise ValidationError({'rank': 'Numeric rank systems cannot have tier-based ranks'})
            if self.numeric_rank:
                if self.numeric_rank < 0:
                    raise ValidationError({'numeric_rank': 'Numeric rank cannot be negative'})
                if self.numeric_rank > self.rank_system.max_numeric_value:
                    raise ValidationError({
                        'numeric_rank': f'Numeric rank cannot exceed {self.rank_system.max_numeric_value}'
                    })
                if self.numeric_rank % self.rank_system.increment != 0:
                    raise ValidationError({
                        'numeric_rank': f'Numeric rank must be in increments of {self.rank_system.increment}'
                    })
        else:
            if self.numeric_rank:
                raise ValidationError({'numeric_rank': 'Tier-based rank systems cannot have numeric ranks'})

    def __str__(self):
        rank_display = self.numeric_rank if self.rank_system.is_numeric else self.rank.name if self.rank else 'Unranked'
        return f"{self.game_stats.user.username} - {self.game_stats.game.name} - {self.rank_system.name}: {rank_display}"

    class Meta:
        verbose_name = 'Game Ranking'
        verbose_name_plural = 'Game Rankings'
        unique_together = ('game_stats', 'rank_system')

# New models for social features

class Post(models.Model):
    user = models.ForeignKey(MyUser, on_delete=models.CASCADE, related_name='posts')
    image = models.ImageField(upload_to='post_images/', null=True, blank=True)
    caption = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Optional game reference - if the post is related to a specific game
    game = models.ForeignKey(Game, on_delete=models.SET_NULL, null=True, blank=True, related_name='posts')
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Post'
        verbose_name_plural = 'Posts'
    
    def __str__(self):
        return f"{self.user.username}'s post ({self.id})"
    
    def delete(self, *args, **kwargs):
        # Delete the image file when deleting the post
        if self.image:
            if os.path.isfile(self.image.path):
                os.remove(self.image.path)
        super().delete(*args, **kwargs)
    
    @property
    def likes_count(self):
        return self.likes.count()
    
    @property
    def comments_count(self):
        return self.comments.count()

class Like(models.Model):
    user = models.ForeignKey(MyUser, on_delete=models.CASCADE, related_name='likes')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'post')
        verbose_name = 'Like'
        verbose_name_plural = 'Likes'
    
    def __str__(self):
        return f"{self.user.username} likes {self.post}"

class Comment(models.Model):
    user = models.ForeignKey(MyUser, on_delete=models.CASCADE, related_name='comments')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Self-referential relationship for replies
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    
    class Meta:
        ordering = ['created_at']
        verbose_name = 'Comment'
        verbose_name_plural = 'Comments'
    
    def __str__(self):
        return f"{self.user.username}'s comment on {self.post}"

class Chat(models.Model):
    participants = models.ManyToManyField(MyUser, related_name='chats')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        participant_names = ', '.join(user.username for user in self.participants.all())
        return f"Chat {self.id} between {participant_names}"
    
    def save(self, *args, **kwargs):
        # Update the updated_at timestamp
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)
    
    def get_messages(self):
        return self.messages.all().order_by('created_at')
    
    def add_message(self, sender, content=None, image=None):
        if not content and not image:
            raise ValidationError("Message must have either content or image")
        
        message = Message.objects.create(
            chat=self,
            sender=sender,
            content=content,
            image=image
        )
        
        # Update chat's updated_at timestamp
        self.save()
        
        return message

class Message(models.Model):
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(MyUser, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField(blank=True)
    image = models.ImageField(upload_to='chat_images/', null=True, blank=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    is_edited = models.BooleanField(default=False)
    is_read = models.BooleanField(default=False)
    is_delivered = models.BooleanField(default=True)  # Added field for delivered status
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Message from {self.sender.username} in chat {self.chat.id}"
    
    def delete(self, *args, **kwargs):
        # Delete the image file when deleting the message
        if self.image:
            if os.path.isfile(self.image.path):
                os.remove(self.image.path)
        super().delete(*args, **kwargs)

class MessageReaction(models.Model):
    """
    Model to store emoji reactions to messages.
    Each user can have only one reaction per message.
    """
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(MyUser, on_delete=models.CASCADE, related_name='message_reactions')
    emoji = models.CharField(max_length=20)  # Store the emoji code
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('message', 'user')  # One reaction per user per message
        ordering = ['created_at']
        
    def __str__(self):
        return f"{self.user.username} reacted with {self.emoji} to message {self.message.id}"
