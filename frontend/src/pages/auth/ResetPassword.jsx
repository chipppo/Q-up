/**
 * Password Reset page component
 * 
 * This page handles setting a new password after requesting a reset.
 * It takes the reset token from the URL that was emailed to the user,
 * and sends a new password to the server to complete the reset process.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import { toast } from 'react-toastify';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
} from '@mui/material';
import '../../styles/pages/auth/Login.css';
import logo from '../../assets/qup-logo.svg';

/**
 * ResetPassword component for setting a new password
 * 
 * Takes tokens from the URL (sent by email) and lets the user
 * create a new password. Shows success message and redirects to login.
 * 
 * @returns {JSX.Element} The reset password form or success message
 */
function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { uidb64, token } = useParams();
  const navigate = useNavigate();

  /**
   * Handles the form submission to reset password
   * 
   * Validates password matching, sends reset request to API,
   * and handles success/failure states.
   * 
   * @param {React.FormEvent} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      await API.post(`/password-reset/confirm/${uidb64}/${token}/`, {
        new_password: newPassword
      });

      setIsSuccess(true);
      toast.success('Password has been successfully reset!');
      
      // Redirecting to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      console.error('Error resetting password:', error);
      setError(error.response?.data?.detail || 'Failed to reset password. Please try again.');
      toast.error('Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  // If password reset was successful, show success message with redirect button
  if (isSuccess) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper className="login-form-wrapper">
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <img src={logo} alt="Q-up Logo" height="48" />
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom color="primary">
              Password Successfully Reset!
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Your password has been reset. You will be redirected to the login page...
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/login')}
            >
              Go to Login
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  // Show the password reset form
  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper className="login-form-wrapper">
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <img src={logo} alt="Q-up Logo" height="48" />
        </Box>
        <Typography variant="h5" gutterBottom align="center">
          Reset Your Password
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }} align="center" color="text.secondary">
          Please enter your new password
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            type="password"
            label="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            type="password"
            label="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            margin="normal"
            required
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isLoading}
            sx={{ mt: 3 }}
          >
            {isLoading ? 'Resetting Password...' : 'Reset Password'}
          </Button>
        </form>
      </Paper>
    </Container>
  );
}

export default ResetPassword; 