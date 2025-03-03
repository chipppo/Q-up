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
  { value: 'UTC', offset: 0 },
  { value: 'America/New_York', offset: -4 },
  { value: 'Europe/London', offset: 1 },
  { value: 'Asia/Tokyo', offset: 9 },
  { value: 'America/Los_Angeles', offset: -7 },
  { value: 'Europe/Paris', offset: 2 },
  { value: 'Asia/Shanghai', offset: 8 }
];

const HOURS = Array.from({ length: 24 }, (_, i) => 
  `${i.toString().padStart(2, '0')}:00`
);

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
    timezone_offset: 0,
    date_of_birth: null,
    language_preference: [],
    platforms: [],
    mic_available: false,
    social_links: [],
    active_hours: [],
    avatar: null,
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await API.get(`/users/${username}/`);
        const userData = response.data;
        
        console.log('Fetched user data:', userData);
        
        // Ensure active_hours is always an array
        let parsedActiveHours = [];
        try {
          if (userData.active_hours) {
            if (typeof userData.active_hours === 'string') {
              parsedActiveHours = JSON.parse(userData.active_hours);
            } else if (Array.isArray(userData.active_hours)) {
              parsedActiveHours = userData.active_hours;
            } else if (typeof userData.active_hours === 'object') {
              parsedActiveHours = Object.keys(userData.active_hours).length === 0 
                ? [] 
                : Object.entries(userData.active_hours)
                    .map(([hour]) => hour)
                    .sort();
            }
          }
          parsedActiveHours = Array.isArray(parsedActiveHours) ? parsedActiveHours : [];
        } catch (e) {
          console.error('Error parsing active_hours:', e);
          parsedActiveHours = [];
        }

        // Ensure other arrays are properly parsed
        const parsedLanguagePreference = Array.isArray(userData.language_preference) 
          ? userData.language_preference 
          : typeof userData.language_preference === 'string'
            ? JSON.parse(userData.language_preference || '[]')
            : [];
        
        const parsedPlatforms = Array.isArray(userData.platforms)
          ? userData.platforms
          : typeof userData.platforms === 'string'
            ? JSON.parse(userData.platforms || '[]')
            : [];
        
        const parsedSocialLinks = Array.isArray(userData.social_links)
          ? userData.social_links
          : typeof userData.social_links === 'string'
            ? JSON.parse(userData.social_links || '[]')
            : [];

        setFormData({
          ...userData,
          display_name: userData.display_name || '',
          bio: userData.bio || '',
          timezone: userData.timezone || '',
          timezone_offset: userData.timezone_offset || 0,
          date_of_birth: userData.date_of_birth ? dayjs(userData.date_of_birth, 'DD/MM/YYYY') : null,
          language_preference: parsedLanguagePreference,
          platforms: parsedPlatforms,
          mic_available: userData.mic_available || false,
          social_links: parsedSocialLinks,
          active_hours: parsedActiveHours,
          avatar: userData.avatar || null,
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
      setFormData(prev => ({
        ...prev,
        avatar: file  // This will be a File object
      }));
    }
  };

  const handleDateChange = (newDate) => {
    setFormData(prev => ({
      ...prev,
      date_of_birth: newDate
    }));
  };

  const handleTimezoneChange = (e) => {
    const selectedTimezone = TIMEZONES.find(tz => tz.value === e.target.value);
    setFormData(prev => ({
      ...prev,
      timezone: e.target.value,
      timezone_offset: selectedTimezone ? selectedTimezone.offset : 0
    }));
  };

  const handleActiveHoursChange = (hour) => {
    setFormData(prev => ({
      ...prev,
      active_hours: prev.active_hours.includes(hour)
        ? prev.active_hours.filter(h => h !== hour)
        : [...prev.active_hours, hour].sort()
    }));
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
      const formDataToSend = new FormData();
      
      // Add the JSON data
      const jsonData = {
        ...formData,
        date_of_birth: formData.date_of_birth?.format('DD/MM/YYYY'),
        language_preference: JSON.stringify(formData.language_preference),
        platforms: JSON.stringify(formData.platforms),
        social_links: JSON.stringify(formData.social_links),
        active_hours: JSON.stringify(formData.active_hours)
      };

      // Remove any undefined or null values
      Object.keys(jsonData).forEach(key => {
        if (jsonData[key] !== undefined && jsonData[key] !== null) {
          formDataToSend.append(key, jsonData[key]);
        }
      });

      // Add the avatar if it exists
      if (formData.avatar) {
        formDataToSend.append('avatar', formData.avatar);
      }

      const response = await API.patch(`/users/${username}/update/`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
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

  const activeHoursSection = (
    <Grid item xs={12}>
      <Typography variant="h6" gutterBottom>Active Hours</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {HOURS.map(hour => {
          // Ensure active_hours is an array before calling includes
          const isActive = Array.isArray(formData.active_hours) && formData.active_hours.includes(hour);
          return (
            <Chip
              key={hour}
              label={hour}
              onClick={() => handleActiveHoursChange(hour)}
              color={isActive ? "primary" : "default"}
              sx={{ m: 0.5 }}
            />
          );
        })}
      </Box>
    </Grid>
  );

  const timezoneSection = (
    <Grid item xs={12} sm={6}>
      <FormControl fullWidth>
        <InputLabel>Timezone</InputLabel>
        <Select
          name="timezone"
          value={formData.timezone}
          onChange={handleTimezoneChange}
          label="Timezone"
        >
          {TIMEZONES.map(tz => (
            <MenuItem key={tz.value} value={tz.value}>
              {tz.value} (UTC{tz.offset >= 0 ? '+' : ''}{tz.offset})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Grid>
  );

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
                src={formData.avatar instanceof File ? URL.createObjectURL(formData.avatar) : formData.avatar ? `${API.defaults.baseURL}${formData.avatar}` : null}
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
          {timezoneSection}

          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Date of Birth"
                value={formData.date_of_birth}
                onChange={handleDateChange}
                slotProps={{ textField: { fullWidth: true } }}
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
          {activeHoursSection}

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