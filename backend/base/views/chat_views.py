from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import Http404
from ..models import Chat, Message, MyUser
from ..serializers import (
    ChatSerializer,
    MessageSerializer
)
from django.utils.dateparse import parse_datetime
from django.utils import timezone
import logging

class ChatListView(APIView):
    """
    Списък на всички чатове или създаване на нов чат.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            # Simple implementation - just get the chats without prefetch_related
            chats = Chat.objects.filter(participants=request.user).order_by('-updated_at')
            
            # Use a simpler serialization approach
            serializer = ChatSerializer(chats, many=True, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            print(f"Error in ChatListView.get: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'detail': f'Error fetching chats: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request):
        try:
            # Get the username of the other participant
            other_username = request.data.get('username')
            if not other_username:
                return Response(
                    {'detail': 'Името на потребителя е задължително'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get the other user
            try:
                other_user = MyUser.objects.get(username=other_username)
            except MyUser.DoesNotExist:
                return Response(
                    {'detail': 'Потребителят не е намерен'},
                status=status.HTTP_404_NOT_FOUND
            )

            # Check if the user is trying to chat with themselves
            if other_user == request.user:
                return Response(
                    {'detail': 'Не можете да създадете чат със себе си'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if chat already exists between these users
            existing_chats = Chat.objects.filter(participants=request.user).filter(participants=other_user)
            
            if existing_chats.exists():
                existing_chat = existing_chats.first()
                serializer = ChatSerializer(existing_chat, context={'request': request})
                return Response(serializer.data)

            # Create new chat
            chat = Chat.objects.create()
            chat.participants.add(request.user, other_user)
            chat.save()
            
            serializer = ChatSerializer(chat, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            print(f"Error in ChatListView.post: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'detail': 'Неуспешно създаване на чат'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ChatDetailView(APIView):
    """
    Извличане или изтриване на чат.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, chat_id):
        try:
            print(f"DEBUG: Fetching chat {chat_id} for user {request.user.username}")
            # Check if the user is a participant in the chat
            try:
                chat = Chat.objects.get(id=chat_id, participants=request.user)
            except Chat.DoesNotExist:
                return Response(
                    {'detail': 'Чатът не е намерен или не сте участник'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            serializer = ChatSerializer(chat, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            print(f"ERROR in ChatDetailView.get: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'detail': f'Неуспешно извличане на чат: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def delete(self, request, chat_id):
        try:
            print(f"DEBUG: Deleting chat {chat_id} for user {request.user.username}")
            # Check if the user is a participant in the chat
            try:
                chat = Chat.objects.get(id=chat_id, participants=request.user)
            except Chat.DoesNotExist:
                return Response(
                    {'detail': 'Чатът не е намерен или не сте участник'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            chat.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            print(f"ERROR in ChatDetailView.delete: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'detail': f'Неуспешно изтриване на чат: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ChatReadView(APIView):
    """
    Маркиране на всички съобщения в чат като прочетени за текущия потребител.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, chat_id):
        try:
            chat = Chat.objects.get(id=chat_id, participants=request.user)
            
            # Find all unread messages in this chat sent by other users
            unread_messages = Message.objects.filter(
                chat=chat,
                is_read=False
            ).exclude(sender=request.user)
            
            # Mark all as read
            updated_count = unread_messages.update(is_read=True)
            
            return Response(
                {"detail": f"Маркирани {updated_count} съобщения като прочетени."}, 
                status=status.HTTP_200_OK
            )
            
        except Chat.DoesNotExist:
            return Response(
                {'detail': 'Чатът не е намерен или не сте участник'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            print(f"Error in ChatReadView.post: {str(e)}")
            return Response(
                {'detail': f'Неуспешно отбелязване на съобщения като прочетени: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MessageListView(APIView):
    """
    Списък на всички съобщения в чат или създаване на ново съобщение.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request, chat_id):
        try:
            # Pagination parameters
            limit = int(request.query_params.get('limit', 20))  # Default 20 messages
            before_id = request.query_params.get('before_id')  # Message ID to load messages before
            after_timestamp = request.query_params.get('after_timestamp')  # Timestamp to load messages after
            
            chat = Chat.objects.get(id=chat_id, participants=request.user)
            
            # Start with all messages in this chat
            messages_query = chat.messages.all()
            
            # Filter messages before the given ID if specified
            if before_id:
                try:
                    before_message = Message.objects.get(id=before_id)
                    messages_query = messages_query.filter(created_at__lt=before_message.created_at)
                except Message.DoesNotExist:
                    pass
            
            # Filter messages after the given timestamp if specified
            if after_timestamp:
                try:
                    # Parse the timestamp and convert to timezone-aware datetime if needed
                    
                    # Try to parse the timestamp
                    parsed_timestamp = parse_datetime(after_timestamp)
                    
                    # Make it timezone-aware if it's not
                    if parsed_timestamp and timezone.is_naive(parsed_timestamp):
                        parsed_timestamp = timezone.make_aware(parsed_timestamp)
                    
                    if parsed_timestamp:
                        # Add slight buffer to avoid missing messages created at the exact same timestamp
                        # This provides a 0.1 second buffer
                        messages_query = messages_query.filter(created_at__gte=parsed_timestamp)
                    else:
                        # If parsing fails, try direct comparison (this works with some formats)
                        messages_query = messages_query.filter(created_at__gt=after_timestamp)
                except Exception as e:
                    print(f"Error parsing timestamp: {e}")
                    # Attempt a direct string comparison as a fallback
                    messages_query = messages_query.filter(created_at__gt=after_timestamp)
            
            # Get messages in the appropriate order and limit the result
            if after_timestamp:
                # For newer messages, use ascending order (oldest to newest)
                messages = messages_query.order_by('created_at')[:limit]
            else:
                # For older messages, use descending order (newest to oldest) and reverse for display
                messages = messages_query.order_by('-created_at')[:limit]
                messages = list(reversed(messages))
            
            serializer = MessageSerializer(messages, many=True, context={'request': request})
            return Response(serializer.data)
        except Chat.DoesNotExist:
            return Response(
                {'detail': 'Чатът не е намерен или не сте участник'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'detail': f'Неуспешно извличане на съобщения: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request, chat_id):
        """
        Create a new message in a chat
        
        Args:
            request: The HTTP request
            chat_id: The ID of the chat
            
        Returns:
            The created message or error response
        """
        try:
            import logging
            logger = logging.getLogger(__name__)
            
            logger.info(f"Creating message in chat {chat_id}")
            logger.info(f"Content-Type: {request.content_type}")
            logger.info(f"FILES: {list(request.FILES.keys()) if request.FILES else 'None'}")
            logger.info(f"DATA: {list(request.data.keys()) if request.data else 'None'}")
            
            # Get the chat object
            try:
                chat = Chat.objects.get(id=chat_id)
                
                # Check if user is a participant
                if not chat.participants.filter(id=request.user.id).exists():
                    return Response(
                        {'detail': 'Нямате достъп до този чат.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Chat.DoesNotExist:
                return Response(
                    {'detail': 'Този чат не съществува.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get message content and image
            content = request.data.get('content', '')
            image = None 
            if 'image' in request.FILES:
                image = request.FILES['image']
                logger.info(f"Image found - Name: {image.name}, Size: {image.size}, Type: {image.content_type}")
            
            # Get parent message if replying
            parent = None
            if 'parent' in request.data and request.data['parent']:
                try:
                    parent_id = request.data['parent']
                    parent = Message.objects.get(id=parent_id, chat=chat)
                except Message.DoesNotExist:
                    return Response(
                        {'detail': 'Съобщението, на което отговаряте, не съществува.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                except (ValueError, TypeError):
                    return Response(
                        {'detail': 'Невалиден идентификатор на съобщение.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Validate if content or image is provided
            if not content and not image:
                return Response(
                    {'detail': 'Съобщението не може да бъде празно.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate image if present
            if image:
                # Validate file size
                if image.size > 10 * 1024 * 1024:  # 10MB
                    return Response(
                        {'detail': 'File size cannot exceed 10MB'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Check content type - allow any file type but log it
                content_type = getattr(image, 'content_type', None)
                logger.info(f"Uploading file with content type: {content_type}")
                
                # Allow all file types but warn about potentially dangerous ones
                dangerous_types = ['application/x-msdownload', 'application/x-executable', 
                                  'application/x-dosexec', 'application/java-archive']
                if content_type and any(dtype in content_type.lower() for dtype in dangerous_types):
                    logger.warning(f"Potentially dangerous file type uploaded: {content_type}")
                    
            # Create message in two steps to prevent S3 errors from failing the entire request
            try:
                # First create message without image
                message = Message.objects.create(
                    chat=chat,
                    sender=request.user,
                    content=content,
                    parent=parent,
                    is_read=False,
                    is_delivered=True
                )
                
                # Then try to save the file/image separately
                if image:
                    try:
                        logger.info(f"Saving file for message {message.id}")
                        
                        # Store original filename and content type
                        message.file_name = getattr(image, 'name', '')
                        message.file_type = getattr(image, 'content_type', '')
                        message.image = image
                        message.save()
                        
                        logger.info(f"File saved successfully: {message.file_name} ({message.file_type})")
                    except Exception as file_error:
                        logger.error(f"Error saving file: {str(file_error)}")
                        import traceback
                        logger.error(traceback.format_exc())
                        # Continue without file - message was created successfully
                
                # Update chat last activity timestamp
                chat.save()
                
                # Return the message with serializer
                serializer = MessageSerializer(message, context={'request': request})
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
            except Exception as msg_error:
                logger.error(f"Error creating message: {str(msg_error)}")
                import traceback
                logger.error(traceback.format_exc())
                return Response(
                    {'detail': f'Неуспешно изпращане на съобщение: {str(msg_error)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            logger.error(f"Unexpected error in message creation: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return Response(
                {'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MessageDetailView(APIView):
    """
    Извличане, актуализиране или изтриване на съобщение.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_object(self, message_id):
        try:
            return Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            raise Http404
    
    def get(self, request, message_id):
        message = self.get_object(message_id)
        
        # Check if user is a participant in the chat
        if request.user not in message.chat.participants.all():
            return Response({"detail": "Нямате разрешение да преглеждате това съобщение."}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = MessageSerializer(message, context={'request': request})
        return Response(serializer.data)
    
    def patch(self, request, message_id):
        message = self.get_object(message_id)
        
        # Check if the user is the sender of the message
        if message.sender != request.user:
            return Response({"detail": "Можете да редактирате само собствените си съобщения."}, status=status.HTTP_403_FORBIDDEN)
        
        # The 24-hour time limit check has been removed as requested
        
        serializer = MessageSerializer(message, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, message_id):
        message = self.get_object(message_id)
        
        # Check if the user is the sender or if they're in the chat
        if message.sender != request.user and request.user not in message.chat.participants.all():
            return Response({"detail": "Нямате разрешение да изтриете това съобщение."}, 
                           status=status.HTTP_403_FORBIDDEN)
        
        message.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MessageReplyView(APIView):
    """
    Списък на всички отговори на съобщение или създаване на нов отговор.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, message_id):
        try:
            parent_message = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            raise Http404
        
        # Check if user is a participant in the chat
        if request.user not in parent_message.chat.participants.all():
            return Response({"detail": "Нямате разрешение да преглеждате отговорите на това съобщение."}, 
                           status=status.HTTP_403_FORBIDDEN)
        
        replies = Message.objects.filter(parent=parent_message)
        serializer = MessageSerializer(replies, many=True, context={'request': request})
        return Response(serializer.data)
        
    def post(self, request, message_id):
        try:
            parent_message = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            raise Http404
            
        # Check if user is a participant in the chat
        if request.user not in parent_message.chat.participants.all():
            return Response({"detail": "Нямате разрешение да отговаряте на това съобщение."}, 
                           status=status.HTTP_403_FORBIDDEN)
                           
        # Create a new message as a reply
        serializer = MessageSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(
                sender=request.user,
                chat=parent_message.chat,
                parent=parent_message
            )
            
            # Update the chat's updated_at timestamp
            parent_message.chat.save()
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MessageStatusView(APIView):
    """
    Актуализиране на статуса за прочитане на съобщение.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, message_id):
        try:
            message = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            raise Http404
            
        # Check if user is a participant in the chat but not the sender
        if request.user not in message.chat.participants.all():
            return Response({"detail": "Нямате разрешение да актуализирате състоянието на това съобщение."}, 
                           status=status.HTTP_403_FORBIDDEN)
                           
        if request.user == message.sender:
            return Response({"detail": "Не можете да отбележите собствените си съобщения като прочетени."}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Mark as read
        message.is_read = True
        message.save()
        
        return Response({"detail": "Съобщението е отбелязано като прочетено."}, status=status.HTTP_200_OK) 