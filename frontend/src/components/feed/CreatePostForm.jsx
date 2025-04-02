/**
 * Component for creating new posts with text, images, and game tags
 * 
 * This form allows users to create posts that can include text captions,
 * image uploads, and optional game tags. It handles the entire post creation
 * process including form validation, image previews, and API submission.
 * 
 * @module CreatePostForm
 * @requires React
 * @requires material-ui
 * @requires react-toastify
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  PhotoCamera as CameraIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import API from '../../api/axios';
import { toast } from 'react-toastify';

/**
 * Form for creating new posts with optional image and game tagging
 * 
 * @function CreatePostForm
 * @param {Object} props - Component props
 * @param {Function} props.onPostCreated - Callback that fires when a post is successfully created
 * @returns {JSX.Element} The post creation form
 */
const CreatePostForm = ({ onPostCreated }) => {
  const [caption, setCaption] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [game, setGame] = useState('');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Fetches available games from the API for the game selection dropdown
   */
  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        const response = await API.get('/games/');
        setGames(response.data);
      } catch (error) {
        console.error('Error fetching games:', error);
        toast.error('Failed to load games');
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  /**
   * Handles image file selection and generates a preview
   * 
   * @function handleImageChange
   * @param {React.ChangeEvent<HTMLInputElement>} e - Image input change event
   */
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Removes the currently selected image and preview
   * 
   * @function handleRemoveImage
   */
  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  /**
   * Handles form submission and creates a new post
   * 
   * @async
   * @function handleSubmit
   * @param {React.FormEvent} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!caption.trim() && !image) {
      toast.error('Please add a caption or an image');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const formData = new FormData();
      formData.append('caption', caption);
      if (image) {
        formData.append('image', image);
      }
      if (game) {
        formData.append('game', game);
      }
      
      const response = await API.post('/posts/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Нулиране на формуляра
      setCaption('');
      setImage(null);
      setImagePreview(null);
      setGame('');
      
      // Известяване на родителския компонент
      if (onPostCreated) {
        onPostCreated(response.data);
      }
      
      toast.success('Post created successfully!');
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Create New Post
      </Typography>
      
      <form onSubmit={handleSubmit}>
        {/* Caption */}
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          margin="normal"
          placeholder="What's on your mind?"
        />
        
        {/* Image Upload */}
        <Box sx={{ my: 2 }}>
          <input
            accept="image/*"
            id="post-image-upload"
            type="file"
            style={{ display: 'none' }}
            onChange={handleImageChange}
          />
          <label htmlFor="post-image-upload">
            <Button
              variant="outlined"
              component="span"
              startIcon={<CameraIcon />}
            >
              Add Photo
            </Button>
          </label>
          
          {imagePreview && (
            <Box sx={{ mt: 2, position: 'relative' }}>
              <IconButton
                size="small"
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                  color: 'background.default',
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                  },
                }}
                onClick={handleRemoveImage}
              >
                <CloseIcon />
              </IconButton>
              <img
                src={imagePreview}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: 300,
                  objectFit: 'contain',
                }}
              />
            </Box>
          )}
        </Box>
        
        {/* Game Selection */}
        <FormControl fullWidth margin="normal">
          <InputLabel id="game-select-label">Game (Optional)</InputLabel>
          <Select
            labelId="game-select-label"
            value={game}
            onChange={(e) => setGame(e.target.value)}
            label="Game (Optional)"
            disabled={loading}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {games.map((game) => (
              <MenuItem key={game.id} value={game.id}>
                {game.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {/* Submit Button */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            type="submit"
            disabled={submitting || (!caption.trim() && !image)}
            startIcon={submitting && <CircularProgress size={20} color="inherit" />}
          >
            {submitting ? 'Posting...' : 'Post'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default CreatePostForm; 