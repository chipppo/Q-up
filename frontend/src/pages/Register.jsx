import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext.jsx";
import { toast } from "react-toastify";
import "./Login.css";

function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      toast.error("Passwords do not match!");
      return;
    }
    
    try {
      await API.post("/register/", { username, email, password });
      toast.success("Registration successful! Please log in.");
      navigate("/login", { state: location.state });
    } catch (err) {
      console.error("Registration error:", err);
      
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
      <h2>Register</h2>
      {location.state?.from && (
        <div className="redirect-message">
          <p>Please register to access the requested page.</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="login-form">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <button type="submit">Register</button>
      </form>
      {error && <p className="error-message">{error}</p>}
      <p>
        Already have an account? <Link to="/login" state={location.state}>Login here</Link>
      </p>
    </div>
  );
}

export default Register;
