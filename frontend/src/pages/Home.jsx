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
      title: "Играйте заедно",
      description: "Намерете играчи, които споделят вашия график и предпочитания за игри."
    },
    {
      icon: <TeamIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: "Изградете своя отбор",
      description: "Свържете се с играчи, които отговарят на вашето ниво на умения и цели."
    },
    {
      icon: <TrophyIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: "Проследявайте напредъка",
      description: "Наблюдавайте вашите постижения в игрите и подобрения в класирането."
    },
    {
      icon: <ChatIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: "Незабавен чат",
      description: "Комуникирайте лесно с вашите партньори за игра."
    },
    {
      icon: <SearchIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: "Умно съвпадение",
      description: "Намерете играчи въз основа на игра, ранг и стил на игра."
    },
    {
      icon: <ScheduleIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: "Гъвкаво планиране",
      description: "Координирайте игрови сесии в различни часови зони."
    }
  ];

  return (
    <div className="home-page">
      {/* Секция Герой */}
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
                Намерете своя перфектен партньор за игра
              </Typography>
              <Typography variant="h5" color="text.secondary" paragraph>
                Свържете се с играчи, които отговарят на вашето ниво на умения, график и цели в игрите.
                Изградете своя отбор и се подобрявайте заедно.
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
                  Започнете
                </Button>
                <Button
                  component={Link}
                  to="/search-profiles"
                  variant="outlined"
                  size="large"
                  sx={{ py: 1.5, px: 4, fontSize: '1.1rem' }}
                >
                  Разгледайте играчи
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Box className="logo-container">
                <img 
                  src={logo} 
                  alt="Q-up Лого" 
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

      {/* Секция с функции */}
      <Box className="features-section">
        <Container maxWidth="lg">
          <Typography
            variant="h2"
            align="center"
            sx={{ mb: 6 }}
            className="section-title"
          >
            Защо да изберете Q-up?
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

      {/* Секция за призив към действие */}
      <Box className="cta-section">
        <Container maxWidth="md">
          <Card className="cta-card">
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h3" gutterBottom>
                Готови ли сте да повишите нивото на вашето геймърско изживяване?
              </Typography>
              <Typography variant="h6" color="text.secondary" paragraph>
                Присъединете се към хиляди геймъри, които намират своите перфектни съотборници всеки ден.
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
                  Присъединете се сега
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