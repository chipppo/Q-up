from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.http import Http404
from ..models import Chat, Message, MyUser
from ..serializers import (
    ChatSerializer,
    MessageSerializer
)
from django.utils.dateparse import parse_datetime
from django.utils import timezone

class ChatListView(APIView):
    """
    Списък на всички чатове или създаване на нов чат.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            # Get all chats where the user is a participant
            chats = Chat.objects.filter(participants=request.user).prefetch_related(
                'participants',
                'messages'
            ).order_by('-updated_at')

            # Serialize the chats
            serializer = ChatSerializer(chats, many=True, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            print(f"Error in ChatListView.get: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'detail': 'Неуспешно извличане на чатове'},
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
    Lists and creates messages in a chat.
    Users must be participants in the chat to view or send messages.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, chat_id):
        try:
            # Check if the user is a participant in the chat
            chat = Chat.objects.get(id=chat_id, participants=request.user)
            
            # Get messages with pagination
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 30))
            
            messages = Message.objects.filter(chat=chat).order_by('-created_at')
            
            # Apply pagination (simple implementation)
            start = (page - 1) * page_size
            end = start + page_size
            messages = messages[start:end]
            
            # Mark messages as read
            for message in messages:
                if message.sender != request.user and not message.is_read:
                    message.is_read = True
                    message.save(update_fields=['is_read'])
            
            serializer = MessageSerializer(messages, many=True, context={'request': request})
            return Response(serializer.data)
        except Chat.DoesNotExist:
            return Response(
                {'detail': 'Chat not found or you are not a participant'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'detail': f'Error retrieving messages: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request, chat_id):
        try:
            # Set up logging
            import logging
            import traceback
            logger = logging.getLogger(__name__)
            
            # Debug logging for message creation
            logger.error(f"Message creation - Request method: {request.method}")
            logger.error(f"Message creation - Content-Type: {request.content_type}")
            logger.error(f"Message creation - FILES keys: {list(request.FILES.keys())}")
            logger.error(f"Message creation - Data keys: {list(request.data.keys())}")
            
            # Check if the user is a participant in the chat
            chat = Chat.objects.get(id=chat_id, participants=request.user)
            
            # Create the message directly
            message = Message(
                chat=chat,
                sender=request.user
            )
            
            # Handle content
            if 'content' in request.data:
                message.content = request.data['content']
                logger.error(f"Message content: {message.content[:50]}...")
                
            # Handle image
            if 'image' in request.FILES:
                image_file = request.FILES['image']
                logger.error(f"Message image found - Name: {image_file.name}, Size: {image_file.size}, Type: {image_file.content_type}")
                message.image = image_file
            
            # Handle file (use the same image field for files)
            if 'file' in request.FILES:
                file = request.FILES['file']
                logger.error(f"Message file found - Name: {file.name}, Size: {file.size}, Type: {file.content_type}")
                message.image = file
                
            # Handle parent message (for replies)
            if 'parent' in request.data:
                try:
                    parent_id = request.data['parent']
                    parent_message = Message.objects.get(id=parent_id, chat=chat)
                    message.parent = parent_message
                    logger.error(f"Parent message set: {parent_id}")
                except Exception as e:
                    # Continue without setting parent if it fails
                    logger.error(f"Error setting parent message: {str(e)}")
                    pass
            
            # Save the message
            try:
                message.save()
                logger.error(f"Message saved successfully with id: {message.id}")
                
                # Verify image was saved correctly
                if message.image:
                    from django.core.files.storage import default_storage
                    if default_storage.exists(message.image.name):
                        logger.error(f"Message image saved to storage at: {message.image.name}")
                        logger.error(f"Message image URL: {message.image.url}")
                    else:
                        logger.error(f"Message image not found in storage after save: {message.image.name}")
                
                serializer = MessageSerializer(message, context={'request': request})
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                logger.error(f"Error saving message: {str(e)}")
                logger.error(traceback.format_exc())
                return Response(
                    {'detail': f'Error saving message: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except Chat.DoesNotExist:
            return Response(
                {'detail': 'Chat not found or you are not a participant'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Unexpected error in message creation: {str(e)}")
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