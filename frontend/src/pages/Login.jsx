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
      return "Потребителското име е задължително";
    }
    if (value.length < 3) {
      return "Потребителското име трябва да е поне 3 символа";
    }
    if (value.length > 30) {
      return "Потребителското име трябва да е по-малко от 30 символа";
    }
    return "";
  };

  const validatePassword = (value) => {
    if (!value) {
      return "Паролата е задължителна";
    }
    return "";
  };

  const validateEmail = (value) => {
    if (!value.trim()) {
      return "Имейлът е задължителен";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return "Моля, въведете валиден имейл адрес";
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
    
    // Валидация на полетата във формуляра
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
      console.log("Успешно влизане за:", username);
      
      const destination = location.state?.from || "/dashboard";
      toast.success(`Добре дошли отново, ${username}!`);
      navigate(destination, { replace: true });
    } catch (error) {
      console.error('Грешка при влизане:', error);
      setError(error.response?.data?.detail || 'Неуспешно влизане. Моля, опитайте отново.');
      toast.error('Неуспешно влизане. Моля, проверете данните си.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    
    // Валидация на имейл
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
      toast.success("Инструкции за нулиране на паролата са изпратени на вашия имейл");
    } catch (error) {
      console.error('Грешка при нулиране на паролата:', error);
      setError(error.response?.data?.detail || 'Неуспешно изпращане на инструкции за нулиране. Моля, опитайте отново.');
      toast.error('Неуспешно изпращане на инструкции за нулиране');
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="login-container">
        <div className="login-form-wrapper">
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <img src={logo} alt="Q-up Лого" height="48" />
          </Box>
          <div className="login-header">
            <h2>Нулиране на паролата</h2>
            <p>Въведете вашия имейл, за да получите инструкции за нулиране</p>
          </div>

          {resetSent ? (
            <div className="success-message">
              <p>Инструкции за нулиране на паролата са изпратени на вашия имейл.</p>
              <Button 
                onClick={() => setShowForgotPassword(false)}
                variant="outlined"
                fullWidth
                sx={{ mt: 2 }}
              >
                Връщане към входа
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="login-form">
              <div className="form-group">
                <input
                  type="email"
                  placeholder="Имейл"
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
                {isLoading ? 'Изпращане...' : 'Изпрати инструкции за нулиране'}
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
                Обратно към входа
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
          <img src={logo} alt="Q-up Лого" height="48" />
        </Box>
        <div className="login-header">
          <h2>Добре дошли отново</h2>
          <p>Влезте, за да продължите към Q-up</p>
        </div>

      {location.state?.from && (
        <div className="redirect-message">
          <p>Моля, влезте, за да продължите към поисканата страница.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <input
              type="text"
              placeholder="Потребителско име"
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
              placeholder="Парола"
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
              Забравена парола?
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
            {isLoading ? 'Влизане...' : 'Вход'}
          </button>
      </form>

        <div className="register-link">
          Нямате акаунт?
          <Link to="/register" state={location.state}>Регистрирайте се тук</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;