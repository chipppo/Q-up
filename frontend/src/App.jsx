/**
 * Main App component for Q-up
 * 
 * This is the root component that sets up all our routing, providers,
 * and the overall structure of the app. It has our theme configuration,
 * routing logic, and wraps everything with the necessary providers.
 */

import { BrowserRouter as Router, Routes, Route, useLocation, createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import Home from "./pages/info/Home";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/dashboard/Dashboard";
import Profile from "./pages/profile/Profile";
import SearchProfiles from "./pages/search/SearchProfiles";
import Feed from "./pages/feed/Feed";
import ProtectedRoute from "./components/common/ProtectedRoute";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import "./styles/global/App.css";
import { ThemeProvider, createTheme } from '@mui/material';
import EditProfileForm from "./components/profile/EditProfileForm";
import Chat from "./pages/chat/Chat";
import ResetPassword from "./pages/auth/ResetPassword";
import TermsOfService from "./pages/info/TermsOfService";
import Contacts from "./pages/info/Contacts";
import { CssBaseline } from '@mui/material';
import { Box, CircularProgress } from '@mui/material';
import { Suspense } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/**
 * Our custom gaming neon theme for Material UI
 * 
 * This theme has a dark background with neon green/pink highlights,
 * custom typography, and cool scrollbars. It gives the app that
 * modern gaming aesthetic.
 */
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00FFAA',
      light: '#33FFBB',
      dark: '#00CC88',
      contrastText: '#121212',
    },
    secondary: {
      main: '#FF00AA',
      light: '#FF33BB',
      dark: '#CC0088',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#00E676',
      light: '#33EB91',
      dark: '#00B85C',
    },
    warning: {
      main: '#FFD600',
      light: '#FFDF33',
      dark: '#CCAB00',
    },
    error: {
      main: '#FF1744',
      light: '#FF4569',
      dark: '#CC1236',
    },
    background: {
      default: '#121212',
      paper: '#1E1E1E',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#AAAAAA',
    },
  },
  typography: {
    fontFamily: [
      'Poppins',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 600,
      fontSize: '2.5rem',
      lineHeight: 1.2,
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: 1.3,
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
      lineHeight: 1.3,
    },
    h4: {
      fontWeight: 500,
      fontSize: '1.5rem',
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h6: {
      fontWeight: 500,
      fontSize: '1rem',
      lineHeight: 1.4,
    },
    subtitle1: {
      fontSize: '1.125rem',
      lineHeight: 1.5,
      fontWeight: 400,
    },
    subtitle2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      fontWeight: 500,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: "#6b6b6b #2b2b2b",
          "&::-webkit-scrollbar, & *::-webkit-scrollbar": {
            backgroundColor: "#2b2b2b",
            width: "8px",
          },
          "&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb": {
            borderRadius: 8,
            backgroundColor: "#6b6b6b",
            minHeight: 24,
          },
          "&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus": {
            backgroundColor: "#959595",
          },
          "&::-webkit-scrollbar-thumb:active, & *::-webkit-scrollbar-thumb:active": {
            backgroundColor: "#959595",
          },
          "&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover": {
            backgroundColor: "#959595",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          textTransform: 'none',
          fontWeight: 500,
        },
        contained: {
          boxShadow: '0 0 10px rgba(0, 255, 170, 0.5)',
          '&:hover': {
            boxShadow: '0 0 15px rgba(0, 255, 170, 0.7)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#1A1A1A',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          backgroundColor: '#1A1A1A',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          '& .MuiTabs-indicator': {
            backgroundColor: '#00FFAA',
            height: 3,
          },
          '& .MuiTabs-flexContainer': {
            '@media (max-width: 600px)': {
              overflowX: 'auto',
              msOverflowStyle: 'none', /* IE and Edge */
              scrollbarWidth: 'none',  /* Firefox */
              '&::-webkit-scrollbar': {
                display: 'none'  /* Chrome, Safari, Opera */
              }
            },
          },
          '& .MuiTabs-scroller': {
            overflowX: 'auto !important',
            msOverflowStyle: 'none', /* IE and Edge */
            scrollbarWidth: 'none',  /* Firefox */
            '&::-webkit-scrollbar': {
              display: 'none'  /* Chrome, Safari, Opera */
            }
          }
        },
        scrollButtons: {
          '&.Mui-disabled': {
            opacity: 0.3,
          },
          '&': {
            color: '#AAAAAA',
          },
          '&:hover': {
            color: '#00FFAA',
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: '#AAAAAA',
          '&:hover': {
            color: '#00FFAA',
            backgroundColor: 'rgba(0, 255, 170, 0.05)',
          },
          '&.Mui-selected': {
            color: '#00FFAA',
            fontWeight: 600,
          },
          textTransform: 'none',
          padding: '12px 16px',
          '@media (max-width: 600px)': {
            minWidth: 'auto',
            padding: '12px 12px',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

/**
 * Inner app content component that handles conditional footer rendering
 * 
 * We have this separate component so we can use useLocation() to check
 * the current route and decide whether to show the footer. The Chat page
 * doesn't have a footer since it needs all the vertical space.
 * 
 * @returns {JSX.Element} The app content with conditional footer
 */
const AppContent = () => {
  const location = useLocation();
  const showFooter = location.pathname !== '/chat';
  const isChatPage = location.pathname === '/chat';

  return (
    <Box 
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        maxHeight: isChatPage ? '100vh' : 'auto',
        overflow: isChatPage ? 'hidden' : 'visible'
      }}
    >
      <Header />
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          pb: showFooter ? 8 : 0, // Добавяне на padding само ако футърът е показан
          overflow: isChatPage ? 'hidden' : 'visible',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Suspense fallback={<CircularProgress sx={{ position: 'absolute', top: '50%', left: '50%' }} />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/reset-password/:uidb64/:token" element={<ResetPassword />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/feed"
              element={
                <ProtectedRoute>
                  <Feed />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route path="/search-profiles" element={<SearchProfiles />} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route 
              path="/profile/:username/edit" 
              element={
                <ProtectedRoute>
                  <EditProfileForm />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Suspense>
      </Box>
      {showFooter && <Footer />}
    </Box>
  );
};

/**
 * The main App component that sets up our app's providers
 * 
 * This wraps everything with the necessary providers:
 * - ThemeProvider: Applies our custom Material UI theme
 * - CssBaseline: Resets CSS to a consistent baseline
 * - AuthProvider: Manages user authentication state
 * - Router: Handles route navigation
 * 
 * @returns {JSX.Element} The complete app with all providers
 */
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <AppContent />
          <ToastContainer 
            position="top-center"
            autoClose={4000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick={false}
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"
            toastStyle={{
              background: '#1E1E1E',
              color: '#FFFFFF',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
              fontSize: '14px',
              fontWeight: '500'
            }}
          />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;