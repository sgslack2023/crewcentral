from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from django.db.models import Count, Q
from crm_back.custom_methods import isAuthenticatedCustom, isAdminUser, HasSystemPermission
from crm_back.mixins import OrganizationContextMixin
from .models import (
    Customer, Branch, ServiceType, DocumentLibrary, 
    DocumentServiceTypeBranchMapping, MoveType, RoomSize,
    EndpointConfiguration, RawEndpointLead
)
from django_q.models import Schedule
from .serializers import (
    CustomerSerializer, CustomerStatsSerializer, BranchSerializer, 
    ServiceTypeSerializer, DocumentLibrarySerializer, DocumentMappingSerializer,
    MoveTypeSerializer, RoomSizeSerializer,
    EndpointConfigurationSerializer, RawEndpointLeadSerializer,
    ScheduleSerializer
)
from rest_framework.views import APIView
from users.models import Organization

class LeadIngestionView(APIView):
    """
    Public endpoint for ingesting leads from external sources
    """
    authentication_classes = [] 
    permission_classes = []

    def post(self, request, config_id=None):
        data = request.data
        secret_key = request.headers.get('X-Endpoint-Secret') or request.query_params.get('secret')
        
        endpoint_config = None
        
        if config_id:
            try:
                endpoint_config = EndpointConfiguration.objects.get(id=config_id, is_active=True)
            except EndpointConfiguration.DoesNotExist:
                return Response({'error': 'Invalid or inactive endpoint configuration ID'}, status=status.HTTP_404_NOT_FOUND)
        elif secret_key:
            try:
                endpoint_config = EndpointConfiguration.objects.get(secret_key=secret_key, is_active=True)
            except EndpointConfiguration.DoesNotExist:
                return Response({'error': 'Invalid or inactive secret key'}, status=status.HTTP_401_UNAUTHORIZED)
        else:
            return Response({'error': 'Endpoint ID in URL or X-Endpoint-Secret header is required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Save raw lead
        raw_lead = RawEndpointLead.objects.create(
            organization=endpoint_config.organization,
            endpoint_config=endpoint_config,
            raw_data=data
        )

        return Response({
            'message': 'Data received and stored successfully', 
            'id': raw_lead.id
        }, status=status.HTTP_201_CREATED)


class EndpointConfigurationViewSet(OrganizationContextMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing organization endpoint configurations
    """
    queryset = EndpointConfiguration.objects.all()
    serializer_class = EndpointConfigurationSerializer
    permission_classes = (isAuthenticatedCustom,)

    def perform_create(self, serializer):
        kwargs = {}
        if hasattr(self.request, 'organization') and self.request.organization:
            kwargs['organization'] = self.request.organization
        serializer.save(**kwargs)


class RawEndpointLeadViewSet(OrganizationContextMixin, viewsets.ModelViewSet):
    """
    ViewSet for viewing raw leads
    """
    queryset = RawEndpointLead.objects.all()
    serializer_class = RawEndpointLeadSerializer
    permission_classes = (isAuthenticatedCustom,)
    http_method_names = ['get', 'delete'] # Only allow viewing and deleting



class CustomerViewSet(OrganizationContextMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing customers
    """
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = (isAuthenticatedCustom, HasSystemPermission)
    
    required_permissions = {
        'list': ['view_customers'],
        'retrieve': ['view_customers'],
        'create': ['create_customers', 'create_leads'], # 'create_leads' is essentially same as customers in this context
        'update': ['edit_customers'],
        'partial_update': ['edit_customers'],
        'destroy': ['delete_customers'],
        'archive': ['edit_customers'],
        'unarchive': ['edit_customers']
    }
    
    def get_queryset(self):
        """
        Optionally filter customers by stage, source, or assigned_to
        """
        queryset = super().get_queryset()
        
        # Handle archiving: restrict to archived/active ONLY for list action
        # This allows retrieve/archive/unarchive to find the object by ID regardless of status
        if self.action == 'list':
            show_archived = self.request.query_params.get('show_archived', 'false').lower() == 'true'
            queryset = queryset.filter(is_archived=show_archived)
        
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

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """
        Archive a customer
        """
        customer = self.get_object()
        customer.is_archived = True
        customer.save()
        
        # Log activity
        try:
            from transactiondata.models import CustomerActivity
            CustomerActivity.objects.create(
                customer=customer,
                activity_type='status_changed',
                title='Customer Archived',
                description='Customer has been moved to archives',
                created_by=request.user
            )
        except Exception as e:
            print(f"Failed to log activity: {e}")
            
        serializer = self.get_serializer(customer)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def unarchive(self, request, pk=None):
        """
        Unarchive a customer
        """
        customer = self.get_object()
        customer.is_archived = False
        customer.save()
        
        # Log activity
        try:
            from transactiondata.models import CustomerActivity
            CustomerActivity.objects.create(
                customer=customer,
                activity_type='status_changed',
                title='Customer Unarchived',
                description='Customer has been restored from archives',
                created_by=request.user
            )
        except Exception as e:
            print(f"Failed to log activity: {e}")
            
        serializer = self.get_serializer(customer)
        return Response(serializer.data)
    
    def perform_create(self, serializer):
        """Set the created_by field to the current user"""
        kwargs = {'created_by': self.request.user}
        if hasattr(self.request, 'organization') and self.request.organization:
            kwargs['organization'] = self.request.organization
        customer = serializer.save(**kwargs)
        
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
            
            # Send welcome email if customer has email
            if customer.email:
                from django_q.tasks import async_task
                from transactiondata.tasks import send_new_lead_welcome_email, get_active_schedule
                
                # Link task to schedule for UI tracking
                task_name = None
                if hasattr(customer, 'organization') and customer.organization:
                    schedule = get_active_schedule('new_lead', customer.organization.id)
                    if schedule:
                        task_name = schedule.name
                
                async_task(send_new_lead_welcome_email, customer.id, q_options={'name': task_name} if task_name else None)
                
        except Exception as e:
            # Don't fail the request if activity logging or email fails
            print(f"Failed to log activity or trigger lead email task: {e}")
    
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
                
                # Automation Triggers
                self._trigger_stage_automations(updated_customer)
                    
            except Exception as e:
                # Don't fail the request if activity logging or automation fails
                print(f"Failed to log activity or trigger automation: {e}")
    
    def _trigger_stage_automations(self, customer, frontend_url=None):
        """Helper to trigger automations when stage changes"""
        from django_q.tasks import async_task
        from django.conf import settings
        
        # Use provided frontend_url or fall back to settings
        if not frontend_url:
            frontend_url = settings.FRONTEND_URL
            
        print(f"Checking automations for customer {customer.id}, stage: {customer.stage}, email: {customer.email}")

        if customer.stage == 'new_lead' and customer.email:
            print(f"Triggering new_lead automation for customer {customer.id}")
            from transactiondata.tasks import send_new_lead_welcome_email, get_active_schedule
            
            task_name = None
            if hasattr(customer, 'organization') and customer.organization:
                schedule = get_active_schedule('new_lead', customer.organization.id)
                if schedule:
                    task_name = schedule.name
            
            async_task(send_new_lead_welcome_email, customer.id, q_options={'name': task_name} if task_name else None)
        elif customer.stage == 'booked' and customer.email:
            print(f"Triggering booked automation for customer {customer.id}")
            from transactiondata.tasks import send_booked_async, get_active_schedule
            
            task_name = None
            if hasattr(customer, 'organization') and customer.organization:
                schedule = get_active_schedule('booked', customer.organization.id)
                if schedule:
                    task_name = schedule.name
            
            async_task(send_booked_async, customer.id, q_options={'name': task_name} if task_name else None)
        elif customer.stage == 'closed' and customer.email:
            print(f"Triggering closed automation for customer {customer.id}")
            from transactiondata.tasks import send_closed_async, get_active_schedule
            
            task_name = None
            if hasattr(customer, 'organization') and customer.organization:
                schedule = get_active_schedule('closed', customer.organization.id)
                if schedule:
                    task_name = schedule.name
            
            async_task(send_closed_async, customer.id, frontend_url, q_options={'name': task_name} if task_name else None)
        else:
            print(f"No automation triggered for stage {customer.stage} (email present: {bool(customer.email)})")

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
            
        # Trigger automations for stage change
        if old_stage != new_stage:
            frontend_url = request.data.get('frontend_url', 'http://127.0.0.1:3000')
            self._trigger_stage_automations(customer, frontend_url)
            
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
        customers = Customer.objects.all()
        # Apply org context filter manually since this is a ViewSet
        if hasattr(request, 'organization') and request.organization:
            customers = customers.filter(organization=request.organization)
            
        total_customers = customers.count()
        total_leads = customers.filter(stage='lead').count()
        unassigned_leads = customers.filter(
            stage='lead',
            assigned_to__isnull=True
        ).count()
        
        # Statistics by stage
        by_stage = {}
        stage_stats = customers.values('stage').annotate(count=Count('id'))
        for stat in stage_stats:
            by_stage[stat['stage']] = stat['count']
        
        # Statistics by source
        by_source = {}
        source_stats = customers.values('source').annotate(count=Count('id'))
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


class BranchViewSet(OrganizationContextMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing branches
    """
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
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
        kwargs = {'created_by': self.request.user}
        if hasattr(self.request, 'organization') and self.request.organization:
            kwargs['organization'] = self.request.organization
        serializer.save(**kwargs)


class ServiceTypeViewSet(OrganizationContextMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing service types
    """
    queryset = ServiceType.objects.all()
    serializer_class = ServiceTypeSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
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
        kwargs = {'created_by': self.request.user}
        if hasattr(self.request, 'organization') and self.request.organization:
            kwargs['organization'] = self.request.organization
        serializer.save(**kwargs)


from django.http import HttpResponse, FileResponse
from django.views.decorators.clickjacking import xframe_options_exempt
from django.utils.decorators import method_decorator
import mimetypes
import os

class DocumentLibraryViewSet(OrganizationContextMixin, viewsets.ModelViewSet):
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
        queryset = super().get_queryset()
        
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
                Q(document_type__icontains=search) |
                Q(subject__icontains=search)
            )
        
        # Filter by category
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category=category)
        
        # Exclude by category
        exclude_category = self.request.query_params.get('exclude_category', None)
        if exclude_category:
            queryset = queryset.exclude(category=exclude_category)
        
        return queryset
    
    def perform_create(self, serializer):
        kwargs = {'created_by': self.request.user}
        if hasattr(self.request, 'organization') and self.request.organization:
            kwargs['organization'] = self.request.organization
        serializer.save(**kwargs)

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


class DocumentMappingViewSet(OrganizationContextMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing document mappings
    """
    queryset = DocumentServiceTypeBranchMapping.objects.all()
    serializer_class = DocumentMappingSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
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
        kwargs = {'created_by': self.request.user}
        if hasattr(self.request, 'organization') and self.request.organization:
            kwargs['organization'] = self.request.organization
        serializer.save(**kwargs)


class MoveTypeViewSet(OrganizationContextMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing move types
    """
    queryset = MoveType.objects.all()
    serializer_class = MoveTypeSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
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
        kwargs = {'created_by': self.request.user}
        if hasattr(self.request, 'organization') and self.request.organization:
            kwargs['organization'] = self.request.organization
        serializer.save(**kwargs)


class RoomSizeViewSet(OrganizationContextMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing room sizes
    """
    queryset = RoomSize.objects.all()
    serializer_class = RoomSizeSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
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
        kwargs = {'created_by': self.request.user}
        if hasattr(self.request, 'organization') and self.request.organization:
            kwargs['organization'] = self.request.organization
        serializer.save(**kwargs)

class ScheduleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing scheduled tasks (django_q.models.Schedule)
    """
    queryset = Schedule.objects.all()
    serializer_class = ScheduleSerializer
    permission_classes = (isAdminUser,) # Only admins should manage schedules

    def get_queryset(self):
        """
        Filter schedules by organization context.
        """
        queryset = super().get_queryset()
        user = self.request.user

        # Superusers see all schedules
        if user.is_superuser:
            return queryset

        # Standard admins see schedules explicitly tagged with their organization_id in kwargs
        if hasattr(self.request, 'organization') and self.request.organization:
            org_id = self.request.organization.id
            
            # Since kwargs is a text field or JSON in django-q, we need to filter carefully
            # A more robust way is to iterate and filter if the DB doesn't support JSON queries well
            # or if it's stored as a stringified dict as seen in get_active_schedule
            
            import json
            import ast
            
            valid_ids = []
            for s in queryset:
                if not s.kwargs:
                    continue
                
                kwargs = s.kwargs
                if isinstance(kwargs, str):
                    try:
                        # Attempt to parse
                        try:
                            kwargs = ast.literal_eval(kwargs)
                        except:
                            kwargs = json.loads(kwargs.replace("'", '"'))
                    except:
                        continue
                
                if isinstance(kwargs, dict) and kwargs.get('organization_id') == org_id:
                    valid_ids.append(s.id)
            
            return queryset.filter(id__in=valid_ids)
            
        return queryset.none()
    
    @action(detail=False, methods=['get'])
    def logs(self, request):
        """
        Return the history of executed tasks.
        """
        from django_q.models import Task
        from .serializers import TaskSerializer
        from rest_framework.response import Response
        import json
        import ast
        
        user = request.user
        tasks_qs = Task.objects.all().order_by('-stopped')
        
        if not user.is_superuser and hasattr(request, 'organization') and request.organization:
            org_id = request.organization.id
            valid_task_ids = []
            
            # Filter first 200 tasks to find matching ones (performance guard)
            recent_tasks = tasks_qs[:200]
            
            for t in recent_tasks:
                if not t.kwargs:
                    continue
                
                kwargs = t.kwargs
                if isinstance(kwargs, str):
                    try:
                        try:
                            kwargs = ast.literal_eval(kwargs)
                        except:
                            kwargs = json.loads(kwargs.replace("'", '"'))
                    except:
                        continue
                
                if isinstance(kwargs, dict) and kwargs.get('organization_id') == org_id:
                    valid_task_ids.append(t.id)
            
            tasks = Task.objects.filter(id__in=valid_task_ids).order_by('-stopped')[:50]
        else:
            tasks = tasks_qs[:50]

        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def create_automation(self, request):
        """
        Create a new automation schedule with validation.
        Expected payload: {
            "name": "Send Invoices Daily",
            "task_type": "invoices|receipts|estimates",
            "schedule_type": "HOURLY|DAILY|WEEKLY|CRON",
            "minutes": 60 (for hourly),
            "repeats": -1 (infinite) or N (number of times)
        }
        """
        from rest_framework.response import Response
        from rest_framework import status
        
        task_type = request.data.get('task_type')
        name = request.data.get('name')
        schedule_type = request.data.get('schedule_type', 'HOURLY')
        minutes = request.data.get('minutes', 60)
        repeats = request.data.get('repeats', -1)
        
        # Map human-readable schedule types to django-q short codes
        type_map = {
            'HOURLY': 'H',
            'DAILY': 'D',
            'WEEKLY': 'W',
            'MONTHLY': 'M',
            'QUARTERLY': 'Q',
            'YEARLY': 'Y',
            'ONCE': 'O',
            'MINUTES': 'I',
        }
        mapped_type = type_map.get(schedule_type, schedule_type)
        
        # Map task type to function path
        task_functions = {
            'invoices': 'transactiondata.tasks.send_pending_invoices',
            'receipts': 'transactiondata.tasks.send_pending_receipts',
            'estimates': 'transactiondata.tasks.send_pending_estimates',
            'leads': 'masterdata.tasks.process_raw_endpoint_leads',
            'new_lead': None,  # Event-driven
            'booked': None,    # Event-driven
            'closed': None     # Event-driven
        }
        
        if task_type not in task_functions:
            return Response(
                {'error': f'Invalid task_type. Must be one of: {", ".join(task_functions.keys())}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        func_path = task_functions[task_type] or 'masterdata.tasks.noop_automation'
        
        # Handle document/template selection
        document_id = request.data.get('document_id')
        kwargs = {
            'task_type': task_type
        }
        if document_id:
            # Validate that the document belongs to the current organization
            if hasattr(request, 'organization') and request.organization:
                from .models import DocumentLibrary
                try:
                    DocumentLibrary.objects.get(id=document_id, organization=request.organization)
                    kwargs['document_id'] = document_id
                except DocumentLibrary.DoesNotExist:
                    return Response(
                        {'error': 'Invalid document_id. Document not found in your organization.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                kwargs['document_id'] = document_id
            
        # Add organization context to kwargs for multi-tenancy support
        if hasattr(request, 'organization') and request.organization:
            kwargs['organization_id'] = request.organization.id
            
        next_run = timezone.now()
        if task_type in ['new_lead', 'booked', 'closed']:
            mapped_type = 'D' # Daily (dummy)
            repeats = -1 # Always active for logic checks
            # Set next_run to the far future so it stays as a config placeholder
            # and isn't picked up by the worker immediately.
            next_run = timezone.now() + timedelta(days=365*50) 
        
        # Create schedule
        default_name_map = {
            'new_lead': 'New Lead Welcome Email',
            'booked': 'Booking Confirmation Email',
            'closed': 'Closed Email',
        }
        default_name = default_name_map.get(task_type, f"{task_type.replace('_', ' ').capitalize()} Automation")

        schedule = Schedule.objects.create(
            name=name or default_name,
            func=func_path,
            schedule_type=mapped_type,
            minutes=minutes if mapped_type == 'H' else None,
            repeats=repeats,
            next_run=next_run,
            kwargs=kwargs if kwargs else None
        )
        
        serializer = self.get_serializer(schedule)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def run_now(self, request, pk=None):
        """
        Manually trigger a schedule immediately.
        """
        from rest_framework.response import Response
        from rest_framework import status
        import importlib
        
        schedule = self.get_object()
        
        try:
            # Parse function path
            module_path, func_name = schedule.func.rsplit('.', 1)
            module = importlib.import_module(module_path)
            func = getattr(module, func_name)
            
            # Execute the function
            result = func()
            
            return Response({
                'success': True,
                'message': f'Task "{schedule.name}" executed successfully',
                'result': result
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


