// src/components/Header.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { 
  AppBar, 
  Toolbar, 
  Button, 
  IconButton, 
  Typography, 
  Box, 
  Badge,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Message as MessageIcon,
  Notifications as NotificationsIcon,
  Dashboard as DashboardIcon,
  Feed as FeedIcon,
  Search as SearchIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  SportsEsports as GameIcon,
  Games as GamesIcon,
} from '@mui/icons-material';
import API from "../api/axios";
import "./Header.css";

// Function to generate a color from a string
const stringToColor = (string) => {
  if (!string) return '#000000';
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
};

// Utility function to safely format image URLs
const formatImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API.defaults.baseURL}${url}`;
};

const Header = () => {
  const { isLoggedIn, username, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [userData, setUserData] = useState(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  
  useEffect(() => {
    if (isLoggedIn && username) {
      fetchUserData();
    }
  }, [isLoggedIn, username]);

  // Check for unread messages
  useEffect(() => {
    if (isLoggedIn) {
      // Set up polling to check for unread messages
      const interval = setInterval(checkUnreadMessages, 10000); // Check every 10 seconds
      
      // Run initial check
      checkUnreadMessages();
      
      // Cleanup on unmount
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  const checkUnreadMessages = async () => {
    try {
      const response = await API.get('/chats/');
      const chats = response.data;
      
      // Check if any chat has unread messages
      const hasUnread = chats.some(chat => chat.unread_count > 0);
      setHasUnreadMessages(hasUnread);
    } catch (error) {
      console.error('Error checking unread messages:', error);
    }
  };

  const fetchUserData = async () => {
    try {
      const response = await API.get(`/users/${username}/`);
      const userData = response.data;
      setUserData(userData);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    logout(() => {
      navigate("/");
    });
  };

  const handleProfileClick = () => {
    handleClose();
    navigate(`/profile/${username}`);
  };

  const handleSettingsClick = () => {
    handleClose();
    navigate(`/profile/${username}/edit`);
  };

  return (
    <AppBar position="sticky">
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{
            textDecoration: 'none',
            color: 'inherit',
            flexGrow: 0,
            fontWeight: 'bold'
          }}
        >
          Q-up
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            color="inherit"
            component={Link}
            to="/search-profiles"
            sx={{ 
              position: 'relative',
              '&:hover::after': {
                content: '"Find Players"',
                position: 'absolute',
                bottom: -20,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '12px',
                whiteSpace: 'nowrap'
              }
            }}
          >
            <GameIcon />
          </IconButton>

        {isLoggedIn ? (
          <>
              <IconButton
                color="inherit"
                component={Link}
                to="/dashboard"
                sx={{ 
                  position: 'relative',
                  '&:hover::after': {
                    content: '"Dashboard"',
                    position: 'absolute',
                    bottom: -20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '12px',
                    whiteSpace: 'nowrap'
                  }
                }}
              >
                <DashboardIcon />
              </IconButton>

              <IconButton
                color="inherit"
                component={Link}
                to="/feed"
                sx={{ 
                  position: 'relative',
                  '&:hover::after': {
                    content: '"Feed"',
                    position: 'absolute',
                    bottom: -20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '12px',
                    whiteSpace: 'nowrap'
                  }
                }}
              >
                <FeedIcon />
              </IconButton>

              <IconButton
                color="inherit"
                component={Link}
                to="/chat"
                sx={{ 
                  position: 'relative',
                  '&:hover::after': {
                    content: '"Messages"',
                    position: 'absolute',
                    bottom: -20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '12px',
                    whiteSpace: 'nowrap'
                  }
                }}
              >
                <Badge color="error" variant="dot" invisible={!hasUnreadMessages}>
                  <MessageIcon />
                </Badge>
              </IconButton>

              <IconButton
                onClick={handleMenu}
                size="small"
                sx={{ ml: 2 }}
              >
                <Avatar 
                  src={formatImageUrl(userData?.avatar_url)}
                  alt={username}
                  sx={{ 
                    width: 32, 
                    height: 32,
                    border: '2px solid',
                    borderColor: 'primary.main',
                    bgcolor: userData?.avatar_url ? 'transparent' : stringToColor(username || '')
                  }}
                >
                  {username?.[0]?.toUpperCase()}
                </Avatar>
              </IconButton>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                onClick={handleClose}
                PaperProps={{
                  elevation: 0,
                  sx: {
                    overflow: 'visible',
                    filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                    mt: 1.5,
                    '& .MuiAvatar-root': {
                      width: 32,
                      height: 32,
                      ml: -0.5,
                      mr: 1,
                    },
                    '&:before': {
                      content: '""',
                      display: 'block',
                      position: 'absolute',
                      top: 0,
                      right: 14,
                      width: 10,
                      height: 10,
                      bgcolor: 'background.paper',
                      transform: 'translateY(-50%) rotate(45deg)',
                      zIndex: 0,
                    },
                  },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem onClick={handleProfileClick}>
                  <ListItemIcon>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  Profile
                </MenuItem>
                <MenuItem onClick={() => {
                  handleClose();
                  navigate(`/profile/${username}`);
                }}>
                  <ListItemIcon>
                    <GamesIcon fontSize="small" />
                  </ListItemIcon>
                  My Games
                </MenuItem>
                <MenuItem onClick={handleSettingsClick}>
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  Settings
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>
          </>
        ) : (
          <>
              <Button
                component={Link}
                to="/login"
                color="inherit"
              >
                Login
              </Button>
              <Button
                component={Link}
                to="/register"
                color="inherit"
                variant="outlined"
                sx={{ borderColor: 'primary.main', '&:hover': { borderColor: 'primary.light' } }}
              >
                Register
              </Button>
          </>
        )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;