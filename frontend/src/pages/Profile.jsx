import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext.jsx";
import "./Profile.css";
import { toast } from 'react-toastify';
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Avatar,
  Tabs,
  Tab,
  Alert,
  IconButton,
  Chip,
  Divider,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import MicIcon from '@mui/icons-material/Mic';
import EditProfileForm from '../components/EditProfileForm';
import ChangePasswordForm from '../components/ChangePasswordForm';
import GameStatsForm from '../components/GameStatsForm';
import CreatePostForm from '../components/CreatePostForm';
import PostCard from '../components/PostCard';
import MessageIcon from '@mui/icons-material/Message';

// Define time periods with their corresponding hours
const TIME_PERIODS = [
  { id: "earlyMorning", name: "Early Morning (5-8 AM)", hours: ["05:00", "06:00", "07:00", "08:00"] },
  { id: "morning", name: "Morning (8-11 AM)", hours: ["08:00", "09:00", "10:00", "11:00"] },
  { id: "noon", name: "Noon (11 AM-2 PM)", hours: ["11:00", "12:00", "13:00", "14:00"] },
  { id: "afternoon", name: "Afternoon (2-5 PM)", hours: ["14:00", "15:00", "16:00", "17:00"] },
  { id: "evening", name: "Evening (5-8 PM)", hours: ["17:00", "18:00", "19:00", "20:00"] },
  { id: "night", name: "Night (8-11 PM)", hours: ["20:00", "21:00", "22:00", "23:00"] },
  { id: "lateNight", name: "Late Night (11 PM-2 AM)", hours: ["23:00", "00:00", "01:00", "02:00"] },
  { id: "overnight", name: "Overnight (2-5 AM)", hours: ["02:00", "03:00", "04:00", "05:00"] }
];

