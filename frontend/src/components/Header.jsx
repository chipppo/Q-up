// src/components/Header.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { AppBar, Toolbar, Button, IconButton, Typography, Box, Badge } from '@mui/material';
import {
  Message as MessageIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Dashboard as DashboardIcon,
  Feed as FeedIcon,
  Search as SearchIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import "./Header.css";

const Header = () => {
  const { isLoggedIn, username, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(() => {
      navigate("/");
    });
  };

  console.log("Header - Current username:", username); // Debugging

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
            flexGrow: 0
          }}
        >
          Q-up
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            component={Link}
            to="/search-profiles"
            color="inherit"
            startIcon={<SearchIcon />}
          >
            Find Players
          </Button>

          {isLoggedIn ? (
            <>
              <IconButton
                color="inherit"
                component={Link}
                to="/feed"
              >
                <FeedIcon />
              </IconButton>

              <IconButton
                color="inherit"
                component={Link}
                to="/chat"
              >
                <Badge color="error" variant="dot">
                  <MessageIcon />
                </Badge>
              </IconButton>

              <IconButton
                color="inherit"
                component={Link}
                to="/dashboard"
              >
                <DashboardIcon />
              </IconButton>

              <Button
                component={Link}
                to={`/profile/${username}`}
                color="inherit"
                startIcon={<PersonIcon />}
              >
                {username}
              </Button>

              <IconButton
                color="inherit"
                onClick={handleLogout}
              >
                <LogoutIcon />
              </IconButton>
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