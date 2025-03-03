import React, { useState } from 'react';
import API from '../api/axios';
import {
  Paper,
  TextField,
  Button,
  Alert,
  Typography,
  Box,
} from '@mui/material';

const ChangePasswordForm = ({ username }) => {
  const [passwords, setPasswords] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPasswords(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate passwords match
    if (passwords.new_password !== passwords.confirm_password) {
      setError('New passwords do not match');
      return;
    }

    try {
      await API.post(`/users/${username}/change-password/`, {
        old_password: passwords.old_password,
        new_password: passwords.new_password,
      });

      setSuccess('Password changed successfully!');
      setPasswords({
        old_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Error changing password');
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 400, mx: 'auto', my: 4 }}>
      <Typography variant="h5" gutterBottom>
        Change Password
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <form onSubmit={handleSubmit}>
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField
            type="password"
            label="Current Password"
            name="old_password"
            value={passwords.old_password}
            onChange={handleChange}
            required
          />

          <TextField
            type="password"
            label="New Password"
            name="new_password"
            value={passwords.new_password}
            onChange={handleChange}
            required
          />

          <TextField
            type="password"
            label="Confirm New Password"
            name="confirm_password"
            value={passwords.confirm_password}
            onChange={handleChange}
            required
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
          >
            Change Password
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default ChangePasswordForm; 