// src/pages/Login.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext.jsx";
import { toast } from "react-toastify";
import "./Login.css";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
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
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
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
                onClick={() => setShowForgotPassword(false)}
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
          onChange={(e) => setUsername(e.target.value)}
          required
              autoComplete="username"
        />
          </div>

          <div className="form-group">
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
              autoComplete="current-password"
            />
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="text-button"
              onClick={() => setShowForgotPassword(true)}
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