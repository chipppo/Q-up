import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import {
  Box,
  Typography,
  Avatar,
  Paper,
  Button,
  CircularProgress,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import RecommendIcon from "@mui/icons-material/Recommend";

const FollowSuggestions = ({ username, limit = 3 }) => {
  const { isLoggedIn, username: currentUsername } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingStatus, setFollowingStatus] = useState({});
  const [hasMore, setHasMore] = useState(false);
  
  // Only show suggestions for the logged-in user's profile
  const isOwnProfile = username === currentUsername;
  const shouldFetch = isLoggedIn && isOwnProfile;

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!shouldFetch) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // For now, we'll just use a simple search to get some users
        // In a real implementation, you'd want a dedicated endpoint for suggestions
        // based on mutual followers, similar games, etc.
        const response = await API.get('/search/?query=&type=user');
        
        // Filter out the current user and users already followed
        if (response.data && Array.isArray(response.data)) {
          // Get current user's following list to filter out
          const followingResponse = await API.get(`/users/${username}/following/`);
          const followingUsernames = followingResponse.data.map(user => user.username);
          
          const filteredUsers = response.data.filter(user => 
            user.username !== currentUsername && 
            !followingUsernames.includes(user.username)
          );
          
          setSuggestions(filteredUsers.slice(0, limit + 1));
          setHasMore(filteredUsers.length > limit);
          
          // Initialize all as not followed
          const initialStatus = {};
          filteredUsers.forEach(user => {
            initialStatus[user.username] = false;
          });
          setFollowingStatus(initialStatus);
        }
      } catch (error) {
        console.error("Error fetching follow suggestions:", error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [username, currentUsername, shouldFetch, limit]);

  const handleFollowToggle = async (targetUsername) => {
    // Optimistic update
    setFollowingStatus(prev => ({
      ...prev,
      [targetUsername]: true
    }));

    try {
      await API.post(`/users/${targetUsername}/follow/`);
      toast.success(`Now following ${targetUsername}`);
      
      // Remove from suggestions after following
      setSuggestions(prev => prev.filter(user => user.username !== targetUsername));
    } catch (error) {
      // Revert on error
      setFollowingStatus(prev => ({
        ...prev,
        [targetUsername]: false
      }));
      toast.error("Failed to follow user");
    }
  };

  if (!shouldFetch || loading || suggestions.length === 0) {
    return null;
  }

  const displaySuggestions = suggestions.slice(0, limit);

  return (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 2, 
        mb: 3, 
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <RecommendIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6" component="div" fontWeight="medium">
          Suggested for you
        </Typography>
      </Box>
      
      <Grid container spacing={2}>
        {displaySuggestions.map(user => (
          <Grid item xs={12} sm={6} md={4} key={user.id}>
            <Card 
              variant="outlined" 
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 2
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Avatar 
                  src={user.avatar ? `${API.defaults.baseURL}${user.avatar}` : null}
                  component={Link}
                  to={`/profile/${user.username}`}
                  sx={{ 
                    width: 60, 
                    height: 60, 
                    mb: 1,
                    cursor: 'pointer'
                  }}
                >
                  {user.username?.[0]?.toUpperCase()}
                </Avatar>
                <Typography 
                  variant="subtitle1" 
                  component={Link} 
                  to={`/profile/${user.username}`}
                  sx={{ 
                    textDecoration: 'none', 
                    color: 'text.primary',
                    textAlign: 'center',
                    fontWeight: 'medium',
                    '&:hover': {
                      color: 'primary.main'
                    }
                  }}
                >
                  {user.display_name || user.username}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  component="div"
                  sx={{ mb: 1, textAlign: 'center' }}
                >
                  @{user.username}
                </Typography>
                
                {user.followers_count > 0 && (
                  <Chip 
                    size="small" 
                    label={`${user.followers_count} follower${user.followers_count !== 1 ? 's' : ''}`}
                    sx={{ mb: 1 }}
                  />
                )}
              </CardContent>
              <CardActions sx={{ p: 2, pt: 0, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<PersonAddIcon />}
                  onClick={() => handleFollowToggle(user.username)}
                  disabled={followingStatus[user.username]}
                  fullWidth
                >
                  {followingStatus[user.username] ? 'Following' : 'Follow'}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {hasMore && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button 
            component={Link} 
            to="/search-profiles"
            variant="outlined"
            size="small"
          >
            Discover more users
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default FollowSuggestions; 