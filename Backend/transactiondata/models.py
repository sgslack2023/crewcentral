from django.db import models
from users.models import CustomUser, Organization
from masterdata.models import Customer, ServiceType

# Create your models here.

class ChargeCategory(models.Model):
    """
    Category for organizing charges (e.g., Transportation, Labor, Fees)
    """
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='charge_categories', null=True, blank=True)
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
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='time_windows', null=True, blank=True)
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
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='charge_definitions', null=True, blank=True)
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
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='estimate_templates', null=True, blank=True)
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
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='estimates', null=True, blank=True)
    assigned_to = models.ForeignKey(
        CustomUser, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='assigned_estimates'
    )
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
    
    # Discount
    discount_type = models.CharField(
        max_length=10,
        choices=[
            ('flat', 'Flat Amount'),
            ('percent', 'Percentage')
        ],
        null=True,
        blank=True,
        help_text="Type of discount: flat amount or percentage"
    )
    discount_value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, default=0, help_text="Discount amount or percentage")
    
    # Calculated total
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Calculated discount amount")
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
            ('work_order', 'Work Order'),
            ('booked', 'Booked'),
            ('invoiced', 'Invoiced'),
            ('rejected', 'Rejected')
        ],
        default='draft'
    )

    # Accounting
    payment_status = models.CharField(
        max_length=20,
        choices=[('unpaid', 'Unpaid'), ('partial', 'Partial'), ('paid', 'Paid')],
        default='unpaid'
    )
    external_notes = models.TextField(blank=True, help_text="Notes visible on the contract/invoice for the customer")
    
    assigned_contractor = models.ForeignKey(
        Organization, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='sublet_estimates',
        help_text="Organization (Contractor) this estimate is sublet to"
    )

    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    balance_due = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
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
    
    def save(self, *args, **kwargs):
        if not self.assigned_to and self.customer and self.customer.assigned_to:
            self.assigned_to = self.customer.assigned_to
        super().save(*args, **kwargs)

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
        ('email_opened', 'Email Opened by Customer'),
        ('other', 'Other Activity'),
    )
    
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='activities')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='activities', null=True, blank=True)
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


class Invoice(models.Model):
    """
    Invoice generated from an Estimate or standalone
    """
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('paid', 'Paid'),
        ('void', 'Void'),
        ('overdue', 'Overdue'),
    )
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='invoices', null=True, blank=True)
    estimate = models.ForeignKey(Estimate, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    work_order = models.ForeignKey('WorkOrder', on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='invoices')
    assigned_to = models.ForeignKey(
        CustomUser, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='assigned_invoices'
    )
    
    invoice_number = models.CharField(max_length=50, unique=True)
    issue_date = models.DateField()
    due_date = models.DateField()
    
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    balance_due = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    notes = models.TextField(blank=True)
    
    pdf_file = models.FileField(upload_to='invoices/', blank=True, null=True)
    email_sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='created_invoices')

    class Meta:
        ordering = ('-issue_date', '-created_at')

    def calculate_balance(self):
        """Recalculate balance_due and update status based on payments"""
        from django.db.models import Sum
        total_paid = self.payments.aggregate(total=Sum('amount'))['total'] or 0
        self.balance_due = self.total_amount - total_paid
        
        if self.balance_due <= 0:
            self.status = 'paid'
        elif self.status == 'draft' and total_paid > 0:
            self.status = 'sent' # Move from draft if payment received
            
        self.save(update_fields=['balance_due', 'status', 'updated_at'])

    def save(self, *args, **kwargs):
        if not self.assigned_to:
            if self.estimate and self.estimate.assigned_to:
                self.assigned_to = self.estimate.assigned_to
            elif self.customer and self.customer.assigned_to:
                self.assigned_to = self.customer.assigned_to
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.customer.full_name}"


