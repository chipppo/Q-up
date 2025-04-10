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
  
  // Handle file selection - convert to image field for compatibility
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
      const dangerousExtensions = [".exe", ".bat", ".cmd", ".msi", ".sh", ".vbs", ".ps1", ".js", ".php", ".dll"];
      const fileName = file.name.toLowerCase();
      const hasDangerousExtension = dangerousExtensions.some(ext => fileName.endsWith(ext));
      
      if (hasDangerousExtension) {
        toast.error("This file type is not allowed for security reasons");
        if (documentInputRef.current) documentInputRef.current.value = "";
        return;
      }
      
      try {
        // IMPORTANT: Since backend only accepts 'image' field, use the same field for all file types
        // The backend will reject non-image files, so we warn users about this limitation
        toast.info("Note: The backend currently only supports image uploads. Non-image files may not upload correctly.");
        
        // Set file for upload - treat it as an image since that's what the backend expects
        setSelectedImage(file);
        
        // Create preview display
        setFilePreview(file);
        
        // Keep image field clear since we're using it for the file
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
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    
    if ((!message.trim() && !selectedImage && !selectedFile) || sending || !selectedChat) {
      return;
    }
    
    try {
      setSending(true);
      
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add message content if any
      if (message.trim()) {
        formData.append("content", message.trim());
      }
      
      // Add image if any (use correct field name for backend)
      if (selectedImage) {
        console.debug("Attaching image:", selectedImage.name, selectedImage.type, selectedImage.size);
        // Backend only accepts 'image' field
        formData.append("image", selectedImage, selectedImage.name);
      }
      
      // Add file if any (use correct field name for backend)
      if (selectedFile) {
        console.debug("Attaching file:", selectedFile.name, selectedFile.type, selectedFile.size);
        // Backend only accepts 'image' field - renamed from 'file'
        formData.append("image", selectedFile, selectedFile.name);
      }
      
      // Add reply_to if replying to a message
      if (replyTo) {
        formData.append("parent", replyTo.id);
      }
      
      // Log form data for debugging (can't directly log FormData content)
      console.debug("FormData keys:", [...formData.entries()].map(entry => `${entry[0]}: ${typeof entry[1] === 'object' ? entry[1].name : entry[1]}`));
      
      toast.info("Sending message...");
      
      // Request config with proper headers
      const requestConfig = {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      };
      
      const response = await API.post(`/chats/${selectedChat.id}/messages/`, formData, requestConfig);
      
      // Add the new message to the message array
      addMessage(response.data);
      
      // Show success message
      if (selectedImage) {
        toast.success("Image sent successfully");
      } else if (selectedFile) {
        toast.success("File sent successfully");
      } else {
        toast.success("Message sent");
      }
      
      // Reset form state
      setMessage("");
      setSelectedImage(null);
      setImagePreview(null);
      setSelectedFile(null);
      setFilePreview(null);
      setReplyTo(null);
      
      // Always scroll to bottom when sending a new message
      setTimeout(() => scrollToBottom({ smooth: true }), 100);
      
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Image type validation issue
      if (error.response && error.response.status === 400 && 
          (error.response.data?.detail?.includes("file type") || 
           error.response.data?.detail?.includes("тип файл"))) {
        toast.error("Only image files are currently supported by the server.");
      } 
      // General error handling
      else if (error.response) {
        const errorMessage = error.response.data?.detail || error.response.statusText;
        toast.error(`Failed to send: ${errorMessage}`);
      } else {
        toast.error("Failed to send message. Please try again.");
      }
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