from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from .serializers import (CreateUserSerializer,CustomUser,LoginSerializer,
                          UpdatePasswordSerializer,CustomUserSerializer,
                          UserActivities, UserActivitiesSerializer,
                          ForgotPasswordSerializer,ResetPasswordSerializer,
                          OrganizationSerializer, OrganizationDetailSerializer,
                          OrganizationMemberSerializer, SystemPermissionSerializer, 
                          OrganizationRoleSerializer)
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from .models import ResetPasswordToken, Organization, OrganizationMember, OrganizationRole, SystemPermission
from django.utils import timezone
import secrets
import string

from django.db import transaction
from django.db.models import Q
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

        # Extract Organization Name 
        organization_name = user_data.pop('organization_name')
        
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
        
        try:
            with transaction.atomic():
                # 1. Create Organization
                organization = Organization.objects.create(
                    name=organization_name,
                    org_type='company', # Default type
                    is_active=True
                )

                # 2. Create Default Admin Role
                admin_role = OrganizationRole.objects.create(
                    organization=organization,
                    name="Admin",
                    is_default_admin=True
                )
                
                # 3. Create User
                user = CustomUser(**user_data)
                user.save()

                # 4. Create Membership
                OrganizationMember.objects.create(
                    user=user,
                    organization=organization,
                    role=admin_role,
                    is_default=True
                )

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
                    
                message = "User and Organization created successfully" if user.approved else "Account request submitted successfully"
                return Response({"success": message}, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

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
        
        # Get user's organizations
        organizations = []
        if user.is_superuser:
            all_orgs = Organization.objects.filter(is_active=True)
            all_perms = list(SystemPermission.objects.values_list('codename', flat=True))
            for i, org in enumerate(all_orgs):
                organizations.append({
                    "id": org.id,
                    "name": org.name,
                    "type": org.org_type,
                    "role": "Superuser",
                    "is_default": i == 0,
                    "permissions": all_perms
                })
        else:
            memberships = OrganizationMember.objects.filter(user=user).select_related('organization', 'role')
            for member in memberships:
                perms = []
                if member.role:
                    if member.role.is_default_admin:
                        perms = list(SystemPermission.objects.values_list('codename', flat=True))
                    else:
                        perms = list(member.role.permissions.values_list('codename', flat=True))
                
                organizations.append({
                    "id": member.organization.id,
                    "name": member.organization.name,
                    "type": member.organization.org_type,
                    "role": member.role.name if member.role else "Member",
                    "is_default": member.is_default,
                    "permissions": perms
                })

        return Response ({
            "access":access,
            "role":user.role,
            "id":user.id,
            "fullname":user.fullname,
            "email":user.email,
            "is_superuser": user.is_superuser,
            "organizations": organizations
        })


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
        from crm_back.custom_methods import get_user_permissions
        data=self.serializer_class(request.user, context={'request': request}).data
        data['current_organization_permissions'] = get_user_permissions(request)
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
        # By default, exclude superusers from the standard users list
        users=self.queryset.filter(is_superuser=False)
        data=self.serializer_class(users,many=True).data
        return  Response(data)

    @action(detail=False, methods=['get'])
    def global_users(self, request):
        """
        List all superusers (global users). Accessible only to superusers.
        """
        if not request.user.is_superuser:
            return Response({"error": "Permission denied. Only superusers can view global users."}, status=status.HTTP_403_FORBIDDEN)
        
        users = self.queryset.filter(is_superuser=True)
        data = self.serializer_class(users, many=True).data
        return Response(data)
    
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
        

class SystemPermissionViewSet(ModelViewSet):
    serializer_class = SystemPermissionSerializer
    queryset = SystemPermission.objects.all()
    http_method_names = ['get'] # View only for admins/roles setup
    permission_classes = (isAdminUser,)

class OrganizationRoleViewSet(ModelViewSet):
    serializer_class = OrganizationRoleSerializer
    queryset = OrganizationRole.objects.all()
    permission_classes = (isAdminUser,)

    def get_queryset(self):
        # Filter roles to only show those belonging to the current organization
        if hasattr(self.request, 'organization') and self.request.organization:
            return self.queryset.filter(organization=self.request.organization)
        if self.request.user.is_superuser:
            return self.queryset
        return self.queryset.none()

    def perform_create(self, serializer):
        # Auto-assign organization on create
        if hasattr(self.request, 'organization') and self.request.organization:
            serializer.save(organization=self.request.organization)
        elif self.request.user.is_superuser:
            serializer.save()
        else:
            raise Exception("Organization context required to create roles.")

    def destroy(self, request, *args, **kwargs):
        role = self.get_object()
        if role.is_default_admin:
            return Response({"error": "Cannot delete default administrator role."}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

class OrganizationViewSet(ModelViewSet):
    serializer_class = OrganizationSerializer
    queryset = Organization.objects.all()
    permission_classes = (isAuthenticatedCustom,)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return OrganizationDetailSerializer
        return OrganizationSerializer

    def get_queryset(self):
        user = self.request.user
        show_inactive = self.request.query_params.get('show_inactive', 'false').lower() == 'true'
        
        if user.is_superuser:
            if show_inactive:
                return self.queryset
            return self.queryset.filter(is_active=True)
        
        # Get organizations where user is a member
        member_org_ids = OrganizationMember.objects.filter(user=user).values_list('organization_id', flat=True)
        
        # Non-superusers see organizations they are members of AND their direct sub-organizations
        qs = self.queryset.filter(
            models.Q(id__in=member_org_ids) | 
            models.Q(parent_organization_id__in=member_org_ids)
        ).distinct()

        if not show_inactive:
            qs = qs.filter(is_active=True)
            
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_superuser:
            serializer.save()
        else:
            # If admin of an organization, set parent and restrict types
            if hasattr(self.request, 'organization') and self.request.organization:
                org_type = self.request.data.get('org_type')
                if org_type not in ['franchisee', 'contractor']:
                    raise Exception("You can only create Franchisee or Contractor organizations.")
                
                serializer.save(
                    parent_organization=self.request.organization,
                    org_type=org_type
                )
            else:
                raise Exception("You must be an admin of an organization to create sub-organizations.")

    def destroy(self, request, *args, **kwargs):
        """
        Reimplemented deletion: Superusers can delete any organization.
        """
        if not request.user.is_superuser:
            return Response({"error": "Only superusers can delete organizations."}, status=status.HTTP_403_FORBIDDEN)
        
        instance = self.get_object()
        org_name = instance.name
        
        try:
            with transaction.atomic():
                instance.delete()
            return Response({"message": f"Organization '{org_name}' deleted successfully."}, status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"error": f"Failed to delete organization: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """
        List members and their roles for an organization.
        """
        organization = self.get_object()
        
        # Permission check: superuser or member of this org
        is_superuser = request.user.is_superuser
        is_member = OrganizationMember.objects.filter(
            user=request.user, 
            organization=organization
        ).exists()

        if not (is_superuser or is_member):
            return Response({"error": "You do not have permission to view members for this organization."}, status=status.HTTP_403_FORBIDDEN)

        members = OrganizationMember.objects.filter(organization=organization).select_related('user', 'role')
        
        # Filter by permission if provided
        permission_codename = request.query_params.get('permission')
        if permission_codename:
            # Filter users whose role has this permission
            # OR users who are default admins (they have all permissions)
            members = members.filter(
                Q(role__permissions__codename=permission_codename) |
                Q(role__is_default_admin=True)
            ).distinct()

        serializer = OrganizationMemberSerializer(members, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        """
        Add a member to the organization.
        Accepts: email, fullname, role_id (optional), is_default (optional)
        """
        organization = self.get_object()
        email = request.data.get('email')
        fullname = request.data.get('fullname')
        role_id = request.data.get('role_id')
        is_default = request.data.get('is_default', False)

        if not email or not fullname:
            return Response({"error": "Email and fullname are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                # Get or create user
                password = request.data.get('password')
                temp_password = None

                user = CustomUser.objects.filter(email=email).first()
                created = False
                
                if not user:
                    # Create new user
                    created = True
                    user = CustomUser.objects.create(
                        email=email,
                        fullname=fullname,
                        approved=True,
                        is_active=True
                    )
                    if password:
                        user.set_password(password)
                    else:
                        # Generate random temporary password if none provided by superuser
                        import secrets
                        import string
                        alphabet = string.ascii_letters + string.digits
                        temp_password = ''.join(secrets.choice(alphabet) for i in range(12))
                        user.set_password(temp_password)
                    user.save()
                
                # If user exists but was not approved, approve them
                elif not user.approved:
                    user.approved = True
                    user.is_active = True
                    user.save()

                # Get role
                role = None
                if role_id:
                    role = OrganizationRole.objects.get(id=role_id, organization=organization)
                else:
                    # Default to regular "User" role or whatever is available
                    role = OrganizationRole.objects.filter(organization=organization).first()

                # Create or update membership
                member, member_created = OrganizationMember.objects.get_or_create(
                    user=user,
                    organization=organization,
                    defaults={'role': role, 'is_default': is_default}
                )

                if not member_created:
                    # Update role if member already exists
                    member.role = role
                    member.save()

                # Send welcome email if the user was just created or approved by this action
                # We check if they need to set a password (they don't have one or it was just set)
                if created or (not user.password):
                    try:
                        # Generate reset token for the link (optional if temp_password is provided)
                        token = ''.join(secrets.choice(string.ascii_letters + string.digits) for i in range(32))
                        ResetPasswordToken.objects.create(user=user, token=token)
                        
                        reset_link = f"{EMAIL_URLS['RESET_PASSWORD_URL']}?token={token}"
                        
                        template = EMAIL_TEMPLATES['WELCOME_ADMIN_CREATED']
                        email_body = template['body'].format(
                            fullname=user.fullname,
                            setup_link=reset_link
                        )
                        
                        send_mail(
                            template['subject'],
                            email_body,
                            settings.EMAIL_HOST_USER,
                            [user.email],
                            fail_silently=False,
                        )
                    except Exception as e:
                        print(f"Failed to send welcome email to {user.email}: {str(e)}")

                response_data = {
                    "message": "Member added successfully",
                    "user_id": user.id,
                    "created": created
                }
                
                # If a temporary password was generated or provided, return it in the response for the superuser
                if temp_password and request.user.is_superuser:
                    response_data["temporary_password"] = temp_password
                elif password and request.user.is_superuser:
                    response_data["password"] = password

                return Response(response_data, status=status.HTTP_201_CREATED)

        except OrganizationRole.DoesNotExist:
            return Response({"error": "Role not found in this organization."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def remove_member(self, request, pk=None):
        """
        Remove a member from the organization.
        """
        organization = self.get_object()
        user_id = request.data.get('user_id')

        if not user_id:
            return Response({"error": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            member = OrganizationMember.objects.get(user_id=user_id, organization=organization)
            
            # Prevent removing the last admin? (Optional safety)
            if member.role and member.role.is_default_admin:
                admin_count = OrganizationMember.objects.filter(organization=organization, role__is_default_admin=True).count()
                if admin_count <= 1:
                    return Response({"error": "Cannot remove the last administrator of the organization."}, status=status.HTTP_400_BAD_REQUEST)

            member.delete()
            return Response({"message": "Member removed successfully."}, status=status.HTTP_200_OK)
        except OrganizationMember.DoesNotExist:
            return Response({"error": "Member not found in this organization."}, status=status.HTTP_404_NOT_FOUND)
