from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from ..models import Post, Like, Comment, MyUser, Game
from ..serializers import PostSerializer, CommentSerializer, LikeSerializer
import logging
import traceback

logger = logging.getLogger(__name__)

class PostListView(APIView):
    """
    API view for listing and creating posts.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get(self, request):
        """
        Get a list of posts, optionally filtered by user or game.
        """
        try:
            # Start with all posts
            posts = Post.objects.all().order_by('-created_at')
            
            # Filter by user if requested
            user_id = request.query_params.get('user_id')
            if user_id:
                posts = posts.filter(user_id=user_id)
            
            # Filter by game if requested
            game_id = request.query_params.get('game_id')
            if game_id:
                posts = posts.filter(game_id=game_id)
                
            # Paginate (simple implementation)
            limit = int(request.query_params.get('limit', 10))
            offset = int(request.query_params.get('offset', 0))
            posts = posts[offset:offset+limit]
            
            serializer = PostSerializer(posts, many=True, context={'request': request})
            return Response(serializer.data)
        
        except Exception as e:
            return Response(
                {"detail": f"Error retrieving posts: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        """
        Create a new post with optional image and game reference.
        """
        try:
            # Debug logging for post creation
            logger.error(f"Post creation - Request method: {request.method}")
            logger.error(f"Post creation - Content-Type: {request.content_type}")
            logger.error(f"Post creation - FILES keys: {list(request.FILES.keys())}")
            logger.error(f"Post creation - POST keys: {list(request.data.keys())}")
            logger.error(f"Post creation - POST data: {request.data}")
            
            # Create a mutable copy of request data
            data = request.data.copy()
            
            # Set the user automatically from the authenticated user
            data['user'] = request.user.id
            
            # Debug image file
            if 'image' in request.FILES:
                image_file = request.FILES['image']
                logger.error(f"Post image found - Name: {image_file.name}, Size: {image_file.size}, Type: {image_file.content_type}")
            else:
                logger.error("No image found in request.FILES")
            
            # If game ID is provided, check that it exists
            if 'game' in data and data['game']:
                try:
                    game_id = int(data['game'])
                    game = Game.objects.get(id=game_id)
                    logger.error(f"Game found: {game.name}")
                except Game.DoesNotExist:
                    logger.error(f"Game with ID {data['game']} not found")
                    return Response(
                        {"game": "Game not found"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                except ValueError:
                    logger.error(f"Invalid game ID format: {data['game']}")
                    return Response(
                        {"game": "Invalid game ID"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Create and validate the post
            serializer = PostSerializer(data=data, context={'request': request})
            if serializer.is_valid():
                post = serializer.save()
                
                # Additional verification after save
                if 'image' in request.FILES:
                    try:
                        from django.core.files.storage import default_storage
                        if post.image and default_storage.exists(post.image.name):
                            logger.error(f"Post image saved successfully at: {post.image.name}")
                            logger.error(f"Post image URL: {post.image.url}")
                        else:
                            logger.error(f"Post image not found in storage after save")
                    except Exception as e:
                        logger.error(f"Error verifying post image: {str(e)}")
                        logger.error(traceback.format_exc())
                
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                logger.error(f"Post serializer validation errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            logger.error(f"Unexpected error in post creation: {str(e)}")
            logger.error(traceback.format_exc())
            return Response(
                {"detail": f"Error creating post: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 