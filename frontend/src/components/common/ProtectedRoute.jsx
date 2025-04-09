/**
 * Protected Route component that restricts access to authenticated users
 * 
 * This component checks if a user is logged in before allowing access to a route.
 * If the user isn't logged in, they are redirected to the login page and shown
 * a notification. The current route path is saved so they can be redirected back
 * after successful login.
 * 
 * @module ProtectedRoute
 * @requires react-router-dom
 * @requires AuthContext
 * @requires react-toastify
 */
// src/components/ProtectedRoute.jsx - Компонент за защитен маршрут
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";

/**
 * Component that renders children only if user is authenticated
 * 
 * @function ProtectedRoute
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Components to render if authenticated
 * @returns {JSX.Element} The protected content or a redirect to login
 */
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