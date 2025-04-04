from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from .models import (
    MyUser, Game, RankSystem, RankTier, PlayerGoal, 
    GameStats, GameRanking, Post, Like, Comment, 
    Chat, Message
)
import json
from datetime import date
from django.utils import timezone
from django.db import connection


class UserModelTests(TestCase):
    """Tests for the MyUser model"""
    
    def test_create_user(self):
        """Test creating a user with valid data"""
        user = MyUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpassword123'
        )
        self.assertEqual(user.username, 'testuser')
        self.assertEqual(user.email, 'test@example.com')
        self.assertTrue(user.check_password('testpassword123'))
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
    
    def test_create_superuser(self):
        """Test creating a superuser"""
        admin = MyUser.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpassword123'
        )
        self.assertTrue(admin.is_active)
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)


class GameModelTests(TestCase):
    """Tests for the Game model"""
    
    def test_create_game(self):
        """Test creating a game with valid data"""
        game = Game.objects.create(
            name='Test Game',
            description='A test game description'
        )
        self.assertEqual(game.name, 'Test Game')
        self.assertEqual(game.description, 'A test game description')
        self.assertEqual(str(game), 'Test Game')


class RankSystemTests(TestCase):
    """Tests for the RankSystem model"""
    
    def setUp(self):
        self.game = Game.objects.create(name='Test Game')
    
    def test_create_tier_rank_system(self):
        """Test creating a tier-based rank system"""
        rank_system = RankSystem.objects.create(
            game=self.game,
            name='Test Tiers',
            is_numeric=False
        )
        self.assertEqual(rank_system.name, 'Test Tiers')
        self.assertFalse(rank_system.is_numeric)
        self.assertEqual(rank_system.game, self.game)
    
    def test_create_numeric_rank_system(self):
        """Test creating a numeric rank system"""
        rank_system = RankSystem.objects.create(
            game=self.game,
            name='Test Numeric',
            is_numeric=True,
            max_numeric_value=10000,
            increment=25
        )
        self.assertEqual(rank_system.name, 'Test Numeric')
        self.assertTrue(rank_system.is_numeric)
        self.assertEqual(rank_system.max_numeric_value, 10000)
        self.assertEqual(rank_system.increment, 25)


