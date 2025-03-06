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
  Avatar,
  CircularProgress,
  Alert,
  IconButton,
  Divider,
  useTheme
} from "@mui/material";
import { 
  Person as PersonIcon, 
  Search as SearchIcon,
  Feed as FeedIcon,
  Edit as EditIcon,
  SportsEsports as GameIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Message as MessageIcon
} from "@mui/icons-material";
import { toast } from "react-toastify";
import "./Dashboard.css";

const stringToColor = (string) => {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
};

function Dashboard() {
  const { username, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isLoggedIn) {
      toast.info('Please log in to view your dashboard');
      navigate('/login', { state: { from: '/dashboard' } });
      return;
    }

    const fetchUserData = async () => {
      try {
        setLoading(true);
        const response = await API.get(`/users/${username}/`);
        setUserData(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('Failed to load dashboard data');
        setLoading(false);
        
        if (error.response?.status === 401) {
          toast.error('Your session has expired. Please log in again.');
          navigate('/login', { state: { from: '/dashboard' } });
        }
      }
    };

    fetchUserData();
  }, [username, isLoggedIn, navigate]);

  const dashboardCards = [
    {
      title: "My Profile",
      icon: <PersonIcon fontSize="large" />,
      description: "View and edit your profile information",
      path: `/profile/${username}`,
      color: theme.palette.primary.main
    },
    {
      title: "Game Feed",
      icon: <FeedIcon fontSize="large" />,
      description: "See what other players are posting",
      path: "/feed",
      color: theme.palette.secondary.main
    },
    {
      title: "Find Players",
      icon: <SearchIcon fontSize="large" />,
      description: "Search for other players",
      path: "/search-profiles",
      color: "#4caf50"
    },
    {
      title: "Edit Profile",
      icon: <EditIcon fontSize="large" />,
      description: "Update your profile settings",
      path: `/profile/${username}/edit`,
      color: "#ff9800"
    },
    {
      title: "Game Stats",
      icon: <GameIcon fontSize="large" />,
      description: "View your gaming statistics",
      path: `/profile/${username}`,
      color: "#9c27b0"
    },
    {
      title: "Community",
      icon: <PeopleIcon fontSize="large" />,
      description: "Connect with other players",
      path: "/search-profiles",
      color: "#2196f3"
    }
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Try Again
          </Button>
      </Container>
    );
  }

  const userColor = stringToColor(username);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Welcome Section */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 4, 
          mb: 4, 
          borderRadius: 2,
          background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
          color: 'white'
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar
            sx={{ 
              width: 64, 
              height: 64,
              bgcolor: userData?.avatar ? 'transparent' : userColor,
              fontSize: '1.5rem'
            }}
            src={userData?.avatar || null}
          >
            {username[0].toUpperCase()}
          </Avatar>
          <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome back, {username}!
        </Typography>
            <Typography variant="subtitle1">
              {userData?.bio || "Complete your profile to connect with other players"}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Dashboard Cards Grid */}
      <Grid container spacing={3}>
        {dashboardCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    mb: 2
                  }}
                >
                  <Avatar 
                    sx={{ 
                      bgcolor: card.color,
                      width: 56,
                      height: 56,
                      mr: 2
                    }}
                  >
                    {card.icon}
                  </Avatar>
                  <Typography variant="h6" component="h2">
                    {card.title}
            </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {card.description}
                </Typography>
              </CardContent>
              <CardActions>
                <Button 
                  component={Link} 
                  to={card.path}
                  size="large" 
                  sx={{ 
                    width: '100%',
                    color: card.color,
                    '&:hover': {
                      bgcolor: `${card.color}10`
                    }
                  }}
                >
                  Go to {card.title}
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
      </Grid>
    </Container>
  );
}

export default Dashboard;