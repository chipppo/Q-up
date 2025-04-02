/**
 * Authentication Context for Q-up
 * 
 * This module provides authentication state management throughout the app.
 * It handles user login/logout, storing tokens in localStorage, and
 * tracking the user's followers/following.
 */

// src/context/AuthContext.jsx - Контекст за автентикация на потребителя
import React, { createContext, useState, useEffect, useContext } from "react";

/**
 * Context object for authentication state
 * @type {React.Context}
 */
const AuthContext = createContext();

/**
 * Custom hook to use the auth context
 * 
 * This makes it easy to access authentication data and functions
 * from any component in the app.
 * 
 * @returns {Object} Authentication state and functions
 * @throws {Error} If used outside of AuthProvider
 */
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/**
 * Authentication Provider component
 * 
 * Wraps your app to provide authentication state and functionality
 * to all child components.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Provider component
 */
const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);

  /**
   * Checks localStorage for existing auth tokens on initial load
   * Restores authentication state if valid tokens are found
   */
  useEffect(() => {
    const accessToken = localStorage.getItem("access");
    const storedUsername = localStorage.getItem("username");
    if (accessToken && storedUsername) {
      setIsLoggedIn(true);
      setUsername(storedUsername);
    }
  }, []);

  /**
   * Logs in a user by storing their tokens and username
   * 
   * @param {string} accessToken - JWT access token
   * @param {string} refreshToken - JWT refresh token
   * @param {string} username - User's username
   */
  const login = (accessToken, refreshToken, username) => {
    localStorage.setItem("access", accessToken);
    localStorage.setItem("refresh", refreshToken);
    localStorage.setItem("username", username);
    setIsLoggedIn(true);
    setUsername(username);
  };

  /**
   * Logs out a user by removing tokens and resetting state
   * 
   * @param {Function} callback - Optional callback after logout (e.g., for navigation)
   */
  const logout = (callback) => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("username");
    setIsLoggedIn(false);
    setUsername("");
    setFollowers([]);
    setFollowing([]);
    if (callback) callback(); // Извикване на callback функцията (напр. навигация към Home)
  };

  /**
   * Updates the list of users who follow the current user
   * 
   * @param {Array} newFollowers - Array of follower users
   */
  const updateFollowers = (newFollowers) => {
    setFollowers(newFollowers);
  };

  /**
   * Updates the list of users the current user follows
   * 
   * @param {Array} newFollowing - Array of followed users
   */
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