from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import Http404, JsonResponse
from ..models import Chat, Message, MyUser
from ..serializers import (
    ChatSerializer,
    MessageSerializer
)
from django.utils.dateparse import parse_datetime
from django.utils import timezone
import logging
import os
from django.utils.text import slugify
import uuid

class ChatListView(APIView):
    """
    Списък на всички чатове или създаване на нов чат.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Get all chats for the current user
        """
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            # If user isn't authenticated, return 401
            if not request.user.is_authenticated:
                return Response(
                    {"detail": "Authentication credentials were not provided."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            logger.info(f"Fetching chats for user {request.user.username}")
            
            # Try to get chats with explicit error handling
            try:
                chats = Chat.objects.filter(participants=request.user)
                logger.info(f"Found {chats.count()} chats for user {request.user.username}")
            except Exception as db_error:
                logger.error(f"Database error in ChatListView.get: {str(db_error)}")
                return Response(
                    {'detail': f'Database error. Please try again later.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Serialize with explicit error handling
            try:
                # Use a smaller context and simpler serialization
                serializer = ChatSerializer(chats, many=True, context={'request': request})
                return Response(serializer.data)
            except Exception as ser_error:
                logger.error(f"Serialization error in ChatListView.get: {str(ser_error)}")
                return Response(
                    {'detail': 'Error processing chat data. Please try again later.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            logger.error(f"Unexpected error in ChatListView.get: {str(e)}")
            return Response(
                {'detail': 'An unexpected error occurred. Please try again later.'},
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
            import logging
            logger = logging.getLogger(__name__)
            
            # Pagination parameters
            limit = int(request.query_params.get('limit', 20))  # Default 20 messages
            before_id = request.query_params.get('before_id')  # Message ID to load messages before
            after_timestamp = request.query_params.get('after_timestamp')  # Timestamp to load messages after
            
            logger.info(f"Fetching messages for chat {chat_id}, before_id={before_id}, after_timestamp={after_timestamp}")
            
            # Get chat with basic error handling
            try:
                chat = Chat.objects.get(id=chat_id, participants=request.user)
            except Chat.DoesNotExist:
                return Response(
                    {'detail': 'Чатът не е намерен или не сте участник'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Start with all messages in this chat - use only_fields to specify exactly which fields we need
            try:
                # Only select fields that actually exist in the database
                messages_query = Message.objects.filter(chat=chat).only(
                    'id', 'chat', 'sender', 'content', 'image', 'parent', 
                    'is_edited', 'is_read', 'is_delivered', 'created_at', 'updated_at'
                )
                logger.info(f"Found {messages_query.count()} messages in chat {chat_id}")
            except Exception as query_error:
                logger.error(f"Error querying messages: {str(query_error)}")
                return Response(
                    {'detail': f'Грешка при извличане на съобщения: {str(query_error)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Filter messages before the given ID if specified
            if before_id:
                try:
                    before_message = Message.objects.get(id=before_id)
                    messages_query = messages_query.filter(created_at__lt=before_message.created_at)
                except Message.DoesNotExist:
                    logger.warning(f"Message with ID {before_id} not found")
                    pass
                except Exception as e:
                    logger.warning(f"Error filtering by before_id {before_id}: {str(e)}")
                    # Continue without this filter
            
            # Filter messages after the given timestamp if specified
            if after_timestamp:
                try:
                    # Parse the timestamp and convert to timezone-aware datetime if needed
                    from django.utils.dateparse import parse_datetime
                    from django.utils import timezone
                    
                    parsed_timestamp = parse_datetime(after_timestamp)
                    
                    # Make it timezone-aware if it's not
                    if parsed_timestamp and timezone.is_naive(parsed_timestamp):
                        parsed_timestamp = timezone.make_aware(parsed_timestamp)
                    
                    if parsed_timestamp:
                        messages_query = messages_query.filter(created_at__gte=parsed_timestamp)
                        logger.info(f"Filtered by timestamp >= {parsed_timestamp}")
                except Exception as e:
                    logger.error(f"Error parsing timestamp {after_timestamp}: {e}")
                    # Continue without timestamp filtering
            
            # Get messages in the appropriate order and limit the result
            try:
                if after_timestamp:
                    # For newer messages, use ascending order (oldest to newest)
                    messages = messages_query.order_by('created_at')[:limit]
                else:
                    # For older messages, use descending order (newest to oldest) and reverse for display
                    messages = messages_query.order_by('-created_at')[:limit]
                    messages = list(reversed(messages))
                
                logger.info(f"Returning {len(messages)} messages for chat {chat_id}")
            except Exception as order_error:
                logger.error(f"Error sorting messages: {str(order_error)}")
                # Fall back to basic query with safe SQL
                from django.db import connection
                cursor = connection.cursor()
                try:
                    # Use raw SQL that doesn't reference the problematic columns
                    cursor.execute(
                        "SELECT id, chat_id, sender_id, content, image, parent_id, is_edited, is_read, is_delivered, created_at, updated_at "
                        "FROM base_message WHERE chat_id = %s ORDER BY created_at DESC LIMIT %s",
                        [chat_id, limit]
                    )
                    message_ids = [row[0] for row in cursor.fetchall()]
                    messages = Message.objects.filter(id__in=message_ids).order_by('-created_at')[:limit]
                    messages = list(reversed(messages))
                    logger.info(f"Used fallback query to get {len(messages)} messages")
                except Exception as sql_error:
                    logger.error(f"SQL error in fallback query: {str(sql_error)}")
                    return Response(
                        {'detail': f'Critical database error: {str(sql_error)}'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            
            # Serialize messages with error handling
            try:
                import traceback
                logger.info(f"Serializing {len(messages)} messages")
                # Try to serialize messages one by one to identify problematic messages
                serialized_messages = []
                problem_message_ids = []
                
                for msg in messages:
                    try:
                        msg_serializer = MessageSerializer(msg, context={'request': request})
                        serialized_messages.append(msg_serializer.data)
                    except Exception as msg_error:
                        logger.error(f"Error serializing message {msg.id}: {str(msg_error)}")
                        logger.error(traceback.format_exc())
                        problem_message_ids.append(msg.id)
                
                if problem_message_ids:
                    logger.warning(f"Skipped problematic messages: {problem_message_ids}")
                
                return Response(serialized_messages)
            except Exception as ser_error:
                logger.error(f"Error serializing messages: {str(ser_error)}")
                import traceback
                logger.error(traceback.format_exc())
                return Response(
                    {'detail': f'Грешка при обработка на съобщения: {str(ser_error)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Unexpected error in MessageListView.get: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return Response(
                {'detail': f'Неочаквана грешка: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request, chat_id):
        """
        Creates a new message in the chat.
        
        This endpoint handles file uploads and creates a message with the content
        and/or file attachment. Files are stored in an S3 bucket.
        
        Args:
            request: HTTP request with message data
            chat_id: ID of the chat to add the message to
            
        Returns:
            New message data or error message
        """
        try:
            # Get the chat
            chat = Chat.objects.get(id=chat_id)
            
            # Check if user is a participant
            if request.user not in chat.participants.all():
                return Response(
                    {'detail': 'You are not a participant in this chat'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Validate request data
            content = request.data.get('content', '').strip()
            image_file = request.FILES.get('image')
            parent_id = request.data.get('parent')
            
            # Debug logging
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Creating message in chat {chat_id} for user {request.user.username}")
            logger.info(f"Request data: content='{content[:50]}{'...' if len(content) > 50 else ''}', image={bool(image_file)}, parent_id={parent_id}")
            
            if image_file:
                logger.info(f"Image file: name={image_file.name}, size={image_file.size}, content_type={image_file.content_type}")
            
            # Check if the message has any content (text or file)
            if not content and not image_file:
                return Response(
                    {'detail': 'Съобщението не може да бъде празно.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create message
            message = Message(
                chat=chat,
                sender=request.user,
                content=content
            )
            
            # Handle parent message (for replies)
            if parent_id:
                try:
                    parent_message = Message.objects.get(id=parent_id)
                    # Make sure parent is in the same chat
                    if parent_message.chat.id != chat.id:
                        return Response(
                            {'detail': 'Parent message must be in the same chat'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    message.parent = parent_message
                except Message.DoesNotExist:
                    return Response(
                        {'detail': 'Parent message does not exist'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Save the message first to get an ID
            message.save()
            
            # Handle file upload (image or document)
            if image_file:
                # Check file size (10MB limit)
                if image_file.size > 10 * 1024 * 1024:
                    message.delete()  # Clean up the message we just created
                    return Response(
                        {'detail': 'File size exceeds the limit of 10MB'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Sanitize filename to prevent path traversal
                import os
                from django.utils.text import slugify
                import uuid
                
                # Get file extension safely
                _, ext = os.path.splitext(image_file.name)
                ext = ext.lower()
                
                # Create a unique filename with the original extension
                filename_base = slugify(os.path.splitext(image_file.name)[0]) or 'file'
                unique_filename = f"{filename_base}_{uuid.uuid4().hex[:8]}{ext}"
                
                # Set the path in the chat_files directory
                file_path = f"chat_files/{unique_filename}"
                
                try:
                    # Save file to the model field (this will use the storage backend)
                    message.image.save(file_path, image_file, save=True)
                    
                    # Log successful upload
                    logger.info(f"File uploaded successfully to: {message.image.url}")
                except Exception as e:
                    logger.error(f"File upload error: {str(e)}")
                    message.delete()  # Clean up the message
                    return Response(
                        {'detail': f'Error uploading file: {str(e)}'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            
            # Update chat's updated_at field
            chat.save()
            
            # Serialize and return the new message
            serializer = MessageSerializer(message)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Chat.DoesNotExist:
            return Response(
                {'detail': 'Chat not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            # Log the error for debugging
            import traceback
            logger.error(f"Unexpected error creating message: {str(e)}")
            logger.error(traceback.format_exc())
            
            return Response(
                {'detail': f'Error creating message: {str(e)}'},
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


class SimpleChatsView(APIView):
    """
    Simplified chat list endpoint that returns minimal data.
    This is a fallback to help troubleshoot issues with the main chat list endpoint.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        try:
            # Get all chats where the user is a participant
            chats_data = []
            
            try:
                # Get chat objects but don't use complex prefetch_related
                chats = Chat.objects.filter(participants=request.user).order_by('-updated_at')
                
                # Manually construct a simple response
                for chat in chats:
                    try:
                        # Get participants with basic info only
                        participants = []
                        for participant in chat.participants.all():
                            participants.append({
                                'id': participant.id,
                                'username': participant.username,
                                'display_name': participant.display_name or participant.username
                            })
                        
                        # Get last message with minimal processing
                        last_message = None
                        try:
                            last_msg = chat.messages.order_by('-created_at').first()
                            if last_msg:
                                last_message = {
                                    'id': last_msg.id,
                                    'content': last_msg.content[:50] if last_msg.content else '',
                                    'sender': last_msg.sender.username,
                                    'created_at': last_msg.created_at.isoformat()
                                }
                        except Exception:
                            pass
                        
                        # Count unread messages safely
                        try:
                            unread_count = chat.messages.filter(is_read=False).exclude(sender=request.user).count()
                        except Exception:
                            unread_count = 0
                        
                        # Add to result
                        chats_data.append({
                            'id': chat.id,
                            'participants': participants,
                            'created_at': chat.created_at.isoformat(),
                            'updated_at': chat.updated_at.isoformat(),
                            'last_message': last_message,
                            'unread_count': unread_count
                        })
                    except Exception as chat_error:
                        # If processing a chat fails, skip it
                        print(f"Error processing chat {chat.id}: {str(chat_error)}")
                        continue
                        
                return JsonResponse(chats_data, safe=False)
            except Exception as db_error:
                print(f"Database error in SimpleChatsView: {str(db_error)}")
                return JsonResponse({
                    'error': 'Database error',
                    'message': str(db_error)
                }, status=500)
                
        except Exception as e:
            print(f"Unexpected error in SimpleChatsView: {str(e)}")
            return JsonResponse({
                'error': 'Unexpected error',
                'message': str(e)
            }, status=500)


class ChatDebugView(APIView):
    """
    Debug endpoint to check chat functionality.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """
        Run diagnostics on the chat system.
        """
        import datetime
        import sys
        import django
        from django.db import connection
        
        diagnostics = {
            'timestamp': datetime.datetime.now().isoformat(),
            'auth': {
                'user_authenticated': request.user.is_authenticated,
                'username': request.user.username if request.user.is_authenticated else None,
                'user_id': request.user.id if request.user.is_authenticated else None,
            },
            'system': {
                'python_version': sys.version,
                'django_version': django.get_version(),
                'timezone': datetime.datetime.now().astimezone().tzinfo.tzname(None),
            },
            'database': {
                'engine': connection.settings_dict['ENGINE'],
                'name': connection.settings_dict['NAME'],
            },
            'tables': {},
            'counts': {},
            'latest': {}
        }
        
        # Check database connectivity
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                row = cursor.fetchone()
                diagnostics['database']['connection_test'] = "OK" if row[0] == 1 else "Failed"
        except Exception as e:
            diagnostics['database']['connection_test'] = f"Error: {str(e)}"
        
        # Check model counts
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            # Get counts of various models
            diagnostics['counts']['users'] = User.objects.count()
            diagnostics['counts']['chats'] = Chat.objects.count()
            diagnostics['counts']['messages'] = Message.objects.count()
            
            # Get user's chats count
            if request.user.is_authenticated:
                user_chats = Chat.objects.filter(participants=request.user)
                diagnostics['counts']['user_chats'] = user_chats.count()
                
                # Get info about latest chat
                if user_chats.exists():
                    latest_chat = user_chats.order_by('-updated_at').first()
                    diagnostics['latest']['chat'] = {
                        'id': latest_chat.id,
                        'updated_at': latest_chat.updated_at.isoformat(),
                        'participant_count': latest_chat.participants.count(),
                        'message_count': latest_chat.messages.count()
                    }
                    
                    # Add participant info
                    diagnostics['latest']['chat']['participants'] = [
                        {'id': p.id, 'username': p.username}
                        for p in latest_chat.participants.all()
                    ]
                    
                    # Check latest message
                    latest_message = latest_chat.messages.order_by('-created_at').first()
                    if latest_message:
                        diagnostics['latest']['message'] = {
                            'id': latest_message.id,
                            'sender_id': latest_message.sender.id,
                            'sender_username': latest_message.sender.username,
                            'created_at': latest_message.created_at.isoformat(),
                            'has_content': bool(latest_message.content),
                            'has_image': bool(latest_message.image)
                        }
        except Exception as e:
            diagnostics['error'] = str(e)
        
        return Response(diagnostics)


def raw_chats_view(request):
    """
    A pure Django view that returns chats without using Django REST Framework.
    This is a last resort to debug issues with DRF.
    """
    # Check if user is authenticated
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    try:
        # Get all chats for this user
        chats = Chat.objects.filter(participants=request.user).order_by('-updated_at')
        
        # Prepare response manually
        chats_data = []
        
        for chat in chats:
            try:
                # Get basic chat data
                chat_data = {
                    'id': chat.id,
                    'created_at': chat.created_at.isoformat() if chat.created_at else None,
                    'updated_at': chat.updated_at.isoformat() if chat.updated_at else None,
                    'participants': [],
                    'last_message': None,
                    'unread_count': 0
                }
                
                # Get participants
                for participant in chat.participants.all():
                    chat_data['participants'].append({
                        'id': participant.id,
                        'username': participant.username,
                        'display_name': participant.display_name or participant.username
                    })
                
                # Get last message
                last_message = chat.messages.order_by('-created_at').first()
                if last_message:
                    chat_data['last_message'] = {
                        'id': last_message.id,
                        'content': last_message.content[:50] if last_message.content else '',
                        'sender': last_message.sender.username,
                        'created_at': last_message.created_at.isoformat() if last_message.created_at else None,
                        'has_image': bool(last_message.image)
                    }
                
                # Count unread messages
                chat_data['unread_count'] = chat.messages.filter(
                    is_read=False
                ).exclude(
                    sender=request.user
                ).count()
                
                # Add to result
                chats_data.append(chat_data)
            except Exception as chat_error:
                print(f"Error processing chat {chat.id}: {str(chat_error)}")
                continue
        
        return JsonResponse(chats_data, safe=False)
    except Exception as e:
        print(f"Error in raw_chats_view: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500) 