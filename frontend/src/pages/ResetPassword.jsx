import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
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
import './Login.css';
import logo from '../assets/qup-logo.svg';

function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { uidb64, token } = useParams();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      await API.post(`/password-reset/confirm/${uidb64}/${token}/`, {
        new_password: newPassword
      });

      setIsSuccess(true);
      toast.success('Password has been reset successfully!');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error.response?.data?.detail || 'Failed to reset password. Please try again.');
      toast.error('Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper className="login-form-wrapper">
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <img src={logo} alt="Q-up Logo" height="48" />
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom color="primary">
              Password Reset Successful!
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