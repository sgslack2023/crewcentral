from rest_framework.permissions import BasePermission
from rest_framework.views import exception_handler
from .utils import decodeJWT
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied


from users.models import OrganizationMember, Organization

class isAuthenticatedCustom(BasePermission):
    
    def has_permission(self, request, _):
        try:
            auth_token = request.META.get("HTTP_AUTHORIZATION", None)
        except Exception:
            return False
        if not auth_token:
            return False
        
        user = decodeJWT(auth_token)
        if not user:
            return False
        
        request.user = user

        # Organization Context Logic
        org_id = request.META.get("HTTP_X_ORGANIZATION_ID")
        request.organization = None

        if org_id:
            try:
                # Ensure it's a valid integer
                org_id_int = int(org_id)
                
                if user.is_superuser:
                    try:
                        request.organization = Organization.objects.get(id=org_id_int, is_active=True)
                    except Organization.DoesNotExist:
                        # Fallback for superuser if ID is wrong
                        pass
                else:
                    try:
                        # Check direct membership first
                        membership = OrganizationMember.objects.filter(user=user, organization_id=org_id_int).first()
                        
                        if membership:
                            request.organization = membership.organization
                            request.org_member = membership
                        else:
                            # Check if user is a member of the PARENT organization of this target
                            try:
                                target_org = Organization.objects.get(id=org_id_int, is_active=True)
                                if target_org.parent_organization:
                                    parent_membership = OrganizationMember.objects.filter(
                                        user=user, 
                                        organization=target_org.parent_organization
                                    ).first()
                                    
                                    if parent_membership:
                                        request.organization = target_org
                                        # Use parent membership for permissions
                                        request.org_member = parent_membership
                                    else:
                                        raise PermissionDenied("You do not have access to this organization.")
                                else:
                                    raise PermissionDenied("You do not have access to this organization.")
                            except Organization.DoesNotExist:
                                pass # Fallback to raise generic error below if not set
                    except Exception as e:
                        if isinstance(e, PermissionDenied):
                            raise e
                        pass
                    
                    if not request.organization:
                        raise PermissionDenied("You are not a member of this organization context.")
            except (ValueError, TypeError):
                # If org_id is e.g. "undefined" or "null", ignore it and fallback
                pass

        # Fallback logic if organization wasn't set by header
        if not getattr(request, 'organization', None):
            if user.is_superuser:
                request.organization = Organization.objects.filter(is_active=True).first()
            else:
                try:
                    membership = OrganizationMember.objects.filter(user=user, is_default=True).first()
                    if not membership:
                        membership = OrganizationMember.objects.filter(user=user).first()
                    
                    if membership:
                        request.organization = membership.organization
                        request.org_member = membership
                except:
                    pass
        
        return True
        
        return True


class isAdminUser(isAuthenticatedCustom):
    """
    Permission class that only allows access to admin users.
    Inherits from isAuthenticatedCustom to ensure user authentication and organization context are loaded.
    """
    
    def has_permission(self, request, view):
        # First, ensure authenticated and organization context is set
        if not super().has_permission(request, view):
            return False
        
        # Superusers are always allowed
        if request.user.is_superuser:
            return True
            
        # Check global role legacy (optional)
        if getattr(request.user, 'role', None) == 'Admin':
            return True
            
        # Check organization membership and role (set by isAuthenticatedCustom)
        if hasattr(request, 'org_member') and request.org_member:
            role = request.org_member.role
            if role and (role.is_default_admin or role.name == 'Admin'):
                return True
                
        return False

class HasSystemPermission(BasePermission):
    """
    Dynamic permission check. usage:
    permission_classes = [HasSystemPermission]
    required_permissions = ['view_customers', 'edit_customers']
    """
    def has_permission(self, request, view):
        if not hasattr(request, 'user') or not request.user:
            return False
            
        if request.user.is_superuser:
            return True
            
        required_perms = getattr(view, 'required_permissions', [])
        if not required_perms:
            return True
            
        # Handle dictionary mapping of action -> permissions
        if isinstance(required_perms, dict):
            action = getattr(view, 'action', None)
            # Find matching permissions for the current action
            required_perms = required_perms.get(action, [])
            
            # If no specific permissions listed for this action, allow if not explicitly required
            if not required_perms:
                return True
            
        user_perms = get_user_permissions(request)
        
        # Check if user has ANY of the required permissions (OR logic) 
        return any(perm in user_perms for perm in required_perms)

def get_user_permissions(request):
    """
    Helper to get flattened list of permission codenames for the current user in the active org.
    """
    if not hasattr(request, 'user') or not request.user:
        return []
        
    if request.user.is_superuser:
        from users.models import SystemPermission
        return list(SystemPermission.objects.values_list('codename', flat=True))
        
    if hasattr(request, 'org_member') and request.org_member:
        role = request.org_member.role
        if role:
            if role.is_default_admin:
                from users.models import SystemPermission
                return list(SystemPermission.objects.values_list('codename', flat=True))
            return list(role.permissions.values_list('codename', flat=True))
            
    return []
    
def custom_exception_handler(exc,context):
    response=exception_handler(exc,context)

    if response is not None:
        return response
    
    exc_list=str(exc).split("Detail:")
    
    return Response({"error":exc_list[-1]},status=403)

    
