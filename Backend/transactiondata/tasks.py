from django_q.tasks import async_task
from .email_utils import send_document_signature_email, send_invoice_pdf_email, send_receipt_pdf_email, send_estimate_pdf_email
from django.db import models
import logging

logger = logging.getLogger(__name__)

def process_document_signing(estimate_id, base_url):
    """
    Task to process document signature request asynchronously.
    """
    from .models import Estimate
    
    try:
        estimate = Estimate.objects.get(id=estimate_id)
        logger.info(f"Starting async document signature processing for Estimate {estimate_id}")
        
        # In a real scenario, this task might involve generating PDFs first
        # For now, we just triggering the email
        
        success, message = send_document_signature_email(estimate, base_url)
        
        if success:
            logger.info(f"Successfully processed document signature for Estimate {estimate_id}")
        else:
            logger.error(f"Failed to process document signature for Estimate {estimate_id}: {message}")
            
    except Estimate.DoesNotExist:
        logger.error(f"Estimate {estimate_id} not found during async processing")
    except Exception as e:
        logger.error(f"Error in process_document_signing task: {e}")


def get_active_schedule(task_type, organization_id):
    """
    Finds an active schedule for a specific event-driven task and organization.
    Returns the Schedule object.
    """
    from django_q.models import Schedule
    import json
    
    # We look for schedules where task_type is stored in kwargs
    schedules = Schedule.objects.filter(repeats__in=[-1, 1])
    
    for s in schedules:
        if not s.kwargs:
            continue
            
        kwargs = s.kwargs
        if isinstance(kwargs, str):
            try:
                # Clean and parse string representation
                import ast
                kwargs = ast.literal_eval(kwargs)
            except:
                try:
                    kwargs = json.loads(kwargs.replace("'", '"'))
                except:
                    continue
        
        if isinstance(kwargs, dict):
            if kwargs.get('task_type') == task_type and kwargs.get('organization_id') == organization_id:
                return s
                
    return None

def send_new_lead_welcome_email(customer_id, **kwargs):
    """
    Async task to send welcome email to a new lead.
    """
    from masterdata.models import Customer, DocumentLibrary
    from .email_utils import send_new_lead_email
    
    try:
        customer = Customer.objects.get(id=customer_id)
        logger.info(f"Starting async welcome email for lead {customer_id}")
        
        # Check for specific automation configuration
        schedule = get_active_schedule('new_lead', customer.organization.id)
        if not schedule:
            logger.info(f"No active automation found for 'new_lead' for organization {customer.organization.id}.")
            return {"sent": 0, "status": "Skipped (No active automation)"}

        schedule_kwargs = schedule.kwargs
        if isinstance(schedule_kwargs, str):
            import ast
            schedule_kwargs = ast.literal_eval(schedule_kwargs)

        template = None
        if schedule_kwargs.get('document_id'):
            try:
                template = DocumentLibrary.objects.get(id=schedule_kwargs.get('document_id'), is_active=True)
            except DocumentLibrary.DoesNotExist:
                pass
        
        # Prepare tracking record
        import uuid
        from .models import EmailLog
        tracking_token = str(uuid.uuid4())
        
        # Create EmailLog record
        EmailLog.objects.create(
            organization=customer.organization,
            customer=customer,
            subject=template.subject if template and template.subject else "Welcome to Baltic Van Lines",
            purpose='new_lead_email',
            tracking_token=tracking_token
        )

        # Render and send email
        success, message = send_new_lead_email(customer, template=template, tracking_token=tracking_token)
        
        if success:
            logger.info(f"Successfully sent welcome email to lead {customer_id}")
            # Log activity
            try:
                from .models import CustomerActivity
                CustomerActivity.objects.create(
                    customer=customer,
                    activity_type='email_sent',
                    title='Welcome Email Sent',
                    description=f'Welcome email sent to {customer.email}',
                    organization=customer.organization
                )
            except Exception as ae:
                logger.error(f"Failed to create activity record: {ae}")
        else:
            logger.error(f"Failed to send welcome email to lead {customer_id}: {message}")
            
    except Customer.DoesNotExist:
        logger.error(f"Customer {customer_id} not found")
        return {"sent": 0, "error": "Customer not found"}
    except Exception as e:
        logger.error(f"Error in send_new_lead_welcome_email task: {e}")
        return {"sent": 0, "error": str(e)}
    
    return {"sent": 1 if success else 0, "message": message, "customer": customer.full_name}


