// src/context/AuthContext.jsx - Контекст за автентикация на потребителя
import React, { createContext, useState, useEffect, useContext } from "react";

const AuthContext = createContext();

// Потребителски хук за използване на контекста за автентикация
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

  // Проверка на localStorage при първоначално зареждане
  useEffect(() => {
    const accessToken = localStorage.getItem("access");
    const storedUsername = localStorage.getItem("username");
    if (accessToken && storedUsername) {
      setIsLoggedIn(true);
      setUsername(storedUsername);
    }
  }, []);

  // Функция за вход
  const login = (accessToken, refreshToken, username) => {
    localStorage.setItem("access", accessToken);
    localStorage.setItem("refresh", refreshToken);
    localStorage.setItem("username", username);
    setIsLoggedIn(true);
    setUsername(username);
  };

  // Функция за изход
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

  // Функция за обновяване на последователите
  const updateFollowers = (newFollowers) => {
    setFollowers(newFollowers);
  };

  // Функция за обновяване на следваните
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