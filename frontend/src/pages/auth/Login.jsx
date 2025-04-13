/**
 * Login page component
 * 
 * This page handles user login and password reset requests.
 * It has form validation and shows nice error messages when something's wrong.
 * After login, it redirects the user to dashboard or a previous page they tried to access.
 */

// src/pages/Login.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import API from "../../api/axios";
import { useAuth } from "../../context/AuthContext.jsx";
import { toast } from "react-toastify";
import { Button, Box } from "@mui/material";
import "../../styles/pages/auth/Login.css";
import logo from "../../assets/qup-logo.svg";

/**
 * Main Login component that handles both login and password reset
 * 
 * @returns {JSX.Element} The login form or password reset form
 */
function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoggedIn } = useAuth();
  
  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      const destination = location.state?.from || "/dashboard";
      navigate(destination, { replace: true });
    }
  }, [isLoggedIn, navigate, location]);

  // Add a global page navigation prevention for errors
  useEffect(() => {
    if (error) {
      console.log("Error is active, preventing navigation");
      
      // 1. Add history state to prevent back button from causing reload
      const initialHistoryLength = window.history.length;
      window.history.pushState({ noReload: true }, '');
      
      // 2. Handle popstate (back/forward) to prevent reload
      const handlePopState = (e) => {
        // If there's an error and someone clicks back, prevent it
        e.preventDefault();
        window.history.pushState({ noReload: true }, '');
        // Flash the error message
        const errorEl = document.querySelector('.error-message');
        if (errorEl) {
          errorEl.style.animation = 'none';
          setTimeout(() => {
            errorEl.style.animation = 'pulsateError 2s infinite';
          }, 10);
        }
        return false;
      };
      
      // 3. Prevent form submissions globally
      const preventForms = (e) => {
        if (e.target.tagName === 'FORM') {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      };
      
      // Add listeners
      window.addEventListener('popstate', handlePopState);
      document.addEventListener('submit', preventForms, true);
      
      // Remove listeners when error is cleared
      return () => {
        window.removeEventListener('popstate', handlePopState);
        document.removeEventListener('submit', preventForms, true);
      };
    }
  }, [error]);

  // Prevent accidental form submission with Enter key
  useEffect(() => {
    const handleKeyDown = (e) => {
      // If there was a previous error and Enter is pressed, prevent default
      if (error && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        
        // Flash the error message to draw attention
        const errorElement = document.querySelector('.error-message');
        if (errorElement) {
          errorElement.style.animation = 'none';
          setTimeout(() => {
            errorElement.style.animation = 'pulsateError 2s infinite';
          }, 10);
        }
        
        return false;
      }
    };
    
    // Add the listener
    window.addEventListener('keydown', handleKeyDown, true);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [error]);

  // Add Enter key handling for form submission
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Only process if not already loading and no error is showing
      if (!isLoading && !error && e.key === 'Enter') {
        // Check if we're on the login form (not password reset)
        if (!showForgotPassword) {
          // Trigger the handleSubmit function directly
          handleSubmit();
        }
      }
    };
    
    // Add the event listener
    window.addEventListener('keydown', handleKeyPress);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [isLoading, error, showForgotPassword]);

  /**
   * Validates the username field
   * 
   * @param {string} value - The username to validate
   * @returns {string} Error message or empty string if valid
   */
  const validateUsername = (value) => {
    if (!value.trim()) {
      return "Username is required";
    }
    if (value.length < 3) {
      return "Username must be at least 3 characters";
    }
    if (value.length > 30) {
      return "Username must be less than 30 characters";
    }
    return "";
  };

  /**
   * Validates the password field
   * 
   * @param {string} value - The password to validate
   * @returns {string} Error message or empty string if valid
   */
  const validatePassword = (value) => {
    if (!value) {
      return "Password is required";
    }
    return "";
  };

  /**
   * Validates the email field for password reset
   * 
   * @param {string} value - The email to validate
   * @returns {string} Error message or empty string if valid
   */
  const validateEmail = (value) => {
    if (!value.trim()) {
      return "Email is required";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return "Please enter a valid email address";
    }
    return "";
  };

  /**
   * Handles username input changes and validates on-the-fly
   * 
   * @param {React.ChangeEvent} e - Input change event
   */
  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setUsername(value);
    if (validationErrors.username) {
      setValidationErrors(prev => ({
        ...prev,
        username: validateUsername(value)
      }));
    }
  };

  /**
   * Handles password input changes and validates on-the-fly
   * 
   * @param {React.ChangeEvent} e - Input change event
   */
  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (validationErrors.password) {
      setValidationErrors(prev => ({
        ...prev,
        password: validatePassword(value)
      }));
    }
  };

  /**
   * Handles email input changes for password reset
   * 
   * @param {React.ChangeEvent} e - Input change event
   */
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (validationErrors.email) {
      setValidationErrors(prev => ({
        ...prev,
        email: validateEmail(value)
      }));
    }
  };

  /**
   * Handles the login button click
   * Validates inputs, sends login request, and handles the response
   * This is now a simple function that doesn't use form submission
   */
  const handleSubmit = async () => {
    setError("");
    
    // Form field validation
    const usernameError = validateUsername(username);
    const passwordError = validatePassword(password);
    
    if (usernameError || passwordError) {
      setValidationErrors({
        username: usernameError,
        password: passwordError
      });
      return;
    }

    setValidationErrors({});
    setIsLoading(true);

    try {
      const response = await API.post("/login/", { username, password });
      const { access, refresh } = response.data;
      
      // On success, login and navigate
      login(access, refresh, username);
      console.log("Successful login for:", username);
      
      // Delay navigation to allow success toast to be seen
      toast.success(`Welcome back, ${username}!`);
      
      // Use a timeout to ensure the success message has time to display
      setTimeout(() => {
        const destination = location.state?.from || "/dashboard";
        navigate(destination, { replace: true });
      }, 500);
      
    } catch (error) {
      console.error('Login error:', error);
      
      // Completely stop the loading state immediately
      setIsLoading(false);
      
      // Set error message based on response
      const errorMessage = error.response?.data?.detail || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      
      // Clear the password field on error
      setPassword("");
      
      // Block page reloads - this is a drastic measure but necessary
      const blockReloads = (e) => {
        // Cancel the event
        e.preventDefault();
        // Chrome requires returnValue to be set
        e.returnValue = '';
        return '';
      };
      
      // Add the event listener
      window.addEventListener('beforeunload', blockReloads);
      
      // Remove it after a safe period (5 seconds)
      setTimeout(() => {
        window.removeEventListener('beforeunload', blockReloads);
      }, 5000);
      
      // Display a permanent error toast (no auto-close)
      toast.error(errorMessage, { 
        autoClose: false, // Never auto-close
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        position: "top-center",
        style: { 
          borderLeft: '4px solid #ff1744',
          fontWeight: 'bold'
        },
      });
    }
  };

  /**
   * Handles the password reset form submission
   * Sends a reset request to the server and shows appropriate messages
   * 
   * @param {React.FormEvent} e - Form submit event
   */
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    
    // Email validation
    const emailError = validateEmail(email);
    if (emailError) {
      setValidationErrors({
        email: emailError
      });
      return;
    }

    setValidationErrors({});
    setIsLoading(true);

    try {
      await API.post("/password-reset/", { email });
      setResetSent(true);
      toast.success("Password reset instructions have been sent to your email");
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error.response?.data?.detail || 'Failed to send reset instructions. Please try again.');
      toast.error('Failed to send reset instructions');
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="login-container">
        <div className="login-form-wrapper">
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <img src={logo} alt="Q-up Logo" height="48" />
          </Box>
          <div className="login-header">
            <h2>Reset Password</h2>
            <p>Enter your email to receive reset instructions</p>
          </div>

          {resetSent ? (
            <div className="success-message">
              <p>Password reset instructions have been sent to your email.</p>
              <Button 
                onClick={() => setShowForgotPassword(false)}
                variant="outlined"
                fullWidth
                sx={{ mt: 2 }}
              >
                Return to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="login-form">
              <div className="form-group">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={handleEmailChange}
                  required
                  className={validationErrors.email ? "input-error" : ""}
                />
                {validationErrors.email && (
                  <div className="validation-error">{validationErrors.email}</div>
                )}
              </div>

              {error && (
                <div className="error-message">
                  <span>{error}</span>
                </div>
              )}

              <button 
                type="submit" 
                className={`login-button ${isLoading ? 'loading' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Reset Instructions'}
              </button>

              <button 
                type="button" 
                className="text-button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setValidationErrors({});
                  setError("");
                }}
              >
                Back to Login
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-form-wrapper">
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <img src={logo} alt="Q-up Logo" height="48" />
        </Box>
        <div className="login-header">
          <h2>Welcome Back</h2>
          <p>Sign in to continue to Q-up</p>
        </div>

      {location.state?.from && (
        <div className="redirect-message">
          <p>Please sign in to continue to the requested page.</p>
        </div>
      )}

      <form 
        className="login-form"
        noValidate 
        autoComplete="off"
        action="javascript:void(0);"
        onSubmit={(e) => {
          // Completely prevent any form submission behavior
          e.preventDefault();
          e.stopPropagation();
          return false;
        }}
      >
          <div className="form-group">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={handleUsernameChange}
              required
              autoComplete="username"
              className={validationErrors.username ? "input-error" : ""}
            />
            {validationErrors.username && (
              <div className="validation-error">{validationErrors.username}</div>
            )}
          </div>

          <div className="form-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={handlePasswordChange}
              required
              autoComplete="current-password"
              className={validationErrors.password ? "input-error" : ""}
            />
            {validationErrors.password && (
              <div className="validation-error">{validationErrors.password}</div>
            )}
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="text-button"
              onClick={() => {
                setShowForgotPassword(true);
                setValidationErrors({});
                setError("");
              }}
            >
              Forgot Password?
            </button>
          </div>

          {error && (
            <div className="error-message" style={{ 
              animation: 'pulsateError 2s infinite', 
              marginBottom: '20px',
              marginTop: '10px',
              padding: '15px',
              backgroundColor: 'rgba(255, 0, 0, 0.1)',
              border: '1px solid var(--color-error)',
              borderRadius: '4px',
              boxShadow: '0 0 8px rgba(255, 0, 0, 0.2)',
              fontWeight: 'bold'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-error)', fontSize: '1.1rem' }}>Login Failed</h4>
              <span>{error}</span>
            </div>
          )}

          <button 
            type="button" // Changed from "submit" to "button"
            className={`login-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
            onClick={handleSubmit} // Direct call to handleSubmit
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
      </form>

        <div className="register-link">
          Don't have an account?
          <Link to="/register" state={location.state}>Register here</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;