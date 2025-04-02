from .auth_views import (
    RegisterUserView,
    LoginUserView
)

from .user_views import (
    UserDetailView,
    UpdateProfileView,
    UploadAvatarView,
    FollowUserView,
    UnfollowUserView,
    FollowersListView,
    FollowingListView,
    MutualFollowersView
)

from .game_views import (
    GameListView,
    GameStatsListView,
    GameStatsUpdateView,
    RankingSystemListView,
    RankTierListView,
    PlayerGoalListView,
    PlayerGoalDetailView
)

from .social_views import (
    PostListView,
    UserPostsView,
    PostDetailView,
    LikeView,
    LikesListView,
    CommentView,
    CommentRepliesView
)

from .chat_views import (
    ChatListView,
    ChatDetailView,
    ChatReadView,
    MessageListView,
    MessageDetailView,
    MessageReplyView,
    MessageStatusView
)

from .search_views import SearchView

from .password_views import (
    PasswordResetRequestView,
    PasswordResetConfirmView
) 