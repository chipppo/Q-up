/**
 * Header component for the Q-up app
 * 
 * This is the navigation bar that appears at the top of every page.
 * It has different layouts for desktop and mobile, and shows different
 * options depending on whether the user is logged in.
 */

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  useMediaQuery,
  useTheme,
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
import API from "../../api/axios";
import "../../styles/components/layout/Header.css";
import logo from "../../assets/qup-logo.svg";

/**
 * Generates a consistent color from a string (like a username)
 * 
 * This is used for avatar backgrounds when a user doesn't have
 * a profile picture. It creates a unique color based on their username
 * so they always get the same color.
 * 
 * @param {string} string - The input string (usually username)
 * @returns {string} A hex color code
 */
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

/**
 * Makes sure image URLs are properly formatted with the base URL if needed
 * 
 * @param {string} url - The image URL to format
 * @returns {string|null} The properly formatted URL or null if no URL provided
 */
const formatImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API.defaults.baseURL}${url}`;
};

/**
 * The main header component with navigation, user menu, and notification indicators
 * 
 * @returns {JSX.Element} The header component
 */
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
  
  // Load user data when logged in
  useEffect(() => {
    if (isLoggedIn && username) {
      fetchUserData();
    }
  }, [isLoggedIn, username]);

  // Check for unread messages periodically
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

  /**
   * Checks if the user has any unread messages
   * Updates the message notification indicator
   */
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

  /**
   * Fetches the user's profile data from the API
   */
  const fetchUserData = async () => {
    try {
      const response = await API.get(`/users/${username}/`);
      const userData = response.data;
      setUserData(userData);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  /**
   * Opens the user dropdown menu
   */
  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  /**
   * Opens the mobile menu
   */
  const handleMobileMenuOpen = (event) => {
    setMobileMenuAnchorEl(event.currentTarget);
  };

  /**
   * Closes the mobile menu
   */
  const handleMobileMenuClose = () => {
    setMobileMenuAnchorEl(null);
  };

  /**
   * Closes the user dropdown menu
   */
  const handleClose = () => {
    setAnchorEl(null);
  };

  /**
   * Handles the logout process
   * Closes menus and navigates to home page
   */
  const handleLogout = () => {
    handleClose();
    handleMobileMenuClose();
    logout(() => {
      navigate("/");
    });
  };

  /**
   * Navigates to the user's profile page
   */
  const handleProfileClick = () => {
    handleClose();
    handleMobileMenuClose();
    navigate(`/profile/${username}`);
  };

  /**
   * Navigates to the profile settings page
   */
  const handleSettingsClick = () => {
    handleClose();
    handleMobileMenuClose();
    navigate(`/profile/${username}/edit`);
  };

  /**
   * Renders the desktop version of the navigation
   * @returns {JSX.Element} Desktop navigation component
   */
  const renderDesktopNav = () => (
    <>
      <Link to="/" className="header-logo">
        <img src={logo} alt="Q-up Logo" height="32" />
        <span className="logo-text">Q-up</span>
      </Link>

      <nav className="header-nav">
        <Link to="/search-profiles" className="nav-button">
          <GameIcon className="nav-icon" />
          <span>Find Players</span>
        </Link>

        {isLoggedIn ? (
          <>
            <Link to="/dashboard" className="nav-button">
              <DashboardIcon className="nav-icon" />
              <span>Dashboard</span>
            </Link>

            <Link to="/feed" className="nav-button">
              <FeedIcon className="nav-icon" />
              <span>Feed</span>
            </Link>

            <Link to="/chat" className="nav-button">
              {hasUnreadMessages ? (
                <span className="message-badge">
                  <MessageIcon className="nav-icon" />
                </span>
              ) : (
                <MessageIcon className="nav-icon" />
              )}
              <span>Messages</span>
            </Link>

            <button 
              onClick={handleMenu}
              className="avatar-button"
            >
              <img 
                src={formatImageUrl(userData?.avatar_url)}
                alt={username}
                className="user-avatar"
                style={{
                  backgroundColor: userData?.avatar_url ? 'transparent' : stringToColor(username || '')
                }}
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${username?.[0]}&background=random`;
                }}
              />
            </button>

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
            <Link to="/login" className="nav-button">
              Login
            </Link>
            <Link to="/register" className="nav-button nav-button-outline">
              Register
            </Link>
          </>
        )}
      </nav>
    </>
  );

  const renderMobileNav = () => (
    <>
      <Link to="/" className="header-logo">
        <img src={logo} alt="Q-up Logo" height="32" />
        <span className="logo-text">Q-up</span>
      </Link>

      <div className="mobile-nav">
        {isLoggedIn && (
          <Link to="/chat" className="mobile-nav-button">
            {hasUnreadMessages && <span className="mobile-badge"></span>}
            <MessageIcon />
          </Link>
        )}

        {isLoggedIn && (
          <button
            className="avatar-button-mobile"
            onClick={handleMenu}
          >
            <img 
              src={formatImageUrl(userData?.avatar_url)}
              alt={username}
              className="user-avatar-mobile"
              style={{
                backgroundColor: userData?.avatar_url ? 'transparent' : stringToColor(username || '')
              }}
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${username?.[0]}&background=random`;
              }}
            />
          </button>
        )}

        <button
          className="mobile-menu-button"
          onClick={handleMobileMenuOpen}
        >
          <MenuIcon />
        </button>

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
      </div>
    </>
  );

  return (
    <header className="header">
      <div className="header-container">
        {isMobile ? renderMobileNav() : renderDesktopNav()}
      </div>
    </header>
  );
};

export default Header;