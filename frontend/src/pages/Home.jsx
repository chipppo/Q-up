import { Link } from "react-router-dom";
import { 
  Button, 
  Container, 
  Typography, 
  Box, 
  Grid, 
  Card, 
  CardContent,
  CardActions,
  Stack,
  useTheme
} from '@mui/material';
import {
  SportsEsports as GameIcon,
  Group as TeamIcon,
  EmojiEvents as TrophyIcon,
  Chat as ChatIcon,
  Search as SearchIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import "./Home.css";
import logo from "../assets/qup-logo.svg";

function Home() {
  const theme = useTheme();

  const features = [
    {
      icon: <GameIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: "Game Together",
      description: "Find players who share your gaming schedule and preferences."
    },
    {
      icon: <TeamIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: "Build Your Team",
      description: "Connect with players who match your skill level and goals."
    },
    {
      icon: <TrophyIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: "Track Progress",
      description: "Monitor your gaming achievements and rank improvements."
    },
    {
      icon: <ChatIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: "Instant Chat",
      description: "Communicate easily with your gaming partners."
    },
    {
      icon: <SearchIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: "Smart Matching",
      description: "Find players based on game, rank, and play style."
    },
    {
      icon: <ScheduleIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: "Flexible Scheduling",
      description: "Coordinate gaming sessions across time zones."
    }
  ];

  return (
    <div className="home-page">
      {/* Hero Section */}
      <Box className="hero-section">
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography 
                variant="h1" 
                className="hero-title"
                sx={{ 
                  mb: 2,
                  background: 'linear-gradient(45deg, #1976d2, #2196f3)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                Find Your Perfect Gaming Partner
              </Typography>
              <Typography variant="h5" color="text.secondary" paragraph>
                Connect with players who match your skill level, schedule, and gaming goals.
                Build your team and improve together.
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
                <Button
                  component={Link}
                  to="/register"
                  variant="contained"
                  size="large"
                  sx={{
                    py: 1.5,
                    px: 4,
                    fontSize: '1.1rem',
                    background: 'linear-gradient(45deg, #00FFAA, #33FFBB)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #00CC88, #00FFAA)',
                    }
                  }}
                >
                  Get Started
                </Button>
                <Button
                  component={Link}
                  to="/search-profiles"
                  variant="outlined"
                  size="large"
                  sx={{ py: 1.5, px: 4, fontSize: '1.1rem' }}
                >
                  Browse Players
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Box className="logo-container">
                <img 
                  src={logo} 
                  alt="Q-up Logo" 
                  className="hero-logo"
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(0, 255, 170, 0.7))',
                    maxWidth: '80%',
                    height: 'auto',
                    animation: 'pulse 3s infinite ease-in-out'
                  }}
                />
                <Typography 
                  variant="h2" 
                  align="center"
                  sx={{ 
                    mt: 2,
                    fontWeight: 'bold',
                    background: 'linear-gradient(45deg, #00FFAA, #33FFBB)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  Q-up
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box className="features-section">
        <Container maxWidth="lg">
          <Typography
            variant="h2"
            align="center"
            sx={{ mb: 6 }}
            className="section-title"
          >
            Why Choose Q-up?
          </Typography>
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card 
                  className="feature-card"
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-8px)'
                    }
                  }}
                >
                  <CardContent>
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                      {feature.icon}
                    </Box>
                    <Typography 
                      variant="h5" 
                      component="h3" 
                      align="center"
                      gutterBottom
                      sx={{ fontWeight: 600 }}
                    >
                      {feature.title}
                    </Typography>
                    <Typography 
                      variant="body1" 
                      color="text.secondary" 
                      align="center"
                    >
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Call to Action Section */}
      <Box className="cta-section">
        <Container maxWidth="md">
          <Card className="cta-card">
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h3" gutterBottom>
                Ready to Level Up Your Gaming Experience?
              </Typography>
              <Typography variant="h6" color="text.secondary" paragraph>
                Join thousands of gamers finding their perfect teammates every day.
              </Typography>
              <CardActions sx={{ justifyContent: 'center', mt: 3 }}>
                <Button
                  component={Link}
                  to="/register"
                  variant="contained"
                  size="large"
                  sx={{
                    py: 1.5,
                    px: 6,
                    fontSize: '1.1rem',
                    background: 'linear-gradient(45deg, #00FFAA, #33FFBB)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #00CC88, #00FFAA)',
                    }
                  }}
                >
                  Join Now
                </Button>
              </CardActions>
            </CardContent>
          </Card>
        </Container>
      </Box>
    </div>
  );
}

export default Home;