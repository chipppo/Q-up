import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { toast } from 'react-toastify';
import {
  Box,
  Button,
  TextField,
  Grid,
  Typography,
  Avatar,
  Switch,
  FormControlLabel,
  Alert,
  Paper,
  Divider,
  Chip,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const TIMEZONES = [
  'UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo',
  'America/Los_Angeles', 'Europe/Paris', 'Asia/Shanghai'
];

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Japanese', 'Korean', 'Chinese',
  'Portuguese', 'Russian', 'Italian'
];

const PLATFORMS = [
  'PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Mobile',
  'PlayStation 5', 'PlayStation 4', 'Xbox Series X/S', 'Xbox One'
];

const EditProfileForm = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    timezone: '',
    date_of_birth: null,
    language_preference: [],
    platforms: [],
    mic_available: false,
    social_links: [],
    active_hours: {},
  });

  const [activeHoursTemp, setActiveHoursTemp] = useState({
    day: 'Monday',
    start: '09:00',
    end: '17:00'
  });

  const [avatar, setAvatar] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await API.get(`/user_data/${username}/`);
        const userData = response.data;
        setFormData({
          display_name: userData.display_name || '',
          bio: userData.bio || '',
          timezone: userData.timezone || '',
          date_of_birth: userData.date_of_birth ? dayjs(userData.date_of_birth) : null,
          language_preference: userData.language_preference || [],
          platforms: userData.platforms || [],
          mic_available: userData.mic_available || false,
          social_links: userData.social_links || [],
          active_hours: userData.active_hours || {},
        });
      } catch (error) {
        toast.error('Failed to load user data');
        console.error('Error fetching user data:', error);
      }
    };

    if (username) {
      fetchUserData();
    }
  }, [username]);

  const handleInputChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: e.target.type === 'checkbox' ? checked : value
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5000000) { // 5MB limit
        setError('File size too large. Maximum size is 5MB.');
        return;
      }
      setAvatar(file);
    }
  };

  const handleDateChange = (newDate) => {
    setFormData(prev => ({
      ...prev,
      date_of_birth: newDate
    }));
  };

  const handleActiveHoursAdd = () => {
    const { day, start, end } = activeHoursTemp;
    setFormData(prev => ({
      ...prev,
      active_hours: {
        ...prev.active_hours,
        [day]: { start, end }
      }
    }));
  };

  const handleActiveHoursRemove = (day) => {
    setFormData(prev => {
      const newActiveHours = { ...prev.active_hours };
      delete newActiveHours[day];
      return { ...prev, active_hours: newActiveHours };
    });
  };

  const handleArrayAdd = (field, value) => {
    if (!value.trim()) return;
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], value.trim()]
    }));
  };

  const handleArrayRemove = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const dataToSubmit = {
        ...formData,
        date_of_birth: formData.date_of_birth?.format('YYYY-MM-DD'),
      };

      // Remove any undefined or null values
      Object.keys(dataToSubmit).forEach(key => {
        if (dataToSubmit[key] === undefined || dataToSubmit[key] === null) {
          delete dataToSubmit[key];
        }
      });

      // Add proper headers to the request
      const response = await API.patch(`/user_data/${username}/update/`, dataToSubmit, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.status === 200) {
        toast.success('Profile updated successfully!');
        navigate(`/profile/${username}`);
      }
    } catch (error) {
      console.error('Update error:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update profile';
      toast.error(errorMessage);
      setError(errorMessage);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 800, mx: 'auto', my: 4 }}>
      <Typography variant="h4" gutterBottom>Edit Profile</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Avatar Upload */}
          <Grid item xs={12}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar
                src={avatar ? URL.createObjectURL(avatar) : formData.avatar}
                sx={{ width: 100, height: 100 }}
              />
              <Button variant="contained" component="label">
                Upload Avatar
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
              </Button>
            </Box>
          </Grid>

          {/* Basic Information */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Display Name"
              name="display_name"
              value={formData.display_name || ''}
              onChange={handleInputChange}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Bio"
              name="bio"
              multiline
              rows={4}
              value={formData.bio || ''}
              onChange={handleInputChange}
            />
          </Grid>

          {/* Timezone and Date of Birth */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Timezone</InputLabel>
              <Select
                name="timezone"
                value={formData.timezone || ''}
                onChange={handleInputChange}
                label="Timezone"
              >
                {TIMEZONES.map(tz => (
                  <MenuItem key={tz} value={tz}>{tz}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Date of Birth"
                value={formData.date_of_birth}
                onChange={handleDateChange}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>

          {/* Languages */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Languages</Typography>
            <FormControl fullWidth>
              <Select
                multiple
                value={formData.language_preference}
                onChange={(e) => handleInputChange({
                  target: { name: 'language_preference', value: e.target.value }
                })}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} />
                    ))}
                  </Box>
                )}
              >
                {LANGUAGES.map((lang) => (
                  <MenuItem key={lang} value={lang}>
                    {lang}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Platforms */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Gaming Platforms</Typography>
            <FormControl fullWidth>
              <Select
                multiple
                value={formData.platforms}
                onChange={(e) => handleInputChange({
                  target: { name: 'platforms', value: e.target.value }
                })}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} />
                    ))}
                  </Box>
                )}
              >
                {PLATFORMS.map((platform) => (
                  <MenuItem key={platform} value={platform}>
                    {platform}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Microphone Availability */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.mic_available}
                  onChange={(e) => handleInputChange({
                    target: {
                      name: 'mic_available',
                      type: 'checkbox',
                      checked: e.target.checked
                    }
                  })}
                />
              }
              label="Microphone Available"
            />
          </Grid>

          {/* Active Hours */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Active Hours</Typography>
            <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'flex-end' }}>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Day</InputLabel>
                <Select
                  value={activeHoursTemp.day}
                  onChange={(e) => setActiveHoursTemp(prev => ({ ...prev, day: e.target.value }))}
                  label="Day"
                >
                  {DAYS_OF_WEEK.map(day => (
                    <MenuItem key={day} value={day}>{day}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Start Time"
                type="time"
                value={activeHoursTemp.start}
                onChange={(e) => setActiveHoursTemp(prev => ({ ...prev, start: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End Time"
                type="time"
                value={activeHoursTemp.end}
                onChange={(e) => setActiveHoursTemp(prev => ({ ...prev, end: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
              <Button
                variant="contained"
                onClick={handleActiveHoursAdd}
              >
                Add Hours
              </Button>
            </Box>
            <Box>
              {Object.entries(formData.active_hours).map(([day, hours]) => (
                <Chip
                  key={day}
                  label={`${day}: ${hours.start} - ${hours.end}`}
                  onDelete={() => handleActiveHoursRemove(day)}
                  sx={{ m: 0.5 }}
                />
              ))}
            </Box>
          </Grid>

          {/* Social Links */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Social Links</Typography>
            <Stack spacing={2}>
              {formData.social_links.map((link, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    value={link}
                    onChange={(e) => {
                      const newLinks = [...formData.social_links];
                      newLinks[index] = e.target.value;
                      handleInputChange({
                        target: { name: 'social_links', value: newLinks }
                      });
                    }}
                  />
                  <IconButton onClick={() => handleArrayRemove('social_links', index)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              <Button
                startIcon={<AddIcon />}
                onClick={() => handleArrayAdd('social_links', '')}
              >
                Add Social Link
              </Button>
            </Stack>
          </Grid>

          {/* Submit Button */}
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              fullWidth
            >
              Save Changes
            </Button>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default EditProfileForm; 