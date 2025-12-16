from django.db import models
from users.models import CustomUser
from masterdata.models import Customer, ServiceType

# Create your models here.

class ChargeCategory(models.Model):
    """
    Category for organizing charges (e.g., Transportation, Labor, Fees)
    """
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_charge_categories'
    )
    
    class Meta:
        ordering = ('name',)
        verbose_name = 'Charge Category'
        verbose_name_plural = 'Charge Categories'
    
    def __str__(self):
        return self.name


class ChargeType(models.TextChoices):
    """Choices for how a charge is calculated"""
    PER_LB = "per_lb", "Per Pound"
    PERCENT = "percent", "Percentage"
    FLAT = "flat", "Flat Fee"
    HOURLY = "hourly", "Hourly"


class TimeWindow(models.Model):
    """
    Predefined time windows for pickup and delivery scheduling
    """
    name = models.CharField(max_length=100, help_text="e.g., Morning, Afternoon, Evening")
    start_time = models.TimeField(help_text="Start time of the window")
    end_time = models.TimeField(help_text="End time of the window")
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_time_windows'
    )
    
    class Meta:
        ordering = ('display_order', 'start_time')
        verbose_name = 'Time Window'
        verbose_name_plural = 'Time Windows'
    
    def __str__(self):
        return f"{self.name} ({self.start_time.strftime('%I:%M %p')} - {self.end_time.strftime('%I:%M %p')})"


class ChargeDefinition(models.Model):
    """
    Defines a specific charge (e.g., Transportation, Fuel Surcharge, Admin Fee)
    """
    name = models.CharField(max_length=150)
    category = models.ForeignKey(ChargeCategory, on_delete=models.CASCADE, related_name='charges')
    charge_type = models.CharField(max_length=20, choices=ChargeType.choices)
    
    # For per_lb / flat / hourly charges
    default_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # For percentage charges
    default_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # KEY: If charge_type == percent, this defines what base it applies to
    percent_applied_on = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        help_text="Only used if charge_type = percent. Defines what this percentage applies to.",
        related_name='dependent_charges'
    )
    
    applies_to = models.ManyToManyField(
        ServiceType,
        blank=True,
        related_name='charge_definitions',
        help_text="Service types this charge applies to. Leave empty for all service types."
    )
    
    is_required = models.BooleanField(default=False, help_text="Must be included in estimates")
    is_active = models.BooleanField(default=True)
    is_estimate_only = models.BooleanField(default=False, help_text="Only for specific estimates, not shown in configure")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_charge_definitions'
    )
    
    class Meta:
        ordering = ('category', 'name')
        verbose_name = 'Charge Definition'
        verbose_name_plural = 'Charge Definitions'
    
    def __str__(self):
        return f"{self.name} ({self.get_charge_type_display()})"


class EstimateTemplate(models.Model):
    """
    Predefined template for estimates (e.g., Local Move Template, Long Distance Template)
    """
    name = models.CharField(max_length=150)
    service_type = models.ForeignKey(
        ServiceType,
        on_delete=models.CASCADE,
        related_name='estimate_templates'
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_templates'
    )
    
    class Meta:
        ordering = ('name',)
        verbose_name = 'Estimate Template'
        verbose_name_plural = 'Estimate Templates'
    
    def __str__(self):
        return f"{self.name} ({self.service_type.service_type})"


class TemplateLineItem(models.Model):
    """
    Line items within a template (which charges to include)
    """
    template = models.ForeignKey(EstimateTemplate, on_delete=models.CASCADE, related_name="items")
    charge = models.ForeignKey(ChargeDefinition, on_delete=models.CASCADE)
    
    # Override default values if needed
    rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Can users edit this in the estimate?
    is_editable = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ('display_order', 'id')
        unique_together = [['template', 'charge']]
    
    def __str__(self):
        return f"{self.template.name} - {self.charge.name}"


