import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Button,
  Typography,
  Tabs,
  Tab,
  Box,
  CircularProgress,
  Divider
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import MessageIcon from "@mui/icons-material/Message";

const FollowersModal = ({ open, onClose, username, initialTab = "followers" }) => {
  const { isLoggedIn, username: currentUsername } = useAuth();
  const [tab, setTab] = useState(initialTab === "following" ? 1 : 0);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingStatus, setFollowingStatus] = useState({});

  useEffect(() => {
    if (open) {
      fetchFollowData();
    }
  }, [open, username, tab]);

  const fetchFollowData = async () => {
    setLoading(true);
    try {
      if (tab === 0) {
        const response = await API.get(`/users/${username}/followers/`);
        setFollowers(response.data);
        if (isLoggedIn) {
          updateFollowingStatus(response.data);
        }
      } else {
        const response = await API.get(`/users/${username}/following/`);
        setFollowing(response.data);
        if (isLoggedIn) {
          updateFollowingStatus(response.data);
        }
      }
    } catch (error) {
      console.error("Error fetching follow data:", error);
      toast.error("Failed to load followers data");
    } finally {
      setLoading(false);
    }
  };

  const updateFollowingStatus = async (users) => {
    if (!isLoggedIn) return;
    
    const statusMap = {};
    for (const user of users) {
      // Skip if it's the current user
      if (user.username === currentUsername) continue;
      
      try {
        const response = await API.get(`/users/${user.username}/followers/`);
        statusMap[user.username] = response.data.some(
          follower => follower.username === currentUsername
        );
      } catch (err) {
        console.error(`Error checking follow status for ${user.username}:`, err);
      }
    }
    setFollowingStatus(statusMap);
  };

  const handleFollowToggle = async (targetUsername, isCurrentlyFollowing) => {
    if (!isLoggedIn) {
      toast.error("Please log in to follow users");
      return;
    }

    // Optimistic update
    setFollowingStatus(prev => ({
      ...prev,
      [targetUsername]: !isCurrentlyFollowing
    }));

    try {
      const endpoint = isCurrentlyFollowing 
        ? `/users/${targetUsername}/unfollow/`
        : `/users/${targetUsername}/follow/`;
      
      await API.post(endpoint);
      toast.success(isCurrentlyFollowing 
        ? `Unfollowed ${targetUsername}` 
        : `Now following ${targetUsername}`
      );
      
      // Refresh lists if we're toggling follow on the profile we're viewing
      if (targetUsername === username) {
        fetchFollowData();
      }
    } catch (error) {
      // Revert on error
      setFollowingStatus(prev => ({
        ...prev,
        [targetUsername]: isCurrentlyFollowing
      }));
      toast.error("Failed to update follow status");
    }
  };

  const handleCreateChat = async (targetUsername) => {
    if (!isLoggedIn) {
      toast.error("Please log in to send messages");
      return;
    }

    try {
      const response = await API.post('/chats/', {
        username: targetUsername
      });
      
      // Close the modal
      onClose();
      
      // Navigate to chat
      window.location.href = `/chat?chatId=${response.data.id}`;
    } catch (error) {
      console.error("Error creating chat:", error);
      toast.error("Failed to start conversation");
    }
  };

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '80vh'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" component="span">
          {username}'s Connections
        </Typography>
        <IconButton edge="end" onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tab} 
          onChange={handleTabChange} 
          sx={{ px: 2 }}
          variant="fullWidth"
        >
          <Tab label={`Followers (${followers.length || 0})`} />
          <Tab label={`Following (${following.length || 0})`} />
        </Tabs>
      </Box>
      
      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {tab === 0 ? (
              followers.length > 0 ? (
                followers.map((user) => (
                  <React.Fragment key={user.id}>
                    <ListItem 
                      alignItems="center" 
                      sx={{ 
                        py: 2, 
                        px: 3,
                        transition: 'background-color 0.2s',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.04)'
                        }
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar 
                          src={user.avatar ? `${API.defaults.baseURL}${user.avatar}` : null}
                          component={Link}
                          to={`/profile/${user.username}`}
                          onClick={onClose}
                          sx={{ 
                            width: 50, 
                            height: 50,
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                            '&:hover': {
                              transform: 'scale(1.05)'
                            }
                          }}
                        >
                          {user.username?.[0]?.toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography 
                            variant="subtitle1"
                            component={Link}
                            to={`/profile/${user.username}`}
                            onClick={onClose}
                            sx={{ 
                              textDecoration: 'none', 
                              color: 'text.primary',
                              fontWeight: 'medium',
                              '&:hover': {
                                color: 'primary.main'
                              }
                            }}
                          >
                            {user.display_name || user.username}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary" component="div">
                            @{user.username}
                          </Typography>
                        }
                      />
                      {isLoggedIn && user.username !== currentUsername && (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleCreateChat(user.username)}
                            sx={{ minWidth: 40, px: 1 }}
                          >
                            <MessageIcon fontSize="small" />
                          </Button>
                          
                          <Button
                            variant={followingStatus[user.username] ? "outlined" : "contained"}
                            color={followingStatus[user.username] ? "error" : "success"}
                            size="small"
                            startIcon={
                              followingStatus[user.username] ? <PersonRemoveIcon /> : <PersonAddIcon />
                            }
                            onClick={() => handleFollowToggle(user.username, followingStatus[user.username])}
                          >
                            {followingStatus[user.username] ? "Unfollow" : "Follow"}
                          </Button>
                        </Box>
                      )}
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))
              ) : (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    No followers yet
                  </Typography>
                </Box>
              )
            ) : following.length > 0 ? (
              following.map((user) => (
                <React.Fragment key={user.id}>
                  <ListItem 
                    alignItems="center" 
                    sx={{ 
                      py: 2, 
                      px: 3,
                      transition: 'background-color 0.2s',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)'
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar 
                        src={user.avatar ? `${API.defaults.baseURL}${user.avatar}` : null}
                        component={Link}
                        to={`/profile/${user.username}`}
                        onClick={onClose}
                        sx={{ 
                          width: 50, 
                          height: 50,
                          cursor: 'pointer',
                          transition: 'transform 0.2s',
                          '&:hover': {
                            transform: 'scale(1.05)'
                          }
                        }}
                      >
                        {user.username?.[0]?.toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography 
                          variant="subtitle1"
                          component={Link}
                          to={`/profile/${user.username}`}
                          onClick={onClose}
                          sx={{ 
                            textDecoration: 'none', 
                            color: 'text.primary',
                            fontWeight: 'medium',
                            '&:hover': {
                              color: 'primary.main'
                            }
                          }}
                        >
                          {user.display_name || user.username}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary" component="div">
                          @{user.username}
                        </Typography>
                      }
                    />
                    {isLoggedIn && user.username !== currentUsername && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleCreateChat(user.username)}
                          sx={{ minWidth: 40, px: 1 }}
                        >
                          <MessageIcon fontSize="small" />
                        </Button>
                        
                        <Button
                          variant={followingStatus[user.username] ? "outlined" : "contained"}
                          color={followingStatus[user.username] ? "error" : "success"}
                          size="small"
                          startIcon={
                            followingStatus[user.username] ? <PersonRemoveIcon /> : <PersonAddIcon />
                          }
                          onClick={() => handleFollowToggle(user.username, followingStatus[user.username])}
                        >
                          {followingStatus[user.username] ? "Unfollow" : "Follow"}
                        </Button>
                      </Box>
                    )}
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))
            ) : (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  Not following anyone yet
                </Typography>
              </Box>
            )}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FollowersModal; 