from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _
from django import forms
from .models import (
    MyUser, 
    Game, 
    RankSystem, 
    RankTier, 
    PlayerGoal, 
    GameStats, 
    GameRanking,
    Post,
    Like,
    Comment,
    Chat,
    Message
)

# Админ за потребители
class MyUserAdmin(UserAdmin):
    # Полета в списъка
    list_display = ('username', 'email', 'is_staff', 'date_joined', 'mic_available')
    list_filter = ('is_staff', 'is_active', 'mic_available')
    search_fields = ('username', 'email', 'display_name')
    
    # Разделяне на полета по групи
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        (_('Лична информация'), {'fields': ('first_name', 'last_name', 'email', 'display_name', 'bio', 'avatar', 'date_of_birth')}),
        (_('Настройки на играч'), {'fields': ('active_hours', 'language_preference', 'platforms', 'mic_available', 'social_links')}),
        (_('Часова зона'), {'fields': ('timezone', 'timezone_offset')}),
        (_('Връзки между потребители'), {'fields': ('followers',)}),
        (_('Разрешения'), {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        (_('Важни дати'), {'fields': ('last_login', 'date_joined')}),
    )
    
    # Полета при добавяне на потребител
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'is_staff', 'is_active')
        }),
    )
    
    # Информация при запис
    save_on_top = True
    
    # Разрешава редактиране на много записи наведнъж
    actions = ['make_active', 'make_inactive']
    
    # Масово активиране
    def make_active(self, request, queryset):
        queryset.update(is_active=True)
    make_active.short_description = "Активиране на избраните потребители"
    
    # Масово деактивиране
    def make_inactive(self, request, queryset):
        queryset.update(is_active=False)
    make_inactive.short_description = "Деактивиране на избраните потребители"

# Админ за игри
class GameAdmin(admin.ModelAdmin):
    list_display = ('name', 'has_description', 'has_logo')
    search_fields = ('name', 'description')
    
    # Проверка за описание
    def has_description(self, obj):
        return bool(obj.description)
    has_description.boolean = True
    has_description.short_description = "Има описание"
    
    # Проверка за лого
    def has_logo(self, obj):
        return bool(obj.logo)
    has_logo.boolean = True
    has_logo.short_description = "Има лого"

# Админ за ранг системи
class RankTierInline(admin.TabularInline):
    model = RankTier
    extra = 1

class RankSystemAdmin(admin.ModelAdmin):
    list_display = ('name', 'game', 'is_numeric', 'max_numeric_value', 'increment')
    list_filter = ('game', 'is_numeric')
    search_fields = ('name', 'game__name')
    inlines = [RankTierInline]
    
    # Показва инкременти само за числови системи
    def get_fields(self, request, obj=None):
        fields = ['game', 'name', 'is_numeric']
        if obj and obj.is_numeric:
            fields.extend(['max_numeric_value', 'increment'])
        return fields

# Админ за цели на играча
class PlayerGoalAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name', 'description')

# Админ за статистики
class GameRankingInline(admin.TabularInline):
    model = GameRanking
    extra = 1
    
    # Персонализирано форма 
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "rank_system":
            if hasattr(self, 'game_stats_instance') and self.game_stats_instance:
                kwargs["queryset"] = RankSystem.objects.filter(game=self.game_stats_instance.game)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
    
    # Запис на формата
    def get_formset(self, request, obj=None, **kwargs):
        formset = super().get_formset(request, obj, **kwargs)
        if obj:
            self.game_stats_instance = obj
        return formset

class GameStatsAdmin(admin.ModelAdmin):
    list_display = ('user', 'game', 'hours_played', 'player_goal')
    list_filter = ('game', 'player_goal')
    search_fields = ('user__username', 'game__name')
    inlines = [GameRankingInline]
    
    # Филтриране на игри
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "player_goal":
            kwargs["queryset"] = PlayerGoal.objects.all().order_by('name')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

# Админ за класиране
class GameRankingAdmin(admin.ModelAdmin):
    list_display = ('get_username', 'get_game', 'rank_system', 'get_rank_display')
    list_filter = ('rank_system', 'game_stats__game')
    search_fields = ('game_stats__user__username', 'game_stats__game__name')
    
    # Взима потребителско име
    def get_username(self, obj):
        return obj.game_stats.user.username
    get_username.short_description = 'Потребител'
    get_username.admin_order_field = 'game_stats__user__username'
    
    # Взима името на играта
    def get_game(self, obj):
        return obj.game_stats.game.name
    get_game.short_description = 'Игра'
    get_game.admin_order_field = 'game_stats__game__name'
    
    # Показване на ранга
    def get_rank_display(self, obj):
        if obj.rank_system.is_numeric:
            return f"{obj.numeric_rank} точки"
        else:
            return obj.rank.name if obj.rank else "Нераниран"
    get_rank_display.short_description = 'Ранг'

