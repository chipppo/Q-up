import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  TextField,
  IconButton,
  Divider,
  Menu,
  MenuItem,
  Button,
  CircularProgress,
  Badge,
  InputAdornment,
  Alert,
} from '@mui/material';
import {
  Send as SendIcon,
  Image as ImageIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Reply as ReplyIcon,
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import { toast } from 'react-toastify';
import './Chat.css';

const Chat = () => {
  const { isLoggedIn, username } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showChatList, setShowChatList] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [sending, setSending] = useState(false);

  // Handle window resize
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleResize = () => setIsMobile(window.innerWidth <= 768);

  // Initial load
  useEffect(() => {
    if (isLoggedIn) {
      fetchChats();
    }
  }, [isLoggedIn]);

  // Handle initial chat selection from state
  useEffect(() => {
    if (location.state?.selectedChatId && chats.length > 0) {
      const chat = chats.find(c => c.id === location.state.selectedChatId);
      if (chat) {
        setSelectedChat(chat);
        fetchMessages(chat.id);
        if (isMobile) {
          setShowChatList(false);
        }
      }
    }
  }, [location.state, chats]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await API.get('/chats/');
      setChats(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching chats:', err);
      setError('Failed to load chats');
      toast.error('Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const response = await API.get(`/chats/${chatId}/messages/`);
      setMessages(response.data);
      scrollToBottom();
    } catch (err) {
      console.error('Error fetching messages:', err);
      toast.error('Failed to load messages');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!selectedChat) {
      toast.error('No chat selected');
      return;
    }
    
    if (!newMessage.trim() && !selectedImage) {
      toast.error('Please enter a message or select an image');
      return;
    }

    try {
      setSending(true);
      const formData = new FormData();
      
      if (newMessage.trim()) {
        formData.append('content', newMessage.trim());
      }
      
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      console.log('Sending message to chat:', selectedChat.id);
      console.log('Message content:', newMessage.trim());
      console.log('Has image:', !!selectedImage);

      const response = await API.post(`/chats/${selectedChat.id}/messages/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Message sent successfully:', response.data);

      // Clear input and image
      setNewMessage('');
      setSelectedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Update messages list
      await fetchMessages(selectedChat.id);
      
      // Update chat list to show latest message
      await fetchChats();
      
      // Scroll to bottom
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.detail || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleBack = () => {
    if (location.state?.returnTo) {
      navigate(location.state.returnTo);
    } else {
      setSelectedChat(null);
    }
  };

  const searchMutualFollowers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await API.get(`/users/${username}/mutual-followers/?q=${query}`);
      setSearchResults(response.data);
    } catch (err) {
      console.error('Error searching mutual followers:', err);
      toast.error('Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  const handleStartChat = async (otherUsername) => {
    try {
      setLoading(true);
      const response = await API.post('/chats/', { username: otherUsername });
      const newChat = response.data;
      
      // Update chats list
      setChats(prevChats => {
        const chatExists = prevChats.some(chat => chat.id === newChat.id);
        if (!chatExists) {
          return [newChat, ...prevChats];
        }
        return prevChats;
      });

      // Select the new/existing chat
      setSelectedChat(newChat);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error('Error starting chat:', err);
      toast.error('Failed to start chat');
    } finally {
      setLoading(false);
    }
  };

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
    if (chat) {
      fetchMessages(chat.id);
    }
    if (isMobile) {
      setShowChatList(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: '/chat' } });
      return;
    }

    fetchChats();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
    }
  }, [selectedChat]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery) {
        searchMutualFollowers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const renderChatList = () => (
    <Box
      sx={{
        width: isMobile && selectedChat ? '0' : '300px',
        display: isMobile && selectedChat ? 'none' : 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #e0e0e0',
        height: '100%'
      }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
        {location.state?.returnTo && (
          <IconButton onClick={handleBack} sx={{ mb: 1 }}>
            <ArrowBackIcon />
          </IconButton>
        )}
        <TextField
          fullWidth
          placeholder="Search mutual followers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searching && (
              <InputAdornment position="end">
                <CircularProgress size={20} />
              </InputAdornment>
            )
          }}
        />
      </Box>

      <List sx={{ flexGrow: 1, overflow: 'auto' }}>
        {searchQuery ? (
          searchResults.map((user) => (
            <ListItem
              key={user.username}
              component="div"
              onClick={() => handleStartChat(user.username)}
              sx={{ cursor: 'pointer' }}
            >
              <ListItemAvatar>
                <Avatar src={user.avatar_url} alt={user.username}>
                  {user.username[0].toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={user.display_name || user.username}
                secondary="Start new chat"
              />
            </ListItem>
          ))
        ) : (
          chats.map((chat) => {
            const otherParticipant = chat.participants.find(p => p.username !== username);
            return (
              <ListItem
                key={chat.id}
                component="div"
                selected={selectedChat?.id === chat.id}
                onClick={() => handleChatSelect(chat)}
                className={`chat-list-item ${selectedChat?.id === chat.id ? 'selected' : ''}`}
                sx={{ cursor: 'pointer' }}
              >
                <ListItemAvatar>
                  <Avatar src={otherParticipant?.avatar_url} alt={otherParticipant?.username}>
                    {otherParticipant?.username[0].toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={otherParticipant?.display_name || otherParticipant?.username}
                  secondary={chat.last_message?.content || 'No messages yet'}
                />
              </ListItem>
            );
          })
        )}
      </List>
    </Box>
  );

  const renderChatMessages = () => (
    <Box
      sx={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: isMobile ? '100%' : 'calc(100% - 300px)',
        display: (!isMobile || selectedChat) ? 'flex' : 'none'
      }}
    >
      {selectedChat ? (
        <>
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center' }}>
            {isMobile && (
              <IconButton onClick={() => setSelectedChat(null)} sx={{ mr: 1 }}>
                <ArrowBackIcon />
              </IconButton>
            )}
            <Avatar
              src={selectedChat.participants.find(p => p.username !== username)?.avatar_url}
              alt={selectedChat.participants.find(p => p.username !== username)?.username}
            >
              {selectedChat.participants.find(p => p.username !== username)?.username[0].toUpperCase()}
            </Avatar>
            <Typography variant="h6" sx={{ ml: 2 }}>
              {selectedChat.participants.find(p => p.username !== username)?.display_name ||
               selectedChat.participants.find(p => p.username !== username)?.username}
            </Typography>
          </Box>

          <Box className="messages-container">
            {messages.map((message) => (
              <Box
                key={message.id}
                className={`message-bubble ${message.sender.username === username ? 'sent' : 'received'}`}
              >
                {message.content && <Typography>{message.content}</Typography>}
                {message.image && (
                  <a href={message.image} target="_blank" rel="noopener noreferrer">
                    <img src={message.image} alt="Message attachment" className="message-image" />
                  </a>
                )}
                <Typography variant="caption" className="message-timestamp">
                  {formatTime(message.created_at)}
                </Typography>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Box>

          <Box className="message-input-container">
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleImageSelect}
            />
            <IconButton onClick={() => fileInputRef.current?.click()}>
              <ImageIcon />
            </IconButton>
            
            <TextField
              className="message-input"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage(e)}
              multiline
              maxRows={4}
              fullWidth
            />
            
            <IconButton 
              onClick={handleSendMessage}
              disabled={sending || (!newMessage.trim() && !selectedImage)}
            >
              {sending ? <CircularProgress size={24} /> : <SendIcon />}
            </IconButton>
          </Box>

          {selectedImage && (
            <Box className="image-preview">
              <img src={URL.createObjectURL(selectedImage)} alt="Selected" />
              <IconButton className="remove-image-button" onClick={handleRemoveImage}>
                <CloseIcon />
              </IconButton>
            </Box>
          )}
        </>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            bgcolor: '#f5f5f5'
          }}
        >
          <Typography variant="h6" color="textSecondary">
            Select a chat or search for users to start messaging
          </Typography>
        </Box>
      )}
    </Box>
  );

  if (loading && !selectedChat) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography color="error" gutterBottom>{error}</Typography>
          <Button variant="contained" onClick={fetchChats}>Try Again</Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ height: 'calc(100vh - 64px)', py: 2 }}>
      <Paper sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        {renderChatList()}
        {renderChatMessages()}
      </Paper>
    </Container>
  );
};

export default Chat; 