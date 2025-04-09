from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from ..models import MyUser

class PasswordResetRequestView(APIView):
    """
    Заявка за имейл за нулиране на парола.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response(
                {'detail': 'Имейлът е задължителен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = MyUser.objects.get(email=email)
        except MyUser.DoesNotExist:
            # We return success even if the email doesn't exist for security
            return Response({'detail': 'Имейлът за възстановяване на паролата е изпратен, ако имейлът съществува'})

        # Generate token and URL
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # Build reset URL (frontend URL)
        reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"

        # Email content
        subject = 'Password Reset for Q-up'
        message = f'''
        Hello {user.username},

        You've requested to reset your password. Please click the link below to reset it:

        {reset_url}

        If you didn't request this, you can safely ignore this email.

        Best regards,
        The Q-up Team
        '''

        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            return Response({'detail': 'Имейлът за нулиране на паролата е изпратен'})
        except Exception as e:
            print(f"Error sending email: {str(e)}")
            return Response(
                {'detail': 'Неуспешно изпращане на имейл за нулиране'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PasswordResetConfirmView(APIView):
    """
    Потвърждаване на нулирането на парола и задаване на нова парола.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, uidb64, token):
        try:
            # Decode the user ID
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = MyUser.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, MyUser.DoesNotExist):
            return Response(
                {'detail': 'Невалидна връзка за нулиране'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check the token is valid
        if not default_token_generator.check_token(user, token):
            return Response(
                {'detail': 'Невалидна или изтекла връзка за нулиране'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get the new password
        new_password = request.data.get('new_password')
        if not new_password:
            return Response(
                {'detail': 'Необходима е нова парола'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Set the new password
        user.set_password(new_password)
        user.save()

        return Response({'detail': 'Паролата е нулирана успешно'}) 