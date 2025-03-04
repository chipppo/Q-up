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
  Select,
  MenuItem,
} from '@mui/material';

const GameStatsForm = ({ username, initialStats }) => {
  const [games, setGames] = useState([]); // List of games
  const [rankingSystems, setRankingSystems] = useState([]); // List of ranking systems
  const [selectedGame, setSelectedGame] = useState('');
  const [selectedRankingSystem, setSelectedRankingSystem] = useState('');
  const [stats, setStats] = useState({
    hours_played: '',
    rank: '',
    achievements: '',
    player_goal: '',
    numeric_rank: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isNumeric, setIsNumeric] = useState(false); // Track if the selected ranking system is numeric

  useEffect(() => {
    // Fetch available games
    const fetchGames = async () => {
      try {
        const response = await API.get('/games/'); // Adjust the endpoint as necessary
        setGames(response.data);
      } catch (err) {
        console.error('Error fetching games:', err);
      }
    };

    fetchGames();
  }, []);

  useEffect(() => {
    // Fetch ranking systems when a game is selected
    const fetchRankingSystems = async () => {
      if (selectedGame) {
        try {
          const response = await API.get(`/games/${selectedGame}/ranking-systems/`); // Adjust the endpoint as necessary
          setRankingSystems(response.data);
        } catch (err) {
          console.error('Error fetching ranking systems:', err);
        }
      }
    };

    fetchRankingSystems();
  }, [selectedGame]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setStats(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGameChange = (e) => {
    setSelectedGame(e.target.value);
    setStats({ hours_played: '', rank: '', achievements: '', player_goal: '', numeric_rank: '' }); // Reset stats
    setSelectedRankingSystem(''); // Reset ranking system
    setIsNumeric(false); // Reset numeric state
  };

  const handleRankingSystemChange = (e) => {
    const selectedSystem = e.target.value;
    setSelectedRankingSystem(selectedSystem);
    
    // Check if the selected ranking system is numeric
    const rankingSystem = rankingSystems.find(system => system.id === selectedSystem);
    setIsNumeric(rankingSystem ? rankingSystem.is_numeric : false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await API.post(`/users/${username}/game-stats/`, {
        game: selectedGame,
        ranking_system: selectedRankingSystem,
        ...stats,
      });
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
          <Grid item xs={12}>
            <Select
              fullWidth
              value={selectedGame}
              onChange={handleGameChange}
              displayEmpty
              required
            >
              <MenuItem value="" disabled>Select a Game</MenuItem>
              {games.map(game => (
                <MenuItem key={game.id} value={game.id}>{game.name}</MenuItem>
              ))}
            </Select>
          </Grid>

          <Grid item xs={12}>
            <Select
              fullWidth
              value={selectedRankingSystem}
              onChange={handleRankingSystemChange}
              displayEmpty
              required
            >
              <MenuItem value="" disabled>Select a Ranking System</MenuItem>
              {rankingSystems.map(system => (
                <MenuItem key={system.id} value={system.id}>{system.name}</MenuItem>
              ))}
            </Select>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Hours Played"
              name="hours_played"
              type="number"
              value={stats.hours_played}
              onChange={handleChange}
              required
            />
          </Grid>

          {isNumeric ? (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Numeric Rank"
                name="numeric_rank"
                type="number"
                value={stats.numeric_rank}
                onChange={handleChange}
              />
            </Grid>
          ) : (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Rank"
                name="rank"
                value={stats.rank}
                onChange={handleChange}
              />
            </Grid>
          )}

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Achievements"
              name="achievements"
              multiline
              rows={4}
              value={stats.achievements}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Player Goal"
              name="player_goal"
              value={stats.player_goal}
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