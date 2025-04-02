import React, { useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import {
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Block as BlockIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import { toast } from 'react-toastify';
import '../../styles/components/chat/ChatContainer.css';

// Helper function to safely format image URLs
const formatImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API.defaults.baseURL}${url}`;
};

// Define time periods with their corresponding hours
const TIME_PERIODS = [
  { id: "earlyMorning", name: "Early Morning (5-8 AM)", hours: ["05:00", "06:00", "07:00", "08:00"] },
  { id: "morning", name: "Morning (8-11 AM)", hours: ["08:00", "09:00", "10:00", "11:00"] },
  { id: "noon", name: "Noon (11 AM-2 PM)", hours: ["11:00", "12:00", "13:00", "14:00"] },
  { id: "afternoon", name: "Afternoon (2-5 PM)", hours: ["14:00", "15:00", "16:00", "17:00"] },
  { id: "evening", name: "Evening (5-8 PM)", hours: ["17:00", "18:00", "19:00", "20:00"] },
  { id: "night", name: "Night (8-11 PM)", hours: ["20:00", "21:00", "22:00", "23:00"] },
  { id: "lateNight", name: "Late Night (11 PM-2 AM)", hours: ["23:00", "00:00", "01:00", "02:00"] },
  { id: "overnight", name: "Overnight (2-5 AM)", hours: ["02:00", "03:00", "04:00", "05:00"] }
];

const UserInfoPanel = ({ user, onClose }) => {
  const navigate = useNavigate();
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);

  // Helper function to format active hours for display
  const formatActiveHours = (activeHours, timezoneOffset = 0) => {
    if (!activeHours || !Array.isArray(activeHours) || activeHours.length === 0) {
      return [];
    }
    
    // Convert hours from UTC to user's local timezone
    const convertedHours = activeHours.map(hour => {
      const [hourStr, minuteStr] = hour.split(':');
      let hourNum = parseInt(hourStr, 10);
      
      // Apply timezone offset
      hourNum = (hourNum + (timezoneOffset || 0) + 24) % 24;
      
      // Format back to string with leading zeros
      return `${hourNum.toString().padStart(2, '0')}:${minuteStr || '00'}`;
    });
    
    // Check which periods the user is active in
    const activePeriods = [];
    for (const period of TIME_PERIODS) {
      // If all hours in the period are active, add the full period
      if (period.hours.every(hour => convertedHours.includes(hour))) {
        activePeriods.push(period.name.split(' ')[0]); // Just use the first word
      }
      // If some hours in the period are active, add the period with a * to indicate partial
      else if (period.hours.some(hour => convertedHours.includes(hour))) {
        activePeriods.push(`${period.name.split(' ')[0]}*`); // Just use the first word with *
      }
    }
    
    return activePeriods;
  };

  const handleBlockUser = async () => {
    try {
      // This would call an API to block the user
      // await API.post(`/users/${user.username}/block/`);
      toast.success(`You have blocked ${user.username}`);
      setBlockDialogOpen(false);
      // Optionally navigate away or refresh the chat list
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('Failed to block user');
    }
  };

  if (!user) return null;

  return (
    <Box 
      className="user-info-content" 
      sx={{ 
        p: 2,
        height: '100%',
        overflowY: 'auto',
      }}
    >
      {/* Profile header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Avatar
          src={formatImageUrl(user?.avatar || user?.avatar_url)} 
          sx={{ width: 60, height: 60, mr: 2 }}
        >
          {user?.username?.[0]?.toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="h6">{user?.display_name || user?.username}</Typography>
          <Typography variant="body2" color="text.secondary">@{user?.username}</Typography>
        </Box>
      </Box>

      {/* Bio section */}
      {user?.bio && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Bio</Typography>
          <Typography variant="body2">{user?.bio}</Typography>
        </Box>
      )}
      
      {/* Active hours */}
      {user?.active_hours && user.active_hours.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Active Hours</Typography>
          <Box 
            sx={{ 
              p: 1.5, 
              bgcolor: 'background.paper', 
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider' 
            }}
          >
            <Typography variant="body2">
              {formatActiveHours(user.active_hours, user.timezone_offset).join(', ')}
            </Typography>
            {formatActiveHours(user.active_hours, user.timezone_offset).some(p => p.includes('*')) && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                * Partially active during this time
              </Typography>
            )}
          </Box>
        </Box>
      )}
        
      {/* Platforms */}
      {user?.platforms && user.platforms.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Platforms</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
            {user.platforms.map((platform, index) => (
              <Chip 
                key={index} 
                label={platform}
                size="small"
                sx={{ m: 0.5, bgcolor: 'rgba(0, 255, 170, 0.1)' }}
                className="active-hour-chip"
              />
            ))}
          </Box>
        </Box>
      )}
        
      {/* Mic availability */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>Mic Available</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {user?.mic_available ? (
            <>
              <MicIcon sx={{ color: 'success.main', mr: 1 }} />
              <Typography variant="body2">Yes</Typography>
            </>
          ) : (
            <>
              <MicOffIcon sx={{ color: 'error.main', mr: 1 }} />
              <Typography variant="body2">No</Typography>
            </>
          )}
        </Box>
      </Box>
      
      {/* Languages */}
      {user?.language_preference && user.language_preference.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Languages</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
            {user.language_preference.map((language, index) => (
              <Chip 
                key={index} 
                label={language} 
                size="small"
                sx={{ m: 0.5, bgcolor: 'rgba(0, 255, 170, 0.1)' }}
                className="active-hour-chip"
              />
            ))}
          </Box>
        </Box>
      )}
      
      {/* View profile button */}
      <Button
        variant="contained"
        fullWidth
        onClick={() => navigate(`/profile/${user?.username}`)}
        sx={{ mb: 2 }}
      >
        View Full Profile
      </Button>
      
      {/* Block user button */}
      <Button 
        variant="outlined" 
        color="error"
        startIcon={<BlockIcon />}
        onClick={() => setBlockDialogOpen(true)}
        fullWidth
      >
        Block User
      </Button>

      {/* Block user confirmation dialog */}
      <Dialog open={blockDialogOpen} onClose={() => setBlockDialogOpen(false)}>
        <DialogTitle>Block User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to block {user?.display_name || user?.username}? 
            You will no longer receive messages from this user.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlockDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleBlockUser} color="error">Block User</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserInfoPanel; 