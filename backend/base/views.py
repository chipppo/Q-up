# This file is maintained for backward compatibility
# It imports all views from the new modular structure in the views/ package

from .views.auth_views import (
    RegisterUserView,
    LoginUserView
)

from .views.user_views import (
    UserDetailView,
    UpdateProfileView,
    UploadAvatarView,
    FollowUserView,
    UnfollowUserView,
    FollowersListView,
    FollowingListView,
    MutualFollowersView
)

from .views.game_views import (
    GameListView,
    GameStatsListView,
    GameStatsUpdateView,
    RankingSystemListView,
    RankTierListView,
    PlayerGoalListView,
    PlayerGoalDetailView
)

from .views.social_views import (
    PostListView,
    UserPostsView,
    PostDetailView,
    LikeView,
    LikesListView,
    CommentView,
    CommentRepliesView
)

from .views.chat_views import (
    ChatListView,
    ChatDetailView,
    ChatReadView,
    MessageListView,
    MessageDetailView,
    MessageReplyView,
    MessageStatusView
)

from .views.search_views import SearchView

from .views.password_views import (
    PasswordResetRequestView,
    PasswordResetConfirmView
)
#For TokenRefreshView, it's already imported directly in urls.py
