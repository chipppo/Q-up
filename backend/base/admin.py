from django.contrib import admin
from django.utils.html import format_html
from django.contrib.auth.admin import UserAdmin
from .models import (
    MyUser, Game, GameStats, RankSystem, RankTier, PlayerGoal, GameRanking,
    Post, Like, Comment, Chat, Message, MessageReaction
)

class GameAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'logo_preview')
    search_fields = ('name',)
    ordering = ('name',)
    readonly_fields = ('logo_preview',)
    fields = ('name', 'description', 'logo', 'logo_preview')

    def logo_preview(self, obj):
        if obj.logo:
            return format_html('<img src="{}" width="50" height="50" />', obj.logo.url)
        return "No Logo"

class RankSystemAdmin(admin.ModelAdmin):
    list_display = ('game', 'name', 'is_numeric', 'max_numeric_value', 'increment')
    list_filter = ('game', 'is_numeric')
    search_fields = ('game__name', 'name')
    fieldsets = (
        (None, {
            'fields': ('game', 'name')
        }),
        ('Rank Type', {
            'fields': ('is_numeric', 'max_numeric_value', 'increment')
        }),
    )

class RankTierAdmin(admin.ModelAdmin):
    list_display = ('rank_system', 'name', 'order', 'icon_preview')
    list_filter = ('rank_system__game', 'rank_system')
    search_fields = ('name', 'rank_system__name')
    ordering = ('rank_system', 'order')
    readonly_fields = ('icon_preview',)
    fields = ('rank_system', 'name', 'order', 'icon', 'icon_preview')

    def icon_preview(self, obj):
        if obj.icon:
            return format_html('<img src="{}" width="30" height="30" />', obj.icon.url)
        return "No Icon"

class PlayerGoalAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)

class GameRankingInline(admin.TabularInline):
    model = GameRanking
    extra = 1
    fields = ('rank_system', 'rank', 'numeric_rank')

class GameStatsAdmin(admin.ModelAdmin):
    list_display = ('user', 'game', 'hours_played', 'player_goal')
    list_filter = ('game', 'player_goal')
    search_fields = ('user__username', 'game__name')
    ordering = ('-hours_played',)
    inlines = [GameRankingInline]
    fieldsets = (
        (None, {
            'fields': ('user', 'game', 'hours_played', 'player_goal')
        }),
    )

class GameRankingAdmin(admin.ModelAdmin):
    list_display = ('game_stats', 'rank_system', 'rank', 'numeric_rank')
    list_filter = ('rank_system', 'rank')
    search_fields = ('game_stats__user__username', 'rank_system__name')

# New admin classes for social features

class CommentInline(admin.TabularInline):
    model = Comment
    extra = 0
    fields = ('user', 'text', 'parent', 'created_at')
    readonly_fields = ('created_at',)
    can_delete = True
    show_change_link = True

class LikeInline(admin.TabularInline):
    model = Like
    extra = 0
    fields = ('user', 'created_at')
    readonly_fields = ('created_at',)
    can_delete = True

class PostAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'caption_preview', 'has_image', 'game', 'created_at', 'likes_count', 'comments_count')
    list_filter = ('created_at', 'game')
    search_fields = ('user__username', 'caption', 'game__name')
    readonly_fields = ('created_at', 'updated_at', 'image_preview')
    inlines = [CommentInline, LikeInline]
    fieldsets = (
        (None, {
            'fields': ('user', 'caption', 'game')
        }),
        ('Media', {
            'fields': ('image', 'image_preview')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def caption_preview(self, obj):
        if obj.caption:
            return obj.caption[:50] + ('...' if len(obj.caption) > 50 else '')
        return "No caption"
    caption_preview.short_description = 'Caption'
    
    def has_image(self, obj):
        return bool(obj.image)
    has_image.boolean = True
    has_image.short_description = 'Has Image'
    
    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="max-width: 300px; max-height: 300px;" />', obj.image.url)
        return "No image"
    image_preview.short_description = 'Image Preview'

class CommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'post', 'text_preview', 'parent', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'text', 'post__caption')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('user', 'post', 'text', 'parent')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def text_preview(self, obj):
        if obj.text:
            return obj.text[:50] + ('...' if len(obj.text) > 50 else '')
        return "No text"
    text_preview.short_description = 'Text'

class LikeAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'post', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'post__caption')
    readonly_fields = ('created_at',)

class MessageReactionAdmin(admin.ModelAdmin):
    list_display = ('message', 'user', 'emoji', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'message__content', 'emoji')
    readonly_fields = ('created_at',)
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'message')

# Register models
admin.site.register(MyUser, UserAdmin)
admin.site.register(Game, GameAdmin)
admin.site.register(RankSystem, RankSystemAdmin)
admin.site.register(RankTier, RankTierAdmin)
admin.site.register(PlayerGoal, PlayerGoalAdmin)
admin.site.register(GameStats, GameStatsAdmin)
admin.site.register(GameRanking, GameRankingAdmin)

# Register new models
admin.site.register(Post, PostAdmin)
admin.site.register(Comment, CommentAdmin)
admin.site.register(Like, LikeAdmin)
admin.site.register(Chat)
admin.site.register(Message)
admin.site.register(MessageReaction, MessageReactionAdmin)
