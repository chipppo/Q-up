import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  CircularProgress,
  Typography,
} from '@mui/material';
import {
  Send as SendIcon,
  Image as ImageIcon,
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
  InsertDriveFile as InsertDriveFileIcon,
  Reply as ReplyIcon,
} from '@mui/icons-material';
import API from '../../api/axios';
import { toast } from 'react-toastify';
import '../../styles/components/chat/MessageInput.css';

const MessageInput = ({ selectedChat, replyTo, setReplyTo, addMessage, scrollToBottom }) => {
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [sending, setSending] = useState(false);
  
  const messageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Handle input changes
  const handleMessageChange = (e) => {
    const newValue = e.target.value;
    setMessage(newValue);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // No need to send typing status if no chat is selected
    if (!selectedChat) return;
  };
  
  // Handle file selection
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size should be less than 10MB");
        if (documentInputRef.current) documentInputRef.current.value = "";
        return;
      }
      
      // Block potentially dangerous file types
      const dangerousExtensions = [".exe", ".bat", ".cmd", ".msi", ".sh", ".vbs", ".ps1", ".php", ".dll"];
      const fileName = file.name.toLowerCase();
      const hasDangerousExtension = dangerousExtensions.some(ext => fileName.endsWith(ext));
      
      if (hasDangerousExtension) {
        toast.error("This file type is not allowed for security reasons");
        if (documentInputRef.current) documentInputRef.current.value = "";
        return;
      }
      
      try {
        // Set file for upload
        setSelectedFile(file);
        setFilePreview(file);
        
        // Clear image selection
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        
        toast.success(`File "${file.name}" ready to upload`);
        
        // Additional validation to warn about file size
        if (file.size > 5 * 1024 * 1024) {
          toast.warning("Large files may take longer to upload");
        }
      } catch (error) {
        console.error("Error handling file:", error);
        toast.error("Error processing file. Please try another one.");
        if (documentInputRef.current) documentInputRef.current.value = "";
      }
    }
  };
  
  // Send message with better file handling
  const handleSendMessage = async () => {
    if ((!message.trim() && !selectedImage && !selectedFile) || sending) {
      return;
    }

    try {
      setSending(true);

      const formData = new FormData();
      
      if (message.trim()) {
        formData.append('content', message.trim());
      }
      
      if (selectedImage) {
        formData.append('image', selectedImage);
      }
      
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      if (replyTo) {
        formData.append('reply_to', replyTo.id);
      }

      // Get the authentication token
      const token = API.defaults.headers.Authorization.split(' ')[1];
      
      if (!token) {
        toast.error("Authentication error. Please login again.");
        setSending(false);
        return;
      }

      const response = await fetch(`${API.defaults.baseURL}/api/chat/${selectedChat.id}/messages/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        // Try to parse the error message from the response
        let errorMessage = "Failed to send message";
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || Object.values(errorData).flat().join(", ") || errorMessage;
        } catch (e) {
          console.error("Error parsing error response:", e);
        }
        
        // Show different messages based on response status
        if (response.status === 413) {
          toast.error("File too large. Please upload a smaller file.");
        } else if (response.status === 401 || response.status === 403) {
          toast.error("You don't have permission to send messages in this chat.");
        } else if (response.status === 404) {
          toast.error("Chat not found. It may have been deleted.");
        } else if (response.status >= 500) {
          toast.error("Server error. Please try again later.");
        } else {
          toast.error(errorMessage);
        }
        
        console.error("Error sending message:", response.status, errorMessage);
        setSending(false);
        return;
      }

      // Clear the input field
      setMessage('');
      setSelectedImage(null);
      setImagePreview(null);
      setSelectedFile(null);
      setFilePreview(null);
      setReplyTo(null);
      
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (documentInputRef.current) documentInputRef.current.value = '';

      // Refetch the messages
      if (addMessage) {
        const data = await response.json();
        addMessage(data);
      }

      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Scroll to bottom of message list
      if (scrollToBottom) {
        scrollToBottom();
      }
      
      // Show toast message
      toast.success("Message sent!");
      
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message: " + (error.message || "Unknown error"));
    } finally {
      setSending(false);
    }
  };
  
  // Helper function to format image URLs
  const formatImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API.defaults.baseURL}${url}`;
  };
  
  // Handle image selection
  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file size
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      
      // Set selected image and create preview
      setSelectedImage(file);
      
      // Check if file has correct extension but wrong content type
      const fileName = file.name.toLowerCase();
      const imageExtensions = [
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg", 
        ".tiff", ".tif", ".avif", ".heic", ".heif", ".jfif", ".pjpeg", ".pjp"
      ];
      const hasImageExtension = imageExtensions.some(ext => fileName.endsWith(ext));
      
      // Validate file type with appropriate notifications
      const validImageTypes = [
        "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/svg+xml",
        "image/tiff", "image/avif", "image/heic", "image/heif"
      ];
      
      // Only warn for non-optimal file types, but don't prevent upload
      if (!validImageTypes.includes(file.type)) {
        if (hasImageExtension) {
          toast.warning("This file has an image extension but its format may not be fully supported. The upload will be attempted but might not display correctly.");
        } else {
          toast.warning("This file type is not recognized as an image. The upload will be attempted but might not display correctly.");
        }
      } else {
        // For valid file types, show success message
        toast.success("Image selected successfully");
      }
      
      // Create preview regardless of validation warnings
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          // Additional validation to check if image can be loaded
          const img = new Image();
          img.onload = () => {
            // Image loaded successfully, set preview
            setImagePreview(reader.result);
            toast.info(`Image "${file.name}" ready to upload`);
          };
          img.onerror = () => {
            // Image cannot be loaded despite correct MIME type
            toast.error("The file appears to be corrupted or is not a valid image. Please try another image.");
            setSelectedImage(null);
            setImagePreview(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          };
          img.src = reader.result;
        } catch (error) {
          console.error("Error processing image:", error);
          toast.error("Error processing image. Please try another one.");
          setSelectedImage(null);
          setImagePreview(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };
      
      reader.onerror = () => {
        toast.error("Error reading file. Please try another image.");
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      };
      
      reader.readAsDataURL(file);
      
      // Clear previously selected file
      setSelectedFile(null);
      setFilePreview(null);
      if (documentInputRef.current) documentInputRef.current.value = "";
    }
  };
  
  // Remove selected file or image
  const handleRemoveFile = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (documentInputRef.current) documentInputRef.current.value = '';
  };
  
  // Set focus on input when chat changes
  useEffect(() => {
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [selectedChat]);
  
  // Clear typing notification timeout when component unmounts
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);
  
  return (
    <Box
      sx={{
        p: 1,
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        flexShrink: 0 // Prevent the input from shrinking
      }}
      className="message-input-container"
    >
      {replyTo && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'action.hover',
            borderRadius: 1,
            p: 1,
            mb: 1,
            gap: 1
          }}
          className="reply-to-container"
        >
          <ReplyIcon fontSize="small" color="primary" />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" color="primary" fontWeight="medium">
              {typeof replyTo.sender === 'string' ? replyTo.sender : replyTo.sender?.username}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {replyTo.content || (replyTo.image_url ? 'Image' : 'File')}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setReplyTo(null)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
      
      {(imagePreview || filePreview) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'action.hover',
            borderRadius: 1,
            p: 1,
            mb: 1,
            gap: 1
          }}
          className="file-preview-container"
        >
          {imagePreview ? (
            <img 
              src={imagePreview} 
              alt="Selected" 
              style={{ 
                height: 40, 
                borderRadius: 4,
                objectFit: 'cover'
              }} 
              className="image-preview"
            />
          ) : (
            <InsertDriveFileIcon fontSize="small" color="primary" />
          )}
          
          <Typography variant="body2" color="text.primary" sx={{ flexGrow: 1 }}>
            {imagePreview ? 'Image selected' : filePreview.name}
          </Typography>
          
          <IconButton size="small" onClick={handleRemoveFile}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
      
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <input
          type="file"
          accept="image/jpeg, image/png, image/gif, image/webp, image/bmp, image/svg+xml, image/tiff, image/avif, image/heic, image/heif"
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={handleImageSelect}
        />
        <input
          type="file"
          style={{ display: 'none' }}
          ref={documentInputRef}
          onChange={handleFileSelect}
        />
        
        <IconButton 
          size="small" 
          onClick={() => fileInputRef.current?.click()}
          color="primary"
          title="Upload image"
          sx={{ mx: 0.5 }}
        >
          <ImageIcon />
        </IconButton>
        
        <IconButton 
          size="small" 
          onClick={() => documentInputRef.current?.click()}
          color="primary"
          title="Upload file"
          sx={{ mr: 1 }}
        >
          <AttachFileIcon />
        </IconButton>
        
        <TextField
          fullWidth
          placeholder="Type a message..."
          value={message}
          onChange={handleMessageChange}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          variant="outlined"
          size="small"
          multiline
          maxRows={4}
          sx={{ flexGrow: 1 }}
          InputProps={{
            sx: { fontFamily: 'inherit' },
            className: 'message-input'
          }}
          inputRef={messageInputRef}
        />
        
        <IconButton
          color="primary"
          onClick={handleSendMessage}
          disabled={(!message.trim() && !selectedImage && !selectedFile) || sending}
          sx={{ ml: 1 }}
        >
          {sending ? <CircularProgress size={24} /> : <SendIcon />}
        </IconButton>
      </Box>
    </Box>
  );
};

export default MessageInput; 