from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Estimate, Invoice, PaymentReceipt
from .utils import generate_invoice_pdf, generate_payment_receipt_pdf
from .tasks import send_invoice_async, send_receipt_async
from django_q.tasks import async_task
from datetime import date
import random
import string

@receiver(post_save, sender=Estimate)
def estimate_status_changed(sender, instance, created, **kwargs):
    """
    Trigger action when Estimate status changes to 'invoiced'
    """
    if not created and instance.status == 'invoiced':
        # Check if invoice already exists
        if not Invoice.objects.filter(estimate=instance).exists():
            # Create a new invoice
            invoice_number = f"INV-{''.join(random.choices(string.digits, k=6))}"
            invoice = Invoice.objects.create(
                organization=instance.organization,
                estimate=instance,
                customer=instance.customer,
                invoice_number=invoice_number,
                issue_date=date.today(),
                due_date=date.today(), # Default to today
                subtotal=instance.subtotal,
                tax_amount=instance.tax_amount,
                total_amount=instance.total_amount,
                balance_due=instance.total_amount,
                status='draft',
                created_by=instance.created_by
            )
            # Generate PDF in background
            from .tasks import generate_invoice_pdf_async
            async_task(generate_invoice_pdf_async, invoice.id)

@receiver(post_save, sender=Invoice)
def invoice_saved(sender, instance, created, **kwargs):
    """
    Queue invoice email after creation
    """
    if created:
        # Trigger PDF generation if not already done
        if not instance.pdf_file:
            from .tasks import generate_invoice_pdf_async
            async_task(generate_invoice_pdf_async, instance.id)
            
        # Queue email automation
        if instance.customer and instance.customer.email:
            async_task(send_invoice_async, instance.id)

@receiver(post_save, sender=PaymentReceipt)
def payment_receipt_created(sender, instance, created, **kwargs):
    """
    Update invoice or estimate balance, generate PDF and queue email when a payment receipt is created
    """
    if created:
        # Update balance depending on what it's linked to
        if instance.invoice:
            instance.invoice.calculate_balance()
        elif instance.estimate:
            instance.estimate.calculate_balance()
            
        # Generate receipt PDF if not already done
        if not instance.pdf_file:
            from .tasks import generate_receipt_pdf_async
            async_task(generate_receipt_pdf_async, instance.id)
            
        # Queue email automation
        customer_email = None
        if instance.invoice and instance.invoice.customer:
            customer_email = instance.invoice.customer.email
        elif instance.estimate and instance.estimate.customer:
            customer_email = instance.estimate.customer.email
            
        if customer_email:
            async_task(send_receipt_async, instance.id)
