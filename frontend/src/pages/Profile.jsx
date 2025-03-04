import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import API from "../api/axios";
import { AuthContext } from "../context/AuthContext.jsx";
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
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import MicIcon from '@mui/icons-material/Mic';
import EditProfileForm from '../components/EditProfileForm';
import ChangePasswordForm from '../components/ChangePasswordForm';
import GameStatsForm from '../components/GameStatsForm';

// ViewProfile Component - moved outside of Profile component
function ViewProfile({ user, gameStats, isFollowing, onFollowToggle, isLoggedIn, loggedInUsername, followersCount }) {
  const isOwnProfile = loggedInUsername === user?.username;
  
  const handleSendMessage = () => {
    toast.info('Messaging feature coming soon!');
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 800, mx: 'auto', my: 4 }}>
      <Grid container spacing={3}>
        {/* Header with Avatar, Name, and Action Buttons */}
        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <Avatar
              src={user?.avatar ? `${API.defaults.baseURL}${user.avatar}` : null}
              sx={{ width: 120, height: 120 }}
            />
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
            </Box>
          </Box>

          {/* Action Buttons */}
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
              <>
                <Button
                  variant="contained"
                  onClick={onFollowToggle}
                  startIcon={isFollowing ? <PersonRemoveIcon /> : <PersonAddIcon />}
                  sx={{ mr: 1 }}
                >
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleSendMessage}
                >
                  Message
                </Button>
              </>
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
                            {ranking.rank ? ranking.rank.name : 
                             ranking.numeric_rank !== null ? `${ranking.numeric_rank} pts` : 
                             'Unranked'}
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
      </Grid>
    </Paper>
  );
}

function Profile() {
  const { username: profileUsername } = useParams();
  const { isLoggedIn, username: loggedInUsername, updateFollowers } = useContext(AuthContext);
  const [tabValue, setTabValue] = useState(0);
  const [userData, setUserData] = useState(null);
  const [gameStats, setGameStats] = useState(null);
  const [loading, setLoading] = useState(true);
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
        />
      )}
    </Container>
  );
}

export default Profile;
