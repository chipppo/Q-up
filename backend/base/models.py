from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
import os

"""
Models for the Q-up platform - this is where we define all our database stuff.
The app is for gamers to connect with each other based on their games and ranks.
"""

# Разширен потребителски модел
class MyUser(AbstractUser):
    """
    Custom user model that extends Django's built-in user.
    Stores all the profile info about our gamers like their avatar, 
    games they play, when they're online, etc.
    """
    
    # Профилни полета
    avatar = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    display_name = models.CharField(max_length=150, blank=True, null=True)  # Показвано име
    email = models.EmailField(unique=True)  # Имейлът трябва да е уникален
    password = models.CharField(max_length=255)  # Парола (Django я защитава)
    
    # Последователи (като в Instagram)
    followers = models.ManyToManyField('self', symmetrical=False, related_name='following', blank=True)
    
    # Активни часове (масив от часове)
    active_hours = models.JSONField(
        default=list,
        blank=True,
        help_text="Масив от активни часове в 24-часов формат (напр. ['00:00', '01:00'])"
    )
    
    # Езикови предпочитания
    language_preference = models.JSONField(
        default=list,
        blank=True,
        help_text="Масив от предпочитани езици"
    )
    
    # Платформи
    platforms = models.JSONField(
        default=list,
        blank=True,
        help_text="Масив от геймърски платформи"
    )
    
    # Наличие на микрофон
    mic_available = models.BooleanField(default=True)  # Дали потребителят има микрофон
    
    # Социални връзки (Instagram, Twitter и др.)
    social_links = models.JSONField(
        default=list,
        blank=True,
        help_text="Масив от връзки към социални мрежи"
    )
    
    # Мета данни
    created_at = models.DateTimeField(auto_now_add=True)  # Кога е създаден профилът
    
    # Флаг за активност на потребителя
    is_active = models.BooleanField(default=True)
    
    # Настройки за часова зона
    timezone = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Часова зона на потребителя (напр. 'UTC', 'Europe/Sofia')"
    )
    timezone_offset = models.IntegerField(
        default=0,
        help_text="Отместване в часове от UTC"
    )
    
    # Дата на раждане (незадължително)
    date_of_birth = models.DateField(null=True, blank=True)
    
    # Валидация на потребителските данни
    def clean(self):
        """
        Validates all the user data before saving to make sure everything's legit.
        Checks things like date of birth (can't be in the future) and timezone offset.
        """
        super().clean()
        # Проверка за дата на раждане
        if self.date_of_birth and self.date_of_birth > timezone.now().date():
            raise ValidationError({'date_of_birth': 'Датата на раждане не може да бъде в бъдещето'})
            
        # Проверка дали JSON полетата са масиви
        if not isinstance(self.active_hours, list):
            self.active_hours = []
        if not isinstance(self.language_preference, list):
            self.language_preference = []
        if not isinstance(self.platforms, list):
            self.platforms = []
        if not isinstance(self.social_links, list):
            self.social_links = []
            
        # Проверка за часова зона
        if self.timezone_offset < -12 or self.timezone_offset > 14:
            raise ValidationError({'timezone_offset': 'Отместването на часовата зона трябва да бъде между -12 и +14'})

    # Пуска валидации при запис
    def save(self, *args, **kwargs):
        """Runs validation before saving the user"""
        self.full_clean()
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = 'Потребител'
        verbose_name_plural = 'Потребители'

    def __str__(self):
        """Returns the username for admin panel and other displays"""
        return self.username  # Показва потребителското име в админ панела

