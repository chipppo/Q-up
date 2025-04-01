import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  List,
  ListItem,
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
  Tooltip,
  Popover,
  ClickAwayListener,
  Drawer,
  Card,
  CardContent,
  CardActions,
  Chip,
  Zoom,
  ListItemButton,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Link,
} from '@mui/material';
import {
  Send as SendIcon,
  Image as ImageIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Reply as ReplyIcon,
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  DoneAll as DoneAllIcon,
  AttachFile as AttachFileIcon,
  Info as InfoIcon,
  Email as EmailIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  Link as LinkIcon,
  ArrowForward as ArrowForwardIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Download as DownloadIcon,
  Block as BlockIcon,
  Report as ReportIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  InsertDriveFile as InsertDriveFileIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import { toast } from 'react-toastify';
import './Chat.css';
import { keyframes } from '@emotion/react';

// Дефиниране на времеви периоди със съответните им часове - добавете това близо до началото на файла
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

// Помощна функция за безопасно форматиране на URL адреси на изображения
const formatImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API.defaults.baseURL}${url}`;
};

// Добавете тази помощна функция, която е цитирана, но липсва
const stringToColor = (string) => {
  let hash = 0;
  let i;
  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
};

// Дефиниране на помощна функция за форматиране на времеви маркери на съобщенията по разбираем за потребителя начин
const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  
  const messageDate = new Date(timestamp);
  const now = new Date();
  const diffMs = now - messageDate;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  // Форматиране на дата като ГГГГ-ММ-ДД
  const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
  const formattedDate = messageDate.toLocaleDateString('en-GB', dateOptions).replace(/\//g, '-');
  
  // Форматиране на време в 24-часов режим (ЧЧ:ММ)
  const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
  const formattedTime = messageDate.toLocaleTimeString('en-GB', timeOptions);
  
  // За днес: показва само времето
  if (diffDay < 1) return formattedTime;
  
  // За по-стари съобщения: показва дата и време
  return `${formattedDate} ${formattedTime}`;
};

// Дефиниране на компонента Message за визуализиране на отделни съобщения
const Message = memo(({ message, highlightedId, onMenuOpen }) => {
  const { username } = useAuth();
  const isOwnMessage = typeof message.sender === 'string' 
    ? message.sender === username 
    : message.sender?.username === username;
  
  // Добавяне на React импорти
  const { useEffect, useState } = React;
  
  // Локално състояние за менюто на това съобщение
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  
  // Вземане на API
  const APIInstance = API;
  
  const senderName = typeof message.sender === 'string' 
    ? message.sender 
    : message.sender?.display_name || message.sender?.username || 'Unknown';
  
  const messageTime = message.timestamp || message.created_at || new Date();
  
  // Функция за определяне дали прикаченият файл е изображение или файл
  const isImageAttachment = (url) => {
    if (!url) return false;
    
    // Проверка за често срещани разширения на изображения в URL
    const imageExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
      '.tiff', '.tif', '.avif', '.heic', '.heif', '.jfif', '.pjpeg', '.pjp'
    ];
    const hasImageExtension = imageExtensions.some(ext => {
      const urlLower = url.toLowerCase();
      return urlLower.endsWith(ext) || urlLower.includes(`${ext}?`);
    });
    
    if (hasImageExtension) return true;
    
    // Проверка също за типове съдържание на изображения в URL (от отговорите на бекенд API)
    const imageContentTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
      'image/tiff', 'image/avif', 'image/heic', 'image/heif'
    ];
    const containsImageContentType = imageContentTypes.some(type => url.toLowerCase().includes(type));
    
    return containsImageContentType;
  };
  
  // Функция за извличане на име на файл от URL
  const getFileName = (url) => {
    if (!url) return 'File';
    const parts = url.split('/');
    return parts[parts.length - 1];
  };
  
  // Обработка на изтегляне на файл
  const handleFileDownload = (url, fileName) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const isHighlighted = highlightedId === message.id;

  // Локална обработка на отваряне/затваряне на меню
  const handleMenuClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleMenuAction = (action) => {
    if (onMenuOpen) {
      onMenuOpen(anchorEl, message, action);
    }
    handleMenuClose();
  };

  return (
    <Box
      className={`message-wrapper ${isOwnMessage ? 'sent' : 'received'}`}
    >
      {!isOwnMessage && (
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1, mb: 0.5 }}>
          {senderName}
        </Typography>
      )}
      
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'row', 
          alignItems: 'flex-start', 
          maxWidth: '100%',
          justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
          width: '100%'
        }}
      >
        {!isOwnMessage && (
          <IconButton 
            size="small" 
            onClick={handleMenuClick}
            sx={{ 
              opacity: 0.5, 
              mr: 0.5, 
              minWidth: '24px',
              flexShrink: 0,
              '&:hover': { opacity: 1 } 
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        )}
        
        <div 
          className={`message-bubble ${isOwnMessage ? 'sent' : 'received'} ${isHighlighted ? 'highlighted-message' : ''}`}
          id={`message-${message.id}`}
          style={{ 
            backgroundColor: isHighlighted ? 'rgba(255, 214, 0, 0.2)' : undefined,
            maxWidth: isOwnMessage ? 'calc(100% - 40px)' : 'calc(100% - 40px)'
          }}
        >
        {message.parent && (
          <Box 
            className="reply-preview"
            sx={{
              borderLeft: '3px solid',
              borderColor: 'primary.main',
              pl: 1,
              py: 0.5,
              opacity: 0.8,
              mb: 1,
              fontSize: '0.85rem',
              backgroundColor: 'rgba(0, 255, 170, 0.05)',
              borderRadius: '4px',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            <Typography variant="caption" fontWeight="medium" sx={{ display: 'block', mb: 0.5 }}>
              {message.parent_sender || (message.parent?.sender?.username ? message.parent.sender.username : 'User')}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {message.parent_message?.content || message.parent?.content || (message.parent?.has_image ? 'Image' : 'File')}
            </Typography>
          </Box>
        )}
        
        {message.content && (
          <div className="message-content" style={{ overflowWrap: 'anywhere', wordBreak: 'break-all', maxWidth: '100%' }}>
            {message.content}
          </div>
        )}
        
        {(message.image || message.has_image) && (
          <Box mt={message.content ? 1 : 0} sx={{ width: '100%', boxSizing: 'border-box' }}>
            {isImageAttachment(formatImageUrl(message.image)) ? (
              <img 
                src={formatImageUrl(message.image)}
                alt="Message attachment" 
                className="message-image"
                style={{ maxWidth: '100%', borderRadius: '8px' }}
              />
            ) : (
              <Box 
                className="file-attachment"
                onClick={() => handleFileDownload(formatImageUrl(message.image), getFileName(message.image))}
              >
                <AttachFileIcon />
                <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', ml: 1 }}>
                  <Typography className="file-name" variant="body2" noWrap sx={{ fontWeight: 'medium' }}>
                    {getFileName(message.image)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Click to download
                  </Typography>
                </Box>
                <DownloadIcon sx={{ ml: 'auto' }} />
              </Box>
            )}
          </Box>
        )}
        </div>
        
        {isOwnMessage && (
          <IconButton 
            size="small" 
            onClick={handleMenuClick}
            sx={{ 
              opacity: 0.5, 
              ml: 0.5, 
              minWidth: '24px',
              flexShrink: 0,
              '&:hover': { opacity: 1 } 
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        )}
        
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          MenuListProps={{
            'aria-labelledby': 'message-options',
          }}
        >
          <MenuItem onClick={() => handleMenuAction('reply')}>
            <ListItemIcon>
              <ReplyIcon fontSize="small" />
            </ListItemIcon>
            Reply
          </MenuItem>
          {isOwnMessage && (
            <MenuItem onClick={() => handleMenuAction('edit')}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              Edit
            </MenuItem>
          )}
          {isOwnMessage && (
            <MenuItem onClick={() => handleMenuAction('delete')}>
              <ListItemIcon>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <Typography color="error">Delete</Typography>
            </MenuItem>
          )}
        </Menu>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: isOwnMessage ? 'auto' : 1, mr: isOwnMessage ? 1 : 'auto' }} className="message-timestamp">
        {formatMessageTime(messageTime)}
        {isOwnMessage && message.is_read !== undefined && (
          <span className="message-status">
            {message.is_read ? 
              <span style={{ marginLeft: '5px', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center' }}>
                <DoneAllIcon fontSize="inherit" style={{ marginRight: '2px' }} /> Seen
              </span> 
              : 
              <span style={{ marginLeft: '5px', color: 'var(--color-text-tertiary)', display: 'inline-flex', alignItems: 'center' }}>
                <CheckIcon fontSize="inherit" style={{ marginRight: '2px' }} /> Sent
              </span>
            }
          </span>
        )}
      </Typography>
    </Box>
  );
});

// Добавете компонент EditMessageForm преди основния компонент Chat
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
      />
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
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

const Chat = () => {
  const { isLoggedIn, username } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showChatList, setShowChatList] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [messageMenuAnchorEl, setMessageMenuAnchorEl] = useState(null);
  const [selectedMessageForMenu, setSelectedMessageForMenu] = useState(null);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [olderMessagesLoading, setOlderMessagesLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const messageInputRef = useRef(null);
  const editInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const messageRefs = useRef({});
  const messagesStartRef = useRef(null);
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [unreadChats, setUnreadChats] = useState({});
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  
  // Добавяне на референция за интервал на анкетиране
  const pollingIntervalRef = useRef(null);

  // Опростени обработчици на файлове
  const handleRemoveFile = () => {
      setSelectedImage(null);
      setImagePreview(null);
      setSelectedFile(null);
      setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (documentInputRef.current) documentInputRef.current.value = '';
  };

  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Валидиране на размера на файла
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      
      // Задаване на избраното изображение и създаване на визуализация - правим това преди валидацията,
      // така че да можем да покажем нещо на потребителя, дори ако типът на файла не е идеален
      setSelectedImage(file);
      
      // Проверка дали файлът има правилно разширение, но грешен тип съдържание
      const fileName = file.name.toLowerCase();
      const imageExtensions = [
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg", 
        ".tiff", ".tif", ".avif", ".heic", ".heif", ".jfif", ".pjpeg", ".pjp"
      ];
      const hasImageExtension = imageExtensions.some(ext => fileName.endsWith(ext));
      
      // Валидиране на типа на файла с подходящи известия
      const validImageTypes = [
        "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/svg+xml",
        "image/tiff", "image/avif", "image/heic", "image/heif"
      ];
      
      // Само предупреждаваме за неоптимални типове файлове, но не предотвратяваме качването
      if (!validImageTypes.includes(file.type)) {
        if (hasImageExtension) {
          toast.warning("This file has an image extension but its format may not be fully supported. The upload will be attempted but might not display correctly.");
        } else {
          toast.warning("This file type is not recognized as an image. The upload will be attempted but might not display correctly.");
        }
      } else {
        // За валидни типове файлове показваме съобщение за успех
        toast.success("Image selected successfully");
      }
      
      // Създаваме визуализация независимо от предупрежденията за валидация
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          // Допълнителна валидация за проверка дали изображението може да бъде заредено
          const img = new Image();
          img.onload = () => {
            // Изображението е заредено успешно, задаваме визуализацията
            setImagePreview(reader.result);
            toast.info(`Image "${file.name}" ready to upload`);
          };
          img.onerror = () => {
            // Изображението не може да бъде заредено въпреки правилния MIME тип
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
      
      // Изчистване на преди това избран файл
      setSelectedFile(null);
      setFilePreview(null);
      if (documentInputRef.current) documentInputRef.current.value = "";
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Валидиране на размера на файла
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size should be less than 10MB");
        if (documentInputRef.current) documentInputRef.current.value = "";
        return;
      }
      
      // Блокиране на потенциално опасни типове файлове
      const dangerousExtensions = [".exe", ".bat", ".cmd", ".msi", ".sh", ".vbs", ".ps1", ".js", ".php", ".dll"];
      const fileName = file.name.toLowerCase();
      const hasDangerousExtension = dangerousExtensions.some(ext => fileName.endsWith(ext));
      
      if (hasDangerousExtension) {
        toast.error("This file type is not allowed for security reasons");
        if (documentInputRef.current) documentInputRef.current.value = "";
        return;
      }
      
      try {
        // Задаване на файла за качване
        setSelectedFile(file);
        setFilePreview(file);
        
        // Изчистване на предишно избрано изображение
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        
        toast.success(`File "${file.name}" ready to upload`);
        
        // Допълнителна валидация за предупреждение за размера на файла
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

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  // Компонент за въвеждане на съобщения
  const MessageInput = () => {
    const messageInputRef = useRef(null);
    const [message, setMessage] = useState('');
    const [localImagePreview, setLocalImagePreview] = useState(null);
    const [localFilePreview, setLocalFilePreview] = useState(null);
    const [localSending, setLocalSending] = useState(false);
    const typingTimeoutRef = useRef(null);
    
    // Нова функция за обработка на набиране с отлагане
    const handleMessageChange = (e) => {
      const newValue = e.target.value;
      setMessage(newValue);
      
      // Изчистване на съществуващо забавяне
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Няма нужда да изпращаме статус на писане, ако няма избран чат
      if (!selectedChat) return;
    };
    
    const handleSendMessage = async (e) => {
      if (e) e.preventDefault();
      
      if ((!message.trim() && !selectedImage && !selectedFile) || sending || !selectedChat) {
        return;
      }
      
      try {
        setSending(true);
        
        // Създаване на данни на формата за качване на файл
        const formData = new FormData();
        
        // Добавяне на съдържание на съобщението, ако има такова
        if (message.trim()) {
          formData.append("content", message.trim());
        }
        
        // Добавяне на изображение, ако има такова
        if (selectedImage) {
          formData.append("image", selectedImage);
        }
        
        // Добавяне на файл, ако има такъв
        if (selectedFile) {
          formData.append("file", selectedFile);
        }
        
        // Добавяне на reply_to, ако отговаряме на съобщение
        if (replyTo) {
          formData.append("parent", replyTo.id);
        }
        
        toast.info("Sending message...");
        
        const response = await API.post(`/chats/${selectedChat.id}/messages/`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        
        // Добавяне на новото съобщение към масива със съобщения
        setMessages(prevMessages => [...prevMessages, response.data]);
        
        // Показване на съобщение за успех
        if (selectedImage) {
          toast.success("Image sent successfully");
        } else if (selectedFile) {
          toast.success("File sent successfully");
        } else {
          toast.success("Message sent");
        }
        
        // Нулиране на състоянието на формата
        setMessage("");
        setSelectedImage(null);
        setImagePreview(null);
        setLocalImagePreview(null);
        setSelectedFile(null);
        setFilePreview(null);
        setLocalFilePreview(null);
        setReplyTo(null);
        
        // Винаги скролиране надолу при изпращане на ново съобщение
        setTimeout(() => scrollToBottom({ smooth: true }), 100);
        
      } catch (error) {
        console.error("Error sending message:", error);
        toast.error("Failed to send message");
      } finally {
        setSending(false);
      }
    };
    
    const handleLocalImageSelect = (e) => {
      handleImageSelect(e);
      // Допълнителна локална визуализация - това се изпълнява отделно от handleImageSelect,
      // за да сме сигурни, че имаме визуализация, дори ако има предупреждения за валидация
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            // Създаване на обект на изображението за валидиране дали изображението може да бъде заредено
            const img = new Image();
            img.onload = () => {
              // Изображението е заредено успешно
              setLocalImagePreview(reader.result);
            };
            img.onerror = () => {
              // Изображението не може да бъде заредено
              setLocalImagePreview(null);
              toast.error("Failed to preview image. It may be corrupted.");
            };
            img.src = reader.result;
          } catch (error) {
            console.error("Error in image preview:", error);
            setLocalImagePreview(null);
            toast.error("Error generating preview");
          }
        };
        reader.onerror = () => {
          setLocalImagePreview(null);
          toast.error("Error generating preview");
        };
        reader.readAsDataURL(file);
      }
    };

    const handleLocalFileSelect = (e) => {
      handleFileSelect(e);
      // Задаване на локална визуализация на файла
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        try {
          setLocalFilePreview(file.name);
        } catch (error) {
          console.error('Error handling local file:', error);
          setLocalFilePreview(null);
        }
      }
    };

    const handleLocalRemoveFile = () => {
      handleRemoveFile();
      setLocalImagePreview(null);
      setLocalFilePreview(null);
    };
    
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
        
        {(localImagePreview || localFilePreview) && (
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
          >
            {localImagePreview ? (
              <img 
                src={localImagePreview} 
                alt="Selected" 
                style={{ 
                  height: 40, 
                  borderRadius: 4,
                  objectFit: 'cover'
                }} 
              />
            ) : (
              <InsertDriveFileIcon fontSize="small" color="primary" />
            )}
            
            <Typography variant="body2" color="text.primary" sx={{ flexGrow: 1 }}>
              {localImagePreview ? 'Image selected' : localFilePreview}
            </Typography>
            
            <IconButton size="small" onClick={handleLocalRemoveFile}>
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
            onChange={handleLocalImageSelect}
          />
          <input
            type="file"
            style={{ display: 'none' }}
            ref={documentInputRef}
            onChange={handleLocalFileSelect}
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

  // Add the missing MessageMenu component and related functions
  const handleMessageMenuOpen = (event, message, action) => {
    // If we received a specific action directly from the Message component's menu
    if (action) {
      if (action === 'reply') {
        handleReplyMessage(message);
      } else if (action === 'edit') {
        setEditingMessage(message);
        setEditContent(message.content || '');
      } else if (action === 'delete') {
        handleDeleteMessage(message.id);
      }
      return;
    }
    
    // For backward compatibility or other use cases
    // Prevent event propagation to avoid conflicts
    if (event) {
      event.stopPropagation();
    }
    
    // If we already have this message selected, close the menu
    if (selectedMessageForMenu && selectedMessageForMenu.id === message.id && messageMenuAnchorEl) {
      setMessageMenuAnchorEl(null);
      setSelectedMessageForMenu(null);
      return;
    }
    
    // Use the current target for menu positioning
    if (event && event.currentTarget) {
      const currentTarget = event.currentTarget;
      
      // Make sure the element is valid before setting it as anchorEl
      if (currentTarget && document.body.contains(currentTarget)) {
        setMessageMenuAnchorEl(currentTarget);
        setSelectedMessageForMenu(message);
      } else {
        console.error('Invalid anchor element for message menu');
      }
    }
  };

  const handleMessageMenuClose = () => {
    setMessageMenuAnchorEl(null);
    setSelectedMessageForMenu(null);
  };

  // Добавяне на липсващата функция handleReplyMessage
  const handleReplyMessage = (message) => {
    setReplyTo(message);
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };

  // Добавяне на липсващата функция handleDeleteMessage
  const handleDeleteMessage = async (messageId) => {
    try {
      await API.delete(`/messages/${messageId}/`);
      
      // Премахване на съобщението от локалното състояние
      setMessages(prevMessages => 
        prevMessages.filter(message => message.id !== messageId)
      );
      
      toast.success('Message deleted successfully');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  // Обработка на промяна на размера на прозореца
  const handleResize = () => setIsMobile(window.innerWidth <= 768);

  // Добавяне на липсващата функция handleBack
  const handleBack = () => {
    if (location.state?.returnTo) {
      navigate(location.state.returnTo);
    } else {
      navigate(-1);
    }
  };

  // Първоначално зареждане
  useEffect(() => {
    if (isLoggedIn) {
      fetchChats();
    }
  }, [isLoggedIn]);

  // Обработка на първоначалния избор на чат от състоянието
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

  // Скролиране до долу само при първоначално зареждане на съобщенията
  useEffect(() => {
    if (messages.length > 0 && !olderMessagesLoading) {
      // Автоматично скролиране до долу само при първоначално зареждане
      const shouldScrollToBottom = !messagesContainerRef.current || 
        messagesContainerRef.current.scrollTop === 0;
        
      if (shouldScrollToBottom) {
        scrollToBottom();
      }
    }
  }, [selectedChat]); // Задейства се само при промяна на чата, не при всяка актуализация на съобщенията

  // Функция за скролиране до дъното на чата (дефинирана като useCallback)
  const scrollToBottom = useCallback((options = { smooth: true }) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: options.smooth ? 'smooth' : 'auto',
        block: 'end'
      });
    }
  }, []); // Празен масив от зависимости, тъй като messagesEndRef е обект на референция

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

  const fetchMessages = async (chatId, options = {}) => {
    const { reset = true, before_id = null } = options;
    
    if (!chatId) return Promise.resolve();
    
    try {
      setMessagesLoading(true);
      
      // Изграждане на URL на заявката с параметри за пагинация
      let url = `/chats/${chatId}/messages/`;
      const params = new URLSearchParams();
      params.append('limit', 20); // Зареждане на 20 съобщения наведнъж
      
      if (before_id) {
        params.append('before_id', before_id);
      }
      
      url = `${url}?${params.toString()}`;
      
      const response = await API.get(url);
      const newMessages = response.data;
      
      // Сортиране на съобщенията по времеви маркер created_at (най-старите първи)
      const sortedMessages = [...newMessages].sort((a, b) => {
        return new Date(a.created_at) - new Date(b.created_at);
      });
      
      if (reset) {
        // Първо задаване на съобщенията
        setMessages(sortedMessages);
        setHasMoreMessages(newMessages.length === 20); // Ако сме получили по-малко от поисканите, няма повече
        
        // Използване на по-дълъг таймаут, за да се уверим, че DOM е актуализиран преди скролиране
        // Това е от решаващо значение за правилното позициониране
        setTimeout(() => {
          // Първо опитайте да използвате scrollToBottom
          scrollToBottom({ smooth: false });
          
          // Като резервен вариант, също директно задайте позицията на скролиране
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        }, 50);
        
        // Маркиране на съобщенията като прочетени при зареждане на чат
        if (selectedChat) {
          markChatAsRead(selectedChat.id);
        }
      } else {
        // Запазване на текущата позиция на скролиране и височина преди добавяне на нови съобщения
        const container = messagesContainerRef.current;
        const scrollHeight = container ? container.scrollHeight : 0;
        const scrollPosition = container ? container.scrollTop : 0;
        
        // Сортиране на всички съобщения, за да се осигури правилен хронологичен ред
        setMessages(prevMessages => {
          // Комбиниране на стари и нови съобщения
          const combinedMessages = [...sortedMessages, ...prevMessages];
          
          // Сортиране на всички съобщения по времеви маркер
          return combinedMessages.sort((a, b) => {
            return new Date(a.created_at) - new Date(b.created_at);
          });
        });
        
        setHasMoreMessages(newMessages.length === 20);
        
        setTimeout(() => {
          if (container) {
            // Изчисляване колко ново съдържание е добавено
            const newScrollHeight = container.scrollHeight;
            const heightDifference = newScrollHeight - scrollHeight;
            
            // Коригиране на позицията на скролиране, за да се запазят същите съобщения в изгледа
            container.scrollTop = scrollPosition + heightDifference;
          }
        }, 50);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      toast.error('Failed to load messages');
    } finally {
      setMessagesLoading(false);
      setOlderMessagesLoading(false);
    }
    
    // Връщане на разрешено обещание, за да се позволи верижно извикване в loadMoreMessages
    return Promise.resolve();
  };
  
  // Функция за зареждане на повече (по-стари) съобщения
  const loadMoreMessages = () => {
    if (!selectedChat || olderMessagesLoading || !hasMoreMessages) return;
    
    setOlderMessagesLoading(true);
    
    // Вземане на ID на най-старото съобщение, което имаме в момента
    const oldestMessage = messages.length > 0 ? messages[0] : null;
    const before_id = oldestMessage ? oldestMessage.id : null;
    
    if (before_id) {
      // Извличане на по-стари съобщения
      fetchMessages(selectedChat.id, { reset: false, before_id });
    } else {
      setOlderMessagesLoading(false);
    }
  };
  
  // Add a function to check if user is at bottom of chat
  const isUserAtBottom = () => {
    if (!messagesContainerRef.current) return true;
    
    const container = messagesContainerRef.current;
    const scrollOffset = 30; // Allow some small offset from bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight <= scrollOffset;
  };
  
  // Function to check for new messages - optimized with useCallback
  const checkForNewMessages = useCallback(async () => {
    if (!selectedChat) return;
    
    try {
      // Improved check for user typing - don't run the check if user is typing
      const activeElement = document.activeElement;
      const isTypingMessage = activeElement && 
        (activeElement.classList.contains('message-input') || 
         activeElement.tagName === 'TEXTAREA');
        
      if (isTypingMessage) {
        return;
      }
      
      // Check if user is at the bottom before we fetch new messages
      const wasAtBottom = isUserAtBottom();
      
      // First, check for new messages
      let url = `/chats/${selectedChat.id}/messages/?limit=30`;
      
      // If we have messages, only get newer ones based on the latest message timestamp
      if (messages.length > 0) {
        const latestMessage = messages[messages.length - 1];
        // Add timestamp filter instead of fetching all messages
        url += `&after_timestamp=${encodeURIComponent(latestMessage.created_at)}`;
      }
      
      const response = await API.get(url);
      const newMessages = response.data;
      
      // Skip state updates if no messages
      if (newMessages.length === 0) {
        return;
      }
      
      // Create a map of existing message IDs for faster lookup
      const existingMessageIds = new Set(messages.map(msg => msg.id));
      
      // Only add messages we don't already have (more efficient filtering)
      const uniqueNewMessages = newMessages.filter(newMsg => !existingMessageIds.has(newMsg.id));
      
      // Also update read status of existing messages
      const updatedMessages = [...messages];
      let hasUpdates = false;
      
      for (const newMsg of newMessages) {
        if (existingMessageIds.has(newMsg.id)) {
          const index = updatedMessages.findIndex(msg => msg.id === newMsg.id);
          if (index !== -1) {
            // Check if read status changed
            if (updatedMessages[index].is_read !== newMsg.is_read) {
              updatedMessages[index] = { ...updatedMessages[index], is_read: newMsg.is_read };
              hasUpdates = true;
            }
          }
        }
      }
      
      // Update existing messages if read status changed
      if (hasUpdates) {
        setMessages(updatedMessages);
      }
      
      // Add new messages if any
      if (uniqueNewMessages.length > 0) {
        console.log(`Adding ${uniqueNewMessages.length} new messages`);
        
        // Add the new messages
        setMessages(prevMessages => {
          // Do one more duplicate check before updating state
          const currentIds = new Set(prevMessages.map(msg => msg.id));
          const filteredNewMessages = uniqueNewMessages.filter(msg => !currentIds.has(msg.id));
          
          // Sort by creation time to ensure chronological order
          const combinedMessages = [...prevMessages, ...filteredNewMessages];
          return combinedMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        });
        
        // Only scroll to bottom for new messages if user was already at bottom
        if (wasAtBottom) {
          setTimeout(() => scrollToBottom({ smooth: true }), 100);
        }
      }
    } catch (error) {
      console.error('Error checking for new messages:', error);
    }
  }, [selectedChat, messages, scrollToBottom, isUserAtBottom]);

  // Function to check for new messages in all chats (for notification)
  const checkAllChatsForNewMessages = async () => {
    try {
      // Получаване на актуализиран списък на чатове с непрочетени
      const response = await API.get('/chats/');
      const updatedChats = response.data;
      
      // Актуализиране на списъка с чатове без промяна на избрания чат
      setChats(updatedChats);
      
      // Създаване на карта на ID на чатове с непрочетени съобщения
      const unreadMap = {};
      updatedChats.forEach(chat => {
        if (chat.unread_count > 0) {
          unreadMap[chat.id] = chat.unread_count;
        }
      });
      
      setUnreadChats(unreadMap);
    } catch (error) {
      console.error('Error checking all chats:', error);
    }
  };

  // Добавяне на функция за маркиране на съобщения като прочетени
  const markChatAsRead = async (chatId) => {
    try {
      await API.post(`/chats/${chatId}/read/`);
      
      // Актуализиране на броя непрочетени чатове
      setUnreadChats(prev => {
        const updated = {...prev};
        delete updated[chatId];
        return updated;
      });
      
      // Актуализиране на списъка с чатове, за да отразява статуса на прочитане
      setChats(prev => prev.map(chat => 
        chat.id === chatId 
          ? {...chat, unread_count: 0}
          : chat
      ));
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  };

  const handleChatSelect = (chat) => {
    // Нулиране на състоянието за новия чат
    setMessages([]);
    setHasMoreMessages(true);
    setSelectedChat(chat);
    setOlderMessagesLoading(false);
    
    if (chat) {
      // Задаване на състояние на зареждане при извличане на съобщения
      setMessagesLoading(true);
      
      // Извличане на съобщения за избрания чат
      fetchMessages(chat.id);
      
      // Маркиране на чата като прочетен
      markChatAsRead(chat.id);
    }
    
    if (isMobile) {
      setShowChatList(false);
    }
  };

  // Добавяне на специален useEffect за анкетиране за съобщения
  useEffect(() => {
    // Настройка на анкетиране само когато е избран чат
    if (selectedChat) {
      // Изчистване на всеки съществуващ интервал на анкетиране
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      
      // Проверка за нови съобщения веднага, когато е избран чат
      checkForNewMessages();
      
      // Настройка на анкетиране за нови съобщения на всеки 5 секунди
      pollingIntervalRef.current = setInterval(() => {
        // Пропускане на анкетирането, ако потребителят активно пише в полето за съобщения
        const activeElement = document.activeElement;
        const isTypingMessage = activeElement && 
          (activeElement.classList.contains('message-input') || 
           activeElement.tagName === 'TEXTAREA');
        
        if (!isTypingMessage) {
          checkForNewMessages();
        }
      }, 5000); // По-рядко анкетиране за намаляване на смущенията при въвеждане
    }
    
    // Почистване при промяна на чата или демонтиране на компонента
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [selectedChat, checkForNewMessages]); // Включване на checkForNewMessages в зависимостите

  // Добавяне и на по-рядко анкетиране за всички чатове
  useEffect(() => {
    // Първоначална настройка на анкетирането при монтиране на компонента
    const allChatsPollingInterval = setInterval(() => {
      if (isLoggedIn) {
        // Пропускане на анкетирането, ако потребителят активно пише в полето за съобщения
        const activeElement = document.activeElement;
        const isTypingMessage = activeElement && 
          (activeElement.classList.contains('message-input') || 
           activeElement.tagName === 'TEXTAREA');
        
        if (!isTypingMessage) {
          checkAllChatsForNewMessages();
        }
      }
    }, 10000); // Проверка на всички чатове на всеки 10 секунди
    
    // Почистване при демонтиране
    return () => {
      clearInterval(allChatsPollingInterval);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isLoggedIn]);

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
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Почистване на всички отворени менюта или селектори при промяна на чата
  useEffect(() => {
    setMessageMenuAnchorEl(null);
    setSelectedMessageForMenu(null);
    setEditingMessage(null);
    setEditContent('');
    setReplyTo(null);
  }, [selectedChat]);

  // Добавяне на ефект за почистване при демонтиране на компонента
  useEffect(() => {
    return () => {
      // Почистване на всички отворени менюта или селектори
      setMessageMenuAnchorEl(null);
      setSelectedMessageForMenu(null);
      setEditingMessage(null);
      setEditContent('');
      setReplyTo(null);
    };
  }, []);

  // Потребителски хук за поведение при скролиране на съобщенията
  useEffect(() => {
    // Скролиране до дъното само когато съобщенията се променят, ако не зареждаме по-стари съобщения
    if (messages.length > 0 && !olderMessagesLoading) {
      // Ако това е предизвикано от зареждане на по-стари съобщения, не скролирайте
      if (olderMessagesLoading) return;
      
      // Автоматично скролиране само ако това е съобщение, изпратено от потребителя, или вече сме на дъното
      const isUserSentMessage = messages.length > 0 && 
                               messages[messages.length - 1].sender === username;
      
      // Скролиране автоматично само ако потребителят е изпратил съобщение или вече е на дъното
      if (isUserSentMessage || isUserAtBottom()) {
        setTimeout(() => {
          scrollToBottom({ smooth: isUserSentMessage });
        }, 50);
      }
    }
  }, [messages, scrollToBottom, username, olderMessagesLoading, isUserAtBottom]);

  // Подобрен фокус на полето за въвеждане на съобщения
  useEffect(() => {
    // Фокусиране на полето за въвеждане на съобщения при промяна на избрания чат
    if (selectedChat && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [selectedChat]);

  useEffect(() => {
    if (editingMessage && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingMessage]);

  const renderChatListHeader = () => (
    <Box>
        {location.state?.returnTo && (
          <IconButton onClick={handleBack} sx={{ mb: 1 }}>
            <ArrowBackIcon />
          </IconButton>
        )}
        <TextField
          fullWidth
        size="small"
        placeholder="Search users..."
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
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'background.paper',
          }
          }}
        />
      </Box>
  );

  const renderChatList = () => (
    <Box 
      sx={{ 
        flexGrow: 1,
        overflow: 'auto',
        width: '350px', // Increase width from 300px to 350px
      }}
    >
        {searchQuery ? (
        // Show search results
        searchResults.length > 0 ? (
          <List>
            {searchResults.map((user) => (
            <ListItem
              key={user.username}
                button
              onClick={() => handleStartChat(user.username)}
                sx={{ py: 1 }}
            >
              <ListItemAvatar>
                  <Avatar src={formatImageUrl(user.avatar_url)}>
                  {user.username[0].toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body1">
                  {user.display_name || user.username}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Start new chat
                </Typography>
              </Box>
            </ListItem>
            ))}
          </List>
        ) : searching ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="text.secondary">No users found</Typography>
          </Box>
        )
      ) : (
        // Show chat list when not searching
        <List>
          {chats.map((chat) => {
            const otherUser = chat.participants.find(p => p.username !== username);
            const lastMessage = chat.last_message;
            const isOwnLastMessage = lastMessage && lastMessage.sender === username;
            
            // Подготовка на преглед на съобщението със статус
            let messagePreview;
            
            if (lastMessage) {
              if (lastMessage.has_image) {
                messagePreview = 'Sent a photo';
              } else if (lastMessage.has_file) {
                messagePreview = 'Sent a file';
              } else if (lastMessage.content) {
                messagePreview = lastMessage.content;
              } else {
                messagePreview = 'New chat';
              }
            } else {
              messagePreview = 'New chat';
            }
            
            // Форматиране на времето на последното съобщение
            const messageTime = lastMessage ? formatMessageTime(lastMessage.created_at) : '';
            
            return (
              <ListItem
                key={chat.id}
                button
                selected={selectedChat?.id === chat.id}
                onClick={() => handleChatSelect(chat)}
                sx={{ 
                  py: 1.5,
                  borderLeft: unreadChats[chat.id] ? '3px solid var(--color-primary)' : 'none',
                  backgroundColor: unreadChats[chat.id] ? 'rgba(0, 255, 170, 0.05)' : 'inherit',
                }}
              >
                <ListItemAvatar>
                  <Badge color="primary" variant="dot" invisible={!unreadChats[chat.id]}>
                    <Avatar 
                      src={formatImageUrl(otherUser?.avatar_url)}
                    >
                      {otherUser?.username?.[0]?.toUpperCase()}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography fontWeight={unreadChats[chat.id] ? 'bold' : 'normal'}>
                      {otherUser?.display_name || otherUser?.username}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {messageTime}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography 
                      variant="body2" 
                      noWrap 
                      fontWeight={unreadChats[chat.id] ? 'medium' : 'normal'}
                      sx={{ 
                        maxWidth: '200px',
                        color: unreadChats[chat.id] ? 'text.primary' : 'text.secondary',
                        fontStyle: isOwnLastMessage ? 'italic' : 'normal'
                      }}
                    >
                      {isOwnLastMessage ? `You: ${messagePreview}` : messagePreview}
                    </Typography>
                    
                    {unreadChats[chat.id] && (
                      <Chip 
                        size="small" 
                        color="primary" 
                        label={unreadChats[chat.id]} 
                        sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                </Box>
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  );

  // Добавяне на този CSS клас, за да се гарантира, че контейнерът за съобщения е правилно позициониран
  const messagesContainerStyle = {
    flexGrow: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    boxSizing: 'border-box',
    height: '0', // Използване на автоматично оразмеряване въз основа на родителския контейнер
    minHeight: '0', // Позволяване на контейнера да се свива при необходимост
    position: 'relative', // Добавяне на относителна позиция
    padding: '8px 16px',
  };

  // Актуализиране на renderChatMessages, за да използва тези стилове
  const renderChatMessages = () => (
    <Box
      sx={messagesContainerStyle}
      className="messages-container"
      ref={messagesContainerRef}
    >
      {/* Бутон за зареждане на повече съобщения */}
      {hasMoreMessages && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, mb: 2, flexShrink: 0 }}>
          <Button 
            variant="outlined" 
            size="small"
            onClick={loadMoreMessages}
            disabled={olderMessagesLoading}
            startIcon={olderMessagesLoading ? <CircularProgress size={16} /> : null}
          >
            {olderMessagesLoading ? 'Loading...' : 'Load Older Messages'}
          </Button>
        </Box>
      )}
      
      {/* Контейнер за съобщения */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        flexGrow: 1,
        justifyContent: messages.length < 10 ? 'flex-end' : 'flex-start'
      }}>
        <div ref={messagesStartRef} />
        
        {messages.map((message, index) => (
          <Message 
            key={`${message.id}-${index}`} 
            message={message} 
            highlightedId={highlightedMessageId} 
            onMenuOpen={handleMessageMenuOpen} 
          />
        ))}
        
        <div ref={messagesEndRef} />
      </Box>
    </Box>
  );

  const handleMessageContextMenu = (event, message) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
    });
    setSelectedMessage(message);
  };
  
  const handleEditMessage = async (messageId, content) => {
    if (!content.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    try {
      // Създаване на FormData
      const formData = new FormData();
      formData.append('content', content.trim());
      
      // Изпращане на заявката, използвайки правилния формат на API крайната точка
      const response = await API.patch(`/messages/${messageId}/`, formData);

      // Актуализиране на съобщението в състоянието
      setMessages(prevMessages => prevMessages.map(msg => 
        msg.id === messageId ? response.data : msg
      ));

      // Нулиране на състоянието за редактиране
      setEditingMessage(null);
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error(error.response?.data?.detail || 'Failed to edit message');
    }
  };

  const handleStartChat = async (username) => {
    try {
      setSearching(true);
      const response = await API.post('/chats/', { username });
      
      // Update chats list
      setChats(prevChats => {
        // Check if chat already exists in the list
        const chatExists = prevChats.some(chat => chat.id === response.data.id);
        if (chatExists) {
          return prevChats.map(chat => 
            chat.id === response.data.id ? response.data : chat
          );
        } else {
          return [response.data, ...prevChats];
        }
      });
      
      // Select the new chat
      setSelectedChat(response.data);
      fetchMessages(response.data.id);
      
      // Clear search
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
    } finally {
      setSearching(false);
    }
  };

  // First add a searchUsers function
  const searchUsers = async (query) => {
    try {
      setSearching(true);
      setSearchResults([]);
      
      // Search all users
      const response = await API.get(`/search/?q=${encodeURIComponent(query)}&type=user`);
      
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  // Add this component to handle the user info panel content
  const UserInfoContent = ({ otherUser, onClose }) => {
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
        // await API.post(`/users/${otherUser.username}/block/`);
        toast.success(`You have blocked ${otherUser.username}`);
        setBlockDialogOpen(false);
        // Optionally navigate away or refresh the chat list
      } catch (error) {
        console.error('Error blocking user:', error);
        toast.error('Failed to block user');
      }
    };

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
            src={formatImageUrl(otherUser?.avatar || otherUser?.avatar_url)} 
            sx={{ width: 60, height: 60, mr: 2 }}
          >
            {otherUser?.username?.[0]?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h6">{otherUser?.display_name || otherUser?.username}</Typography>
            <Typography variant="body2" color="text.secondary">@{otherUser?.username}</Typography>
          </Box>
        </Box>

        {/* Bio section */}
        {otherUser?.bio && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Bio</Typography>
            <Typography variant="body2">{otherUser?.bio}</Typography>
          </Box>
        )}
        
        {/* Active hours */}
        {otherUser?.active_hours && otherUser.active_hours.length > 0 && (
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
                {formatActiveHours(otherUser.active_hours, otherUser.timezone_offset).join(', ')}
          </Typography>
              {formatActiveHours(otherUser.active_hours, otherUser.timezone_offset).some(p => p.includes('*')) && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                  * Partially active during this time
                </Typography>
              )}
        </Box>
          </Box>
        )}
          
          {/* Platforms */}
          {otherUser?.platforms && otherUser.platforms.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Platforms</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
              {otherUser.platforms.map((platform, index) => (
                  <Chip 
                  key={index} 
                    label={platform}
                    size="small"
                  sx={{ m: 0.5, bgcolor: 'rgba(0, 255, 170, 0.1)' }}
                  />
                ))}
              </Box>
            </Box>
          )}
          
        {/* Mic availability */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Mic Available</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {otherUser?.mic_available ? (
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
        {otherUser?.language_preference && otherUser.language_preference.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Languages</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
              {otherUser.language_preference.map((language, index) => (
            <Chip 
                  key={index} 
                  label={language} 
              size="small"
                  sx={{ m: 0.5, bgcolor: 'rgba(0, 255, 170, 0.1)' }}
                  />
                ))}
              </Box>
            </Box>
          )}
        
        {/* View profile button */}
        <Button
          variant="contained"
          fullWidth
          onClick={() => navigate(`/profile/${otherUser?.username}`)}
          sx={{ mb: 2 }}
        >
          View Full Profile
        </Button>
        
        {/* Block user button */}
          <Button 
            variant="outlined" 
            color="error"
            startIcon={<BlockIcon />}
          onClick={handleBlockUser}
            fullWidth
          >
            Block User
          </Button>
      </Box>
    );
  };

  // Add the renderChatHeader function back if it was accidentally removed
  const renderChatHeader = () => {
    if (!selectedChat) return null;
    const otherUser = selectedChat.participants.find(p => p.username !== username);
    
    return (
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'background.paper',
      }}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            cursor: 'pointer',
            flex: 1,
          }}
          onClick={() => navigate(`/profile/${otherUser?.username}`)}
        >
          {isMobile && (
            <IconButton onClick={(e) => {
              e.stopPropagation();
              setSelectedChat(null);
            }} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
          )}
          
          <Avatar
            sx={{ width: 40, height: 40 }}
            src={formatImageUrl(otherUser?.avatar_url)}
          >
            {otherUser?.username?.[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ ml: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              {otherUser?.display_name || otherUser?.username}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {otherUser?.status || 'Online'}
            </Typography>
          </Box>
        </Box>
        
        {/* Remove the search button */}
      </Box>
    );
  };

  // Update the main content section to use the renderChatHeader function correctly
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'row',
        height: { 
          xs: 'calc(100vh - 56px)', // Account for smaller header on mobile (56px)
          sm: 'calc(100vh - 64px)'  // Standard header height (64px) 
        },
        width: '100%',
        bgcolor: 'background.paper',
        overflow: 'hidden', // Prevent outer scrollbar
        position: 'relative', // Ensure proper positioning
        mt: '0px' // No top margin
      }}
      className="chat-page-container"
    >
      {/* Left panel - Chat list */}
      <Box
        sx={{
          width: isMobile ? '100%' : 350, // Increased width to 350px
          height: '100%', // Full height
          borderRight: '1px solid',
          borderColor: 'divider',
          display: isMobile && selectedChat ? 'none' : 'flex',
          flexDirection: 'column',
          overflow: 'hidden' // Prevent overflow
        }}
        className="chat-sidebar"
      >
        {renderChatListHeader()}
        {renderChatList()}
      </Box>
        
      {/* Middle panel - Chat messages */}
      <Box
        sx={{
          flexGrow: 1,
          flexDirection: 'column',
          height: '100%', // Full height
          width: isMobile ? '100%' : `calc(100% - ${showUserInfo ? 650 : 350}px)`, // Adjust based on user info panel
          display: (!isMobile || selectedChat) ? 'flex' : 'none',
          overflow: 'hidden' // Prevent container overflow
        }}
      >
        {selectedChat ? (
          <>
            {renderChatHeader()}

            {renderChatMessages()}
            
            {editingMessage ? (
              <EditMessageForm 
                message={editingMessage} 
                onSave={handleEditMessage} 
                onCancel={() => setEditingMessage(null)} 
              />
            ) : (
              <MessageInput />
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
            }}
          >
            <Typography variant="h6" color="text.secondary">
              Select a chat to start messaging
            </Typography>
          </Box>
        )}
      </Box>

      {/* Right panel - User info */}
      {showUserInfo && selectedChat && (
        <Box 
          sx={{
            width: isMobile ? '100%' : 300,
            height: '100%',
            borderLeft: '1px solid',
            borderColor: 'divider',
            display: (showUserInfo && !isMobile) ? 'block' : 'none'
          }}
        >
          <UserInfoContent 
            otherUser={selectedChat?.participants.find(p => p.username !== username)}
            onClose={() => setShowUserInfo(false)}
          />
        </Box>
      )}

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={() => {
          if (selectedMessage) {
            setReplyTo(selectedMessage);
            messageInputRef.current?.focus();
          }
          handleContextMenuClose();
        }}>
          <ListItemIcon>
            <ReplyIcon fontSize="small" />
          </ListItemIcon>
          Reply
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Chat; 