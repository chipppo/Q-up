// src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
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
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Chip
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
  Add as AddIcon
} from "@mui/icons-material";
import { toast } from "react-toastify";
import "./Dashboard.css";

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

  const fetchUserData = async () => {
      try {
        setLoading(true);
      const userResponse = await API.get(`/users/${username}/`);
      const userData = userResponse.data;
      
      // Ensure we have the full avatar URL
      if (userData.avatar && !userData.avatar.startsWith('http')) {
        userData.avatar_url = `http://localhost:8000${userData.avatar_url}`;
      }
      
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
          background: 'linear-gradient(to right, #1976d2, #64b5f6)',
          color: 'white',
          borderRadius: 2,
        }}
      >
        <Avatar
          src={userData?.avatar_url || ''}
          sx={{
            width: 80,
            height: 80,
            mr: { xs: 0, sm: 3 },
            mb: { xs: 2, sm: 0 },
            border: '3px solid white',
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                <GameIcon sx={{ mr: 1 }} />
                Your Games
            </Typography>
              <Button 
                variant="outlined" 
                startIcon={<AddIcon />}
                endIcon={<GameIcon />}
                onClick={() => navigate(`/profile/${username}`)}
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
              <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                {stats.map((stat) => (
                  <ListItem 
                    key={stat.id} 
                    divider
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                        cursor: 'pointer'
                      }
                    }}
                    onClick={() => navigate(`/profile/${username}`)}
                  >
                    <ListItemAvatar>
                      <Avatar 
                        src={stat.game.logo} 
                        alt={stat.game.name}
                        sx={{
                          bgcolor: 'primary.main',
                          '& .MuiSvgIcon-root': { color: 'white' }
                        }}
                      >
                        <GameIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <GameIcon sx={{ mr: 1, fontSize: 16 }} />
                          {stat.game.name}
                        </Box>
                      }
                      secondary={`${stat.hours_played} hours played • ${stat.player_goal?.name || 'No goal set'}`}
                    />
                    {stat.rankings && stat.rankings.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {stat.rankings.map((ranking, index) => (
                          <Chip 
                            key={index}
                            icon={<img 
                              src={ranking.rank?.icon || ''} 
                              alt="" 
                              style={{ width: 20, height: 20 }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.onerror = null;
                              }}
                            />}
                            label={ranking.rank?.name || `Rank: ${ranking.numeric_rank}`} 
                            color="primary" 
                            variant="outlined" 
                            size="small"
                          />
                        ))}
                      </Box>
                    )}
                  </ListItem>
                ))}
              </List>
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
                  const otherParticipant = chat.participants.find(p => p.username !== username);
                  return (
                    <ListItem 
                      key={chat.id} 
                      divider 
                      component="div"
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.04)'
                        }
                      }}
                      onClick={() => navigate(`/chat?chat=${chat.id}`)}
                    >
                      <ListItemAvatar>
                        <Avatar 
                          src={otherParticipant?.avatar_url || ''} 
                          alt={otherParticipant?.username}
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
                          chat.last_message ? 
                            (chat.last_message.content?.length > 30 ? 
                              chat.last_message.content.substring(0, 30) + '...' : 
                              chat.last_message.content) || (chat.last_message.image ? 'Sent an image' : '') : 
                            'No messages yet'
                        }
                      />
                      <Typography variant="caption" color="text.secondary">
                        {chat.last_message ? 
                          new Date(chat.last_message.created_at).toLocaleDateString() : 
                          new Date(chat.created_at).toLocaleDateString()
                        }
                      </Typography>
                    </ListItem>
                  );
                })}
              </List>
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