def send_invoice_async(invoice_id, **kwargs):
    """
    Immediate async task to send an invoice.
    """
    from .models import Invoice
    from django.utils import timezone
    
    try:
        from masterdata.models import DocumentLibrary
        invoice = Invoice.objects.get(id=invoice_id)
        
        # Check for specific automation configuration
        template = None
        schedule = get_active_schedule('invoices', invoice.organization.id)
        if schedule:
            schedule_kwargs = schedule.kwargs
            if isinstance(schedule_kwargs, str):
                import ast
                schedule_kwargs = ast.literal_eval(schedule_kwargs)
            
            if schedule_kwargs.get('document_id'):
                try:
                    template = DocumentLibrary.objects.get(id=schedule_kwargs.get('document_id'), is_active=True)
                except DocumentLibrary.DoesNotExist:
                    pass
        # Prepare tracking record
        import uuid
        from .models import EmailLog
        tracking_token = str(uuid.uuid4())
        
        # Create EmailLog record
        EmailLog.objects.create(
            organization=invoice.organization,
            customer=invoice.customer,
            subject=template.subject if template and template.subject else f"Invoice #{invoice.invoice_number}",
            purpose='invoice_email',
            tracking_token=tracking_token,
            invoice=invoice
        )

        success, message = send_invoice_pdf_email(invoice, template=template, tracking_token=tracking_token)
        
        if success:
            invoice.email_sent_at = timezone.now()
            invoice.save(update_fields=['email_sent_at'])
            
            # Log activity
            try:
                from .models import CustomerActivity
                CustomerActivity.objects.create(
                    customer=invoice.customer,
                    activity_type='email_sent',
                    title='Invoice Emailed',
                    description=f'Invoice #{invoice.invoice_number} emailed to {invoice.customer.email}',
                    organization=invoice.organization
                )
            except Exception as ae:
                logger.error(f"Failed to create activity record: {ae}")
                
            return {"sent": 1, "customer": invoice.customer.full_name, "invoice": invoice.invoice_number}
        return {"sent": 0, "error": message}
    except Invoice.DoesNotExist:
        logger.error(f"Invoice {invoice_id} not found")
        return {"sent": 0, "error": "Invoice not found"}
    except Exception as e:
        logger.error(f"Error in send_invoice_async: {e}")
        return {"sent": 0, "error": str(e)}


def send_receipt_async(receipt_id, **kwargs):
    """
    Immediate async task to send a receipt.
    """
    from .models import PaymentReceipt
    from django.utils import timezone
    
    try:
        from masterdata.models import DocumentLibrary
        receipt = PaymentReceipt.objects.get(id=receipt_id)
        
        # Check for specific automation configuration
        template = None
        schedule = get_active_schedule('receipts', receipt.organization.id)
        if schedule:
            schedule_kwargs = schedule.kwargs
            if isinstance(schedule_kwargs, str):
                import ast
                schedule_kwargs = ast.literal_eval(schedule_kwargs)
            
            if schedule_kwargs.get('document_id'):
                try:
                    template = DocumentLibrary.objects.get(id=schedule_kwargs.get('document_id'), is_active=True)
                except DocumentLibrary.DoesNotExist:
                    pass

        # Prepare tracking record
        import uuid
        from .models import EmailLog
        tracking_token = str(uuid.uuid4())
        
        # Create EmailLog record
        EmailLog.objects.create(
            organization=receipt.invoice.organization,
            customer=receipt.invoice.customer,
            subject=template.subject if template and template.subject else f"Payment Receipt for Invoice #{receipt.invoice.invoice_number}",
            purpose='receipt_email',
            tracking_token=tracking_token,
            invoice=receipt.invoice
        )

        success, message = send_receipt_pdf_email(receipt, template=template, tracking_token=tracking_token)
        
        if success:
            receipt.email_sent_at = timezone.now()
            receipt.save(update_fields=['email_sent_at'])
            return {"sent": 1, "customer": receipt.invoice.customer.full_name}
        return {"sent": 0, "error": message}
    except PaymentReceipt.DoesNotExist:
        logger.error(f"Receipt {receipt_id} not found")
        return {"sent": 0, "error": "Receipt not found"}
    except Exception as e:
        logger.error(f"Error in send_receipt_async: {e}")
        return {"sent": 0, "error": str(e)}


