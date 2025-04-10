from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q
from ..models import Post, Like, Comment, MyUser, Game
from ..serializers import (
    PostSerializer,
    PostDetailSerializer,
    CommentSerializer,
    ReplySerializer,
    LikeSerializer,
    UserSerializer
)
import logging

class PostListView(APIView):
    """
    Списък на всички публикации или създаване на нова публикация.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get(self, request):
        """Получаване на всички публикации от потребители, които текущият потребител следва + собствените му публикации"""
        following_users = request.user.following.all()
        posts = Post.objects.filter(
            Q(user=request.user) | Q(user__in=following_users)
        ).select_related('user', 'game').order_by('-created_at')
        
        # Add pagination
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 20))
        start = (page - 1) * limit
        end = start + limit
        
        # Slice the queryset for pagination
        paginated_posts = posts[start:end]
        
        serializer = PostSerializer(paginated_posts, many=True, context={'request': request})
        return Response(serializer.data)
    
    def post(self, request):
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            # Get data from request
            content = request.data.get('content', '').strip()
            image = request.FILES.get('image', None)
            
            # Check that at least one of content or image is provided
            if not content and not image:
                return Response(
                    {'detail': 'Публикацията трябва да съдържа текст или снимка'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Log information about the file
            if image:
                logger.info(f"Processing post image upload: name={image.name}, size={image.size}, content_type={image.content_type}")
                
                # Validate file size - prevent extremely large files
                if image.size > 15 * 1024 * 1024:  # 15MB
                    return Response(
                        {'detail': 'Размерът на изображението не може да надвишава 15MB'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Validate file type
                content_type = getattr(image, 'content_type', None)
                if content_type and not content_type.startswith('image/'):
                    return Response(
                        {'detail': 'Невалиден тип файл. Моля, качете само изображения.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Create post
            try:
                post = Post.objects.create(
                    user=request.user,
                    content=content,
                    image=image
                )
                
                # Check if image was successfully uploaded (if provided)
                if image and not post.image:
                    logger.error(f"Image upload failed for post {post.id}")
                    post.delete()  # Remove the post if image upload failed
                    return Response(
                        {'detail': 'Качването на изображението не бе успешно'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                
                # Verify S3 URL is accessible for uploaded image
                if post.image:
                    try:
                        url = post.image.url
                        logger.info(f"Post image successfully uploaded to: {url}")
                    except Exception as e:
                        logger.error(f"Error generating URL for post image: {str(e)}")
                        # Don't delete the post, but log the error
                
                # Notification functionality removed - model doesn't exist
                
                serializer = PostSerializer(post, context={'request': request})
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                logger.error(f"Error creating post: {str(e)}")
                import traceback
                logger.error(traceback.format_exc())
                return Response(
                    {'detail': f'Неуспешно създаване на публикация: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            logger.error(f"Unexpected error in PostsView.post: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return Response(
                {'detail': f'Неуспешно създаване на публикация: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserPostsView(APIView):
    """
    Списък на всички публикации от конкретен потребител.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, username):
        try:
            user = MyUser.objects.get(username=username)
            posts = Post.objects.filter(user=user).select_related('user', 'game').order_by('-created_at')
            serializer = PostSerializer(posts, many=True, context={'request': request})
            return Response(serializer.data)
        except MyUser.DoesNotExist:
            return Response(
                {"detail": "Потребителят не е намерен."},
                status=status.HTTP_404_NOT_FOUND
            )


