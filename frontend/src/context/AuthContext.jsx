// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from "react";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");

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
    if (callback) callback(); // Call the callback (e.g., navigate to Home)
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };