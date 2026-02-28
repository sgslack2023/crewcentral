from django.db import models
from users.models import CustomUser, Organization

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
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='branches', null=True, blank=True)
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
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='service_types', null=True, blank=True)
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
    Document Library for storing and managing documents, contracts, invoices, and emails
    """
    CATEGORY_CHOICES = (
        ('Email', 'Email'),
        ('Contract', 'Contract'),
        ('Invoice', 'Invoice'),
        ('Payment Receipt', 'Payment Receipt'),
        ('Work Order', 'Work Order'),
        ('Other', 'Other'),
    )
    
    DOCUMENT_PURPOSE_CHOICES = (
        ('new_lead_email', 'New Lead Email'),
        ('booked_email', 'Booked Email'),
        ('closed_email', 'Closed Email'),
        ('invoice_email', 'Invoice Email'),
        ('receipt_email', 'Receipt Email'),
        ('endpoint_leads_task', 'Endpoint Leads task'),
        ('estimate_pdf', 'Estimate PDF'),
        ('invoice_pdf', 'Invoice PDF'),
        ('receipt_pdf', 'Receipt PDF'),
        ('work_order_pdf', 'Work Order PDF'),
        ('contract_pdf', 'Contract PDF'),
        ('none', 'None'),
    )

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='Other')
    document_purpose = models.CharField(max_length=50, choices=DOCUMENT_PURPOSE_CHOICES, default='none')
    subject = models.CharField(max_length=255, blank=True, null=True, help_text="Used specifically for Email category")
    file = models.FileField(upload_to='documents/', blank=True, null=True)
    document_type = models.CharField(max_length=100, blank=True, null=True)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='documents', null=True, blank=True)
    is_active = models.BooleanField(default=True)
    attachments = models.ManyToManyField('self', blank=True, symmetrical=False, related_name='attached_to_documents')
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
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='customers', null=True, blank=True)
    
    # Additional Information
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    
    # CRM Fields
    source = models.CharField(max_length=50, choices=SOURCE_CHOICES, default='other')
    stage = models.CharField(max_length=50, choices=STAGE_CHOICES, default='new_lead')
    is_archived = models.BooleanField(default=False)
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
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='move_types', null=True, blank=True)
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
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='room_sizes', null=True, blank=True)
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

class EndpointConfiguration(models.Model):
    """
    Configuration for external API endpoints per organization
    """
    name = models.CharField(max_length=255)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='endpoint_configs')
    secret_key = models.CharField(max_length=255, unique=True, blank=True, help_text="Secret key to be used in endpoint headers for authentication")
    mapping_config = models.JSONField(default=dict, blank=True, help_text="Mapping from incoming JSON keys to internal Customer fields")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.secret_key:
            import uuid
            self.secret_key = str(uuid.uuid4()).replace('-', '')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.organization.name})"


class RawEndpointLead(models.Model):
    """
    Stores raw JSON data received from endpoints before processing
    """
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='raw_leads')
    endpoint_config = models.ForeignKey(EndpointConfiguration, on_delete=models.SET_NULL, null=True, blank=True)
    raw_data = models.JSONField()
    processed = models.BooleanField(default=False)
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)

    def __str__(self):
        return f"Raw Lead {self.id} - {self.organization.name} at {self.created_at}"
