import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import {
  Paper,
  TextField,
  Button,
  Alert,
  Typography,
  Grid,
  Box,
} from '@mui/material';

const GameStatsForm = ({ username, gameId, initialStats }) => {
  const [stats, setStats] = useState({
    hours_played: '',
    rank: '',
    achievements: [],
    goals: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (initialStats) {
      setStats(initialStats);
    }
  }, [initialStats]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setStats(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await API.patch(`/users/${username}/game-stats/${gameId}/`, stats);
      setSuccess('Game statistics updated successfully!');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error updating game statistics');
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 600, mx: 'auto', my: 4 }}>
      <Typography variant="h5" gutterBottom>
        Edit Game Statistics
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Hours Played"
              name="hours_played"
              type="number"
              value={stats.hours_played}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Rank"
              name="rank"
              value={stats.rank}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Goals"
              name="goals"
              multiline
              rows={4}
              value={stats.goals}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              fullWidth
            >
              Update Game Stats
            </Button>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default GameStatsForm; 