def send_estimate_async(estimate_id, **kwargs):
    """
    Immediate async task to send an estimate.
    """
    from .models import Estimate
    from django.utils import timezone
    from masterdata.models import DocumentLibrary
    
    try:
        estimate = Estimate.objects.get(id=estimate_id)
        
        # Check for specific automation configuration
        template = None
        schedule = get_active_schedule('estimates', estimate.organization.id)
        if schedule:
            schedule_kwargs = schedule.kwargs
            if isinstance(schedule_kwargs, str):
                import ast
                schedule_kwargs = ast.literal_eval(schedule_kwargs)
            
            if schedule_kwargs.get('document_id'):
                try:
                    template = DocumentLibrary.objects.get(id=schedule_kwargs.get('document_id'), is_active=True)
                except DocumentLibrary.DoesNotExist:
                    pass

        # Prepare tracking record
        import uuid
        from .models import EmailLog
        tracking_token = str(uuid.uuid4())
        
        # Create EmailLog record
        EmailLog.objects.create(
            organization=estimate.organization,
            customer=estimate.customer,
            subject=template.subject if template and template.subject else f"Estimate #{estimate.id}",
            purpose='estimate_email',
            tracking_token=tracking_token,
            estimate=estimate
        )

        success, message = send_estimate_pdf_email(estimate, template=template, tracking_token=tracking_token)
        
        if success:
            estimate.email_sent_at = timezone.now()
            estimate.save(update_fields=['email_sent_at'])
            return {"sent": 1, "customer": estimate.customer.full_name}
        return {"sent": 0, "error": message}
    except Estimate.DoesNotExist:
        logger.error(f"Estimate {estimate_id} not found")
        return {"sent": 0, "error": "Estimate not found"}
    except Exception as e:
        logger.error(f"Error in send_estimate_async: {e}")
        return {"sent": 0, "error": str(e)}


def send_booked_async(customer_id, **kwargs):
    """
    Async task to send booking confirmation.
    """
    from masterdata.models import Customer, DocumentLibrary
    from .email_utils import send_booked_email
    
    try:
        customer = Customer.objects.get(id=customer_id)
        
        schedule = get_active_schedule('booked', customer.organization.id)
        if not schedule:
            return {"sent": 0, "status": "Skipped"}

        schedule_kwargs = schedule.kwargs
        if isinstance(schedule_kwargs, str):
            import ast
            schedule_kwargs = ast.literal_eval(schedule_kwargs)

        template = None
        if schedule_kwargs.get('document_id'):
            try:
                template = DocumentLibrary.objects.get(id=schedule_kwargs.get('document_id'), is_active=True)
            except DocumentLibrary.DoesNotExist:
                pass

        # Prepare tracking record
        import uuid
        from .models import EmailLog
        tracking_token = str(uuid.uuid4())
        
        # Create EmailLog record
        EmailLog.objects.create(
            organization=customer.organization,
            customer=customer,
            subject=template.subject if template and template.subject else "Booking Confirmation",
            purpose='booked_email',
            tracking_token=tracking_token
        )

        success, message = send_booked_email(customer, template=template, tracking_token=tracking_token)
        
        if success:
            # Log activity
            try:
                from .models import CustomerActivity
                CustomerActivity.objects.create(
                    customer=customer,
                    activity_type='email_sent',
                    title='Booking Confirmation Sent',
                    description=f'Booking confirmation email sent to {customer.email}',
                    organization=customer.organization
                )
            except Exception as ae:
                logger.error(f"Failed to create activity record: {ae}")
                
        return {"sent": 1 if success else 0, "message": message, "customer": customer.full_name}
    except Customer.DoesNotExist:
        logger.error(f"Customer {customer_id} not found")
        return {"sent": 0, "error": "Customer not found"}
    except Exception as e:
        logger.error(f"Error in send_booked_async: {e}")
        return {"sent": 0, "error": str(e)}


