from rest_framework.permissions import BasePermission
from rest_framework.views import exception_handler
from .utils import decodeJWT
from rest_framework.response import Response


class isAuthenticatedCustom(BasePermission):
    
    def has_permission(self, request,_):
        try:
            auth_token=request.META.get("HTTP_AUTHORIZATION",None)
        except Exception:
            return False
        if not auth_token:
            return False
        
        user=decodeJWT(auth_token)
        if not user:
            return False
        
        request.user=user
        return True


class isAdminUser(BasePermission):
    """
    Permission class that only allows access to admin users
    """
    
    def has_permission(self, request, _):
        # First, authenticate the user
        try:
            auth_token=request.META.get("HTTP_AUTHORIZATION",None)
        except Exception:
            return False
        if not auth_token:
            return False
        
        user=decodeJWT(auth_token)
        if not user:
            return False
        
        # Set the user on the request (authentication successful)
        request.user=user
        
        # Now check if user has admin role (authorization)
        if user.role != 'Admin' and not user.is_superuser:
            # User is authenticated but not authorized
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to access this resource. Admin access required.")
        
        return True
    
def custom_exception_handler(exc,context):
    response=exception_handler(exc,context)

    if response is not None:
        return response
    
    exc_list=str(exc).split("Detail:")
    
    return Response({"error":exc_list[-1]},status=403)

    
