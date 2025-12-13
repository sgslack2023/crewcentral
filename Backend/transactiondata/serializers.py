from rest_framework import serializers
from .models import (
    ChargeCategory, ChargeDefinition, EstimateTemplate, TemplateLineItem, 
    Estimate, EstimateLineItem, CustomerActivity, EstimateDocument, DocumentSigningBatch
)
from users.models import CustomUser


class ChargeCategorySerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ChargeCategory
        fields = [
            'id', 'name', 'description', 'is_active', 
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.fullname
        return None


class ChargeDefinitionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    percent_applied_on_name = serializers.SerializerMethodField()
    applies_to_names = serializers.SerializerMethodField()
    
    class Meta:
        model = ChargeDefinition
        fields = [
            'id', 'name', 'category', 'category_name', 'charge_type', 
            'default_rate', 'default_percentage', 'percent_applied_on', 'percent_applied_on_name',
            'applies_to', 'applies_to_names', 'is_required', 'is_active', 
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.fullname
        return None
    
    def get_category_name(self, obj):
        return obj.category.name if obj.category else None
    
    def get_percent_applied_on_name(self, obj):
        return obj.percent_applied_on.name if obj.percent_applied_on else None
    
    def get_applies_to_names(self, obj):
        return [st.service_type for st in obj.applies_to.all()]


class TemplateLineItemSerializer(serializers.ModelSerializer):
    charge_name = serializers.SerializerMethodField()
    charge_type = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    
    class Meta:
        model = TemplateLineItem
        fields = [
            'id', 'template', 'charge', 'charge_name', 'charge_type', 'category_name',
            'rate', 'percentage', 'is_editable', 'display_order'
        ]
    
    def get_charge_name(self, obj):
        return obj.charge.name if obj.charge else None
    
    def get_charge_type(self, obj):
        return obj.charge.charge_type if obj.charge else None
    
    def get_category_name(self, obj):
        return obj.charge.category.name if obj.charge and obj.charge.category else None


class EstimateTemplateSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    service_type_name = serializers.SerializerMethodField()
    items = TemplateLineItemSerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = EstimateTemplate
        fields = [
            'id', 'name', 'service_type', 'service_type_name', 'description', 'is_active', 
            'created_at', 'updated_at', 'created_by', 'created_by_name', 
            'items', 'items_count'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.fullname
        return None
    
    def get_service_type_name(self, obj):
        return obj.service_type.service_type if obj.service_type else None
    
    def get_items_count(self, obj):
        return obj.items.count()


class EstimateLineItemSerializer(serializers.ModelSerializer):
    charge_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    
    class Meta:
        model = EstimateLineItem
        fields = [
            'id', 'estimate', 'charge', 'charge_name', 'charge_type', 'category_name',
            'rate', 'percentage', 'quantity', 'amount', 'is_user_modified', 'display_order'
        ]
    
    def get_charge_name(self, obj):
        return obj.charge_name
    
    def get_category_name(self, obj):
        return obj.charge.category.name if obj.charge and obj.charge.category else None


class EstimateSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    template_name = serializers.SerializerMethodField()
    service_type_name = serializers.SerializerMethodField()
    items = EstimateLineItemSerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()
    document_signing_token = serializers.SerializerMethodField()
    
    class Meta:
        model = Estimate
        fields = [
            'id', 'customer', 'customer_name', 'template_used', 'template_name',
            'service_type', 'service_type_name', 'weight_lbs', 'labour_hours', 
            'subtotal', 'tax_percentage', 'tax_amount', 'total_amount',
            'status', 'notes', 'created_at', 'updated_at', 'created_by', 'created_by_name', 
            'items', 'items_count',
            'public_token', 'email_sent_at', 'customer_viewed_at', 'customer_responded_at', 'link_active',
            'document_signing_token'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'subtotal', 'tax_amount', 'total_amount', 'public_token']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.fullname
        return None
    
    def get_customer_name(self, obj):
        return obj.customer.full_name if obj.customer else None
    
    def get_template_name(self, obj):
        return obj.template_used.name if obj.template_used else None
    
    def get_service_type_name(self, obj):
        return obj.service_type.service_type if obj.service_type else None
    
    def get_items_count(self, obj):
        return obj.items.count()
    
    def get_document_signing_token(self, obj):
        """Get the separate token for document signing"""
        try:
            if hasattr(obj, 'document_batch'):
                return obj.document_batch.signing_token
        except:
            pass
        return None


# Simple serializers for dropdowns
class ChargeCategorySimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChargeCategory
        fields = ['id', 'name']


class ChargeDefinitionSimpleSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    applies_to_names = serializers.SerializerMethodField()
    
    class Meta:
        model = ChargeDefinition
        fields = ['id', 'name', 'charge_type', 'category_name', 'default_rate', 'default_percentage', 'applies_to', 'applies_to_names']
    
    def get_category_name(self, obj):
        return obj.category.name if obj.category else None
    
    def get_applies_to_names(self, obj):
        return [st.service_type for st in obj.applies_to.all()]


class EstimateTemplateSimpleSerializer(serializers.ModelSerializer):
    service_type_name = serializers.SerializerMethodField()
    
    class Meta:
        model = EstimateTemplate
        fields = ['id', 'name', 'service_type', 'service_type_name', 'description']
    
    def get_service_type_name(self, obj):
        return obj.service_type.service_type if obj.service_type else None


class CustomerActivitySerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    estimate_id = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomerActivity
        fields = [
            'id', 'customer', 'customer_name', 'estimate', 'estimate_id', 
            'activity_type', 'title', 'description', 
            'created_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['created_at', 'created_by']
    
    def get_created_by_name(self, obj):
        return obj.created_by.fullname if obj.created_by else 'System'
    
    def get_customer_name(self, obj):
        return obj.customer.full_name if obj.customer else None
    
    def get_estimate_id(self, obj):
        return obj.estimate.id if obj.estimate else None


class EstimateDocumentSerializer(serializers.ModelSerializer):
    document_title = serializers.SerializerMethodField()
    document_url = serializers.SerializerMethodField()
    document_type = serializers.SerializerMethodField()
    processed_content = serializers.SerializerMethodField()
    signature_count = serializers.SerializerMethodField()
    signatures_required = serializers.SerializerMethodField()
    
    class Meta:
        model = EstimateDocument
        fields = [
            'id', 'estimate', 'document', 'document_title', 'document_url', 'document_type',
            'requires_signature', 'customer_viewed', 'customer_viewed_at',
            'customer_signed', 'customer_signed_at', 'customer_signature', 'created_at',
            'processed_content', 'signature_count', 'signatures_required'
        ]
        read_only_fields = ['created_at', 'customer_viewed', 'customer_viewed_at', 'customer_signed', 'customer_signed_at', 'processed_content', 'signature_count', 'signatures_required']
    
    def get_document_title(self, obj):
        return obj.document.title if obj.document else None
    
    def get_document_url(self, obj):
        if obj.document and obj.document.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.document.file.url)
            try:
                return obj.document.file.url
            except:
                return None
        return None
    
    def get_document_type(self, obj):
        return obj.document.document_type if obj.document else None
    
    def get_signature_count(self, obj):
        """Return how many signatures have been filled"""
        if not obj.customer_signature:
            return 0
        try:
            import json
            signatures = json.loads(obj.customer_signature)
            return len(signatures)
        except:
            return 0
    
    def get_signatures_required(self, obj):
        """Return total number of signature fields in document"""
        if not obj.document or not obj.document.file:
            return 0
        
        try:
            # Count {{signature}} tags in document
            with obj.document.file.open('rb') as file:
                html_bytes = file.read()
                html_content = html_bytes.decode('utf-8')
            
            import re
            # Count all {{signature}} occurrences
            count = len(re.findall(r'\{\{signature\}\}', html_content))
            return count
        except:
            return 0
    
    def get_processed_content(self, obj):
        """
        Return document content with template tags replaced
        """
        if not obj.document or not obj.document.file:
            return None
        
        # Only process HTML documents
        if not (obj.document.document_type == 'HTML Document' or 
                str(obj.document.file).endswith('.html')):
            return None
        
        try:
            # Read document content
            with obj.document.file.open('rb') as file:
                html_bytes = file.read()
                html_content = html_bytes.decode('utf-8')
            
            # Extract body if it's a full HTML document
            import re
            body_match = re.search(r'<body[^>]*>(.*?)</body>', html_content, re.DOTALL | re.IGNORECASE)
            if body_match:
                html_content = body_match.group(1)
            
            # Process template tags
            from .utils import process_document_template
            
            # Pass customer_signature (JSON string with indexed signatures)
            processed = process_document_template(
                html_content,
                customer=obj.estimate.customer if obj.estimate else None,
                estimate=obj.estimate,
                signatures=obj.customer_signature  # This is JSON string like {"0": "base64...", "1": "base64..."}
            )
            
            return processed
        except Exception as e:
            print(f"Error processing document content: {e}")
            import traceback
            traceback.print_exc()
            return None


class DocumentSigningBatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentSigningBatch
        fields = ['id', 'estimate', 'signing_token', 'link_active', 'email_sent_at', 'created_at', 'created_by']
        read_only_fields = ['signing_token', 'created_at', 'created_by']
