import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography
} from '@mui/material';
import '../../styles/components/chat/EditMessageForm.css';

const EditMessageForm = ({ message, onSave, onCancel }) => {
  const [content, setContent] = useState(message.content || '');
  const inputRef = useRef(null);
  
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  const handleSave = () => {
    if (content.trim()) {
      onSave(message.id, content);
    }
  };
  
  return (
    <Box
      sx={{
        p: 1,
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.selected',
        display: 'flex',
        flexDirection: 'column',
      }}
      className="edit-message-form"
    >
      <Box sx={{ mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Editing message
        </Typography>
      </Box>
      
      <TextField
        fullWidth
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
          }
        }}
        variant="outlined"
        size="small"
        multiline
        maxRows={4}
        inputRef={inputRef}
        sx={{ mb: 1 }}
        className="edit-message-input"
      />
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }} className="edit-message-actions">
        <Button variant="outlined" size="small" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          variant="contained" 
          size="small" 
          onClick={handleSave}
          disabled={!content.trim()}
        >
          Save
        </Button>
      </Box>
    </Box>
  );
};

export default EditMessageForm; 