from rest_framework import serializers
from .models import (
    Customer, Branch, ServiceType, DocumentLibrary, 
    DocumentServiceTypeBranchMapping, MoveType, RoomSize,
    EndpointConfiguration, RawEndpointLead
)
from django_q.models import Schedule, Task
from users.models import CustomUser


class CustomerSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    service_type_name = serializers.SerializerMethodField()
    move_size_name = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()
    upcoming_visit_id = serializers.SerializerMethodField()
    job_number = serializers.ReadOnlyField()

    class Meta:
        model = Customer
        fields = [
            'id', 'job_number', 'full_name', 'email', 'phone', 'company',
            'organization', 'address', 'city', 'state', 'country', 'postal_code',
            'source', 'stage', 'is_archived', 'assigned_to', 'assigned_to_name',
            'service_type', 'service_type_name', 'move_date', 'move_size', 'move_size_name',
            'branch', 'branch_name', 'origin_address', 'destination_address',
            'notes', 'created_at', 'updated_at', 'created_by', 'created_by_name',
            'upcoming_visit_id'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'job_number']
    
    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.fullname
        return None
    
    def get_upcoming_visit_id(self, obj):
        # Find the next scheduled or in-progress visit
        visit = obj.site_visits.filter(
            status__in=['SCHEDULED', 'IN_PROGRESS']
        ).order_by('scheduled_at').first()
        return visit.id if visit else None
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.fullname
        return None
    
    def get_service_type_name(self, obj):
        if obj.service_type:
            return obj.service_type.service_type
        return None
    
    def get_move_size_name(self, obj):
        if obj.move_size:
            return obj.move_size.name
        return None
    
    def get_branch_name(self, obj):
        if obj.branch:
            return obj.branch.name
        return None


class CustomerStatsSerializer(serializers.Serializer):
    """Serializer for customer statistics"""
    total_customers = serializers.IntegerField()
    total_leads = serializers.IntegerField()
    unassigned_leads = serializers.IntegerField()
    by_stage = serializers.DictField()
    by_source = serializers.DictField()


class BranchSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Branch
        fields = [
            'id', 'name', 'destination', 'dispatch_location', 'sales_tax_percentage', 'organization', 'is_active',
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.fullname
        return None


class ServiceTypeSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ServiceType
        fields = [
            'id', 'service_type', 'scaling_factor', 'color', 'estimate_content', 'organization', 'enabled',
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.fullname
        return None
        

class DocumentLibraryBasicSerializer(serializers.ModelSerializer):
    """
    Simplified version of DocumentLibrarySerializer to avoid recursion.
    Used for nested attachments.
    """
    class Meta:
        model = DocumentLibrary
        fields = ['id', 'title', 'category', 'document_purpose', 'subject', 'document_type', 'is_active']


class DocumentLibrarySerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    service_types = serializers.SerializerMethodField()
    branches = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    attachments_data = serializers.SerializerMethodField()
    
    class Meta:
        model = DocumentLibrary
        fields = [
            'id', 'title', 'description', 'category', 'document_purpose', 'subject', 'file', 'file_url', 'document_type',
            'organization', 'is_active', 'attachments', 'attachments_data', 'created_at', 'updated_at', 'created_by', 'created_by_name',
            'service_types', 'branches'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.fullname
        return None
    
    def get_file_url(self, obj):
        """Return complete file URL if file exists"""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            # Fallback without request context
            try:
                return obj.file.url
            except:
                return None
        return None
    
    def get_service_types(self, obj):
        mappings = obj.mappings.filter(service_type__isnull=False).select_related('service_type')
        return [mapping.service_type.service_type for mapping in mappings]
    
    def get_attachments_data(self, obj):
        attachments = obj.attachments.all()
        return DocumentLibraryBasicSerializer(attachments, many=True, context=self.context).data

    def get_branches(self, obj):
        mappings = obj.mappings.filter(branch__isnull=False).select_related('branch')
        return [mapping.branch.name for mapping in mappings]


class DocumentMappingSerializer(serializers.ModelSerializer):
    document_title = serializers.SerializerMethodField()
    service_type_name = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = DocumentServiceTypeBranchMapping
        fields = [
            'id', 'document', 'document_title', 'service_type', 'service_type_name',
            'branch', 'branch_name', 'created_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['created_at', 'created_by']
    
    def get_document_title(self, obj):
        return obj.document.title if obj.document else None
    
    def get_service_type_name(self, obj):
        return obj.service_type.service_type if obj.service_type else None
    
    def get_branch_name(self, obj):
        return obj.branch.name if obj.branch else None
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.fullname
        return None


class MoveTypeSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = MoveType
        fields = [
            'id', 'name', 'description', 'cubic_feet', 'weight', 'is_active',
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.fullname
        return None


class RoomSizeSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = RoomSize
        fields = [
            'id', 'name', 'description', 'cubic_feet', 'weight', 'is_active',
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.fullname
        return None


class EndpointConfigurationSerializer(serializers.ModelSerializer):
    secret_key = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = EndpointConfiguration
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'organization']

class RawEndpointLeadSerializer(serializers.ModelSerializer):
    endpoint_name = serializers.ReadOnlyField(source='endpoint_config.name')

    class Meta:
        model = RawEndpointLead
        fields = '__all__'
        read_only_fields = ['created_at']

class ScheduleSerializer(serializers.ModelSerializer):
    task_type = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()
    
    last_run = serializers.SerializerMethodField()
    success = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()

    class Meta:
        model = Schedule
        fields = [
            'id', 'name', 'func', 'task_type', 'args', 'kwargs', 
            'schedule_type', 'minutes', 'repeats', 'next_run', 
            'last_run', 'success', 'is_active'
        ]
    
    def get_task_type(self, obj):
        """Extract task type from func name for easier frontend filtering"""
        if 'send_pending_invoices' in obj.func:
            return 'invoices'
        elif 'send_pending_receipts' in obj.func:
            return 'receipts'
        elif 'send_pending_estimates' in obj.func:
            return 'estimates'
        elif 'process_raw_endpoint_leads' in obj.func:
            return 'leads'
        
        # Check kwargs for event-driven types (New Lead, Booked, Closed)
        if obj.kwargs:
            import json
            kwargs = obj.kwargs
            if isinstance(kwargs, str):
                try:
                    kwargs = json.loads(kwargs.replace("'", '"')) # Simple correction for single quotes
                except:
                    pass
            if isinstance(kwargs, dict):
                if kwargs.get('task_type'):
                    return kwargs.get('task_type')
                    
        return 'other'
    
    def get_is_active(self, obj):
        """Determine if schedule is active based on repeats value"""
        return obj.repeats > 0 or obj.repeats == -1

    def get_last_run(self, obj):
        """Get the stopped time of the latest task for this schedule"""
        from django_q.models import Task
        # Look for tasks by name (if set) or by exact func
        task = Task.objects.filter(name=obj.name).order_by('-stopped').first()
        if not task:
            task = Task.objects.filter(func=obj.func).order_by('-stopped').first()
        
        return task.stopped if task else None

    def get_success(self, obj):
        """Get the success status of the latest task for this schedule"""
        from django_q.models import Task
        task = Task.objects.filter(name=obj.name).order_by('-stopped').first()
        if not task:
            task = Task.objects.filter(func=obj.func).order_by('-stopped').first()
            
        return task.success if task else None


class TaskSerializer(serializers.ModelSerializer):
    """Serializer for django_q.models.Task to show execution history"""
    task_name = serializers.SerializerMethodField()
    formatted_result = serializers.SerializerMethodField()
    
    class Meta:
        model = Task
        fields = [
            'id', 'name', 'func', 'args', 'kwargs', 'started', 
            'stopped', 'success', 'result', 'task_name', 'formatted_result'
        ]

    def get_task_name(self, obj):
        # Extract function name and make it pretty
        if not obj.func:
            return obj.name
        
        name = obj.func.split('.')[-1]
        name = name.replace('send_pending_', '').replace('send_', '').replace('_async', '').replace('_', ' ').capitalize()
        # Fallback for leads
        if 'process_raw_endpoint_leads' in obj.func:
            return 'Lead Ingestion'
        return name

    def get_formatted_result(self, obj):
        # Helper to safely decode data
        def safe_decode(data):
            if not data:
                return data
            if isinstance(data, (dict, list, tuple)):
                return data
            try:
                import base64
                import pickle
                decoded = base64.b64decode(data)
                return pickle.loads(decoded)
            except:
                return data

        result_data = safe_decode(obj.result)
        args_data = safe_decode(obj.args) or []
        kwargs_data = safe_decode(obj.kwargs) or {}

        # Identify the target customer from args or kwargs
        target = "System Task"
        
        # Try to find a customer/invoice/receipt ID to make it more specific
        from masterdata.models import Customer
        from transactiondata.models import Invoice, PaymentReceipt
        
        func_name = obj.func or ""
        
        # Extract ID from args or common kwarg names
        item_id = args_data[0] if args_data else (
            kwargs_data.get('customer_id') or 
            kwargs_data.get('invoice_id') or 
            kwargs_data.get('receipt_id') or 
            kwargs_data.get('estimate_id')
        )
        
        if 'send_new_lead_welcome_email' in func_name and item_id:
            try:
                c = Customer.objects.get(id=item_id)
                target = f"Lead: {c.full_name}"
            except: target = "New Lead"
        elif 'invoice_async' in func_name and item_id:
            try:
                inv = Invoice.objects.get(id=item_id)
                target = f"Invoice: {inv.invoice_number} ({inv.customer.full_name})"
            except: target = "Invoice"
        elif 'receipt_async' in func_name and item_id:
            try:
                rcpt = PaymentReceipt.objects.get(id=item_id)
                target = f"Receipt: {rcpt.invoice.invoice_number} ({rcpt.invoice.customer.full_name})"
            except: target = "Receipt"
        elif 'booked_async' in func_name and item_id:
            try:
                c = Customer.objects.get(id=item_id)
                target = f"Booking: {c.full_name}"
            except: target = "Booking"
        elif 'closed_async' in func_name and item_id:
            try:
                c = Customer.objects.get(id=item_id)
                target = f"Closed: {c.full_name}"
            except: target = "Closed Sale"
        elif 'send_pending' in func_name:
            if isinstance(result_data, dict):
                sent_names = result_data.get('sent_customers', [])
                if sent_names:
                    names_str = ", ".join(sent_names)
                    return f"Batch Process: Sent to {names_str}"
                
                total = result_data.get('total', 0)
                if total == 0:
                    return "Batch Check: No pending items found"
                else:
                    return f"Batch Check: Completed (Processed {total} items)"
            else:
                target = "Batch Process"

        if obj.success:
            if isinstance(result_data, dict):
                if 'status' in result_data:
                    return result_data['status']
                # If it's a generic success message, try to use the more specific 'target'
                if 'message' in result_data and "successfully" not in result_data['message'].lower():
                    return result_data['message']
            
            if "Batch" in target:
                return target
            return f"Successfully sent to {target}"
        else:
            if isinstance(result_data, dict) and 'error' in result_data:
                return f"Failed: {result_data['error']}"
            return f"Failed to send to {target}"
