import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  CircularProgress, 
  Button, 
  Alert,
  Divider,
  Paper
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PostCard from '../components/PostCard';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './Feed.css';

const Feed = () => {
  const { isLoggedIn, username } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const postsPerPage = 20;

  // Пренасочване към входа, ако потребителят не е удостоверен
  useEffect(() => {
    if (!isLoggedIn) {
      toast.info('Моля, влезте в профила си, за да видите вашия фийд');
      navigate('/login', { state: { from: '/feed' } });
    }
  }, [isLoggedIn, navigate]);

  // Зареждане на публикации при монтиране на компонента
  useEffect(() => {
    if (isLoggedIn) {
      fetchPosts();
    }
  }, [isLoggedIn]);

  // Функция за извличане на публикации с пагинация
  const fetchPosts = async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      // Добавяне на параметри за пагинация към заявката
      const response = await API.get(`/posts/?page=${page}&limit=${postsPerPage}`);
      
      // Проверка дали има още публикации за зареждане
      const fetchedPosts = response.data;
      
      if (fetchedPosts.length < postsPerPage) {
        setHasMore(false);
      }

      if (loadMore) {
        // Добавяне на нови публикации към съществуващите
        setPosts(prevPosts => [...prevPosts, ...fetchedPosts]);
        setPage(prevPage => prevPage + 1);
      } else {
        // Замяна на съществуващите публикации
        setPosts(fetchedPosts);
        setPage(2); // Следващата страница ще бъде 2
      }
    } catch (error) {
      console.error('Грешка при зареждане на публикации:', error);
      
      // Обработка на грешки при удостоверяване
      if (error.response && error.response.status === 401) {
        toast.error('Вашата сесия е изтекла. Моля, влезте отново.');
        navigate('/login', { state: { from: '/feed' } });
      } else {
        setError('Неуспешно зареждане на публикации. Моля, опитайте отново по-късно.');
        toast.error('Неуспешно зареждане на публикации');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Обработка на актуализации на публикации (харесвания, коментари)
  const handlePostUpdate = (updatedPost) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === updatedPost.id ? updatedPost : post
      )
    );
  };

  // Обработка на изтриване на публикация
  const handlePostDelete = (postId) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    toast.success('Публикацията е изтрита успешно');
  };

  // Зареждане на още публикации
  const handleLoadMore = () => {
    fetchPosts(true);
  };

  if (loading) {
    return (
      <Container className="feed-container" sx={{ textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="feed-container">
        <Alert severity="error">{error}</Alert>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button variant="contained" onClick={() => fetchPosts()}>
            Опитайте отново
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container className="feed-container">
      <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 2 }} className="feed-header">
        <Typography variant="h4" component="h1" gutterBottom>
          Вашият фийд
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Вижте последните публикации от хората, които следвате
        </Typography>
      </Paper>

      {posts.length === 0 ? (
        <Box className="empty-feed">
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Няма публикации за показване
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Следвайте повече потребители, за да видите техните публикации във вашия фийд
          </Typography>
        </Box>
      ) : (
        <>
          {posts.map(post => (
            <PostCard 
              key={post.id} 
              post={post} 
              onPostUpdate={handlePostUpdate}
              onPostDelete={handlePostDelete}
            />
          ))}
          
          <Box className="load-more-container">
            {loadingMore ? (
              <CircularProgress size={30} />
            ) : hasMore ? (
              <Button 
                variant="outlined" 
                onClick={handleLoadMore}
                size="large"
                className="load-more-button"
              >
                Зареди още
              </Button>
            ) : (
              <Typography variant="body2" color="text.secondary" className="end-message">
                Достигнахте края на вашия фийд
              </Typography>
            )}
          </Box>
        </>
      )}
    </Container>
  );
};

export default Feed; 