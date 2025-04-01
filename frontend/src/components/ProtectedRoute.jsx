// src/components/ProtectedRoute.jsx - Компонент за защитен маршрут
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    // Съхраняване на текущия път за пренасочване след вход
    toast.info("Please log in to access this page");
    return <Navigate to="/login" state={{ from: location.pathname }} />;
  }

  return children;
};

export default ProtectedRoute;