def send_closed_async(customer_id, base_url, **kwargs):
    """
    Async task to send closing email with feedback link.
    """
    from masterdata.models import Customer, DocumentLibrary
    from .email_utils import send_closed_email
    
    try:
        customer = Customer.objects.get(id=customer_id)
        logger.info(f"Starting async Closed Email for customer {customer_id} (Org: {customer.organization.id})")
        
        schedule = get_active_schedule('closed', customer.organization.id)
        if not schedule:
            logger.info(f"No active automation found for 'closed' for organization {customer.organization.id}.")
            return {"sent": 0, "status": "Skipped"}

        schedule_kwargs = schedule.kwargs
        if isinstance(schedule_kwargs, str):
            import ast
            schedule_kwargs = ast.literal_eval(schedule_kwargs)

        template = None
        if schedule_kwargs.get('document_id'):
            try:
                template = DocumentLibrary.objects.get(id=schedule_kwargs.get('document_id'), is_active=True)
            except DocumentLibrary.DoesNotExist:
                pass
        
        # Create or get Feedback record
        from .models import Feedback
        import uuid
        from django.utils import timezone
        
        feedback_obj, created = Feedback.objects.get_or_create(
            customer=customer,
            organization=customer.organization,
            defaults={
                'status': 'requested',
                'public_token': str(uuid.uuid4()),
                'request_sent_at': timezone.now(),
            }
        )
        if not feedback_obj.public_token:
            feedback_obj.public_token = str(uuid.uuid4())
            feedback_obj.save()
        
        # Prepare tracking record
        from .models import EmailLog
        tracking_token = str(uuid.uuid4())
        
        # Create EmailLog record
        EmailLog.objects.create(
            organization=customer.organization,
            customer=customer,
            subject=template.subject if template and template.subject else "Thank you for choosing Baltic Van Lines",
            purpose='closed_email',
            tracking_token=tracking_token
        )

        feedback_link = f"{base_url}/feedback/{feedback_obj.public_token}"
        success, message = send_closed_email(customer, feedback_link, template=template, tracking_token=tracking_token)
        
        if success:
            logger.info(f"Successfully sent Closed Email to customer {customer_id}")
            # Log activity
            try:
                from .models import CustomerActivity
                CustomerActivity.objects.create(
                    customer=customer,
                    activity_type='email_sent',
                    title='Closed/Feedback Email Sent',
                    description=f'Final email with feedback link sent to {customer.email}',
                    organization=customer.organization
                )
            except Exception as ae:
                logger.error(f"Failed to create activity record: {ae}")
        else:
            logger.error(f"Failed to send Closed Email to customer {customer_id}: {message}")
        return {"sent": 1 if success else 0, "message": message, "customer": customer.full_name}
    except Customer.DoesNotExist:
        logger.error(f"Customer {customer_id} not found")
        return {"sent": 0, "error": "Customer not found"}
    except Exception as e:
        logger.error(f"Error in send_closed_async: {e}")
        return {"sent": 0, "error": str(e)}


