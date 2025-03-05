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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoggedIn) {
      toast.info('Please log in to view your feed');
      navigate('/login', { state: { from: '/feed' } });
    }
  }, [isLoggedIn, navigate]);

  // Fetch posts when component mounts
  useEffect(() => {
    if (isLoggedIn) {
      fetchPosts();
    }
  }, [isLoggedIn]);

  // Function to fetch posts with pagination
  const fetchPosts = async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      // Add pagination parameters to the request
      const response = await API.get(`/posts/?page=${page}&limit=${postsPerPage}`);
      
      // Check if we have more posts to load
      const fetchedPosts = response.data;
      
      if (fetchedPosts.length < postsPerPage) {
        setHasMore(false);
      }

      if (loadMore) {
        // Append new posts to existing ones
        setPosts(prevPosts => [...prevPosts, ...fetchedPosts]);
        setPage(prevPage => prevPage + 1);
      } else {
        // Replace existing posts
        setPosts(fetchedPosts);
        setPage(2); // Next page will be 2
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      
      // Handle authentication errors
      if (error.response && error.response.status === 401) {
        toast.error('Your session has expired. Please log in again.');
        navigate('/login', { state: { from: '/feed' } });
      } else {
        setError('Failed to load posts. Please try again later.');
        toast.error('Failed to load posts');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Handle post updates (likes, comments)
  const handlePostUpdate = (updatedPost) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === updatedPost.id ? updatedPost : post
      )
    );
  };

  // Handle post deletion
  const handlePostDelete = (postId) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    toast.success('Post deleted successfully');
  };

  // Load more posts
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
            Try Again
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container className="feed-container">
      <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 2 }} className="feed-header">
        <Typography variant="h4" component="h1" gutterBottom>
          Your Feed
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          See the latest posts from people you follow
        </Typography>
      </Paper>

      {posts.length === 0 ? (
        <Box className="empty-feed">
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No posts to show
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Follow more users to see their posts in your feed
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
                Load More
              </Button>
            ) : (
              <Typography variant="body2" color="text.secondary" className="end-message">
                You've reached the end of your feed
              </Typography>
            )}
          </Box>
        </>
      )}
    </Container>
  );
};

export default Feed; 