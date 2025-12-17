from django.contrib import admin
from .models import Customer, Branch, ServiceType, DocumentLibrary, DocumentServiceTypeBranchMapping


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'email', 'phone', 'company', 'source', 'stage', 'assigned_to', 'created_at')
    list_filter = ('stage', 'source', 'assigned_to', 'created_at')
    search_fields = ('full_name', 'email', 'phone', 'company')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'created_by')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('full_name', 'email', 'phone', 'company')
        }),
        ('Address', {
            'fields': ('address', 'city', 'state', 'country', 'postal_code'),
            'classes': ('collapse',)
        }),
        ('CRM Information', {
            'fields': ('source', 'stage', 'assigned_to')
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ('name', 'destination', 'dispatch_location', 'sales_tax_percentage', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'destination', 'dispatch_location')
    ordering = ('name',)
    readonly_fields = ('created_at', 'updated_at', 'created_by')
    
    fieldsets = (
        ('Branch Information', {
            'fields': ('name', 'destination', 'dispatch_location', 'sales_tax_percentage', 'is_active')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ServiceType)
class ServiceTypeAdmin(admin.ModelAdmin):
    list_display = ('service_type', 'scaling_factor', 'color', 'enabled', 'created_at')
    list_filter = ('enabled', 'created_at')
    search_fields = ('service_type',)
    ordering = ('service_type',)
    readonly_fields = ('created_at', 'updated_at', 'created_by')

    fieldsets = (
        ('Service Type Information', {
            'fields': ('service_type', 'scaling_factor', 'color', 'estimate_content', 'enabled')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(DocumentLibrary)
class DocumentLibraryAdmin(admin.ModelAdmin):
    list_display = ('title', 'document_type', 'is_active', 'created_at')
    list_filter = ('is_active', 'document_type', 'created_at')
    search_fields = ('title', 'description', 'document_type')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'created_by')
    
    fieldsets = (
        ('Document Information', {
            'fields': ('title', 'description', 'document_type', 'is_active')
        }),
        ('File', {
            'fields': ('file', 'file_url')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(DocumentServiceTypeBranchMapping)
class DocumentMappingAdmin(admin.ModelAdmin):
    list_display = ('document', 'service_type', 'branch', 'created_at')
    list_filter = ('service_type', 'branch', 'created_at')
    search_fields = ('document__title',)
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'created_by')
    
    fieldsets = (
        ('Mapping Information', {
            'fields': ('document', 'service_type', 'branch')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at'),
            'classes': ('collapse',)
        }),
    )
