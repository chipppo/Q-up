// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";

const AuthContext = createContext();

// Custom hook to use the auth context
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);

  // Check localStorage on initial load
  useEffect(() => {
    const accessToken = localStorage.getItem("access");
    const storedUsername = localStorage.getItem("username");
    if (accessToken && storedUsername) {
      setIsLoggedIn(true);
      setUsername(storedUsername);
    }
  }, []);

  // Login function
  const login = (accessToken, refreshToken, username) => {
    localStorage.setItem("access", accessToken);
    localStorage.setItem("refresh", refreshToken);
    localStorage.setItem("username", username);
    setIsLoggedIn(true);
    setUsername(username);
  };

  // Logout function
  const logout = (callback) => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("username");
    setIsLoggedIn(false);
    setUsername("");
    setFollowers([]);
    setFollowing([]);
    if (callback) callback(); // Call the callback (e.g., navigate to Home)
  };

  // Function to update followers
  const updateFollowers = (newFollowers) => {
    setFollowers(newFollowers);
  };

  // Function to update following
  const updateFollowing = (newFollowing) => {
    setFollowing(newFollowing);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, username, login, logout, followers, following, updateFollowers, updateFollowing }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider, useAuth };