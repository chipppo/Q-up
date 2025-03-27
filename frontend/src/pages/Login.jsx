// src/pages/Login.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext.jsx";
import { toast } from "react-toastify";
import { Button, Box } from "@mui/material";
import "./Login.css";
import logo from "../assets/qup-logo.svg";

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
  
  useEffect(() => {
    if (isLoggedIn) {
      const destination = location.state?.from || "/dashboard";
      navigate(destination, { replace: true });
    }
  }, [isLoggedIn, navigate, location]);

  const validateUsername = (value) => {
    if (!value.trim()) {
      return "Username is required";
    }
    if (value.length < 3) {
      return "Username must be at least 3 characters long";
    }
    if (value.length > 30) {
      return "Username must be less than 30 characters";
    }
    return "";
  };

  const validatePassword = (value) => {
    if (!value) {
      return "Password is required";
    }
    return "";
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    // Validate form fields
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
      
      login(access, refresh, username);
      console.log("Login successful for:", username);
      
      const destination = location.state?.from || "/dashboard";
      toast.success(`Welcome back, ${username}!`);
      navigate(destination, { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.detail || 'Login failed. Please try again.');
      toast.error('Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    
    // Validate email
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
          <p>Please log in to continue to the requested page.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="login-form">
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
            <div className="error-message">
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            className={`login-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
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