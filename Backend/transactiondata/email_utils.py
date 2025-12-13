import secrets
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone


def generate_public_token():
    """Generate a secure random token for public estimate access"""
    return secrets.token_urlsafe(32)


def send_estimate_email(estimate, base_url="http://127.0.0.1:3000"):
    """
    Send estimate to customer via email
    """
    # Generate token if not exists
    if not estimate.public_token:
        estimate.public_token = generate_public_token()
        estimate.save()
    
    # Build public link
    public_link = f"{base_url}/public-estimate/{estimate.public_token}"
    
    # Email subject
    subject = f"Estimate #{estimate.id} from BVL Movers"
    
    # Email body
    message = f"""
Hello {estimate.customer.full_name},

Thank you for your interest in BVL Movers!

We have prepared an estimate for your {estimate.service_type.service_type} service.

Estimate Details:
- Estimate Number: #{estimate.id}
- Service Type: {estimate.service_type.service_type}
- Total Amount: ${estimate.total_amount}

Please review and approve your estimate by clicking the link below:

{public_link}

This link is secure and unique to your estimate. You can view the details and approve or reject the estimate directly through this link.

If you have any questions, please don't hesitate to contact us.

Best regards,
BVL Movers Team
"""
    
    # Send email
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[estimate.customer.email],
            fail_silently=False,
        )
        
        # Update email sent timestamp
        estimate.email_sent_at = timezone.now()
        estimate.status = 'sent'
        estimate.save()
        
        return True, "Email sent successfully"
    except Exception as e:
        return False, str(e)


def send_document_signature_email(estimate, base_url="http://127.0.0.1:3000"):
    """
    Send document signature request to customer (with separate token from estimate)
    """
    from .models import DocumentSigningBatch
    
    # Check if estimate has documents
    document_count = estimate.estimate_documents.count()
    
    if document_count == 0:
        return False, "No documents attached to this estimate"
    
    # Get or create document signing batch with its own token
    batch, created = DocumentSigningBatch.objects.get_or_create(
        estimate=estimate,
        defaults={'signing_token': generate_public_token()}
    )
    
    # Build public link for documents (uses DIFFERENT token than estimate)
    document_link = f"{base_url}/sign-documents/{batch.signing_token}"
    
    # Email subject
    subject = f"Documents for Signature - Estimate #{estimate.id}"
    
    # Email body
    document_list = "\n".join([
        f"- {doc.document.title}" for doc in estimate.estimate_documents.all()
    ])
    
    message = f"""
Hello {estimate.customer.full_name},

We need your signature on the following documents for Estimate #{estimate.id}:

{document_list}

Please review and sign each document by clicking the link below:

{document_link}

This link is secure and unique to your estimate. All documents must be signed to proceed.

If you have any questions, please don't hesitate to contact us.

Best regards,
BVL Movers Team
"""
    
    # Send email
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[estimate.customer.email],
            fail_silently=False,
        )
        
        # Update batch email sent timestamp
        batch.email_sent_at = timezone.now()
        batch.save()
        
        return True, f"Document signature request sent to {estimate.customer.email}"
    except Exception as e:
        return False, str(e)

