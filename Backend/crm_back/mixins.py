from rest_framework.exceptions import PermissionDenied

class OrganizationContextMixin:
    """
    Mixin to filter queryset by the organization in the request context.
    Requires 'isAuthenticatedCustom' permission which sets request.organization.
    """
    
    def get_queryset(self):
        from django.db import models
        from users.models import Organization
        
        # Get the original queryset from the ViewSet
        queryset = super().get_queryset()
        user = self.request.user

        # Superusers see everything
        if user and user.is_superuser:
            return queryset
        
        # Check if organization is set in request (by isAuthenticatedCustom)
        if hasattr(self.request, 'organization') and self.request.organization:
            active_org = self.request.organization
            
            # Check if the model actually has 'organization' field to avoid errors
            if hasattr(self.queryset.model, 'organization'):
                # Get direct sub-organizations (franchisees/contractors)
                descendants = Organization.objects.filter(parent_organization=active_org).values_list('id', flat=True)
                
                # Base filter: Own data + Direct sub-org data
                org_filter = models.Q(organization=active_org) | models.Q(organization_id__in=descendants)
                
                # Model-specific expansions for assignments
                model_name = self.queryset.model.__name__
                if model_name == 'Estimate':
                    # Allow contractors to see estimates specifically assigned to them 
                    # even if the estimate belongs to the parent org
                    org_filter |= models.Q(assigned_contractor=active_org)
                elif model_name == 'WorkOrder':
                    # Allow contractors to see work orders assigned to them
                    org_filter |= models.Q(contractor=active_org)
                
                return queryset.filter(org_filter).distinct()
            else:
                # If model doesn't have organization (e.g. global types), return as is
                return queryset
        
        # Default to empty if no org context and not superuser
        return queryset.none()