# Игра
class Game(models.Model):
    """
    Stores information about each game in the platform.
    Simple model with name, description and a logo.
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    logo = models.ImageField(
        upload_to='game_logos/', 
        null=True, 
        blank=True,
        help_text="Качи лого на играта (JPEG, PNG, или GIF)"
    )

    # Проверка за тип на файла
    def clean(self):
        """Makes sure the logo is a valid image format"""
        super().clean()
        if self.logo:
            if not self.logo.name.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                raise ValidationError({'logo': 'Разрешени са само PNG, JPG, JPEG или GIF файлове.'})

    def __str__(self):
        """Shows game name in admin and other displays"""
        return self.name

    # Изтрива файла с логото
    def delete(self, *args, **kwargs):
        """Deletes the logo file when deleting the game to prevent orphaned files"""
        if self.logo:
            self.logo.delete()
        super().delete(*args, **kwargs)

# Ранг система (ELO, рангове)
class RankSystem(models.Model):
    """
    Represents a ranking system for a game (like ranks in CS2, LoL, etc).
    Can be either tier-based (Bronze, Silver, Gold) or numeric (like ELO points).
    """
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='rank_systems')
    name = models.CharField(max_length=100)
    is_numeric = models.BooleanField(
        default=False,
        help_text="Отбележи, ако това е точкова система (като CS2 Premier)"
    )
    max_numeric_value = models.IntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Максимална стойност за числови рангове"
    )
    increment = models.IntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(1)],
        help_text="Стъпка за числови рангове (напр. 1000 за CS2 Premier)"
    )

    # Валидация на типа ранг система
    def clean(self):
        """
        Makes sure numeric rank systems have required values set and
        non-numeric systems don't have them to avoid confusion.
        """
        super().clean()
        if self.is_numeric:
            if not self.max_numeric_value:
                raise ValidationError({'max_numeric_value': 'Максималната стойност е задължителна за числови ранг системи'})
            if not self.increment:
                raise ValidationError({'increment': 'Стъпката е задължителна за числови ранг системи'})
        elif not self.is_numeric and (self.max_numeric_value or self.increment):
            raise ValidationError('Нечисловите ранг системи не трябва да имат максимална стойност или стъпка')

    def __str__(self):
        """Shows the game name and rank system name together"""
        return f"{self.game.name} - {self.name}"

    class Meta:
        verbose_name = 'Ранг система'
        verbose_name_plural = 'Ранг системи'
        unique_together = ('game', 'name')

# Ниво на ранг (злато, диамант)
class RankTier(models.Model):
    """
    Individual ranks within a tier-based ranking system.
    For example: Bronze, Silver, Gold in League of Legends.
    Only used for non-numeric rank systems.
    """
    rank_system = models.ForeignKey(RankSystem, on_delete=models.CASCADE, related_name='ranks')
    name = models.CharField(max_length=100)
    order = models.IntegerField(
        validators=[MinValueValidator(1)],
        help_text="Позиция в ранкинг системата (1 е най-ниската)"
    )
    icon = models.ImageField(
        upload_to='rank_icons/',
        null=True,
        blank=True,
        help_text="Качи икона на ранга (JPEG, PNG, или GIF)"
    )

    # Само за не-числови системи
    def clean(self):
        """
        Validates that this is only used with non-numeric rank systems 
        and that the icon is a valid image format.
        """
        super().clean()
        if self.rank_system.is_numeric:
            raise ValidationError('Не може да се създават степенни рангове за числови ранкинг системи')
        if self.icon:
            if not self.icon.name.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                raise ValidationError({'icon': 'Разрешени са само PNG, JPG, JPEG или GIF файлове.'})

    def __str__(self):
        """Shows the game name and rank name together"""
        return f"{self.rank_system.game.name} - {self.name}"

    # Изтрива файла с иконата
    def delete(self, *args, **kwargs):
        """Removes the icon file when deleting the rank"""
        if self.icon:
            self.icon.delete()
        super().delete(*args, **kwargs)

    class Meta:
        ordering = ['rank_system', 'order']
        unique_together = ('rank_system', 'order')

# Цел на играча (състезателно, забавление)
class PlayerGoal(models.Model):
    """
    Represents what a player wants to get out of playing a game.
    Examples: competitive play, casual fun, achievement hunting, etc.
    """
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Име на целта на играча (напр. 'Състезателно', 'Забавление')"
    )
    description = models.TextField(
        help_text="Подробно описание на това какво означава тази цел"
    )

    def __str__(self):
        """Returns the goal name for display"""
        return self.name

    class Meta:
        verbose_name = 'Цел на играч'
        verbose_name_plural = 'Цели на играчи'

# Статистика за игра на потребител
class GameStats(models.Model):
    """
    Tracks a user's stats for a specific game, like hours played
    and what their goals are with that game.
    """
    user = models.ForeignKey(MyUser, on_delete=models.CASCADE, related_name='game_stats')
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='stats')
    hours_played = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Общо изиграни часове в тази игра"
    )
    player_goal = models.ForeignKey(
        PlayerGoal, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )

    def __str__(self):
        """Shows username and game name together"""
        return f"{self.user.username} - {self.game.name}"

    class Meta:
        verbose_name = 'Статистика за игра'
        verbose_name_plural = 'Статистики за игри'
        unique_together = ('user', 'game')

# Класиране на играч
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
        help_text="Точки за числови ранкинг системи (напр. CS2 Premier точки)"
    )

    # Валидация според типа ранг система
    def clean(self):
        super().clean()
        if not self.rank_system:
            if self.rank or self.numeric_rank:
                raise ValidationError('Не може да зададете ранг без ранкинг система')
            return

        if self.rank_system.is_numeric:
            if self.rank:
                raise ValidationError({'rank': 'Числовите ранкинг системи не могат да имат степенни рангове'})
            if self.numeric_rank:
                if self.numeric_rank < 0:
                    raise ValidationError({'numeric_rank': 'Числовият ранг не може да бъде отрицателен'})
                if self.numeric_rank > self.rank_system.max_numeric_value:
                    raise ValidationError({
                        'numeric_rank': f'Числовият ранг не може да надвишава {self.rank_system.max_numeric_value}'
                    })
                if self.numeric_rank % self.rank_system.increment != 0:
                    raise ValidationError({
                        'numeric_rank': f'Числовият ранг трябва да бъде в стъпки от {self.rank_system.increment}'
                    })
        else:
            if self.numeric_rank:
                raise ValidationError({'numeric_rank': 'Степенните ранкинг системи не могат да имат числови рангове'})

    def __str__(self):
        rank_display = self.numeric_rank if self.rank_system.is_numeric else self.rank.name if self.rank else 'Нераниран'
        return f"{self.game_stats.user.username} - {self.game_stats.game.name} - {self.rank_system.name}: {rank_display}"

    class Meta:
        verbose_name = 'Ранг на играч'
        verbose_name_plural = 'Рангове на играчи'
        unique_together = ('game_stats', 'rank_system')

# Социални модели

# Пост
class Post(models.Model):
    user = models.ForeignKey(MyUser, on_delete=models.CASCADE, related_name='posts')
    image = models.ImageField(upload_to='post_images/', null=True, blank=True)
    caption = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Връзка с игра - ако постът е свързан с конкретна игра
    game = models.ForeignKey(Game, on_delete=models.SET_NULL, null=True, blank=True, related_name='posts')
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Публикация'
        verbose_name_plural = 'Публикации'
    
    def __str__(self):
        return f"{self.user.username}'s post ({self.id})"
    
    # Изтрива снимката при изтриване на поста
    def delete(self, *args, **kwargs):
        # Изтрива снимка при изтриване на пост
        if self.image:
            # S3 compatible file deletion
            self.image.delete(save=False)
        super().delete(*args, **kwargs)
    
    # Брой харесвания
    @property
    def likes_count(self):
        return self.likes.count()
    
    # Брой коментари
    @property
    def comments_count(self):
        return self.comments.count()

# Харесване
class Like(models.Model):
    user = models.ForeignKey(MyUser, on_delete=models.CASCADE, related_name='likes')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'post')
        verbose_name = 'Харесване'
        verbose_name_plural = 'Харесвания'
    
    def __str__(self):
        return f"{self.user.username} likes {self.post}"

# Коментар
class Comment(models.Model):
    user = models.ForeignKey(MyUser, on_delete=models.CASCADE, related_name='comments')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Връзка за отговори на коментар
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    
    class Meta:
        ordering = ['created_at']
        verbose_name = 'Коментар'
        verbose_name_plural = 'Коментари'
    
    def __str__(self):
        return f"{self.user.username} коментира за {self.post}"

# Чат
class Chat(models.Model):
    participants = models.ManyToManyField(MyUser, related_name='chats')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        participant_names = ', '.join(user.username for user in self.participants.all())
        return f"Чат {self.id} между {participant_names}"
    
    # Обновява времето на последна промяна
    def save(self, *args, **kwargs):
        # Обновява timestamp-а
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)
    
    # Взима всички съобщения
    def get_messages(self):
        return self.messages.all().order_by('created_at')
    
    # Добавя ново съобщение
    def add_message(self, sender, content=None, image=None):
        if not content and not image:
            raise ValidationError("Съобщението трябва да има съдържание или изображение")
        
        message = Message.objects.create(
            chat=self,
            sender=sender,
            content=content,
            image=image
        )
        
        # Обновява чата
        self.save()
        
        return message

# Съобщение
class Message(models.Model):
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(MyUser, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField(blank=True)
    image = models.FileField(upload_to='chat_files/', null=True, blank=True)  # Changed from ImageField to FileField to support all types
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    is_edited = models.BooleanField(default=False)
    is_read = models.BooleanField(default=False)
    is_delivered = models.BooleanField(default=True)  # Статус за доставка
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Съобщение от {self.sender.username} в чат {self.chat.id}"
    
    # Изтрива картинката при изтриване
    def delete(self, *args, **kwargs):
        # Изтрива снимката при изтриване
        if hasattr(self, 'image') and self.image:
            try:
                # S3 compatible file deletion
                self.image.delete(save=False)
            except Exception as e:
                # Log error but continue with deletion
                print(f"Error deleting image file for message {self.id}: {str(e)}")
                import traceback
                traceback.print_exc()
        
        super().delete(*args, **kwargs)
