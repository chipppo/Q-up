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
function ViewProfile({ user, gameStats, isFollowing, onFollowToggle, isLoggedIn, loggedInUsername }) {
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
              src={user?.avatar}
              sx={{ width: 120, height: 120 }}
            />
            <Box>
              <Typography variant="h4">{user?.display_name || user?.username}</Typography>
              <Typography variant="subtitle1">@{user?.username}</Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                <Typography>
                  <strong>{user?.followers_count || 0}</strong> followers
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

        {/* Game Stats */}
        <Grid item xs={12}>
          <Typography variant="h6">Game Statistics</Typography>
          {gameStats && gameStats.length > 0 ? (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {gameStats.map((stat) => (
                <Grid item xs={12} sm={6} md={4} key={stat.id}>
                  <Paper elevation={2} sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">{stat.game.name}</Typography>
                    <Typography>Hours: {stat.hours_played || 0}</Typography>
                    <Typography>Rank: {stat.rank || 'N/A'}</Typography>
                    <Typography>Achievements: {stat.achievements || 'None'}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
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
  const { isLoggedIn, username: loggedInUsername } = useContext(AuthContext);
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
        
        const userResponse = await API.get(`/user_data/${profileUsername}/`);
        setUserData(userResponse.data);
        setFollowersCount(userResponse.data.followers_count || 0);
        setFollowingCount(userResponse.data.following_count || 0);
        
        const statsResponse = await API.get(`/user_data/${profileUsername}/game_stats/`);
        setGameStats(statsResponse.data);
        
        // Check if logged-in user is following this profile
        if (isLoggedIn && loggedInUsername && profileUsername !== loggedInUsername) {
          try {
            const followersResponse = await API.get(`/user_data/${profileUsername}/followers/`);
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
    try {
      const endpoint = isFollowing ? '/unfollow' : '/follow';
      await API.post(`${endpoint}/${profileUsername}/`);
      setIsFollowing(!isFollowing);
      toast.success(isFollowing ? 'Unfollowed successfully' : 'Followed successfully');
    } catch (error) {
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
              {gameStats?.map((stat) => (
                <GameStatsForm
                  key={stat.game.id}
                  username={profileUsername}
                  gameId={stat.game.id}
                  initialStats={stat}
                />
              ))}
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
        />
      )}
    </Container>
  );
}

export default Profile;
