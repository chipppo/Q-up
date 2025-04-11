/**
 * Profile editing form component
 * 
 * This component lets users edit their profile information like:
 * - Display name and bio
 * - Profile picture (avatar)
 * - When they're usually online (active hours)
 * - What languages they speak
 * - What gaming platforms they use
 * - Social media links
 * - Timezone and date of birth
 * - Whether they have a microphone
 * 
 * It's a complex form with lots of different input types.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API, { formatAvatarUrl } from '../../api/axios';
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
  CircularProgress,
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';
import TwitterIcon from '@mui/icons-material/Twitter';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import GitHubIcon from '@mui/icons-material/GitHub';
import YouTubeIcon from '@mui/icons-material/YouTube';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import HeadsetIcon from '@mui/icons-material/Headset';
import VideogameAssetIcon from '@mui/icons-material/VideogameAsset';
import LinkIcon from '@mui/icons-material/Link';
import { TIME_PERIODS, hoursToPeriodIds, periodIdsToHours } from '../../utils/timeUtils';

/**
 * Days of the week for scheduling active hours
 */
const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

/**
 * Common timezone options with their UTC offsets
 */
const TIMEZONES = [
  { value: 'UTC', offset: 0 },
  { value: 'America/New_York', offset: -4 },
  { value: 'Europe/London', offset: 1 },
  { value: 'Asia/Tokyo', offset: 9 },
  { value: 'America/Los_Angeles', offset: -7 },
  { value: 'Europe/Paris', offset: 2 },
  { value: 'Asia/Shanghai', offset: 8 }
];

/**
 * Hour options for scheduling (24-hour format)
 */
const HOURS = Array.from({ length: 24 }, (_, i) => 
  `${i.toString().padStart(2, '0')}:00`
);

/**
 * Available language options for users to select
 */
const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 
  'Russian', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 
  'Turkish', 'Dutch', 'Swedish', 'Norwegian', 'Finnish', 'Danish', 
  'Polish', 'Czech', 'Hungarian', 'Greek', 'Romanian', 'Bulgarian', 
  'Ukrainian', 'Thai', 'Vietnamese', 'Indonesian', 'Malay', 'Filipino'
];

/**
 * Gaming platform options users can select
 */
const PLATFORMS = [
  'PC', 'PlayStation 5', 'PlayStation 4', 'Xbox Series X/S', 'Xbox One', 
  'Nintendo Switch', 'Mobile', 'Steam Deck', 'VR'
];

/**
 * The main EditProfileForm component
 * 
 * @returns {JSX.Element} The profile editing form
 */
