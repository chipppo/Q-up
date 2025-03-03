from django.contrib import admin
from django.utils.html import format_html
from .models import MyUser, Game, GameStats, RankSystem, RankTier, PlayerGoal

@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'logo_preview')
    search_fields = ('name',)
    ordering = ('name',)
    readonly_fields = ('logo_preview',)
    fields = ('name', 'description', 'logo', 'logo_preview')

    def logo_preview(self, obj):
        if obj.logo:
            return format_html('<img src="{}" style="max-width: 100px; max-height: 100px;" />', obj.logo.url)
        return "No logo uploaded"
    logo_preview.short_description = 'Logo Preview'

@admin.register(RankSystem)
class RankSystemAdmin(admin.ModelAdmin):
    list_display = ('game', 'name', 'is_numeric', 'max_numeric_value', 'increment')
    list_filter = ('game', 'is_numeric')
    search_fields = ('game__name', 'name')
    fieldsets = (
        (None, {
            'fields': ('game', 'name', 'is_numeric')
        }),
        ('Numeric Ranking Settings', {
            'fields': ('max_numeric_value', 'increment'),
            'classes': ('collapse',),
            'description': 'Configure these only for numeric ranking systems like CS2 Premier'
        }),
    )

@admin.register(RankTier)
class RankTierAdmin(admin.ModelAdmin):
    list_display = ('rank_system', 'name', 'order', 'icon_preview')
    list_filter = ('rank_system__game', 'rank_system')
    search_fields = ('name', 'rank_system__name')
    ordering = ('rank_system', 'order')
    readonly_fields = ('icon_preview',)
    fields = ('rank_system', 'name', 'order', 'icon', 'icon_preview')

    def icon_preview(self, obj):
        if obj.icon:
            return format_html('<img src="{}" style="max-width: 50px; max-height: 50px;" />', obj.icon.url)
        return "No icon uploaded"
    icon_preview.short_description = 'Icon Preview'

@admin.register(PlayerGoal)
class PlayerGoalAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)

@admin.register(GameStats)
class GameStatsAdmin(admin.ModelAdmin):
    list_display = ('user', 'game', 'hours_played', 'get_rank_display', 'player_goal')
    list_filter = ('game', 'rank_system', 'player_goal')
    search_fields = ('user__username', 'game__name')
    ordering = ('-hours_played',)
    fieldsets = (
        (None, {
            'fields': ('user', 'game', 'hours_played', 'player_goal')
        }),
        ('Ranking', {
            'fields': ('rank_system', 'rank', 'numeric_rank'),
            'description': 'Choose either a tier-based rank or numeric rank based on the rank system'
        }),
    )

    def get_rank_display(self, obj):
        if obj.rank_system:
            if obj.rank_system.is_numeric and obj.numeric_rank:
                return f"{obj.numeric_rank} points"
            elif obj.rank:
                if obj.rank.icon:
                    return format_html(
                        '<img src="{}" style="max-width: 20px; max-height: 20px;" /> {}',
                        obj.rank.icon.url,
                        obj.rank.name
                    )
                return obj.rank.name
            return "Unranked"
        return "No rank system"
    get_rank_display.short_description = 'Rank'

# Register other models
admin.site.register(MyUser)