def send_pending_invoices(organization_id=None, **kwargs):
    """
    Scheduled task to send pending invoices as PDFs via email.
    Finds all invoices that haven't been emailed yet.
    """
    from .models import Invoice
    from django.utils import timezone
    from masterdata.models import DocumentLibrary
    
    logger.info("Starting send_pending_invoices task")
    
    try:
        # Query for invoices that haven't been emailed
        query = Invoice.objects.filter(email_sent_at__isnull=True)
        
        if organization_id:
            query = query.filter(organization_id=organization_id)
        
        pending_invoices = query.select_related('customer', 'estimate')
        
        sent_count = 0
        failed_count = 0
        skipped_count = 0
        
        sent_customers = []
        
        for invoice in pending_invoices:
            # Skip if no estimate (though unlikely)
            if not invoice.estimate:
                logger.warning(f"Skipping Invoice {invoice.id}: No linked estimate")
                skipped_count += 1
                continue
                
            # Check for active automation configuration
            template = None
            schedule_kwargs = get_active_schedule_kwargs('invoices', invoice.organization.id)
            if schedule_kwargs and schedule_kwargs.get('document_id'):
                try:
                    template = DocumentLibrary.objects.get(id=schedule_kwargs.get('document_id'), is_active=True)
                except DocumentLibrary.DoesNotExist:
                    pass
            
            # If no automation template, check for "invoice_email" mapping
            if not template:
                has_mapping = DocumentLibrary.objects.filter(
                    organization=invoice.organization, 
                    document_purpose='invoice_email', 
                    is_active=True
                ).exists()

                if not has_mapping:
                    logger.warning(f"Skipping Invoice {invoice.id}: No invoice email template or mapping configured")
                    skipped_count += 1
                    continue
            
            # Skip if customer has no email
            if not invoice.customer.email:
                logger.warning(f"Skipping Invoice {invoice.id}: Customer has no email")
                skipped_count += 1
                continue
            
            try:
                success, message = send_invoice_pdf_email(invoice, template=template)
                if success:
                    invoice.email_sent_at = timezone.now()
                    invoice.save(update_fields=['email_sent_at'])
                    sent_count += 1
                    sent_customers.append(invoice.customer.full_name)
                    logger.info(f"Successfully sent invoice {invoice.invoice_number}")
                else:
                    failed_count += 1
                    logger.error(f"Failed to send invoice {invoice.invoice_number}: {message}")
            except Exception as e:
                failed_count += 1
                logger.error(f"Error sending invoice {invoice.invoice_number}: {e}")
        
        summary = {
            'sent': sent_count,
            'failed': failed_count,
            'skipped': skipped_count,
            'total': sent_count + failed_count + skipped_count,
            'sent_customers': sent_customers
        }
        
        logger.info(f"send_pending_invoices completed: {summary}")
        return summary
        
    except Exception as e:
        logger.error(f"Error in send_pending_invoices task: {e}")
        return {'sent': 0, 'failed': 0, 'skipped': 0, 'error': str(e)}


def send_pending_receipts(organization_id=None, **kwargs):
    """
    Scheduled task to send pending payment receipts as PDFs via email.
    Finds all payment receipts that haven't been emailed yet.
    """
    from .models import PaymentReceipt
    from django.utils import timezone
    from masterdata.models import DocumentLibrary
    
    logger.info("Starting send_pending_receipts task")
    
    try:
        # Query for receipts that haven't been emailed
        query = PaymentReceipt.objects.filter(email_sent_at__isnull=True)
        
        if organization_id:
            query = query.filter(organization_id=organization_id)
        
        pending_receipts = query.select_related('invoice', 'invoice__estimate', 'invoice__customer')
        
        sent_count = 0
        failed_count = 0
        skipped_count = 0
        
        sent_customers = []
        
        for receipt in pending_receipts:
            estimate = receipt.invoice.estimate if receipt.invoice else None
            if not estimate:
                logger.warning(f"Skipping Receipt {receipt.id}: No linked estimate/invoice")
                skipped_count += 1
                continue

            # Check for active automation configuration
            template = None
            schedule_kwargs = get_active_schedule_kwargs('receipts', receipt.organization.id)
            if schedule_kwargs and schedule_kwargs.get('document_id'):
                try:
                    template = DocumentLibrary.objects.get(id=schedule_kwargs.get('document_id'), is_active=True)
                except DocumentLibrary.DoesNotExist:
                    pass
            
            # If no automation template, check for "receipt_email" mapping
            if not template:
                has_mapping = DocumentLibrary.objects.filter(
                    organization=receipt.organization, 
                    document_purpose='receipt_email', 
                    is_active=True
                ).exists()

                if not has_mapping:
                    logger.warning(f"Skipping Receipt {receipt.id}: No receipt email template or mapping configured")
                    skipped_count += 1
                    continue
            
            # Skip if customer has no email
            if not receipt.invoice.customer.email:
                logger.warning(f"Skipping Receipt {receipt.id}: Customer has no email")
                skipped_count += 1
                continue
            
            try:
                success, message = send_receipt_pdf_email(receipt, template=template)
                if success:
                    receipt.email_sent_at = timezone.now()
                    receipt.save(update_fields=['email_sent_at'])
                    sent_count += 1
                    sent_customers.append(receipt.invoice.customer.full_name)
                    logger.info(f"Successfully sent receipt {receipt.id}")
                else:
                    failed_count += 1
                    logger.error(f"Failed to send receipt {receipt.id}: {message}")
            except Exception as e:
                failed_count += 1
                logger.error(f"Error sending receipt {receipt.id}: {e}")
        
        summary = {
            'sent': sent_count,
            'failed': failed_count,
            'skipped': skipped_count,
            'total': sent_count + failed_count + skipped_count,
            'sent_customers': sent_customers
        }
        
        logger.info(f"send_pending_receipts completed: {summary}")
        return summary
        
    except Exception as e:
        logger.error(f"Error in send_pending_receipts task: {e}")
        return {'sent': 0, 'failed': 0, 'skipped': 0, 'error': str(e)}