const EditProfileForm = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  
  // Form state to hold all the user's profile data
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
  const [newSocialLink, setNewSocialLink] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const [removingLink, setRemovingLink] = useState(false);
  const [removingLinkIndex, setRemovingLinkIndex] = useState(null);

  /**
   * Load the user's current profile data when the component mounts
   */
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

  // Debug logging for social links
  useEffect(() => {
    console.log('Current social links in state:', formData.social_links);
  }, [formData.social_links]);

  /**
   * Updates form state when input fields change
   * 
   * @param {React.ChangeEvent} e - The input change event
   */
  const handleInputChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: e.target.type === 'checkbox' ? checked : value
    }));
  };

  /**
   * Handles avatar (profile picture) uploads
   * 
   * @param {React.ChangeEvent} e - The file input change event
   */
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

  const handleActiveHoursChange = (period) => {
    setFormData(prev => {
      // Get the current active hours, ensuring it's an array
      const currentHours = Array.isArray(prev.active_hours) ? [...prev.active_hours] : [];
      
      // Get the hours for this period
      const periodObj = TIME_PERIODS.find(p => p.id === period);
      
      if (!periodObj) {
        console.error(`Period ${period} not found in TIME_PERIODS`);
        return prev;
      }
      
      const periodHours = periodObj.hours;
      
      // Count how many hours from this period are already active
      const activeHoursInPeriod = periodHours.filter(hour => currentHours.includes(hour));
      const allHoursActive = activeHoursInPeriod.length === periodHours.length;
      
      let updatedHours;
      
      if (allHoursActive) {
        // If all hours are active, remove ONLY the hours from this specific period
        updatedHours = currentHours.filter(hour => !periodHours.includes(hour));
      } else {
        // Otherwise, add ONLY the hours from this specific period that aren't already selected
        
        // Create a new set to avoid duplicate hours
        updatedHours = [...new Set([
          ...currentHours,
          ...periodHours
        ])];
      }
      
      // Sort hours for consistent display and storage
      return {
        ...prev,
        active_hours: updatedHours.sort()
      };
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
    const updatedArray = formData[field].filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      [field]: updatedArray
    }));
    
    // If removing a social link, update the server immediately
    if (field === 'social_links') {
      setRemovingLink(true);
      setRemovingLinkIndex(index);
      const formDataToSend = new FormData();
      formDataToSend.append('social_links', JSON.stringify(updatedArray));
      
      console.log('Removing social link, sending updated links to server:', updatedArray);
      
      API.patch(`/users/${username}/update/`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      })
      .then(response => {
        if (response.status === 200) {
          console.log('Social link removed successfully, server response:', response.data);
          toast.success('Social link removed from your profile', {
            autoClose: 3000,
            position: 'bottom-right'
          });
        }
      })
      .catch(error => {
        console.error('Error removing social link:', error);
        console.error('Error response:', error.response?.data);
        toast.error('Failed to remove link from server', {
          autoClose: 5000
        });
      })
      .finally(() => {
        setRemovingLink(false);
        setRemovingLinkIndex(null);
      });
    }
  };

  const handleSocialLinkAdd = async () => {
    if (!newSocialLink.trim()) return;
    
    // Basic URL validation
    try {
      new URL(newSocialLink);
      
      // First update local state
      const updatedLinks = [...formData.social_links, newSocialLink];
      setFormData(prev => ({
        ...prev,
        social_links: updatedLinks
      }));
      setNewSocialLink('');
      
      // Then send update to server
      try {
        setAddingLink(true);
        const formDataToSend = new FormData();
        formDataToSend.append('social_links', JSON.stringify(updatedLinks));
        
        console.log('Sending social links to server:', updatedLinks);
        
        const response = await API.patch(`/users/${username}/update/`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          }
        });
        
        if (response.status === 200) {
          console.log('Social link added successfully, server response:', response.data);
          toast.success('Social link added and saved to your profile!', {
            autoClose: 3000,
            position: 'bottom-right'
          });
        }
      } catch (error) {
        console.error('Error saving social link:', error);
        console.error('Error response:', error.response?.data);
        toast.error('Failed to save link to server. Try again or use Save Profile Changes button.', {
          autoClose: 5000
        });
      } finally {
        setAddingLink(false);
      }
    } catch (err) {
      toast.error('Please enter a valid URL including http:// or https://', {
        autoClose: 5000
      });
    }
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
      <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
        Select the time periods when you're typically available to play. Click a period to select/deselect all hours in that time range.
      </Typography>
      
      <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.paper' }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Currently selected: <strong>{formData.active_hours ? formData.active_hours.length : 0} hours</strong>
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
          {TIME_PERIODS.map(period => {
            // Check if all hours in this period are active
            const isActive = Array.isArray(formData.active_hours) && 
              period.hours.every(hour => formData.active_hours.includes(hour));
            
            // Check if some but not all hours are active (partial selection)
            const hasPartial = Array.isArray(formData.active_hours) && 
              period.hours.some(hour => formData.active_hours.includes(hour)) &&
              !period.hours.every(hour => formData.active_hours.includes(hour));
            
            return (
              <Chip
                key={period.id}
                label={`${period.name} (${period.hours[0]}-${period.hours[period.hours.length-1]})`}
                onClick={() => handleActiveHoursChange(period.id)}
                color={isActive ? "primary" : hasPartial ? "secondary" : "default"}
                variant={isActive ? "filled" : hasPartial ? "outlined" : "filled"}
                sx={{ 
                  m: 0.5,
                  fontWeight: isActive ? 'bold' : 'normal',
                  position: 'relative',
                }}
              />
            );
          })}
        </Box>
        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
          Note: Time periods may overlap. Selecting a period adds all hours in that range.
        </Typography>
      </Paper>
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

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Note:</strong> Social links are saved immediately when added or removed. All other profile changes require clicking the "Save Profile Changes" button at the bottom of the form.
      </Alert>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Avatar Upload */}
          <Grid item xs={12}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar
                src={formData.avatar instanceof File ? URL.createObjectURL(formData.avatar) : formatAvatarUrl(formData.avatar, username)}
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
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Social Links
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Add your social media profiles. <strong>Links are saved immediately</strong> when added or removed (no need to click Save Profile Changes).
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Stack direction="row" spacing={2}>
                  <TextField
                    fullWidth
                    label="Add social link (URL)"
                    value={newSocialLink}
                    onChange={(e) => setNewSocialLink(e.target.value)}
                    placeholder="https://..."
                    helperText="Enter a complete URL (e.g., https://twitter.com/yourusername)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSocialLinkAdd();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleSocialLinkAdd}
                    variant="contained" 
                    startIcon={addingLink ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
                    sx={{ height: 56 }}
                    disabled={addingLink || !newSocialLink.trim()}
                  >
                    {addingLink ? 'Saving...' : 'Add & Save'}
                  </Button>
                </Stack>
              </Grid>
              <Grid item xs={12}>
                {formData.social_links.length > 0 ? (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Your saved social links ({formData.social_links.length}):
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {formData.social_links.map((link, index) => {
                        try {
                          const url = new URL(link);
                          let icon = <LinkIcon />;
                          const hostname = url.hostname;
                          
                          // Determine icon based on hostname
                          if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
                            icon = <TwitterIcon />;
                          } else if (hostname.includes('facebook.com')) {
                            icon = <FacebookIcon />;
                          } else if (hostname.includes('instagram.com')) {
                            icon = <InstagramIcon />;
                          } else if (hostname.includes('linkedin.com')) {
                            icon = <LinkedInIcon />;
                          } else if (hostname.includes('github.com')) {
                            icon = <GitHubIcon />;
                          } else if (hostname.includes('youtube.com')) {
                            icon = <YouTubeIcon />;
                          } else if (hostname.includes('twitch.tv')) {
                            icon = <SportsEsportsIcon />;
                          } else if (hostname.includes('discord.com') || hostname.includes('discord.gg')) {
                            icon = <HeadsetIcon />;
                          } else if (hostname.includes('steam')) {
                            icon = <VideogameAssetIcon />;
                          }
                          
                          return (
                            <Chip
                              key={index}
                              icon={icon}
                              label={hostname.replace('www.', '')}
                              onDelete={() => handleArrayRemove('social_links', index)}
                              sx={{ m: 0.5 }}
                              color="primary"
                              variant="outlined"
                              deleteIcon={removingLinkIndex === index ? 
                                <CircularProgress size={16} color="inherit" /> : undefined}
                              component="a"
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              clickable
                            />
                          );
                        } catch (err) {
                          return null;
                        }
                      })}
                    </Stack>
                  </Paper>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No social links added yet. Add links to your social media profiles above.
                  </Typography>
                )}
              </Grid>
            </Grid>
          </Box>

          {/* Submit Button */}
          <Grid item xs={12} sx={{ mt: 3 }}>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(25, 118, 210, 0.05)' }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                <strong>Important:</strong> While social links are saved immediately, other profile changes 
                (display name, bio, languages, etc.) require clicking the button below to save to the database.
              </Typography>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                sx={{ py: 1.5, fontSize: '1.1rem' }}
              >
                Save Profile Changes
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default EditProfileForm; 