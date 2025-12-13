from rest_framework.viewsets import ModelViewSet
from .serializers import (CreateUserSerializer,CustomUser,LoginSerializer,
                          UpdatePasswordSerializer,CustomUserSerializer,
                          UserActivities, UserActivitiesSerializer,
                          ForgotPasswordSerializer,ResetPasswordSerializer)
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from .models import ResetPasswordToken
from django.utils import timezone
import secrets
import string

from django.db import transaction
from django.contrib.auth import authenticate
from datetime import datetime
from crm_back.utils import get_access_token
from crm_back.custom_methods import isAuthenticatedCustom, isAdminUser

from django.core.mail import send_mail
from crm_back.email_templates import EMAIL_TEMPLATES, EMAIL_URLS

import io

def add_user_activity(user,action):
    UserActivities.objects.create(
        user_id=user.id,
        email=user.email,
        fullname=user.fullname,
        action=action
    )


class CreateUserView(ModelViewSet):
    http_method_names=["post"]
    queryset=CustomUser.objects.all()
    serializer_class=CreateUserSerializer

    def create(self,request):
        valid_request=self.serializer_class(data=request.data)
        valid_request.is_valid(raise_exception=True)
        
        # If approved is not specified, default to False (account request)
        # If approved is True, this is admin creating a user (requires authentication)
        is_account_request = not valid_request.validated_data.get('approved', False)
        
        # If it's admin creating user (approved=True), require authentication
        if not is_account_request:
            # Check if user is authenticated
            try:
                # This will raise an exception if not authenticated
                from crm_back.custom_methods import isAuthenticatedCustom
                auth_check = isAuthenticatedCustom()
                auth_check.has_permission(request, self)
            except:
                return Response({"error": "Authentication required for creating approved users"}, status=status.HTTP_401_UNAUTHORIZED)
        
        user_data = valid_request.validated_data.copy()
        email = user_data['email']
        
        # Check if user already exists (only for account requests, not admin creation)
        if is_account_request:
            try:
                existing_user = CustomUser.objects.get(email=email)
                
                # User already exists - determine their status and respond accordingly
                if existing_user.approved and existing_user.is_active:
                    # User is already approved and active
                    return Response({
                        "error": "Account already exists",
                        "message": "An account with this email already exists and is active. Please try logging in instead.",
                        "status": "active"
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
                elif not existing_user.approved and not existing_user.denial_reason:
                    # User has a pending request
                    return Response({
                        "error": "Request pending",
                        "message": "Your previous account request is still pending approval. Please wait for administrator review.",
                        "status": "pending"
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
                elif existing_user.denial_reason:
                    # User was previously denied - send email reminder and reject new request
                    try:
                        template = EMAIL_TEMPLATES['ACCOUNT_DENIED']
                        email_body = template['body'].format(
                            fullname=existing_user.fullname,
                            denial_reason=existing_user.denial_reason,
                            support_email=EMAIL_URLS['SUPPORT_EMAIL']
                        )
                        send_mail(
                            'EmployPro - Previous Request Status',
                            email_body,
                            settings.EMAIL_HOST_USER,
                            [existing_user.email],
                            fail_silently=False,
                        )
                    except Exception as e:
                        print(f"Email sending failed for denied user {existing_user.email}: {str(e)}")
                    
                    return Response({
                        "error": "Previous request denied",
                        "message": "Your previous account request was denied. We've sent you an email with the details. Please contact support if you have questions.",
                        "status": "denied"
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except CustomUser.DoesNotExist:
                # User doesn't exist, proceed with creating new account request
                pass
        
        # If this is an account request, ensure approved=False and is_active=False
        if is_account_request:
            user_data['approved'] = False
            user_data['is_active'] = False
        
        user = CustomUser(**user_data)
        user.save()

        # Send appropriate email based on approval status
        if user.approved:
            # Send welcome email if user is approved (admin created)
            template = EMAIL_TEMPLATES['WELCOME_ADMIN_CREATED']
            email_body = template['body'].format(
                fullname=user.fullname,
                setup_link=EMAIL_URLS['SETUP_PASSWORD_URL']
            )
            send_mail(
                template['subject'],
                email_body,
                settings.EMAIL_HOST_USER,
                [user.email],
                fail_silently=False,
            )
        else:
            # Send confirmation email for account request (user signup)
            template = EMAIL_TEMPLATES['ACCOUNT_REQUEST_RECEIVED']
            email_body = template['body'].format(
                fullname=user.fullname,
                support_email=EMAIL_URLS['SUPPORT_EMAIL']
            )
            send_mail(
                template['subject'],
                email_body,
                settings.EMAIL_HOST_USER,
                [user.email],
                fail_silently=False,
            )
            
        # Log activity if user is authenticated (admin action)
        if hasattr(request, 'user') and request.user.is_authenticated:
            add_user_activity(request.user,"added new user")
            
        message = "User created successfully" if user.approved else "Account request submitted successfully"
        return Response({"success": message}, status=status.HTTP_201_CREATED)  
    

class LoginView(ModelViewSet):
    http_method_names=["post"]
    queryset=CustomUser.objects.all()
    serializer_class=LoginSerializer

    def create(self,request):
        valid_request=self.serializer_class(data=request.data)
        valid_request.is_valid(raise_exception=True)

        new_user=valid_request.validated_data["is_new_user"]

        if new_user:
            user=CustomUser.objects.filter(email=valid_request.validated_data["email"])

            if user:
                user=user[0]
                if not user.password:
                    return Response ({"user_id":user.id})
                else:
                    raise Exception("User has password already")
            else:
                raise Exception("User with email not found")
        
        # First check if user exists and get their details
        try:
            user_obj = CustomUser.objects.get(email=valid_request.validated_data["email"])
        except CustomUser.DoesNotExist:
            return Response({"error":"Invalid email or password"},status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user account is active (but allow superusers to login regardless)
        if not user_obj.is_active and not user_obj.is_superuser:
            print(f"Inactive user login attempt: {user_obj.email}")
            return Response({"error":"Your account has been deactivated. Please contact the administrator for assistance."},status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user is approved (but allow superusers to login regardless)
        if not user_obj.approved and not user_obj.is_superuser:
            return Response({"error":"Your account is pending approval. Please wait for an administrator to approve your request."},status=status.HTTP_400_BAD_REQUEST)
        
        # Now authenticate with credentials
        user=authenticate(
            username=valid_request.validated_data["email"],
            password=valid_request.validated_data.get("password",None)
            )
        if not user:
            return Response({"error":"Invalid email or password"},status=status.HTTP_400_BAD_REQUEST)
        access=get_access_token({"user_id":user.id},1)
        user.last_login=datetime.now()
        user.save()
        add_user_activity(user,"logged in")
        
        return Response ({"access":access,"role":user.role,"id":user.id,"fullname":user.fullname,"email":user.email})


class UpdatePasswordView(ModelViewSet):
    serializer_class=UpdatePasswordSerializer
    http_method_names=["post"]
    queryset=CustomUser.objects.all()
    
    def create(self,request):
        valid_request=self.serializer_class(data=request.data)
        valid_request.is_valid(raise_exception=True)

        user=CustomUser.objects.filter(id=valid_request.validated_data["user_id"])

        if not user:
            raise Exception("User with Id not found")
        
        user=user[0]

        user.set_password(valid_request.validated_data["password"])
        user.save()
        add_user_activity(user,"updated password")
        return Response ({"success":"user password updated"})
    

class MeView(ModelViewSet):
    serializer_class=CustomUserSerializer
    http_method_names=["get"]
    queryset=CustomUser.objects.all()
    permission_classes=(isAuthenticatedCustom,)

    def list(self,request):
        data=self.serializer_class(request.user).data    
        return  Response(data)


class UserActivitiesView(ModelViewSet):
    serializer_class=UserActivitiesSerializer
    http_method_names=["get"]
    queryset=UserActivities.objects.select_related("user")
    permission_classes=(isAdminUser,)


class UsersView(ModelViewSet):
    serializer_class=CustomUserSerializer
    queryset=CustomUser.objects.all()
    permission_classes=(isAdminUser,)

    def list(self,request):
        users=self.queryset.filter(is_superuser=False)
        data=self.serializer_class(users,many=True).data
        return  Response(data)
    
    def update(self, request, pk=None):
        try:
            user = self.get_object()
            
            # Get the previous approval status
            was_approved_before = user.approved
            
            # Update user with new data
            serializer = self.get_serializer(user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            
            # Check if user was just approved (approved changed from False to True)
            is_now_approved = serializer.instance.approved
            if not was_approved_before and is_now_approved:
                # Send welcome email when user is approved
                try:
                    template = EMAIL_TEMPLATES['ACCOUNT_APPROVED']
                    email_body = template['body'].format(
                        fullname=user.fullname,
                        setup_link=EMAIL_URLS['SETUP_PASSWORD_URL']
                    )
                    send_mail(
                        template['subject'],
                        email_body,
                        settings.EMAIL_HOST_USER,
                        [user.email],
                        fail_silently=False,
                    )
                    
                    # Log the approval activity
                    add_user_activity(request.user, f"approved user account for {user.fullname}")
                    
                except Exception as e:
                    # Log email error but don't fail the approval
                    print(f"Email sending failed for user {user.email}: {str(e)}")
            
            # Check if user was just denied (has denial_reason and not approved)
            elif not is_now_approved and user.denial_reason and not was_approved_before:
                # Send denial email when user is denied
                try:
                    template = EMAIL_TEMPLATES['ACCOUNT_DENIED']
                    email_body = template['body'].format(
                        fullname=user.fullname,
                        denial_reason=user.denial_reason,
                        support_email=EMAIL_URLS['SUPPORT_EMAIL']
                    )
                    send_mail(
                        template['subject'],
                        email_body,
                        settings.EMAIL_HOST_USER,
                        [user.email],
                        fail_silently=False,
                    )
                    
                    # Log the denial activity
                    add_user_activity(request.user, f"denied user account for {user.fullname}")
                    
                except Exception as e:
                    # Log email error but don't fail the denial
                    print(f"Email sending failed for user {user.email}: {str(e)}")
            
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {"error": f"Failed to update user: {str(e)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def partial_update(self, request, pk=None):
        # Use the same logic as update for partial updates (PATCH)
        return self.update(request, pk)



class ForgotPasswordView(ModelViewSet):
    http_method_names = ["post"]
    serializer_class = ForgotPasswordSerializer
    queryset = ResetPasswordToken.objects.all()

    def create(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        user = CustomUser.objects.get(email=email)
        
        token = self.generate_token()
        
        # Create ResetPasswordToken object with the generated token
        reset_password_token = ResetPasswordToken.objects.create(user=user, token=token)
        
        reset_password_link = f"{EMAIL_URLS['RESET_PASSWORD_URL']}?token={token}"
        
        # Use email template from email_templates.py
        template = EMAIL_TEMPLATES['PASSWORD_RESET']
        email_body = template['body'].format(
            fullname=user.fullname,
            reset_link=reset_password_link,
            token=token
        )

        # Send email
        send_mail(
            template['subject'],
            email_body,
            settings.EMAIL_HOST_USER,
            [user.email],
            fail_silently=False,
        )
        return Response({'message': 'Reset password link sent successfully'}, status=status.HTTP_200_OK)

    def generate_token(self):
            # Generate a random token using a combination of letters and digits
        characters = string.ascii_letters + string.digits
        token_length = 32  # You can adjust the length of the token as needed
        return ''.join(secrets.choice(characters) for i in range(token_length))

class ResetPasswordView(ModelViewSet):
    http_method_names = ["post"]
    serializer_class = ResetPasswordSerializer
    queryset = ResetPasswordToken.objects.all()

    def create(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data['token']
        password = serializer.validated_data['password']
        
        try:
            reset_password_token = ResetPasswordToken.objects.get(token=token)
        except ResetPasswordToken.DoesNotExist:
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)
        
        if reset_password_token.expiry < timezone.now():
            return Response({'error': 'Token expired'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = reset_password_token.user
        user.set_password(password)
        user.save()
        
        reset_password_token.delete()
        
        return Response({'message': 'Password reset successfully'}, status=status.HTTP_200_OK)