class Estimate(models.Model):
    """
    Customer estimate/quote
    """
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='estimates')
    template_used = models.ForeignKey(EstimateTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    
    service_type = models.ForeignKey(
        ServiceType,
        on_delete=models.CASCADE,
        related_name='estimates'
    )
    
    # Move details
    weight_lbs = models.PositiveIntegerField(null=True, blank=True)
    labour_hours = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Date ranges
    pickup_date_from = models.DateField(null=True, blank=True, help_text="Pickup start date")
    pickup_date_to = models.DateField(null=True, blank=True, help_text="Pickup end date")
    pickup_time_window = models.ForeignKey(TimeWindow, on_delete=models.SET_NULL, null=True, blank=True, related_name='pickup_estimates', help_text="Pickup arrival window")
    delivery_date_from = models.DateField(null=True, blank=True, help_text="Delivery start date")
    delivery_date_to = models.DateField(null=True, blank=True, help_text="Delivery end date")
    delivery_time_window = models.ForeignKey(TimeWindow, on_delete=models.SET_NULL, null=True, blank=True, related_name='delivery_estimates', help_text="Delivery arrival window")
    
    # Calculated total
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="Tax percentage from customer's branch")
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=[
            ('draft', 'Draft'),
            ('sent', 'Sent to Customer'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected')
        ],
        default='draft'
    )
    
    # Email tracking
    public_token = models.CharField(max_length=100, unique=True, null=True, blank=True)
    email_sent_at = models.DateTimeField(null=True, blank=True)
    customer_viewed_at = models.DateTimeField(null=True, blank=True)
    customer_responded_at = models.DateTimeField(null=True, blank=True)
    link_active = models.BooleanField(default=True)
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_estimates'
    )
    
    class Meta:
        ordering = ('-created_at',)
        verbose_name = 'Estimate'
        verbose_name_plural = 'Estimates'
    
    def __str__(self):
        return f"Estimate #{self.id} - {self.customer.full_name}"


class EstimateLineItem(models.Model):
    """
    Individual line item in an estimate
    """
    estimate = models.ForeignKey(Estimate, on_delete=models.CASCADE, related_name="items")
    charge = models.ForeignKey(ChargeDefinition, on_delete=models.SET_NULL, null=True)
    charge_name = models.CharField(max_length=150)  # Store name in case charge is deleted
    charge_type = models.CharField(max_length=20, choices=ChargeType.choices)
    
    # Values
    rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    
    # Calculated amount
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Track if user manually edited this
    is_user_modified = models.BooleanField(default=False)
    display_order = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ('display_order', 'id')
    
    def __str__(self):
        return f"{self.estimate} - {self.charge_name}"


class CustomerActivity(models.Model):
    """
    Track customer activity timeline (estimates created, shared, etc.)
    """
    ACTIVITY_TYPES = (
        ('estimate_created', 'Estimate Created'),
        ('estimate_updated', 'Estimate Updated'),
        ('estimate_sent', 'Estimate Sent to Customer'),
        ('estimate_approved', 'Estimate Approved'),
        ('estimate_rejected', 'Estimate Rejected'),
        ('customer_contacted', 'Customer Contacted'),
        ('note_added', 'Note Added'),
        ('status_changed', 'Status Changed'),
        ('other', 'Other Activity'),
    )
    
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='activities')
    estimate = models.ForeignKey(Estimate, on_delete=models.SET_NULL, null=True, blank=True, related_name='activities')
    activity_type = models.CharField(max_length=50, choices=ACTIVITY_TYPES)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_activities'
    )
    
    class Meta:
        ordering = ('-created_at',)
        verbose_name = 'Customer Activity'
        verbose_name_plural = 'Customer Activities'
    
    def __str__(self):
        return f"{self.customer.full_name} - {self.title}"


class DocumentSigningBatch(models.Model):
    """
    Batch of documents to be signed for an estimate (with separate token from estimate approval)
    """
    estimate = models.OneToOneField(Estimate, on_delete=models.CASCADE, related_name='document_batch')
    
    # Separate public token for document signing
    signing_token = models.CharField(max_length=100, unique=True)
    link_active = models.BooleanField(default=True)
    
    # Email tracking
    email_sent_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_document_batches'
    )
    
    class Meta:
        verbose_name = 'Document Signing Batch'
        verbose_name_plural = 'Document Signing Batches'
    
    def __str__(self):
        return f"Document Batch - Estimate #{self.estimate.id}"


class EstimateDocument(models.Model):
    """
    Documents attached to an estimate for customer signature
    """
    estimate = models.ForeignKey(Estimate, on_delete=models.CASCADE, related_name='estimate_documents')
    document = models.ForeignKey(
        'masterdata.DocumentLibrary',
        on_delete=models.CASCADE,
        related_name='estimate_documents'
    )
    requires_signature = models.BooleanField(default=True)
    customer_viewed = models.BooleanField(default=False)
    customer_viewed_at = models.DateTimeField(null=True, blank=True)
    customer_signed = models.BooleanField(default=False)
    customer_signed_at = models.DateTimeField(null=True, blank=True)
    customer_signature = models.TextField(blank=True, help_text="JSON with indexed signatures: {\"0\": \"base64...\", \"1\": \"base64...\"}")
    customer_text_inputs = models.TextField(blank=True, help_text="JSON with indexed text inputs: {\"0\": \"text value\", \"1\": \"another value\"}")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ('created_at',)
        unique_together = [['estimate', 'document']]
    
    def __str__(self):
        return f"Estimate #{self.estimate.id} - {self.document.title}"