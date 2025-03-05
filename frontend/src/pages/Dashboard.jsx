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
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Alert
} from "@mui/material";
import { 
  Person as PersonIcon, 
  Search as SearchIcon,
  Feed as FeedIcon,
  Create as CreateIcon,
  SportsEsports as GameIcon,
  People as PeopleIcon
} from "@mui/icons-material";
import { toast } from "react-toastify";
import "./Dashboard.css";

function Dashboard() {
  const { username, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [recentPosts, setRecentPosts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isLoggedIn) {
      toast.info('Please log in to view your dashboard');
      navigate('/login', { state: { from: '/dashboard' } });
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch recent posts
        const postsResponse = await API.get('/posts/?limit=5');
        setRecentPosts(postsResponse.data);
        
        // Fetch user profile for game stats
        const profileResponse = await API.get(`/profile/${username}/`);
        
        // Create activity items from various data
        const activityItems = [];
        
        // Add game stats as activity
        if (profileResponse.data.game_stats && profileResponse.data.game_stats.length > 0) {
          profileResponse.data.game_stats.forEach(stat => {
            activityItems.push({
              type: 'game_stat',
              title: `Played ${stat.game.name} for ${stat.hours_played} hours`,
              timestamp: new Date().toISOString(), // Use current time as fallback
              data: stat
            });
          });
        }
        
        // Sort activity by timestamp (newest first)
        activityItems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        setRecentActivity(activityItems.slice(0, 5)); // Take top 5 activities
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data');
        setLoading(false);
        
        // Handle authentication errors
        if (error.response && error.response.status === 401) {
          toast.error('Your session has expired. Please log in again.');
          navigate('/login', { state: { from: '/dashboard' } });
        }
      }
    };

    fetchDashboardData();
  }, [username, isLoggedIn, navigate]);

  const dashboardLinks = [
    { title: "Profile", icon: <PersonIcon />, path: `/profile/${username}` },
    { title: "Search Profiles", icon: <SearchIcon />, path: "/search-profiles" },
    { title: "Feed", icon: <FeedIcon />, path: "/feed" },
    { title: "Edit Profile", icon: <CreateIcon />, path: `/profile/${username}/edit` },
  ];

  if (loading) {
    return (
      <Container className="dashboard-container" sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="dashboard-container" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container className="dashboard-container" sx={{ py: 4 }}>
      <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 2 }} className="dashboard-header">
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Welcome back, {username}!
        </Typography>
      </Paper>

      <Grid container spacing={4}>
        {/* Quick Links Section */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Quick Links
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              {dashboardLinks.map((link, index) => (
                <Grid item xs={6} key={index}>
                  <Button
                    component={Link}
                    to={link.path}
                    variant="outlined"
                    startIcon={link.icon}
                    fullWidth
                    sx={{ justifyContent: 'flex-start', mb: 1 }}
                    className="quick-link-button"
                  >
                    {link.title}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Recent Activity Section */}
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {recentActivity.length > 0 ? (
              <List>
                {recentActivity.map((activity, index) => (
                  <React.Fragment key={index}>
                    <ListItem alignItems="flex-start" className="activity-list-item">
                      <ListItemAvatar>
                        <Avatar className={activity.type === 'game_stat' ? 'game-avatar' : 'activity-avatar'}>
                          {activity.type === 'game_stat' ? <GameIcon /> : <PeopleIcon />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={activity.title}
                        secondary={
                          activity.type === 'game_stat' && activity.data.rankings && activity.data.rankings.length > 0 
                            ? `Rank: ${activity.data.rankings[0].rank_tier.name || 'Unranked'} in ${activity.data.rankings[0].rank_system.name}`
                            : null
                        }
                      />
                    </ListItem>
                    {index < recentActivity.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body1" color="text.secondary">
                  No recent activity to show
                </Typography>
                <Button 
                  component={Link} 
                  to={`/profile/${username}/edit`} 
                  variant="contained" 
                  sx={{ mt: 2 }}
                >
                  Update Your Profile
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Recent Posts Section */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Posts
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {recentPosts.length > 0 ? (
              <Grid container spacing={2}>
                {recentPosts.map(post => (
                  <Grid item xs={12} sm={6} md={4} key={post.id}>
                    <Card className="post-card">
                      <CardContent className="post-content">
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          @{post.author.username} • {new Date(post.created_at).toLocaleDateString()}
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          {post.content.length > 100 
                            ? `${post.content.substring(0, 100)}...` 
                            : post.content}
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Button 
                          size="small" 
                          component={Link} 
                          to={`/feed`} 
                          state={{ scrollToPost: post.id }}
                        >
                          View Post
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body1" color="text.secondary">
                  No recent posts to show
                </Typography>
                <Button 
                  component={Link} 
                  to="/feed" 
                  variant="contained" 
                  sx={{ mt: 2 }}
                >
                  Go to Feed
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Dashboard;