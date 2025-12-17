from rest_framework import serializers
from .models import Customer, Branch, ServiceType, DocumentLibrary, DocumentServiceTypeBranchMapping, MoveType, RoomSize
from users.models import CustomUser


class CustomerSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    service_type_name = serializers.SerializerMethodField()
    move_size_name = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()
    job_number = serializers.ReadOnlyField()

    class Meta:
        model = Customer
        fields = [
            'id', 'job_number', 'full_name', 'email', 'phone', 'company',
            'address', 'city', 'state', 'country', 'postal_code',
            'source', 'stage', 'assigned_to', 'assigned_to_name',
            'service_type', 'service_type_name', 'move_date', 'move_size', 'move_size_name',
            'branch', 'branch_name', 'origin_address', 'destination_address',
            'notes', 'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'job_number']
    
    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.fullname
        return None
    
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
            'id', 'name', 'destination', 'dispatch_location', 'sales_tax_percentage', 'is_active',
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
            'id', 'service_type', 'scaling_factor', 'color', 'estimate_content', 'enabled',
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.fullname
        return None


class DocumentLibrarySerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    service_types = serializers.SerializerMethodField()
    branches = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = DocumentLibrary
        fields = [
            'id', 'title', 'description', 'file', 'file_url', 'document_type',
            'is_active', 'created_at', 'updated_at', 'created_by', 'created_by_name',
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

