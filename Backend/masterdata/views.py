from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from crm_back.custom_methods import isAuthenticatedCustom
from .models import Customer, Branch, ServiceType, DocumentLibrary, DocumentServiceTypeBranchMapping, MoveType, RoomSize
from .serializers import (
    CustomerSerializer, CustomerStatsSerializer, BranchSerializer, 
    ServiceTypeSerializer, DocumentLibrarySerializer, DocumentMappingSerializer,
    MoveTypeSerializer, RoomSizeSerializer
)
from rest_framework.views import APIView


class CustomerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing customers
    """
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        """
        Optionally filter customers by stage, source, or assigned_to
        """
        queryset = Customer.objects.all()
        
        # Filter by stage
        stage = self.request.query_params.get('stage', None)
        if stage:
            queryset = queryset.filter(stage=stage)
        
        # Filter by source
        source = self.request.query_params.get('source', None)
        if source:
            queryset = queryset.filter(source=source)
        
        # Filter by assigned user
        assigned_to = self.request.query_params.get('assigned_to', None)
        if assigned_to:
            if assigned_to.lower() == 'unassigned':
                queryset = queryset.filter(assigned_to__isnull=True)
            else:
                queryset = queryset.filter(assigned_to__id=assigned_to)
        
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search) |
                Q(email__icontains=search) |
                Q(phone__icontains=search) |
                Q(company__icontains=search)
            )
        
        return queryset
    
    def perform_create(self, serializer):
        """Set the created_by field to the current user"""
        customer = serializer.save(created_by=self.request.user)
        
        # Create activity for new customer
        try:
            from transactiondata.models import CustomerActivity
            CustomerActivity.objects.create(
                customer=customer,
                activity_type='other',
                title=f'Customer Created',
                description=f'New customer {customer.full_name} added to CRM',
                created_by=self.request.user
            )
        except Exception as e:
            # Don't fail the request if activity logging fails
            print(f"Failed to log activity: {e}")
    
    def perform_update(self, serializer):
        """Track stage changes when customer is updated"""
        # Get the old stage before update
        customer = self.get_object()
        old_stage = customer.stage
        
        # Save the updated customer
        updated_customer = serializer.save()
        
        # Check if stage changed
        if old_stage != updated_customer.stage:
            try:
                from transactiondata.models import CustomerActivity
                CustomerActivity.objects.create(
                    customer=updated_customer,
                    activity_type='status_changed',
                    title=f'Stage Changed: {old_stage.title()} → {updated_customer.stage.title()}',
                    description=f'Customer stage changed from {old_stage} to {updated_customer.stage}',
                    created_by=self.request.user
                )
            except Exception as e:
                # Don't fail the request if activity logging fails
                print(f"Failed to log activity: {e}")
    
    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """
        Assign a customer to a user
        """
        customer = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from users.models import CustomUser
            user = CustomUser.objects.get(id=user_id)
            customer.assigned_to = user
            customer.save()
            
            serializer = self.get_serializer(customer)
            return Response(serializer.data)
        except CustomUser.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def unassign(self, request, pk=None):
        """
        Unassign a customer
        """
        customer = self.get_object()
        customer.assigned_to = None
        customer.save()
        
        serializer = self.get_serializer(customer)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def change_stage(self, request, pk=None):
        """
        Change customer stage
        """
        customer = self.get_object()
        old_stage = customer.stage
        new_stage = request.data.get('stage')
        
        if not new_stage:
            return Response(
                {'error': 'stage is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate stage choice
        valid_stages = [choice[0] for choice in Customer._meta.get_field('stage').choices]
        if new_stage not in valid_stages:
            return Response(
                {'error': f'Invalid stage. Must be one of: {", ".join(valid_stages)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        customer.stage = new_stage
        customer.save()
        
        # Create activity record for stage change
        try:
            from transactiondata.models import CustomerActivity
            CustomerActivity.objects.create(
                customer=customer,
                activity_type='status_changed',
                title=f'Stage Changed: {old_stage.title()} → {new_stage.title()}',
                description=f'Customer stage changed from {old_stage} to {new_stage}',
                created_by=request.user
            )
        except Exception as e:
            # Don't fail the request if activity logging fails
            print(f"Failed to log activity: {e}")
        
        serializer = self.get_serializer(customer)
        return Response(serializer.data)


class CustomerStatisticsViewSet(viewsets.ViewSet):
    """
    ViewSet for customer statistics
    """
    permission_classes = (isAuthenticatedCustom,)
    http_method_names = ['get']
    
    def list(self, request):
        """
        Get customer statistics
        """
        total_customers = Customer.objects.count()
        total_leads = Customer.objects.filter(stage='lead').count()
        unassigned_leads = Customer.objects.filter(
            stage='lead',
            assigned_to__isnull=True
        ).count()
        
        # Statistics by stage
        by_stage = {}
        stage_stats = Customer.objects.values('stage').annotate(count=Count('id'))
        for stat in stage_stats:
            by_stage[stat['stage']] = stat['count']
        
        # Statistics by source
        by_source = {}
        source_stats = Customer.objects.values('source').annotate(count=Count('id'))
        for stat in source_stats:
            by_source[stat['source']] = stat['count']
        
        data = {
            'total_customers': total_customers,
            'total_leads': total_leads,
            'unassigned_leads': unassigned_leads,
            'by_stage': by_stage,
            'by_source': by_source
        }
        
        serializer = CustomerStatsSerializer(data)
        return Response(serializer.data)


class BranchViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing branches
    """
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = Branch.objects.all()
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(destination__icontains=search) |
                Q(dispatch_location__icontains=search)
            )
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ServiceTypeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing service types
    """
    queryset = ServiceType.objects.all()
    serializer_class = ServiceTypeSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = ServiceType.objects.all()
        
        # Filter by enabled status
        enabled = self.request.query_params.get('enabled', None)
        if enabled is not None:
            queryset = queryset.filter(enabled=enabled.lower() == 'true')
        
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(service_type__icontains=search)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


from django.http import HttpResponse, FileResponse
from django.views.decorators.clickjacking import xframe_options_exempt
from django.utils.decorators import method_decorator
import mimetypes
import os

class DocumentLibraryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing documents
    """
    queryset = DocumentLibrary.objects.all()
    serializer_class = DocumentLibrarySerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_serializer_context(self):
        """
        Pass request to serializer for building absolute URLs
        """
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def get_queryset(self):
        queryset = DocumentLibrary.objects.all()
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by service type
        service_type_id = self.request.query_params.get('service_type', None)
        if service_type_id:
            queryset = queryset.filter(mappings__service_type__id=service_type_id).distinct()
        
        # Filter by branch
        branch_id = self.request.query_params.get('branch', None)
        if branch_id:
            queryset = queryset.filter(mappings__branch__id=branch_id).distinct()
        
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(document_type__icontains=search)
            )
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @method_decorator(xframe_options_exempt)
    @action(detail=True, methods=['get'])
    def view_file(self, request, pk=None):
        """
        Serve the file content with headers that allow framing/embedding
        """
        document = self.get_object()
        if not document.file:
            return Response({'error': 'No file attached'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get file path
        file_path = document.file.path
        
        # Check if file exists
        if not os.path.exists(file_path):
            return Response({'error': 'File not found on server'}, status=status.HTTP_404_NOT_FOUND)
            
        # Open file
        try:
            file_handle = open(file_path, 'rb')
            
            # Determine mime type
            content_type, encoding = mimetypes.guess_type(file_path)
            if not content_type:
                content_type = 'application/octet-stream'
                
            # Create response
            response = FileResponse(file_handle, content_type=content_type)
            
            # Set headers to allow embedding
            # Remove X-Frame-Options if it exists (though middleware might add it back, we can try to override)
            # Setting it to SAMEORIGIN is safer but if frontend/backend are different ports/domains, it might fail
            # We can try removing it or setting to ALLOWALL (which isn't standard but some ignore)
            # Best is to not send it, or send it as SAMEORIGIN if on same domain
            # If frontend is on localhost:3000 and backend localhost:8000, they are different origins.
            
            response['X-Frame-Options'] = 'ALLOWALL'  # Not standard, but try to override
            # Alternatively, we can just not set it and hope middleware doesn't override, 
            # OR we can rely on the fact that we are serving a file directly.
            
            # Also set Content-Disposition to inline to ensure it displays in browser
            response['Content-Disposition'] = f'inline; filename="{os.path.basename(file_path)}"'
            
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DocumentMappingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing document mappings
    """
    queryset = DocumentServiceTypeBranchMapping.objects.all()
    serializer_class = DocumentMappingSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = DocumentServiceTypeBranchMapping.objects.all()
        
        # Filter by document
        document_id = self.request.query_params.get('document', None)
        if document_id:
            queryset = queryset.filter(document__id=document_id)
        
        # Filter by service type
        service_type_id = self.request.query_params.get('service_type', None)
        if service_type_id:
            queryset = queryset.filter(service_type__id=service_type_id)
        
        # Filter by branch
        branch_id = self.request.query_params.get('branch', None)
        if branch_id:
            queryset = queryset.filter(branch__id=branch_id)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class MoveTypeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing move types
    """
    queryset = MoveType.objects.all()
    serializer_class = MoveTypeSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = MoveType.objects.all()
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search)
            )
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class RoomSizeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing room sizes
    """
    queryset = RoomSize.objects.all()
    serializer_class = RoomSizeSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = RoomSize.objects.all()
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search)
            )
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