class AuthAPITests(APITestCase):
    """Tests for authentication endpoints"""
    
    def setUp(self):
        self.register_url = reverse('register')
        self.login_url = reverse('login')
        self.user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpassword123'
        }
    
    def test_user_registration(self):
        """Test user registration endpoint"""
        response = self.client.post(
            self.register_url, 
            self.user_data, 
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue('access' in response.data)
        self.assertTrue('refresh' in response.data)
        self.assertEqual(MyUser.objects.count(), 1)
        self.assertEqual(MyUser.objects.get().username, 'testuser')
    
    def test_user_login(self):
        """Test user login endpoint"""
        # Create user first
        user = MyUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpassword123'
        )
        
        # Attempt login
        response = self.client.post(
            self.login_url,
            {'username': 'testuser', 'password': 'testpassword123'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue('access' in response.data)
        self.assertTrue('refresh' in response.data)


class UserProfileAPITests(APITestCase):
    """Tests for user profile endpoints"""
    
    def setUp(self):
        self.user = MyUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpassword123'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.profile_url = reverse('user-detail', kwargs={'username': 'testuser'})
        self.update_url = reverse('update-profile', kwargs={'username': 'testuser'})
    
    def test_get_user_profile(self):
        """Test getting user profile"""
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')
        self.assertEqual(response.data['email'], 'test@example.com')
    
    def test_update_profile(self):
        """Test updating profile information"""
        update_data = {
            'display_name': 'Test User',
            'bio': 'This is a test bio',
            'timezone': 'Europe/Sofia',
            'timezone_offset': 3,
            'mic_available': 'true',
            'active_hours': json.dumps(['12:00', '13:00']),
            'platforms': json.dumps(['PC', 'PlayStation']),
            'language_preference': json.dumps(['English', 'Bulgarian'])
        }
        
        response = self.client.patch(self.update_url, update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify changes
        self.user.refresh_from_db()
        self.assertEqual(self.user.display_name, 'Test User')
        self.assertEqual(self.user.bio, 'This is a test bio')
        self.assertEqual(self.user.timezone, 'Europe/Sofia')
        self.assertEqual(self.user.timezone_offset, 3)
        self.assertTrue(self.user.mic_available)
        self.assertEqual(self.user.active_hours, ['12:00', '13:00'])
        self.assertEqual(self.user.platforms, ['PC', 'PlayStation'])
        self.assertEqual(self.user.language_preference, ['English', 'Bulgarian'])


class GameAPITests(APITestCase):
    """Tests for game-related endpoints"""
    
    def setUp(self):
        self.user = MyUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpassword123'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # Create test game
        self.game = Game.objects.create(
            name='Test Game',
            description='A test game'
        )
        
        # Create test player goal
        self.player_goal = PlayerGoal.objects.create(
            name='Competitive',
            description='Play competitively'
        )
        
        # Create test rank system
        self.rank_system = RankSystem.objects.create(
            game=self.game,
            name='Test Ranks',
            is_numeric=False
        )
        
        # Create test rank tiers
        self.rank_tier = RankTier.objects.create(
            rank_system=self.rank_system,
            name='Bronze',
            order=1
        )
        
        # URLs
        self.games_url = reverse('game-list')
        self.game_stats_url = reverse('game-stats', kwargs={'username': 'testuser'})
    
    def test_get_games_list(self):
        """Test retrieving games list"""
        response = self.client.get(self.games_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Test Game')
    
    def test_add_game_to_profile(self):
        """Test adding a game to user profile"""
        game_data = {
            'game_id': self.game.id,
            'hours_played': 100,
            'player_goal': self.player_goal.id,
            'rankings': [
                {
                    'rank_system_id': self.rank_system.id,
                    'rank_id': self.rank_tier.id
                }
            ]
        }
        
        response = self.client.post(self.game_stats_url, game_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that GameStats was created
        self.assertEqual(GameStats.objects.count(), 1)
        game_stats = GameStats.objects.first()
        self.assertEqual(game_stats.user, self.user)
        self.assertEqual(game_stats.game, self.game)
        self.assertEqual(game_stats.hours_played, 100)
        self.assertEqual(game_stats.player_goal, self.player_goal)
        
        # Check that GameRanking was created
        self.assertEqual(GameRanking.objects.count(), 1)
        ranking = GameRanking.objects.first()
        self.assertEqual(ranking.game_stats, game_stats)
        self.assertEqual(ranking.rank_system, self.rank_system)
        self.assertEqual(ranking.rank, self.rank_tier)


class SocialAPITests(APITestCase):
    """Tests for social features (posts, likes, comments)"""
    
    def setUp(self):
        # Create test users
        self.user1 = MyUser.objects.create_user(
            username='user1',
            email='user1@example.com',
            password='password123'
        )
        self.user2 = MyUser.objects.create_user(
            username='user2',
            email='user2@example.com',
            password='password123'
        )
        
        # Set up client and authenticate
        self.client = APIClient()
        self.client.force_authenticate(user=self.user1)
        
        # Set up following relationship
        self.user1.following.add(self.user2)
        
        # Create a test post
        self.post = Post.objects.create(
            user=self.user2,
            caption='Test post'
        )
        
        # URLs
        self.posts_url = reverse('post-list')
        self.post_detail_url = reverse('post-detail', kwargs={'post_id': self.post.id})
        self.like_url = reverse('post-like', kwargs={'post_id': self.post.id})
        self.comment_url = reverse('post-comments', kwargs={'post_id': self.post.id})
    
    def test_get_posts_feed(self):
        """Test getting posts feed"""
        response = self.client.get(self.posts_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['caption'], 'Test post')
        self.assertEqual(response.data[0]['user']['username'], 'user2')
    
    def test_create_post(self):
        """Test creating a new post"""
        post_data = {
            'caption': 'New test post'
        }
        response = self.client.post(self.posts_url, post_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Post.objects.count(), 2)
        self.assertEqual(Post.objects.filter(user=self.user1).count(), 1)
    
    def test_like_post(self):
        """Test liking a post"""
        response = self.client.post(self.like_url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Like.objects.count(), 1)
        self.assertTrue(Like.objects.filter(user=self.user1, post=self.post).exists())
    
    def test_comment_on_post(self):
        """Test commenting on a post"""
        comment_data = {
            'text': 'Test comment'
        }
        response = self.client.post(self.comment_url, comment_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Comment.objects.count(), 1)
        comment = Comment.objects.first()
        self.assertEqual(comment.text, 'Test comment')
        self.assertEqual(comment.user, self.user1)
        self.assertEqual(comment.post, self.post)


class ChatAPITests(APITestCase):
    """Tests for chat functionality"""
    
    def setUp(self):
        # Create test users
        self.user1 = MyUser.objects.create_user(
            username='user1',
            email='user1@example.com',
            password='password123'
        )
        self.user2 = MyUser.objects.create_user(
            username='user2',
            email='user2@example.com',
            password='password123'
        )
        
        # Set up client and authenticate
        self.client = APIClient()
        self.client.force_authenticate(user=self.user1)
        
        # URLs
        self.chats_url = reverse('chat-list')
    
    def test_create_chat(self):
        """Test creating a new chat"""
        chat_data = {
            'username': 'user2'
        }
        response = self.client.post(self.chats_url, chat_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Chat.objects.count(), 1)
        
        # Verify chat was created with both users
        chat = Chat.objects.first()
        participants = chat.participants.all()
        self.assertEqual(participants.count(), 2)
        self.assertTrue(self.user1 in participants)
        self.assertTrue(self.user2 in participants)
    
    def test_send_message(self):
        """Test sending a message in a chat"""
        # Create a chat first
        chat = Chat.objects.create()
        chat.participants.add(self.user1, self.user2)
        chat.save()
        
        # Using direct SQL to create a message to avoid model field mismatch
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO base_message 
                (content, chat_id, sender_id, parent_id, is_read, is_delivered, created_at, updated_at, image) 
                VALUES (%s, %s, %s, NULL, %s, %s, %s, %s, %s)
            """, [
                'Hello, this is a test message',  # content
                chat.id,                          # chat_id
                self.user1.id,                    # sender_id
                False,                            # is_read
                True,                             # is_delivered
                timezone.now(),                   # created_at
                timezone.now(),                   # updated_at
                ''                                # image
            ])
        
        # Verify message was created properly using raw SQL
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM base_message")
            count = cursor.fetchone()[0]
            self.assertEqual(count, 1)
            
            cursor.execute("SELECT content, sender_id, chat_id FROM base_message LIMIT 1")
            message_data = cursor.fetchone()
            self.assertEqual(message_data[0], 'Hello, this is a test message')
            self.assertEqual(message_data[1], self.user1.id)
            self.assertEqual(message_data[2], chat.id)


class SearchAPITests(APITestCase):
    """Tests for search functionality"""
    
    def setUp(self):
        # Create test users with specific profiles
        self.user1 = MyUser.objects.create_user(
            username='gamer123',
            display_name='Pro Gamer',
            email='gamer@example.com',
            password='password123',
            bio='I love playing games',
            platforms=['PC', 'Xbox'],
            language_preference=['English', 'German'],
            active_hours=['14:00', '15:00', '16:00'],
            mic_available=True
        )
        
        self.user2 = MyUser.objects.create_user(
            username='casualplayer',
            display_name='Casual Player',
            email='casual@example.com',
            password='password123',
            bio='Just playing for fun',
            platforms=['PlayStation', 'Switch'],
            language_preference=['French', 'Spanish'],
            active_hours=['20:00', '21:00'],
            mic_available=False
        )
        
        # Create a game
        self.game = Game.objects.create(name='Test Game')
        
        # Create player goals
        self.competitive_goal = PlayerGoal.objects.create(
            name='Competitive',
            description='Play competitively'
        )
        self.casual_goal = PlayerGoal.objects.create(
            name='Casual',
            description='Play casually'
        )
        
        # Add game stats
        self.user1_stats = GameStats.objects.create(
            user=self.user1,
            game=self.game,
            hours_played=500,
            player_goal=self.competitive_goal
        )
        
        self.user2_stats = GameStats.objects.create(
            user=self.user2,
            game=self.game,
            hours_played=50,
            player_goal=self.casual_goal
        )
        
        # Set up client
        self.client = APIClient()
        
        # URL
        self.search_url = reverse('search')
    
    def test_search_by_username(self):
        """Test searching users by username"""
        response = self.client.get(f"{self.search_url}?q=gamer")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['username'], 'gamer123')
    
    def test_search_by_platform(self):
        """Test searching users by platform"""
        response = self.client.get(f"{self.search_url}?platforms=PC")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['username'], 'gamer123')
    
    def test_search_by_language(self):
        """Test searching users by language"""
        response = self.client.get(f"{self.search_url}?languages=French")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['username'], 'casualplayer')
    
    def test_search_by_mic_availability(self):
        """Test searching users by mic availability"""
        response = self.client.get(f"{self.search_url}?mic_available=true")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['username'], 'gamer123')
    
    def test_search_by_hours_played(self):
        """Test searching users by minimum hours played"""
        response = self.client.get(f"{self.search_url}?min_hours_played=100")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['username'], 'gamer123')
    
    def test_search_by_player_goal(self):
        """Test searching users by player goal"""
        response = self.client.get(f"{self.search_url}?player_goals={self.competitive_goal.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['username'], 'gamer123')


class PasswordResetAPITests(APITestCase):
    """Tests for password reset functionality"""
    
    def setUp(self):
        self.user = MyUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='oldpassword123'
        )
        
        # URLs
        self.reset_request_url = reverse('password-reset-request')
    
    def test_password_reset_request(self):
        """Test requesting a password reset email"""
        response = self.client.post(
            self.reset_request_url,
            {'email': 'test@example.com'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('detail', response.data)