# Админ за постове
class CommentInline(admin.TabularInline):
    model = Comment
    extra = 0
    fields = ('user', 'text', 'created_at')
    readonly_fields = ('created_at',)

class LikeInline(admin.TabularInline):
    model = Like
    extra = 0
    fields = ('user', 'created_at')
    readonly_fields = ('created_at',)

class PostAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'caption_preview', 'likes_count', 'comments_count', 'created_at')
    list_filter = ('created_at', 'user')
    search_fields = ('user__username', 'caption')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [CommentInline, LikeInline]
    
    # Съкратено показване на текста
    def caption_preview(self, obj):
        return obj.caption[:50] + '...' if len(obj.caption) > 50 else obj.caption
    caption_preview.short_description = 'Текст'
    
    # Брой харесвания
    def likes_count(self, obj):
        return obj.likes.count()
    likes_count.short_description = 'Харесвания'
    
    # Брой коментари
    def comments_count(self, obj):
        return obj.comments.count()
    comments_count.short_description = 'Коментари'

# Админ за коментари
class CommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'post', 'text_preview', 'created_at')
    list_filter = ('created_at', 'user')
    search_fields = ('user__username', 'text', 'post__caption')
    readonly_fields = ('created_at', 'updated_at')
    
    # Съкратено показване на текста
    def text_preview(self, obj):
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text
    text_preview.short_description = 'Текст'

# Админ за харесвания
class LikeAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'post', 'created_at')
    list_filter = ('created_at', 'user')
    search_fields = ('user__username', 'post__caption')
    readonly_fields = ('created_at',)

# Админ за чатове
class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    fields = ('sender', 'content_preview', 'created_at', 'is_read', 'is_delivered')
    readonly_fields = ('created_at', 'content_preview')
    
    # Съкратено показване на съдържанието
    def content_preview(self, obj):
        if not obj.content:
            return "[Изображение]" if obj.image else "[Празно съобщение]"
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Съдържание'

class ChatAdmin(admin.ModelAdmin):
    list_display = ('id', 'participants_list', 'messages_count', 'updated_at')
    list_filter = ('updated_at',)
    search_fields = ('participants__username',)
    readonly_fields = ('created_at', 'updated_at')
    inlines = [MessageInline]
    
    # Списък с участници
    def participants_list(self, obj):
        return ", ".join([user.username for user in obj.participants.all()])
    participants_list.short_description = 'Участници'
    
    # Брой съобщения
    def messages_count(self, obj):
        return obj.messages.count()
    messages_count.short_description = 'Брой съобщения'

# Админ за съобщения
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'chat_id', 'sender', 'content_preview', 'created_at', 'is_read', 'is_delivered')
    list_filter = ('created_at', 'sender', 'is_read', 'is_delivered')
    search_fields = ('sender__username', 'content', 'chat__id')
    readonly_fields = ('created_at', 'updated_at')
    
    # Съкратено показване на съдържанието
    def content_preview(self, obj):
        if not obj.content:
            return "[Изображение]" if obj.image else "[Празно съобщение]"
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Съдържание'
    
    # ID на чата
    def chat_id(self, obj):
        return f"Чат #{obj.chat.id}"
    chat_id.short_description = 'Чат'
    chat_id.admin_order_field = 'chat__id'

# Регистриране на всички модели
admin.site.register(MyUser, MyUserAdmin)
admin.site.register(Game, GameAdmin)
admin.site.register(RankSystem, RankSystemAdmin)
admin.site.register(RankTier, admin.ModelAdmin)
admin.site.register(PlayerGoal, PlayerGoalAdmin)
admin.site.register(GameStats, GameStatsAdmin)
admin.site.register(GameRanking, GameRankingAdmin)
admin.site.register(Post, PostAdmin)
admin.site.register(Comment, CommentAdmin)
admin.site.register(Like, LikeAdmin)
admin.site.register(Chat, ChatAdmin)
admin.site.register(Message, MessageAdmin)