class PaymentReceipt(models.Model):
    PAYMENT_METHODS = (
        ('credit_card', 'Credit Card'),
        ('bank_transfer', 'Bank Transfer'),
        ('cash', 'Cash'),
        ('check', 'Check'),
        ('other', 'Other'),
    )
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='payments', null=True, blank=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField()
    payment_method = models.CharField(max_length=50, choices=PAYMENT_METHODS)
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True)
    
    pdf_file = models.FileField(upload_to='payments/', blank=True, null=True)
    email_sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='created_payments')

    class Meta:
        ordering = ('-payment_date',)

    def __str__(self):
        return f"Payment {self.amount} for {self.invoice.invoice_number}"


class Feedback(models.Model):
    """
    Customer Feedback and Reviews
    """
    STATUS_CHOICES = (
        ('draft', 'Draft Request'),
        ('requested', 'Requested'),
        ('received', 'Review Received'),
        ('ignored', 'Ignored'),
    )
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='feedbacks', null=True, blank=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='feedbacks')
    
    # Internal tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    request_sent_at = models.DateTimeField(null=True, blank=True)
    public_token = models.CharField(max_length=100, unique=True, null=True, blank=True)
    
    # Review content
    rating = models.PositiveIntegerField(default=0, help_text="1-5 stars")
    comment = models.TextField(blank=True, help_text="Customer's review text")
    source = models.CharField(max_length=50, blank=True, help_text="Source of review (e.g., Google, Internal)")
    review_url = models.URLField(blank=True, help_text="Link to external review if applicable")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='created_feedbacks')

    class Meta:
        ordering = ('-created_at',)
        verbose_name = 'Feedback'
        verbose_name_plural = 'Feedback'

    def __str__(self):
        return f"Feedback from {self.customer.full_name} ({self.status})"


class WorkOrder(models.Model):
    """
    Internal order for a contractor based on an estimate
    """
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('accepted', 'Accepted by Contractor'),
        ('completed', 'Completed'),
        ('disputed', 'Disputed'),
        ('cancelled', 'Cancelled'),
    )

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='work_orders', null=True, blank=True)
    estimate = models.ForeignKey(Estimate, on_delete=models.CASCADE, related_name='work_orders')
    contractor = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='assigned_work_orders', null=True, blank=True)
    assigned_to = models.ForeignKey(
        CustomUser, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='assigned_work_orders'
    )
    work_order_template = models.ForeignKey('masterdata.DocumentLibrary', on_delete=models.SET_NULL, null=True, blank=True, related_name='work_orders_generated')
    
    work_order_type = models.CharField(
        max_length=20,
        choices=[('internal', 'Internal'), ('external', 'External')],
        default='external'
    )

    # Snapshot fields from Estimate for independence
    service_type = models.ForeignKey('masterdata.ServiceType', on_delete=models.SET_NULL, null=True, blank=True)
    weight_lbs = models.PositiveIntegerField(null=True, blank=True)
    labour_hours = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    pickup_date_from = models.DateField(null=True, blank=True)
    pickup_date_to = models.DateField(null=True, blank=True)
    pickup_time_window = models.ForeignKey(TimeWindow, on_delete=models.SET_NULL, null=True, blank=True, related_name='pickup_work_orders')
    
    delivery_date_from = models.DateField(null=True, blank=True)
    delivery_date_to = models.DateField(null=True, blank=True)
    delivery_time_window = models.ForeignKey(TimeWindow, on_delete=models.SET_NULL, null=True, blank=True, related_name='delivery_work_orders')

    notes = models.TextField(blank=True, help_text="Snapshot of estimate notes or work order specific notes")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    external_id = models.CharField(max_length=50, blank=True, null=True, help_text="Contractor's internal tracking ID")
    
    # Financials for the contractor (what we pay them)
    total_contractor_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Files
    pdf_file = models.FileField(upload_to='work_orders/', blank=True, null=True)
    
    # Sharing
    public_token = models.CharField(max_length=100, unique=True, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='created_work_orders')

    def update_total(self):
        """Recalculate total_contractor_amount based on line items"""
        total = self.items.filter(is_active=True).aggregate(
            total=models.Sum('total_amount')
        )['total'] or 0
        self.total_contractor_amount = total
        self.save(update_fields=['total_contractor_amount', 'updated_at'])

    def save(self, *args, **kwargs):
        if not self.assigned_to and self.estimate and self.estimate.assigned_to:
            self.assigned_to = self.estimate.assigned_to
        super().save(*args, **kwargs)

    class Meta:
        ordering = ('-created_at',)

    def __str__(self):
        return f"WO-{self.id} for {self.estimate.id} - {self.contractor.name}"


