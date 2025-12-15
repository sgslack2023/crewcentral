from django.contrib import admin
from .models import (
    ChargeCategory, ChargeDefinition, EstimateTemplate, TemplateLineItem,
    Estimate, EstimateLineItem, CustomerActivity, EstimateDocument, DocumentSigningBatch
)


@admin.register(ChargeCategory)
class ChargeCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'created_at', 'created_by')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at', 'created_by')


@admin.register(ChargeDefinition)
class ChargeDefinitionAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'charge_type', 'get_applies_to_display', 'is_required', 'is_active')
    list_filter = ('charge_type', 'is_required', 'is_active', 'category', 'applies_to')
    search_fields = ('name', 'category__name')
    readonly_fields = ('created_at', 'updated_at', 'created_by')
    filter_horizontal = ('applies_to',)  # Better UI for many-to-many
    
    def get_applies_to_display(self, obj):
        """Display service types in list view"""
        service_types = obj.applies_to.all()
        if not service_types:
            return "All Service Types"
        return ", ".join([st.service_type for st in service_types])
    get_applies_to_display.short_description = 'Applies To'


class TemplateLineItemInline(admin.TabularInline):
    model = TemplateLineItem
    extra = 0
    fields = ('charge', 'rate', 'percentage', 'is_editable', 'display_order')


@admin.register(EstimateTemplate)
class EstimateTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'service_type', 'is_active', 'created_at', 'created_by')
    list_filter = ('service_type', 'is_active', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at', 'created_by')
    inlines = [TemplateLineItemInline]


class EstimateLineItemInline(admin.TabularInline):
    model = EstimateLineItem
    extra = 0
    fields = ('charge_name', 'charge_type', 'rate', 'percentage', 'quantity', 'amount', 'is_user_modified')
    readonly_fields = ('amount',)


@admin.register(Estimate)
class EstimateAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'service_type', 'pickup_date_from', 'delivery_date_from', 'status', 'total_amount', 'created_at')
    list_filter = ('service_type', 'status', 'created_at', 'pickup_date_from', 'delivery_date_from')
    search_fields = ('customer__full_name', 'customer__email', 'notes')
    readonly_fields = ('created_at', 'updated_at', 'created_by', 'subtotal', 'tax_percentage', 'tax_amount', 'total_amount')
    inlines = [EstimateLineItemInline]
    fieldsets = (
        ('Basic Information', {
            'fields': ('customer', 'template_used', 'service_type', 'status')
        }),
        ('Move Details', {
            'fields': ('weight_lbs', 'labour_hours')
        }),
        ('Schedule', {
            'fields': ('pickup_date_from', 'pickup_date_to', 'delivery_date_from', 'delivery_date_to')
        }),
        ('Financial', {
            'fields': ('subtotal', 'tax_percentage', 'tax_amount', 'total_amount')
        }),
        ('Email Tracking', {
            'fields': ('public_token', 'email_sent_at', 'customer_viewed_at', 'customer_responded_at', 'link_active'),
            'classes': ('collapse',)
        }),
        ('Additional Information', {
            'fields': ('notes', 'created_at', 'updated_at', 'created_by')
        }),
    )


@admin.register(EstimateLineItem)
class EstimateLineItemAdmin(admin.ModelAdmin):
    list_display = ('estimate', 'charge_name', 'charge_type', 'amount', 'is_user_modified')
    list_filter = ('charge_type', 'is_user_modified')
    search_fields = ('estimate__customer__full_name', 'charge_name')
    readonly_fields = ('amount',)


@admin.register(CustomerActivity)
class CustomerActivityAdmin(admin.ModelAdmin):
    list_display = ('customer', 'activity_type', 'title', 'created_at', 'created_by')
    list_filter = ('activity_type', 'created_at')
    search_fields = ('customer__full_name', 'title', 'description')
    readonly_fields = ('created_at', 'created_by')


@admin.register(DocumentSigningBatch)
class DocumentSigningBatchAdmin(admin.ModelAdmin):
    list_display = ('estimate', 'signing_token', 'link_active', 'email_sent_at', 'created_at')
    list_filter = ('link_active', 'created_at')
    search_fields = ('estimate__customer__full_name', 'signing_token')
    readonly_fields = ('signing_token', 'created_at', 'created_by')


@admin.register(EstimateDocument)
class EstimateDocumentAdmin(admin.ModelAdmin):
    list_display = ('estimate', 'document', 'requires_signature', 'customer_viewed', 'customer_signed', 'customer_signed_at')
    list_filter = ('requires_signature', 'customer_signed', 'customer_viewed', 'created_at')
    search_fields = ('estimate__customer__full_name', 'document__title')
    readonly_fields = ('customer_viewed', 'customer_viewed_at', 'customer_signed', 'customer_signed_at', 'created_at')