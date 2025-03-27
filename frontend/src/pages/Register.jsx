import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext.jsx";
import { toast } from "react-toastify";
import { Box, Checkbox, FormControlLabel } from "@mui/material";
import "./Login.css";
import logo from "../assets/qup-logo.svg";

function PasswordStrengthIndicator({ password }) {
  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: "None" };
    
    let score = 0;
    
    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    
    // Complexity checks
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    
    // Normalize score to 0-4 range
    score = Math.min(score, 4);
    
    const labels = {
      0: "Very Weak",
      1: "Weak",
      2: "Fair",
      3: "Good",
      4: "Strong"
    };
    
    const colors = {
      0: "var(--color-error)",
      1: "#FF6B6B",
      2: "var(--color-warning)",
      3: "#70C1B3",
      4: "var(--color-success)"
    };
    
    return {
      score,
      label: labels[score],
      color: colors[score]
    };
  };
  
  const strength = getPasswordStrength(password);
  
  // Calculate width percentage based on score
  const widthPercentage = (strength.score / 4) * 100;
  
  // Don't render if no password entered
  if (!password) return null;
  
  return (
    <div className="password-strength">
      <div className="password-strength-bar">
        <div 
          className="password-strength-fill" 
          style={{ 
            width: `${widthPercentage}%`,
            backgroundColor: strength.color
          }}
        ></div>
      </div>
      <div className="password-strength-label" style={{ color: strength.color }}>
        Password strength: {strength.label}
      </div>
      
      <div className="password-requirements">
        <p>Password must contain:</p>
        <ul>
          <li className={password.length >= 8 ? "valid" : "invalid"}>
            At least 8 characters
          </li>
          <li className={/[A-Z]/.test(password) ? "valid" : "invalid"}>
            At least one uppercase letter
          </li>
          <li className={/[a-z]/.test(password) ? "valid" : "invalid"}>
            At least one lowercase letter
          </li>
          <li className={/[0-9]/.test(password) ? "valid" : "invalid"}>
            At least one number
          </li>
          <li className={/[^A-Za-z0-9]/.test(password) ? "valid" : "invalid"}>
            At least one special character (recommended)
          </li>
        </ul>
      </div>
    </div>
  );
}

function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn } = useAuth();

  // Redirect if already logged in
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
    // Username should contain only alphanumeric characters and underscores
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return "Username can only contain letters, numbers, and underscores";
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

  const validatePassword = (value) => {
    if (!value) {
      return "Password is required";
    }
    if (value.length < 8) {
      return "Password must be at least 8 characters long";
    }
    // Password should contain at least one uppercase letter, one lowercase letter and one number
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
      return "Password must contain at least one uppercase letter, one lowercase letter, and one number";
    }
    return "";
  };

  const validateConfirmPassword = (value, passwordValue) => {
    if (!value) {
      return "Please confirm your password";
    }
    if (value !== passwordValue) {
      return "Passwords do not match";
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

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    
    // Validate password and update error state
    if (validationErrors.password) {
      setValidationErrors(prev => ({
        ...prev,
        password: validatePassword(value)
      }));
    }
    
    // Also check confirm password match if it's been entered
    if (confirmPassword && validationErrors.confirmPassword) {
      setValidationErrors(prev => ({
        ...prev,
        confirmPassword: validateConfirmPassword(confirmPassword, value)
      }));
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (validationErrors.confirmPassword) {
      setValidationErrors(prev => ({
        ...prev,
        confirmPassword: validateConfirmPassword(value, password)
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    // Validate all fields
    const usernameError = validateUsername(username);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(confirmPassword, password);
    
    if (!agreeToTerms) {
      setError("You must agree to the Terms of Service to register.");
      toast.error("You must agree to the Terms of Service to register.");
      return;
    }
    
    if (usernameError || emailError || passwordError || confirmPasswordError) {
      setValidationErrors({
        username: usernameError,
        email: emailError,
        password: passwordError,
        confirmPassword: confirmPasswordError
      });
      return;
    }
    
    setValidationErrors({});
    setIsLoading(true);
    
    try {
      await API.post("/register/", { username, email, password });
      toast.success("Registration successful! Please log in.");
      navigate("/login", { state: location.state });
    } catch (err) {
      console.error("Registration error:", err);
      setIsLoading(false);
      
      // Handle different types of errors
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const responseData = err.response.data;
        
        if (responseData.username) {
          setError(`Username error: ${responseData.username.join(', ')}`);
          toast.error(`Username error: ${responseData.username.join(', ')}`);
        } else if (responseData.email) {
          setError(`Email error: ${responseData.email.join(', ')}`);
          toast.error(`Email error: ${responseData.email.join(', ')}`);
        } else if (responseData.password) {
          setError(`Password error: ${responseData.password.join(', ')}`);
          toast.error(`Password error: ${responseData.password.join(', ')}`);
        } else if (responseData.non_field_errors) {
          setError(responseData.non_field_errors.join(', '));
          toast.error(responseData.non_field_errors.join(', '));
        } else {
          setError("Registration failed. Please try again.");
          toast.error("Registration failed. Please try again.");
        }
      } else {
        setError("Registration failed. Please check your connection and try again.");
        toast.error("Registration failed. Please check your connection and try again.");
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-form-wrapper">
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <img src={logo} alt="Q-up Logo" height="48" />
        </Box>
        <div className="login-header">
          <h2>Create Account</h2>
          <p>Join Q-up and find your gaming partner</p>
        </div>
        
        {location.state?.from && (
          <div className="redirect-message">
            <p>Please register to access the requested page.</p>
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
              className={validationErrors.username ? "input-error" : ""}
            />
            {validationErrors.username && (
              <div className="validation-error">{validationErrors.username}</div>
            )}
          </div>
          
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
          
          <div className="form-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={handlePasswordChange}
              required
              className={validationErrors.password ? "input-error" : ""}
            />
            {validationErrors.password && (
              <div className="validation-error">{validationErrors.password}</div>
            )}
            <PasswordStrengthIndicator password={password} />
          </div>
          
          <div className="form-group">
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              required
              className={validationErrors.confirmPassword ? "input-error" : ""}
            />
            {validationErrors.confirmPassword && (
              <div className="validation-error">{validationErrors.confirmPassword}</div>
            )}
          </div>
          
          <div className="form-group terms-checkbox">
            <FormControlLabel
              control={
                <Checkbox
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <span>
                  I agree to the <Link to="/terms-of-service" target="_blank" rel="noopener">Terms of Service</Link>
                </span>
              }
            />
          </div>
          
          {error && <div className="error-message"><span>{error}</span></div>}
          
          <button 
            type="submit" 
            className={`login-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Register'}
          </button>
        </form>
        
        <div className="register-link">
          Already have an account? <Link to="/login" state={location.state}>Login here</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