class ContractorEstimateLineItem(models.Model):
    """
    Specific line items for the contractor work order (often different rates)
    """
    work_order = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name='items')
    estimate_item = models.ForeignKey('EstimateLineItem', on_delete=models.SET_NULL, null=True, blank=True)
    
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    contractor_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    is_active = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        self.total_amount = self.quantity * self.contractor_rate
        super().save(*args, **kwargs)
        # Update WorkOrder total
        self.work_order.update_total()

    def __str__(self):
        return f"{self.description} - {self.total_amount}"


class TransactionCategory(models.Model):
    """
    Category for expenses and purchases (e.g., Office Supplies, Travel, Maintenance)
    """
    CATEGORY_TYPES = (
        ('expense', 'Expense Only'),
        ('purchase', 'Purchase Only'),
        ('both', 'Both'),
    )

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='transaction_categories', null=True, blank=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    category_type = models.CharField(max_length=20, choices=CATEGORY_TYPES, default='both')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='created_transaction_categories')

    class Meta:
        ordering = ('name',)
        verbose_name = 'Transaction Category'
        verbose_name_plural = 'Transaction Categories'

    def __str__(self):
        return self.name


class Expense(models.Model):
    """
    Operational expenses (reimbursable or company paid)
    """
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='expenses', null=True, blank=True)
    title = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    expense_date = models.DateField()
    category = models.ForeignKey(TransactionCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    description = models.TextField(blank=True)
    receipt_file = models.FileField(upload_to='expenses/', blank=True, null=True)
    
    # Optional: Link to a customer or job if billable
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='related_expenses')
    work_order = models.ForeignKey(WorkOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='related_expenses')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='created_expenses')

    class Meta:
        ordering = ('-expense_date', '-created_at')

    def __str__(self):
        return f"{self.title} - ${self.amount}"


class Purchase(models.Model):
    """
    Procurement and asset purchases
    """
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='purchases', null=True, blank=True)
    item_name = models.CharField(max_length=200)
    vendor = models.CharField(max_length=200, blank=True)
    
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    
    purchase_date = models.DateField()
    category = models.ForeignKey(TransactionCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchases')
    description = models.TextField(blank=True)
    attachment_file = models.FileField(upload_to='purchases/', blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='created_purchases')

    class Meta:
        ordering = ('-purchase_date', '-created_at')

    def save(self, *args, **kwargs):
        # Auto-calculate total if not set
        if not self.total_amount and self.quantity and self.unit_price:
            self.total_amount = self.quantity * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.item_name} - ${self.total_amount}"


class EmailLog(models.Model):
    """
    Log of emails sent from the system with tracking capabilities
    """
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='email_logs', null=True, blank=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='email_logs', null=True, blank=True)
    
    subject = models.CharField(max_length=255)
    purpose = models.CharField(max_length=100, help_text="e.g., new_lead_email, invoice_email")
    tracking_token = models.CharField(max_length=100, unique=True)
    
    sent_at = models.DateTimeField(auto_now_add=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    is_opened = models.BooleanField(default=False)
    
    # Optional: Link to specific document
    estimate = models.ForeignKey(Estimate, on_delete=models.SET_NULL, null=True, blank=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ('-sent_at',)
        verbose_name = 'Email Log'
        verbose_name_plural = 'Email Logs'

    def __str__(self):
        return f"{self.subject} to {self.customer.full_name if self.customer else 'Unknown'}"