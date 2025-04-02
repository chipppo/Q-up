/**
 * Form component for managing user game statistics
 * 
 * This component provides a form for users to add or edit their gaming statistics,
 * including games played, hours, rankings, and gaming goals. It supports multiple
 * ranking systems per game and allows updating or removing game stats.
 * 
 * @module GameStatsForm
 * @requires React
 * @requires material-ui
 */
import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
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
  Stack,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

/**
 * Form for adding and editing game statistics for a user's profile
 * 
 * @function GameStatsForm
 * @param {Object} props - Component props
 * @param {string} props.username - Username of the profile being edited
 * @param {Object|null} props.initialStats - Initial game statistics if editing existing data
 * @param {Function} props.onUpdate - Callback that fires when stats are successfully updated
 * @returns {JSX.Element} The game statistics form
 */
const GameStatsForm = ({ username, initialStats, onUpdate }) => {
  const [games, setGames] = useState([]);
  const [rankingSystems, setRankingSystems] = useState([]);
  const [rankTiers, setRankTiers] = useState({});
  const [playerGoals, setPlayerGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    game: '',
    hours_played: '',
    player_goal: '',
    rankings: [],
  });

  /**
   * Fetches initial data for the form including games and player goals
   * Also sets up form data if editing existing stats
   */
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
          setFormData({
            game: initialStats.game.id,
            hours_played: initialStats.hours_played,
            player_goal: initialStats.player_goal?.id || '',
            rankings: initialStats.rankings.map(ranking => ({
              rank_system: ranking.rank_system.id,
              rank: ranking.rank?.id || '',
              numeric_rank: ranking.numeric_rank || '',
            })),
          });

          if (initialStats.game.id) {
            const rankingSystemsRes = await API.get(`/games/${initialStats.game.id}/ranking-systems/`);
            setRankingSystems(rankingSystemsRes.data);
            
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

  /**
   * Fetches ranking systems when a game is selected
   * Also fetches rank tiers for non-numeric ranking systems
   */
  useEffect(() => {
    const fetchRankingSystems = async () => {
      if (formData.game) {
        try {
          const response = await API.get(`/games/${formData.game}/ranking-systems/`);
          setRankingSystems(response.data);
          
          setFormData(prev => ({
            ...prev,
            rankings: [],
          }));

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
          setError('Error fetching ranking systems');
        }
      }
    };

    fetchRankingSystems();
  }, [formData.game]);

  /**
   * Handles changes to the main form fields
   * 
   * @function handleChange
   * @param {React.ChangeEvent} e - Change event
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * Handles changes to ranking-specific fields
   * 
   * @function handleRankingChange
   * @param {number|string} rankSystemId - ID of the ranking system being changed
   * @param {string} field - Field name ('rank' or 'numeric_rank')
   * @param {string|number} value - New value for the field
   */
  const handleRankingChange = (rankSystemId, field, value) => {
    setFormData(prev => {
      const rankings = [...prev.rankings];
      const existingIndex = rankings.findIndex(r => r.rank_system === rankSystemId);
      
      if (existingIndex >= 0) {
        rankings[existingIndex] = {
          ...rankings[existingIndex],
          [field]: value,
        };
      } else {
        rankings.push({
          rank_system: rankSystemId,
          numeric_rank: field === 'numeric_rank' ? value : '',
          rank: field === 'rank' ? value : '',
        });
      }

      return {
        ...prev,
        rankings,
      };
    });
  };

  /**
   * Handles form submission to create or update game stats
   * 
   * @async
   * @function handleSubmit
   * @param {React.FormEvent} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.game) {
      setError('Please select a game');
      return;
    }

    try {
      const submitData = {
        game_id: parseInt(formData.game),
        hours_played: parseInt(formData.hours_played) || 0,
        player_goal: formData.player_goal ? parseInt(formData.player_goal) : null,
        rankings: formData.rankings
          .filter(ranking => ranking.rank_system && (ranking.rank || ranking.numeric_rank))
          .map(ranking => ({
            rank_system_id: parseInt(ranking.rank_system),
            rank_id: ranking.rank ? parseInt(ranking.rank) : null,
            numeric_rank: ranking.numeric_rank ? parseInt(ranking.numeric_rank) : null
          }))
      };

      console.log('Submitting data:', submitData);

      let response;
      if (initialStats) {
        response = await API.patch(
          `/users/${username}/game-stats/${initialStats.game.id}/`,
          submitData
        );
      } else {
        response = await API.post(
          `/users/${username}/game-stats/`,
          submitData
        );
      }

      setSuccess('Game statistics saved successfully!');
      if (onUpdate) {
        onUpdate(response.data);
      }
    } catch (err) {
      console.error('Error saving game stats:', err);
      setError('Error saving game statistics');
    }
  };

  /**
   * Handles deletion of game statistics
   * 
   * @async
   * @function handleDelete
   */
  const handleDelete = async () => {
    try {
      await API.delete(`/users/${username}/game-stats/${initialStats.game.id}/`);
      setSuccess('Game statistics deleted successfully!');
      setDeleteDialogOpen(false);
      if (onUpdate) {
        onUpdate(null, true);
      }
    } catch (err) {
      console.error('Error deleting game stats:', err);
      setError('Error deleting game statistics');
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        {initialStats ? 'Edit Game Statistics' : 'Add Game Statistics'}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Game</InputLabel>
            <Select
                name="game"
                value={formData.game}
                onChange={handleChange}
              required
                label="Game"
                disabled={!!initialStats}
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

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Hours Played"
              name="hours_played"
              type="number"
              value={formData.hours_played}
              onChange={handleChange}
              required
              inputProps={{ min: 0 }}
            />
          </Grid>

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

          <Grid item xs={12}>
            <Stack direction="row" spacing={2}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              fullWidth
            >
                {initialStats ? 'Update' : 'Add'} Game Stats
              </Button>
              
              {initialStats && (
                <Button
                  variant="contained"
                  color="error"
                  size="large"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete
            </Button>
              )}
            </Stack>
          </Grid>
        </Grid>
      </form>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Game Statistics</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete these game statistics? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default GameStatsForm; 