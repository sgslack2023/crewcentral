from django.db import models
from users.models import CustomUser

# Create your models here.

# Choices for Customer fields
SOURCE_CHOICES = (
    ('moveit', 'Moveit'),
    ('mymovingloads', 'MyMovingLoads'),
    ('moving24', 'Moving24'),
    ('baltic_website', 'Baltic Website'),
    ('n1m_website', 'N1M Website'),
    ('google', 'Google'),
    ('referral', 'Referral'),
    ('other', 'Other'),
)

STAGE_CHOICES = (
    ('new_lead', 'New Lead'),
    ('in_progress', 'In Progress'),
    ('opportunity', 'Opportunity'),
    ('booked', 'Booked'),
    ('closed', 'Closed'),
    ('bad_lead', 'Bad Lead'),
    ('lost', 'Lost'),
)


class Branch(models.Model):
    """
    Branch/Location model for managing different office locations
    """
    name = models.CharField(max_length=255, unique=True)
    destination = models.CharField(max_length=255, blank=True, null=True)
    dispatch_location = models.CharField(max_length=255)
    sales_tax_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=0.00,
        help_text="Sales tax percentage for this branch (e.g., 8.25 for 8.25%)"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_branches'
    )
    
    class Meta:
        ordering = ('name',)
        verbose_name = 'Branch'
        verbose_name_plural = 'Branches'
    
    def __str__(self):
        return self.name


class ServiceType(models.Model):
    """
    Service Type model for categorizing different types of services
    """
    service_type = models.CharField(max_length=255, unique=True)
    scaling_factor = models.DecimalField(max_digits=10, decimal_places=2, default=1.0)
    color = models.CharField(max_length=7, blank=True, null=True, help_text="Hex color code (e.g., #FF5733)")
    estimate_content = models.TextField(blank=True, null=True, help_text="Additional content to display on estimates for this service type")
    enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_service_types'
    )
    
    class Meta:
        ordering = ('service_type',)
        verbose_name = 'Service Type'
        verbose_name_plural = 'Service Types'
    
    def __str__(self):
        return self.service_type


class DocumentLibrary(models.Model):
    """
    Document Library for storing and managing documents
    """
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    file = models.FileField(upload_to='documents/', blank=True, null=True)
    document_type = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_documents'
    )
    
    class Meta:
        ordering = ('-created_at',)
        verbose_name = 'Document'
        verbose_name_plural = 'Document Library'
    
    def __str__(self):
        return self.title


class DocumentServiceTypeBranchMapping(models.Model):
    """
    Mapping table to associate documents with service types and branches
    """
    document = models.ForeignKey(
        DocumentLibrary,
        on_delete=models.CASCADE,
        related_name='mappings'
    )
    service_type = models.ForeignKey(
        ServiceType,
        on_delete=models.CASCADE,
        related_name='document_mappings',
        blank=True,
        null=True
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name='document_mappings',
        blank=True,
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_document_mappings'
    )
    
    class Meta:
        ordering = ('-created_at',)
        verbose_name = 'Document Mapping'
        verbose_name_plural = 'Document Mappings'
        unique_together = [['document', 'service_type', 'branch']]
    
    def __str__(self):
        parts = [self.document.title]
        if self.service_type:
            parts.append(f"Service: {self.service_type.service_type}")
        if self.branch:
            parts.append(f"Branch: {self.branch.name}")
        return " - ".join(parts)

class Customer(models.Model):
    # Basic Information
    full_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    company = models.CharField(max_length=255, blank=True, null=True)
    
    # Additional Information
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    
    # CRM Fields
    source = models.CharField(max_length=50, choices=SOURCE_CHOICES, default='other')
    stage = models.CharField(max_length=50, choices=STAGE_CHOICES, default='new_lead')
    assigned_to = models.ForeignKey(
        CustomUser, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='assigned_customers'
    )
    
    # Move Information
    service_type = models.ForeignKey(
        'ServiceType',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='customers'
    )
    move_date = models.DateField(blank=True, null=True)
    move_size = models.ForeignKey(
        'RoomSize',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='customers'
    )
    branch = models.ForeignKey(
        'Branch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='customers'
    )
    origin_address = models.TextField(blank=True, null=True)
    destination_address = models.TextField(blank=True, null=True)
    
    # Notes and metadata
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_customers'
    )
    
    class Meta:
        ordering = ('-created_at',)
        verbose_name = 'Customer'
        verbose_name_plural = 'Customers'

    def __str__(self):
        return f"{self.full_name} - {self.stage}"

    @property
    def job_number(self):
        """Return the ID + 999 to make it start from 1000"""
        return self.id + 999 if self.id else None
    
    @property
    def is_lead(self):
        """Check if customer is in lead stage"""
        return self.stage == 'new_lead'
    
    @property
    def is_unassigned(self):
        """Check if customer has no assigned user"""
        return self.assigned_to is None


class MoveType(models.Model):
    """
    Move Type model for managing different types of moves
    """
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    cubic_feet = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    weight = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_move_types'
    )
    
    class Meta:
        ordering = ('name',)
        verbose_name = 'Move Type'
        verbose_name_plural = 'Move Types'
    
    def __str__(self):
        return self.name


class RoomSize(models.Model):
    """
    Room Size model for managing different room sizes
    """
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    cubic_feet = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    weight = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_room_sizes'
    )
    
    class Meta:
        ordering = ('name',)
        verbose_name = 'Room Size'
        verbose_name_plural = 'Room Sizes'
    
    def __str__(self):
        return self.name