def send_pending_estimates(organization_id=None, **kwargs):
    """
    Scheduled task to send pending estimates as PDFs via email.
    Finds all estimates with status 'sent' that haven't been emailed in the last 24 hours.
    """
    from .models import Estimate
    from django.utils import timezone
    from datetime import timedelta
    from masterdata.models import DocumentLibrary
    
    logger.info("Starting send_pending_estimates task")
    
    try:
        # Query for estimates with status 'sent' that haven't been emailed recently
        cutoff_time = timezone.now() - timedelta(hours=24)
        query = Estimate.objects.filter(
            status='sent'
        ).filter(
            models.Q(email_sent_at__isnull=True) | models.Q(email_sent_at__lt=cutoff_time)
        )
        
        if organization_id:
            query = query.filter(organization_id=organization_id)
        
        pending_estimates = query.select_related('customer')
        
        sent_count = 0
        failed_count = 0
        skipped_count = 0
        
        sent_customers = []
        
        for estimate in pending_estimates:
            # Check for active automation configuration
            template = None
            schedule_kwargs = get_active_schedule_kwargs('estimates', estimate.organization.id)
            if schedule_kwargs and schedule_kwargs.get('document_id'):
                try:
                    template = DocumentLibrary.objects.get(id=schedule_kwargs.get('document_id'), is_active=True)
                except DocumentLibrary.DoesNotExist:
                    pass
            
            # If no automation template, check for "estimate_email" mapping
            if not template:
                has_mapping = DocumentLibrary.objects.filter(
                    organization=estimate.organization, 
                    document_purpose='estimate_email', 
                    is_active=True
                ).exists()

                if not has_mapping:
                    logger.warning(f"Skipping Estimate {estimate.id}: No estimate email template or mapping configured")
                    skipped_count += 1
                    continue
            
            # Skip if customer has no email
            if not estimate.customer.email:
                logger.warning(f"Skipping Estimate {estimate.id}: Customer has no email")
                skipped_count += 1
                continue
            
            try:
                success, message = send_estimate_pdf_email(estimate, template=template)
                if success:
                    estimate.email_sent_at = timezone.now()
                    estimate.save(update_fields=['email_sent_at'])
                    sent_count += 1
                    sent_customers.append(estimate.customer.full_name)
                    logger.info(f"Successfully sent estimate {estimate.id}")
                else:
                    failed_count += 1
                    logger.error(f"Failed to send estimate {estimate.id}: {message}")
            except Exception as e:
                failed_count += 1
                logger.error(f"Error sending estimate {estimate.id}: {e}")
        
        summary = {
            'sent': sent_count,
            'failed': failed_count,
            'skipped': skipped_count,
            'total': sent_count + failed_count + skipped_count,
            'sent_customers': sent_customers
        }
        
        logger.info(f"send_pending_estimates completed: {summary}")
        return summary
        
    except Exception as e:
        logger.error(f"Error in send_pending_estimates task: {e}")
        return {'sent': 0, 'failed': 0, 'skipped': 0, 'error': str(e)}
