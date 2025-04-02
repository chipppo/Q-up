/**
 * Dashboard page component
 * 
 * The Dashboard serves as the main landing page after login, displaying:
 * - User profile summary with avatar and join date
 * - Quick access to recent chats and posts
 * - Game statistics and activity metrics
 * - Navigation cards to other major app features
 * 
 * @module Dashboard
 * @requires React
 * @requires react-router-dom
 * @requires material-ui
 * @requires react-toastify
 * @requires AuthContext
 */
// src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import API from "../../api/axios";
import { 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  Button, 
  Card, 
  CardContent,
  CardActions,
  Avatar,
  CircularProgress,
  Alert,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Chip,
  Tooltip
} from "@mui/material";
import { 
  Person as PersonIcon, 
  Search as SearchIcon,
  Feed as FeedIcon,
  Edit as EditIcon,
  SportsEsports as GameIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Message as MessageIcon,
  PersonAdd as PersonAddIcon,
  PostAdd as PostAddIcon,
  Chat as ChatIcon,
  Add as AddIcon,
  AccessTime as TimeIcon
} from "@mui/icons-material";
import { toast } from "react-toastify";
import "../../styles/pages/dashboard/Dashboard.css";

/**
 * Formats image URLs by ensuring they have the correct base URL path
 * 
 * @function formatImageUrl
 * @param {string|null} url - The image URL to format
 * @returns {string|null} The formatted URL or null if no URL provided
 */
const formatImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API.defaults.baseURL}${url}`;
};

/**
 * Generates a consistent color based on a string (used for avatar backgrounds)
 * 
 * @function stringToColor
 * @param {string} string - The string to generate a color from (usually username)
 * @returns {string} A hex color code
 */
const stringToColor = (string) => {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
};

/**
 * Main Dashboard component that displays personalized user information,
 * recent activity, and navigation options to other app features
 * 
 * @function Dashboard
 * @returns {JSX.Element} The rendered dashboard
 */
function Dashboard() {
  const { username } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentChats, setRecentChats] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    fetchUserData();
    fetchRecentChats();
    fetchRecentPosts();
  }, [username]);

  /**
   * Fetches user profile data and game statistics
   * 
   * @async
   * @function fetchUserData
   */
  const fetchUserData = async () => {
      try {
        setLoading(true);
      const userResponse = await API.get(`/users/${username}/`);
      const userData = userResponse.data;
      
      // No need to manually format the avatar URL anymore
      setUserData(userData);

      const statsResponse = await API.get(`/users/${username}/game-stats/`);
      setStats(statsResponse.data);
      } catch (error) {
      console.error("Error fetching user data:", error);
      setError("Failed to load user data. Please try again later.");
        
      if (error.response?.status === 401) {
          toast.error('Your session has expired. Please log in again.');
          navigate('/login', { state: { from: '/dashboard' } });
        }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetches the user's most recent chat conversations
   * 
   * @async
   * @function fetchRecentChats
   */
  const fetchRecentChats = async () => {
    try {
      setLoadingChats(true);
      const response = await API.get('/chats/');
      // Sort by most recent message
      const sortedChats = response.data.sort((a, b) => 
        new Date(b.updated_at) - new Date(a.updated_at)
      );
      setRecentChats(sortedChats.slice(0, 3)); // Get top 3 recent chats
    } catch (error) {
      console.error("Error fetching recent chats:", error);
    } finally {
      setLoadingChats(false);
    }
  };

  /**
   * Fetches the user's most recent posts
   * 
   * @async
   * @function fetchRecentPosts
   */
  const fetchRecentPosts = async () => {
    try {
      setLoadingPosts(true);
      const response = await API.get(`/users/${username}/posts/`);
      setRecentPosts(response.data.slice(0, 3)); // Get top 3 recent posts
    } catch (error) {
      console.error("Error fetching recent posts:", error);
    } finally {
      setLoadingPosts(false);
    }
  };

  /**
   * Formats dates into a readable string format
   * 
   * @function formatDate
   * @param {string} dateString - ISO date string to format
   * @returns {string} Formatted date string
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
        <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Welcome Section */}
      <Paper
        sx={{
          p: 3,
          mb: 4,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          background: 'linear-gradient(to right, #00FFAA, #33FFBB)',
          color: 'background.default',
          borderRadius: 2,
        }}
      >
        <Avatar
          src={formatImageUrl(userData?.avatar_url)}
          sx={{
            width: 80,
            height: 80,
            mr: { xs: 0, sm: 3 },
            mb: { xs: 2, sm: 0 },
            border: '3px solid',
            borderColor: 'primary.main',
            bgcolor: userData?.avatar_url ? 'transparent' : stringToColor(username || '')
          }}
        >
          {userData?.username?.[0]?.toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="h4" gutterBottom>
            Welcome back, {userData?.display_name || userData?.username}!
        </Typography>
          <Typography variant="body1">
            Member since {formatDate(userData?.created_at)}
        </Typography>
        </Box>
      </Paper>

      <Grid container spacing={4}>
        {/* Quick Stats Section */}
        <Grid item xs={12}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            <GameIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
            Your Stats
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                sx={{
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  borderRadius: 2,
                  boxShadow: 2,
                  height: '100%',
                }}
              >
                <PersonAddIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
                  Following
                </Typography>
                <Typography variant="h4" color="primary">
                  {userData?.following_count || 0}
            </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                sx={{
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  borderRadius: 2,
                  boxShadow: 2,
                  height: '100%',
                }}
              >
                <GameIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  Games
                </Typography>
                <Typography variant="h4" color="primary">
                  {stats.length}
                </Typography>
              </Paper>
                </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                sx={{
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  borderRadius: 2,
                  boxShadow: 2,
                  height: '100%',
                }}
              >
                <PostAddIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  Posts
                </Typography>
                <Typography variant="h4" color="primary">
                  {recentPosts.length > 0 ? recentPosts.length : 0}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Grid>

        {/* Game Stats Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                <GameIcon sx={{ mr: 1, fontSize: 28 }} />
                Your Games
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => navigate(`/profile/${username}`)}
                sx={{ borderRadius: '20px' }}
              >
                Add Game
              </Button>
            </Box>
            {stats.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <GameIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  You haven't added any games yet.
                </Typography>
                <Button 
                  variant="contained" 
                  sx={{ mt: 2 }}
                  startIcon={<GameIcon />}
                  onClick={() => navigate(`/profile/${username}`)}
                >
                  Add Your First Game
                </Button>
              </Box>
            ) : (
              <Box className="game-stats-container">
                {stats.map((stat) => (
                  <Box 
                    key={stat.id} 
                    className="game-stat-item"
                    onClick={() => navigate(`/profile/${username}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    {/* Game Logo */}
                    <Box sx={{ position: 'relative' }}>
                      <Avatar 
                        src={formatImageUrl(stat.game.logo)} 
                        alt={stat.game.name}
                        sx={{
                          width: 70,
                          height: 70,
                          bgcolor: 'primary.main',
                          borderRadius: '12px'
                        }}
                        variant="rounded"
                      >
                        <GameIcon sx={{ fontSize: 40 }} />
                      </Avatar>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          position: 'absolute', 
                          bottom: -8, 
                          right: -8, 
                          bgcolor: 'primary.main', 
                          color: 'background.default', 
                          borderRadius: '10px', 
                          px: 1, 
                          py: 0.5,
                          fontWeight: 'bold'
                        }}
                      >
                        {stat.hours_played}h
                      </Typography>
                    </Box>
                    
                    {/* Game Info */}
                    <Box sx={{ ml: 2, flexGrow: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                        {stat.game.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Goal: {stat.player_goal?.name || 'Not set'}
                      </Typography>
                      
                      {/* Rankings */}
                      {stat.rankings && stat.rankings.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {stat.rankings.map((ranking, index) => (
                            <Box 
                              key={index}
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                gap: 0.5,
                                bgcolor: 'rgba(25, 118, 210, 0.1)',
                                borderRadius: '20px',
                                px: 1.5,
                                py: 0.5
                              }}
                            >
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                {ranking.rank_system.name}:
                              </Typography>
                              
                              {ranking.rank_system.is_numeric ? (
                                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                  {ranking.numeric_rank !== null ? `${ranking.numeric_rank}` : 'Unranked'}
                                </Typography>
                              ) : ranking.rank?.icon ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Avatar 
                                    src={formatImageUrl(ranking.rank.icon)}
                                    alt={ranking.rank.name}
                                    sx={{ width: 20, height: 20 }}
                                    imgProps={{
                                      onError: (e) => {
                                        e.target.src = null;
                                        e.target.alt = ranking.rank.name.charAt(0);
                                      }
                                    }}
                                  >
                                    {ranking.rank.name.charAt(0)}
                                  </Avatar>
                                  <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                    {ranking.rank.name}
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                  {ranking.rank?.name || 'Unranked'}
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Recent Chats Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                Recent Chats
                        </Typography>
                        <Button 
                variant="outlined" 
                startIcon={<ChatIcon />}
                onClick={() => navigate('/chat')}
              >
                All Chats
                        </Button>
            </Box>
            {loadingChats ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : recentChats.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <MessageIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  You don't have any chats yet.
                </Typography>
                <Button 
                  variant="contained" 
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/search-profiles')}
                >
                  Find Players to Chat With
                </Button>
              </Box>
            ) : (
              <List>
                {recentChats.map((chat) => {
                  // Find the other participant (not the current user)
                  const otherParticipant = chat.participants.find(p => p.username !== username);
                  
                  return (
                    <ListItem 
                      key={chat.id} 
                      divider 
                      component="li"
                      onClick={() => navigate('/chat', { state: { selectedChatId: chat.id } })}
                      sx={{ 
                        '&:hover': { 
                          backgroundColor: 'rgba(0, 0, 0, 0.04)' 
                        },
                        cursor: 'pointer'
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar 
                          src={formatImageUrl(otherParticipant?.avatar_url)}
                          sx={{ 
                            bgcolor: otherParticipant?.avatar_url ? 'transparent' : stringToColor(otherParticipant?.username || '') 
                          }}
                        >
                          {otherParticipant?.username?.[0]?.toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={otherParticipant?.display_name || otherParticipant?.username}
                        secondary={
                          chat.last_message ? (
                            <>
                              {chat.last_message.content.length > 30 
                                ? chat.last_message.content.substring(0, 30) + '...' 
                                : chat.last_message.content}
                              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                                {new Date(chat.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Typography>
                            </>
                          ) : 'No messages yet'
                        }
                      />
                      {chat.unread_count > 0 && (
                        <Chip 
                          label={chat.unread_count} 
                          color="primary" 
                          size="small" 
                          sx={{ ml: 1 }}
                        />
                      )}
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Recent Posts Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                Recent Posts
              </Typography>
              <Button 
                variant="outlined" 
                startIcon={<PostAddIcon />}
                onClick={() => navigate('/feed')}
              >
                View All Posts
              </Button>
            </Box>
            {loadingPosts ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : recentPosts.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <PostAddIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  You haven't posted anything yet.
                </Typography>
                <Button 
                  variant="contained" 
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/create-post')}
                >
                  Create Your First Post
                </Button>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {recentPosts.map((post) => (
                  <Grid item xs={12} key={post.id}>
                    <Card 
                      className="post-card"
                      onClick={() => navigate(`/feed?post=${post.id}`)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <CardContent className="post-content">
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Avatar 
                            src={formatImageUrl(post.user.avatar_url)}
                            sx={{ 
                              mr: 1,
                              bgcolor: post.user.avatar_url ? 'transparent' : stringToColor(post.user.username || '')
                            }}
                          >
                            {post.user.username?.[0]?.toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                              {post.user.display_name || post.user.username}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(post.created_at)}
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Typography variant="body1" sx={{ mb: 2 }}>
                          {post.caption}
                        </Typography>
                        
                        {post.image && (
                          <Box 
                            sx={{ 
                              width: '100%', 
                              height: 200, 
                              overflow: 'hidden', 
                              borderRadius: 1,
                              mb: 2
                            }}
                          >
                            <img 
                              src={formatImageUrl(post.image)}
                              alt="Post"
                              style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'cover' 
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </Box>
                        )}
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">
                            {post.likes_count} likes • {post.comments_count} comments
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>

        {/* Quick Actions Section */}
        <Grid item xs={12}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            Quick Actions
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <Paper
                sx={{
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  borderRadius: 2,
                  boxShadow: 2,
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 3,
                  },
                }}
                onClick={() => navigate(`/profile/${username}/edit`)}
              >
                <EditIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom textAlign="center">
                  Edit Profile
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Update your profile information, avatar, and preferences
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Paper
                sx={{
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  borderRadius: 2,
                  boxShadow: 2,
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 3,
                  },
                }}
                onClick={() => navigate('/feed')}
              >
                <FeedIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom textAlign="center">
                  View Feed
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  See the latest posts from people you follow
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Paper
                sx={{
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  borderRadius: 2,
                  boxShadow: 2,
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 3,
                  },
                }}
                onClick={() => navigate('/search-profiles')}
              >
                <SearchIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom textAlign="center">
                  Find Players
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Discover new players based on games, goals, and rankings
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Dashboard;