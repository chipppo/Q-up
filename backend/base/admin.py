from django.contrib import admin
from django.utils.html import format_html
from .models import MyUser, Game, RankSystem, RankTier, PlayerGoal, GameStats, GameRanking

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

# Register models
admin.site.register(MyUser)
admin.site.register(Game, GameAdmin)
admin.site.register(RankSystem, RankSystemAdmin)
admin.site.register(RankTier, RankTierAdmin)
admin.site.register(PlayerGoal, PlayerGoalAdmin)
admin.site.register(GameStats, GameStatsAdmin)
admin.site.register(GameRanking, GameRankingAdmin)
