// src/components/Header.jsx - Компонент за горен колонтитул (хедър)
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
  Divider,
  useMediaQuery,
  useTheme,
  Stack
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
  Menu as MenuIcon
} from '@mui/icons-material';
import API from "../api/axios";
import "./Header.css";
import logo from "../assets/qup-logo.svg";

// Функция за генериране на цвят от низ
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

// Помощна функция за безопасно форматиране на URL адреси на изображения
const formatImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API.defaults.baseURL}${url}`;
};

const Header = () => {
  const { isLoggedIn, username, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = useState(null);
  const [userData, setUserData] = useState(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  
  useEffect(() => {
    if (isLoggedIn && username) {
      fetchUserData();
    }
  }, [isLoggedIn, username]);

  // Проверка за непрочетени съобщения
  useEffect(() => {
    if (isLoggedIn) {
      // Настройка на анкетиране за проверка на непрочетени съобщения
      const interval = setInterval(checkUnreadMessages, 10000); // Проверка на всеки 10 секунди
      
      // Изпълняване на първоначална проверка
      checkUnreadMessages();
      
      // Почистване при демонтиране
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  const checkUnreadMessages = async () => {
    try {
      const response = await API.get('/chats/');
      const chats = response.data;
      
      // Проверка дали някой чат има непрочетени съобщения
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

  const handleMobileMenuOpen = (event) => {
    setMobileMenuAnchorEl(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchorEl(null);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    handleMobileMenuClose();
    logout(() => {
      navigate("/");
    });
  };

  const handleProfileClick = () => {
    handleClose();
    handleMobileMenuClose();
    navigate(`/profile/${username}`);
  };

  const handleSettingsClick = () => {
    handleClose();
    handleMobileMenuClose();
    navigate(`/profile/${username}/edit`);
  };

  const renderDesktopNav = () => (
    <>
      <Box component={Link} to="/" sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
        <img src={logo} alt="Q-up Logo" height="32" style={{ marginRight: '8px' }} />
        <Typography
          variant="h6"
          sx={{
            fontWeight: 'bold'
          }}
        >
          Q-up
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          color="inherit"
          component={Link}
          to="/search-profiles"
          startIcon={<GameIcon />}
          sx={{ textTransform: 'none', fontWeight: 500 }}
        >
          Find Players
        </Button>

        {isLoggedIn ? (
          <>
            <Button
              color="inherit"
              component={Link}
              to="/dashboard"
              startIcon={<DashboardIcon />}
              sx={{ textTransform: 'none', fontWeight: 500 }}
            >
              Dashboard
            </Button>

            <Button
              color="inherit"
              component={Link}
              to="/feed"
              startIcon={<FeedIcon />}
              sx={{ textTransform: 'none', fontWeight: 500 }}
            >
              Feed
            </Button>

            <Button
              color="inherit"
              component={Link}
              to="/chat"
              startIcon={
                <Badge color="error" variant="dot" invisible={!hasUnreadMessages}>
                  <MessageIcon />
                </Badge>
              }
              sx={{ textTransform: 'none', fontWeight: 500 }}
            >
              Messages
            </Button>

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
              sx={{ textTransform: 'none', fontWeight: 500 }}
            >
              Login
            </Button>
            <Button
              component={Link}
              to="/register"
              color="inherit"
              variant="outlined"
              sx={{ borderColor: 'primary.main', '&:hover': { borderColor: 'primary.light' }, textTransform: 'none', fontWeight: 500 }}
            >
              Register
            </Button>
          </>
        )}
      </Box>
    </>
  );

  const renderMobileNav = () => (
    <>
      <Box component={Link} to="/" sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
        <img src={logo} alt="Q-up Logo" height="32" style={{ marginRight: '8px' }} />
        <Typography
          variant="h6"
          sx={{
            fontWeight: 'bold'
          }}
        >
          Q-up
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {isLoggedIn && (
          <IconButton
            color="inherit"
            component={Link}
            to="/chat"
            sx={{ mr: 1 }}
          >
            <Badge color="error" variant="dot" invisible={!hasUnreadMessages}>
              <MessageIcon />
            </Badge>
          </IconButton>
        )}

        {isLoggedIn && (
          <IconButton
            size="small"
            onClick={handleMenu}
            sx={{ mr: 2 }}
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
        )}

        <IconButton
          color="inherit"
          onClick={handleMobileMenuOpen}
        >
          <MenuIcon />
        </IconButton>

        <Menu
          anchorEl={mobileMenuAnchorEl}
          open={Boolean(mobileMenuAnchorEl)}
          onClose={handleMobileMenuClose}
          PaperProps={{
            sx: {
              width: '200px',
            }
          }}
        >
          <MenuItem onClick={() => {
            handleMobileMenuClose();
            navigate('/search-profiles');
          }}>
            <ListItemIcon>
              <GameIcon fontSize="small" />
            </ListItemIcon>
            Find Players
          </MenuItem>

          {isLoggedIn ? (
            <>
              <MenuItem onClick={() => {
                handleMobileMenuClose();
                navigate('/dashboard');
              }}>
                <ListItemIcon>
                  <DashboardIcon fontSize="small" />
                </ListItemIcon>
                Dashboard
              </MenuItem>

              <MenuItem onClick={() => {
                handleMobileMenuClose();
                navigate('/feed');
              }}>
                <ListItemIcon>
                  <FeedIcon fontSize="small" />
                </ListItemIcon>
                Feed
              </MenuItem>

              <MenuItem onClick={() => {
                handleMobileMenuClose();
                navigate('/chat');
              }}>
                <ListItemIcon>
                  <Badge color="error" variant="dot" invisible={!hasUnreadMessages}>
                    <MessageIcon />
                  </Badge>
                </ListItemIcon>
                Messages
              </MenuItem>

              <Divider />

              <MenuItem onClick={() => {
                handleMobileMenuClose();
                navigate(`/profile/${username}`);
              }}>
                <ListItemIcon>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                Profile
              </MenuItem>

              <MenuItem onClick={() => {
                handleMobileMenuClose();
                navigate(`/profile/${username}/edit`);
              }}>
                <ListItemIcon>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                Settings
              </MenuItem>

              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </>
          ) : (
            <>
              <MenuItem onClick={() => {
                handleMobileMenuClose();
                navigate('/login');
              }}>
                Login
              </MenuItem>
              <MenuItem onClick={() => {
                handleMobileMenuClose();
                navigate('/register');
              }}>
                Register
              </MenuItem>
            </>
          )}
        </Menu>
      </Box>
    </>
  );

  return (
    <AppBar position="sticky">
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        {isMobile ? renderMobileNav() : renderDesktopNav()}
      </Toolbar>
    </AppBar>
  );
};

export default Header;