// ViewProfile Component - moved outside of Profile component
function ViewProfile({ user, gameStats, isFollowing, onFollowToggle, isLoggedIn, loggedInUsername, followersCount, posts }) {
  const navigate = useNavigate();
  const isOwnProfile = loggedInUsername === user?.username;
  
  const handleSendMessage = async () => {
    if (!isLoggedIn) {
      toast.error('Please log in to send messages');
      navigate('/login', { state: { from: `/profile/${user.username}` } });
      return;
    }

    try {
      // Create or get existing chat
      const response = await API.post('/chats/', {
        username: user.username
      });

      // Navigate to chat with the specific chat ID
      navigate('/chat', {
        state: {
          selectedChatId: response.data.id,
          returnTo: `/profile/${user.username}`
        }
      });
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to create chat. Please try again later.');
    }
  };

  // Helper function to format active hours for display
  const formatActiveHours = (activeHours, timezoneOffset = 0) => {
    if (!activeHours || !Array.isArray(activeHours) || activeHours.length === 0) {
      return "Not specified";
    }
    
    // Convert hours from UTC to user's local timezone
    const convertedHours = activeHours.map(hour => {
      const [hourStr, minuteStr] = hour.split(':');
      let hourNum = parseInt(hourStr, 10);
      
      // Apply timezone offset
      hourNum = (hourNum + timezoneOffset + 24) % 24;
      
      // Format back to string with leading zeros
      return `${hourNum.toString().padStart(2, '0')}:${minuteStr}`;
    });
    
    // Check which periods the user is active in
    const activePeriods = [];
    for (const period of TIME_PERIODS) {
      // If all hours in the period are active, add the full period
      if (period.hours.every(hour => convertedHours.includes(hour))) {
        activePeriods.push(period.name.split(' ')[0]); // Just use the first word
      }
      // If some hours in the period are active, add the period with a * to indicate partial
      else if (period.hours.some(hour => convertedHours.includes(hour))) {
        activePeriods.push(`${period.name.split(' ')[0]}*`); // Just use the first word with *
      }
    }
    
    return activePeriods.length > 0 ? activePeriods.join(", ") : "Not specified";
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 800, mx: 'auto', my: 4 }}>
      <Grid container spacing={3}>
        {/* Profile Header */}
        <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              src={user?.avatar ? `${API.defaults.baseURL}${user.avatar}` : null}
              sx={{ width: 100, height: 100 }}
            >
              {user?.username?.[0]?.toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h4">{user?.display_name || user?.username}</Typography>
              <Typography variant="subtitle1">@{user?.username}</Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                <Typography>
                  <strong>{followersCount || 0}</strong> followers
                </Typography>
                <Typography>
                  <strong>{user?.following_count || 0}</strong> following
                </Typography>
              </Box>
              {/* Display active hours */}
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>Active:</strong> {formatActiveHours(user?.active_hours, user?.timezone_offset)}
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic', display: 'block', marginTop: '2px' }}>
                    (Times shown in {user?.timezone || 'local'} timezone)
                  </span>
                  {formatActiveHours(user?.active_hours, user?.timezone_offset).includes('*') && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic', display: 'block', marginTop: '2px' }}>
                      * Partially active during this time period
                    </span>
                  )}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box>
            {isOwnProfile ? (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                component={Link}
                to={`/profile/${user?.username}/edit`}
              >
                Edit Profile
              </Button>
            ) : isLoggedIn && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={onFollowToggle}
                  startIcon={isFollowing ? <PersonRemoveIcon /> : <PersonAddIcon />}
                >
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleSendMessage}
                  startIcon={<MessageIcon />}
                >
                  Message
                </Button>
              </Box>
            )}
          </Box>
        </Grid>

        {/* User Info */}
        <Grid item xs={12}>
          <Typography variant="h6">Bio</Typography>
          <Typography>{user?.bio || "No bio available"}</Typography>
        </Grid>

        {/* Gaming Preferences */}
        <Grid item xs={12}>
          <Typography variant="h6">Gaming Preferences</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            <Chip 
              icon={<MicIcon />}
              label={user?.mic_available ? "Has Microphone" : "No Microphone"}
              color={user?.mic_available ? "success" : "default"}
            />
            {user?.platforms?.map((platform, index) => (
              <Chip key={index} label={platform} />
            ))}
          </Box>
        </Grid>

        {/* Languages */}
        {user?.language_preference?.length > 0 && (
          <Grid item xs={12}>
            <Typography variant="h6">Languages</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
              {user.language_preference.map((lang, index) => (
                <Chip key={index} label={lang} />
              ))}
            </Box>
          </Grid>
        )}

        {/* Social Links */}
        {user?.social_links?.length > 0 && (
          <Grid item xs={12}>
            <Typography variant="h6">Social Links</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
              {user.social_links.map((link, index) => {
                try {
                  const url = new URL(link);
                  let icon = null;
                  const hostname = url.hostname;
                  
                  // Determine icon based on hostname
                  if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
                    icon = '𝕏'; // X (Twitter)
                  } else if (hostname.includes('facebook.com')) {
                    icon = 'f';
                  } else if (hostname.includes('instagram.com')) {
                    icon = '📷';
                  } else if (hostname.includes('linkedin.com')) {
                    icon = 'in';
                  } else if (hostname.includes('github.com')) {
                    icon = '🐙';
                  } else if (hostname.includes('youtube.com')) {
                    icon = '▶️';
                  } else if (hostname.includes('twitch.tv')) {
                    icon = '🎮';
                  } else if (hostname.includes('discord.com') || hostname.includes('discord.gg')) {
                    icon = '🎧';
                  } else if (hostname.includes('steam')) {
                    icon = '🎲';
                  }
                  
                  return (
                    <Chip
                      key={index}
                      icon={icon ? <span style={{ fontSize: '1.2rem', marginLeft: '8px' }}>{icon}</span> : undefined}
                      label={hostname.replace('www.', '')}
                      component="a"
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      clickable
                      color="primary"
                      variant="outlined"
                      sx={{ 
                        borderRadius: '16px',
                        '&:hover': {
                          backgroundColor: 'rgba(25, 118, 210, 0.1)',
                        }
                      }}
                    />
                  );
                } catch (err) {
                  return null;
                }
              })}
            </Box>
          </Grid>
        )}

        {/* Game Stats - Horizontal Scrolling */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Game Statistics</Typography>
            {isOwnProfile && (
              <Button 
                variant="outlined" 
                size="small"
                component={Link}
                to={`/profile/${user?.username}`}
                onClick={() => {
                  // Set tab to Game Statistics (index 3)
                  const event = new CustomEvent('setProfileTab', { detail: 3 });
                  window.dispatchEvent(event);
                }}
              >
                Manage Games
              </Button>
            )}
          </Box>
          
          {gameStats && gameStats.length > 0 ? (
            <div className="game-stats-scroll">
              {gameStats.map((stat) => (
                <div className="game-stat-card" key={stat.id}>
                  <h3>{stat.game.name}</h3>
                  
                  <div className="game-stat-row">
                    <span className="game-stat-label">Hours Played:</span>
                    <span className="game-stat-value">{stat.hours_played || 0}</span>
                  </div>
                  
                  {stat.player_goal && (
                    <div className="game-stat-row">
                      <span className="game-stat-label">Goal:</span>
                      <span className="game-stat-value">{stat.player_goal.name}</span>
                    </div>
                  )}
                  
                  {stat.rankings && stat.rankings.length > 0 && (
                    <div className="game-rankings">
                      <div className="game-rankings-title">Rankings:</div>
                      {stat.rankings.map((ranking) => (
                        <div className="game-stat-row" key={ranking.id}>
                          <span className="game-stat-label">{ranking.rank_system.name}:</span>
                          <span className="game-stat-value">
                            {ranking.rank ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {ranking.rank.icon && (
                                  <img 
                                    src={`${API.defaults.baseURL}${ranking.rank.icon}`}
                                    alt={ranking.rank.name}
                                    style={{ width: 60, height: 60, objectFit: 'contain' }}
                                  />
                                )}
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  {ranking.rank.name}
                                </Typography>
                              </Box>
                            ) : ranking.numeric_rank !== null ? (
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {ranking.numeric_rank} pts
                              </Typography>
                            ) : (
                              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                Unranked
                              </Typography>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Typography sx={{ mt: 1 }}>No game statistics available</Typography>
          )}
        </Grid>

        {/* Posts Section */}
        <Grid item xs={12}>
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom>Posts</Typography>
          
          {posts && posts.length > 0 ? (
            posts.map(post => (
              <PostCard 
                key={post.id} 
                post={post} 
              />
            ))
          ) : (
            <Typography sx={{ mt: 1, textAlign: 'center', py: 4, bgcolor: 'background.paper', borderRadius: 1 }}>
              No posts yet
            </Typography>
          )}
        </Grid>
      </Grid>
    </Paper>
  );
}

function Profile() {
  const { username: profileUsername } = useParams();
  const { isLoggedIn, username: loggedInUsername, updateFollowers } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [userData, setUserData] = useState(null);
  const [gameStats, setGameStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingGame, setIsAddingGame] = useState(false);
  const [gameFormData, setGameFormData] = useState({
    game_name: "",
    hours_played: "",
    rank: "",
    achievements: "",
    goals: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const navigate = useNavigate();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  
  // Define isOwnProfile - moved to after all hooks are initialized
  const isOwnProfile = loggedInUsername === profileUsername;

  // Listen for tab change events
  useEffect(() => {
    const handleTabChange = (event) => {
      setTabValue(event.detail);
    };

    window.addEventListener('setProfileTab', handleTabChange);
    
    return () => {
      window.removeEventListener('setProfileTab', handleTabChange);
    };
  }, []);

  // Fetch user data and game stats
  useEffect(() => {
    const fetchData = async () => {
      if (!profileUsername) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        console.log("Fetching data for:", profileUsername);
        
        const userResponse = await API.get(`/users/${profileUsername}/`);
        setUserData(userResponse.data);
        setFollowersCount(userResponse.data.followers_count || 0);
        setFollowingCount(userResponse.data.following_count || 0);
        
        const statsResponse = await API.get(`/users/${profileUsername}/game-stats/`);
        setGameStats(statsResponse.data);
        
        // Check if logged-in user is following this profile
        if (isLoggedIn && loggedInUsername && profileUsername !== loggedInUsername) {
          try {
            const followersResponse = await API.get(`/users/${profileUsername}/followers/`);
            setIsFollowing(followersResponse.data.some(
              follower => follower.username === loggedInUsername
            ));
          } catch (followErr) {
            console.error('Error checking follow status:', followErr);
          }
        }
      } catch (err) {
        console.error('Error fetching profile data:', err);
        setError(err.response?.data?.detail || 'Error fetching profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profileUsername, isLoggedIn, loggedInUsername]);

  // Fetch user posts
  useEffect(() => {
    const fetchPosts = async () => {
      if (!profileUsername) return;
      
      try {
        setLoadingPosts(true);
        const response = await API.get(`/users/${profileUsername}/posts/`);
        setPosts(response.data);
      } catch (err) {
        console.error('Error fetching posts:', err);
        // Don't set error state here to avoid blocking the profile display
      } finally {
        setLoadingPosts(false);
      }
    };

    fetchPosts();
  }, [profileUsername]);

  const handleFollowToggle = async () => {
    // Optimistically update the state
    const newIsFollowing = !isFollowing;
    setIsFollowing(newIsFollowing);

    // Update follower count immediately
    if (newIsFollowing) {
      setFollowersCount(prevCount => prevCount + 1); // Increment follower count
    } else {
      setFollowersCount(prevCount => prevCount - 1); // Decrement follower count
    }

    try {
      const endpoint = newIsFollowing ? `/users/${profileUsername}/follow/` : `/users/${profileUsername}/unfollow/`;
      await API.post(endpoint);
      toast.success(newIsFollowing ? 'Followed successfully' : 'Unfollowed successfully');
    } catch (error) {
      // Revert the optimistic update if the request fails
      setIsFollowing(!newIsFollowing); // Revert the following state
      if (newIsFollowing) {
        setFollowersCount(prevCount => prevCount - 1); // Revert follower count
      } else {
        setFollowersCount(prevCount => prevCount + 1); // Revert follower count
      }
      toast.error('Failed to update follow status');
    }
  };

  const handlePostCreated = (newPost) => {
    setPosts(prevPosts => [newPost, ...prevPosts]);
  };

  const handlePostUpdate = (updatedPost) => {
    setPosts(prevPosts => 
      prevPosts.map(post => post.id === updatedPost.id ? updatedPost : post)
    );
  };

  const handlePostDelete = (postId) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container>
      {isOwnProfile ? (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
              <Tab label="Profile" />
              <Tab label="Edit Profile" />
              <Tab label="Change Password" />
              <Tab label="Game Statistics" />
              <Tab label="Posts" />
            </Tabs>
          </Box>
          
          {tabValue === 0 && (
            <ViewProfile 
              user={userData} 
              gameStats={gameStats} 
              isFollowing={false} 
              onFollowToggle={() => {}}
              isLoggedIn={isLoggedIn}
              loggedInUsername={loggedInUsername}
              followersCount={followersCount}
              posts={posts}
            />
          )}
          {tabValue === 1 && (
            <EditProfileForm 
              username={profileUsername} 
              initialData={userData} 
            />
          )}
          {tabValue === 2 && (
            <ChangePasswordForm 
              username={profileUsername} 
            />
          )}
          {tabValue === 3 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">Manage Game Statistics</Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => setIsAddingGame(true)}
                >
                  Add New Game
                </Button>
              </Box>
              
              {isAddingGame && (
                <Box sx={{ mb: 4 }}>
                  <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>Add New Game Stats</Typography>
                    <GameStatsForm
                      username={profileUsername}
                      onUpdate={() => {
                        setIsAddingGame(false);
                        // Refresh game stats
                        API.get(`/users/${profileUsername}/game-stats/`)
                          .then(response => setGameStats(response.data))
                          .catch(err => console.error('Error refreshing game stats:', err));
                      }}
                    />
                  </Paper>
                </Box>
              )}
              
              {gameStats?.length > 0 ? (
                <Grid container spacing={3}>
                  {gameStats.map((stat, index) => (
                    <Grid item xs={12} key={`${stat.game.id}-${index}`}>
                      <Paper elevation={2} sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>{stat.game.name}</Typography>
                        <GameStatsForm
                          username={profileUsername}
                          initialStats={stat}
                          onUpdate={() => {
                            // Refresh game stats
                            API.get(`/users/${profileUsername}/game-stats/`)
                              .then(response => setGameStats(response.data))
                              .catch(err => console.error('Error refreshing game stats:', err));
                          }}
                        />
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Alert severity="info">
                  You haven't added any game statistics yet. Click "Add New Game" to get started.
                </Alert>
              )}
            </Box>
          )}
          {tabValue === 4 && (
            <Box>
              <CreatePostForm onPostCreated={handlePostCreated} />
              
              {loadingPosts ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : posts.length > 0 ? (
                posts.map(post => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    onPostUpdate={handlePostUpdate}
                    onPostDelete={handlePostDelete}
                  />
                ))
              ) : (
                <Alert severity="info">
                  You haven't created any posts yet. Use the form above to create your first post!
                </Alert>
              )}
            </Box>
          )}
        </>
      ) : (
        <ViewProfile 
          user={userData} 
          gameStats={gameStats} 
          isFollowing={isFollowing} 
          onFollowToggle={handleFollowToggle}
          isLoggedIn={isLoggedIn}
          loggedInUsername={loggedInUsername}
          followersCount={followersCount}
          posts={posts}
        />
      )}
    </Container>
  );
}

export default Profile;
