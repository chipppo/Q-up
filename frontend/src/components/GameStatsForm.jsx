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
  FormControl,
  InputLabel,
  CircularProgress,
  Divider,
  Stack,
  Card,
  CardContent,
} from '@mui/material';

const GameStatsForm = ({ username, initialStats, onUpdate }) => {
  const [games, setGames] = useState([]);
  const [rankingSystems, setRankingSystems] = useState([]);
  const [rankTiers, setRankTiers] = useState({});  // Changed to object to store tiers for each system
  const [playerGoals, setPlayerGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    game: '',
    hours_played: '',
    player_goal: '',
    rankings: [], // Array to store multiple ranking system data
  });

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [gamesRes, goalsRes] = await Promise.all([
          API.get('/games/'),
          API.get('/player-goals/'),
        ]);

        setGames(gamesRes.data);
        setPlayerGoals(goalsRes.data);

        if (initialStats) {
          // Transform initial stats to new format
          const rankings = [];
          if (initialStats.rank_system) {
            rankings.push({
              rank_system: initialStats.rank_system.id,
              numeric_rank: initialStats.numeric_rank || '',
              rank: initialStats.rank?.id || '',
            });
          }

          setFormData({
            game: initialStats.game?.id || '',
            hours_played: initialStats.hours_played || '',
            player_goal: initialStats.player_goal?.id || '',
            rankings,
          });

          // If we have initial stats, fetch the ranking systems for that game
          if (initialStats.game?.id) {
            const rankingSystemsRes = await API.get(`/games/${initialStats.game.id}/ranking-systems/`);
            setRankingSystems(rankingSystemsRes.data);
            
            // Fetch rank tiers for all non-numeric ranking systems
            const tierPromises = rankingSystemsRes.data
              .filter(rs => !rs.is_numeric)
              .map(rs => API.get(`/ranking-systems/${rs.id}/tiers/`));
            
            const tierResponses = await Promise.all(tierPromises);
            const newRankTiers = {};
            rankingSystemsRes.data.forEach((rs, index) => {
              if (!rs.is_numeric) {
                newRankTiers[rs.id] = tierResponses[index].data;
              }
            });
            setRankTiers(newRankTiers);
          }
        }
      } catch (err) {
        setError('Error loading form data');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [initialStats]);

  // Fetch ranking systems when game changes
  useEffect(() => {
    const fetchRankingSystems = async () => {
      if (formData.game) {
        try {
          const response = await API.get(`/games/${formData.game}/ranking-systems/`);
          setRankingSystems(response.data);
          
          // Reset rankings when game changes
          setFormData(prev => ({
            ...prev,
            rankings: [],
          }));

          // Fetch rank tiers for all non-numeric ranking systems
          const tierPromises = response.data
            .filter(rs => !rs.is_numeric)
            .map(rs => API.get(`/ranking-systems/${rs.id}/tiers/`));
          
          const tierResponses = await Promise.all(tierPromises);
          const newRankTiers = {};
          response.data.forEach((rs, index) => {
            if (!rs.is_numeric) {
              newRankTiers[rs.id] = tierResponses[index].data;
            }
          });
          setRankTiers(newRankTiers);
        } catch (err) {
          console.error('Error fetching ranking systems:', err);
        }
      }
    };

    fetchRankingSystems();
  }, [formData.game]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value || ''
    }));
  };

  const handleRankingChange = (rankSystemId, field, value) => {
    setFormData(prev => {
      const rankings = [...prev.rankings];
      const existingIndex = rankings.findIndex(r => r.rank_system === rankSystemId);
      
      if (existingIndex >= 0) {
        rankings[existingIndex] = {
          ...rankings[existingIndex],
          [field]: value || '',
        };
      } else {
        rankings.push({
          rank_system: rankSystemId,
          numeric_rank: '',
          rank: '',
          [field]: value || '',
        });
      }

      return {
        ...prev,
        rankings,
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const endpoint = initialStats
        ? `/users/${username}/game-stats/${initialStats.id}/`
        : `/users/${username}/game-stats/`;
      
      const method = initialStats ? 'patch' : 'post';

      // Clean up the form data before submitting
      const submitData = {
        game: formData.game || null,
        hours_played: formData.hours_played || 0,
        player_goal: formData.player_goal || null,
        rankings: formData.rankings.map(ranking => ({
          rank_system: ranking.rank_system,
          numeric_rank: ranking.numeric_rank || null,
          rank: ranking.rank || null,
        })),
      };

      await API[method](endpoint, submitData);
      setSuccess('Game statistics updated successfully!');
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error updating game statistics');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 800, mx: 'auto', my: 4 }}>
      <Typography variant="h5" gutterBottom>
        {initialStats ? 'Edit Game Statistics' : 'Add Game Statistics'}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Game Selection */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Game</InputLabel>
              <Select
                name="game"
                value={formData.game || ''}
                onChange={handleChange}
                required
                label="Game"
              >
                <MenuItem value="">
                  <em>Select a game</em>
                </MenuItem>
                {games.map(game => (
                  <MenuItem key={game.id} value={game.id}>
                    {game.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Hours Played */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Hours Played"
              name="hours_played"
              type="number"
              value={formData.hours_played || ''}
              onChange={handleChange}
              required
              inputProps={{ min: 0 }}
            />
          </Grid>

          {/* Player Goal */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Player Goal</InputLabel>
              <Select
                name="player_goal"
                value={formData.player_goal || ''}
                onChange={handleChange}
                label="Player Goal"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {playerGoals.map(goal => (
                  <MenuItem key={goal.id} value={goal.id}>
                    {goal.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Ranking Systems */}
          {formData.game && rankingSystems.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Ranking Systems
              </Typography>
              <Stack spacing={2}>
                {rankingSystems.map(system => {
                  const ranking = formData.rankings.find(r => r.rank_system === system.id) || {};
                  
                  return (
                    <Card key={system.id} variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          {system.name}
                        </Typography>
                        {system.is_numeric ? (
                          <TextField
                            fullWidth
                            label="Numeric Rank"
                            type="number"
                            value={ranking.numeric_rank || ''}
                            onChange={(e) => handleRankingChange(system.id, 'numeric_rank', e.target.value)}
                            inputProps={{
                              min: 0,
                              max: system.max_numeric_value,
                              step: system.increment
                            }}
                            helperText={`Value must be between 0 and ${system.max_numeric_value} in increments of ${system.increment}`}
                          />
                        ) : (
                          <FormControl fullWidth>
                            <InputLabel>Rank Tier</InputLabel>
                            <Select
                              value={ranking.rank || ''}
                              onChange={(e) => handleRankingChange(system.id, 'rank', e.target.value)}
                              label="Rank Tier"
                            >
                              <MenuItem value="">
                                <em>None</em>
                              </MenuItem>
                              {rankTiers[system.id]?.map(tier => (
                                <MenuItem key={tier.id} value={tier.id}>
                                  {tier.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            </Grid>
          )}

          {/* Submit Button */}
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              fullWidth
            >
              {initialStats ? 'Update' : 'Add'} Game Stats
            </Button>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default GameStatsForm; 