class PostDetailView(APIView):
    """
    Извличане, актуализиране или изтриване на публикация.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
            serializer = PostDetailSerializer(post, context={'request': request})
            return Response(serializer.data)
        except Post.DoesNotExist:
            return Response(
                {"detail": "Публикацията не е намерена."},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def patch(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
            
            # Check if the user is the owner of the post
            if post.user != request.user:
                return Response(
                    {"detail": "Можете да актуализирате само собствените си публикации."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            serializer = PostSerializer(post, data=request.data, partial=True, context={'request': request})
            if serializer.is_valid():
                # Handle game reference if provided
                game_id = request.data.get('game')
                if game_id:
                    try:
                        game = Game.objects.get(id=game_id)
                        post.game = game
                    except Game.DoesNotExist:
                        return Response(
                            {"detail": "Играта не е намерена."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                
                post = serializer.save()
                return Response(PostSerializer(post, context={'request': request}).data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Post.DoesNotExist:
            return Response(
                {"detail": "Публикацията не е намерена."},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def delete(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
            
            # Check if the user is the owner of the post
            if post.user != request.user:
                return Response(
                    {"detail": "Можете да изтривате само собствените си публикации."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            post.delete()
            return Response(
                {"detail": "Публикацията е изтрита успешно."},
                status=status.HTTP_204_NO_CONTENT
            )
        except Post.DoesNotExist:
            return Response(
                {"detail": "Публикацията не е намерена."},
                status=status.HTTP_404_NOT_FOUND
            )


class LikeView(APIView):
    """
    Харесване или отказ от харесване на публикация.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
            
            # Check if the user already liked this post
            like, created = Like.objects.get_or_create(user=request.user, post=post)
            
            if created:
                return Response(
                    {"detail": "Публикацията е харесана успешно."},
                    status=status.HTTP_201_CREATED
                )
            else:
                return Response(
                    {"detail": "Вече сте харесали тази публикация."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Post.DoesNotExist:
            return Response(
                {"detail": "Публикацията не е намерена."},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def delete(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
            
            # Try to find and delete the like
            try:
                like = Like.objects.get(user=request.user, post=post)
                like.delete()
                return Response(
                    {"detail": "Отказахте харесването успешно."},
                    status=status.HTTP_204_NO_CONTENT
                )
            except Like.DoesNotExist:
                return Response(
                    {"detail": "Не сте харесали тази публикация."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Post.DoesNotExist:
            return Response(
                {"detail": "Публикацията не е намерена."},
                status=status.HTTP_404_NOT_FOUND
            )


class LikesListView(APIView):
    """
    Списък на всички потребители, харесали публикация.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
            likes = Like.objects.filter(post=post).select_related('user')
            serializer = LikeSerializer(likes, many=True)
            return Response(serializer.data)
        except Post.DoesNotExist:
            return Response(
                {"detail": "Публикацията не е намерена."},
                status=status.HTTP_404_NOT_FOUND
            )


class CommentView(APIView):
    """
    Създаване, актуализиране или изтриване на коментар.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
            
            # Проверка дали това е отговор на друг коментар
            parent_id = request.data.get('parent')
            parent = None
            if parent_id:
                try:
                    parent = Comment.objects.get(id=parent_id, post=post)
                except Comment.DoesNotExist:
                    return Response(
                        {"detail": "Родителският коментар не е намерен."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Създаване на коментара
            comment = Comment.objects.create(
                user=request.user,
                post=post,
                text=request.data.get('text', ''),
                parent=parent
            )
            
            if parent:
                serializer = ReplySerializer(comment)
            else:
                serializer = CommentSerializer(comment)
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Post.DoesNotExist:
            return Response(
                {"detail": "Публикацията не е намерена."},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def delete(self, request, comment_id):
        try:
            comment = Comment.objects.get(id=comment_id)
            
            # Проверка дали потребителят е собственик на коментара
            if comment.user != request.user:
                return Response(
                    {"detail": "Можете да изтривате само собствените си коментари."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            comment.delete()
            return Response(
                {"detail": "Коментарът е изтрит успешно."},
                status=status.HTTP_204_NO_CONTENT
            )
        except Comment.DoesNotExist:
            return Response(
                {"detail": "Коментарът не е намерен."},
                status=status.HTTP_404_NOT_FOUND
            )


class CommentRepliesView(APIView):
    """
    Преглед за списък с отговори на коментар и създаване на нови отговори.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, comment_id):
        try:
            comment = Comment.objects.get(id=comment_id)
            replies = Comment.objects.filter(parent=comment).order_by('-created_at')
            serializer = ReplySerializer(replies, many=True, context={'request': request})
            return Response(serializer.data)
        except Comment.DoesNotExist:
            return Response({'error': 'Коментарът не е намерен'}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, comment_id):
        try:
            comment = Comment.objects.get(id=comment_id)
            serializer = ReplySerializer(data=request.data, context={'request': request, 'parent': comment})
            if serializer.is_valid():
                serializer.save(user=request.user)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Comment.DoesNotExist:
            return Response({'error': 'Коментарът не е намерен'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST) 