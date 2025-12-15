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
    from django.core.mail import EmailMultiAlternatives
    
    # Generate token if not exists
    if not estimate.public_token:
        estimate.public_token = generate_public_token()
        estimate.save()
    
    # Build public link
    public_link = f"{base_url}/public-estimate/{estimate.public_token}"
    
    # Email subject
    subject = f"Please Review and Sign - Estimate #{estimate.id}"
    
    # HTML Email body
    html_message = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{ margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5; }}
        .email-container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; }}
        .header {{ background-color: #FFFF00; padding: 40px 20px; text-align: center; }}
        .header img {{ max-width: 200px; height: auto; }}
        .header h1 {{ color: #333; font-size: 24px; margin: 10px 0 0 0; }}
        .content {{ padding: 40px 30px; background-color: #f8f9fa; }}
        .title {{ color: #5a6c7d; font-size: 20px; font-weight: 600; margin-bottom: 24px; text-align: center; }}
        .greeting {{ color: #333; font-size: 16px; margin-bottom: 20px; }}
        .message {{ color: #5a6c7d; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }}
        .contact {{ color: #5a6c7d; font-size: 15px; line-height: 1.6; margin-bottom: 32px; }}
        .button-container {{ text-align: center; margin: 32px 0; }}
        .button {{ display: inline-block; background-color: #1890ff; color: #ffffff; text-decoration: none; 
                   padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; }}
        .footer {{ padding: 30px; background-color: #ffffff; text-align: center; color: #999; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>Baltic Van Lines</h1>
        </div>
        <div class="content">
            <div class="title">Please Review and Sign - Estimate #{estimate.id}</div>
            <div class="greeting">Hello {estimate.customer.full_name},</div>
            <div class="message">
                Please review and complete your estimate related to your move by using the button below.
            </div>
            <div class="contact">
                If you have any questions please contact us at <strong>647-931-5244</strong> or send an email to 
                <strong>Info@BalticVanLines.ca</strong>
            </div>
            <div class="button-container">
                <a href="{public_link}" class="button">View Estimate</a>
            </div>
        </div>
        <div class="footer">
            <p>&copy; 2024 Baltic Van Lines. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    """
    
    # Plain text fallback
    text_message = f"""
Hello {estimate.customer.full_name},

Please review and complete your estimate related to your move by using the link below:

{public_link}

If you have any questions please contact us at 647-931-5244 or send an email to Info@BalticVanLines.ca

Best regards,
Baltic Van Lines Team
"""
    
    # Send email
    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_message,
            from_email=settings.EMAIL_HOST_USER,
            to=[estimate.customer.email]
        )
        email.attach_alternative(html_message, "text/html")
        email.send(fail_silently=False)
        
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
    from django.core.mail import EmailMultiAlternatives
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
    
    # Get document titles for subject
    document_titles = [doc.document.title for doc in estimate.estimate_documents.all()]
    first_doc_title = document_titles[0] if document_titles else "Documents"
    
    # Email subject
    subject = f"Please Review and Sign - {first_doc_title}"
    
    # HTML Email body
    document_list_html = "".join([
        f"<li style='margin-bottom: 8px;'>{doc.document.title}</li>" 
        for doc in estimate.estimate_documents.all()
    ])
    
    html_message = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{ margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5; }}
        .email-container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; }}
        .header {{ background-color: #FFFF00; padding: 40px 20px; text-align: center; }}
        .header img {{ max-width: 200px; height: auto; }}
        .header h1 {{ color: #333; font-size: 24px; margin: 10px 0 0 0; }}
        .content {{ padding: 40px 30px; background-color: #f8f9fa; }}
        .title {{ color: #5a6c7d; font-size: 20px; font-weight: 600; margin-bottom: 24px; text-align: center; }}
        .greeting {{ color: #333; font-size: 16px; margin-bottom: 20px; }}
        .message {{ color: #5a6c7d; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }}
        .contact {{ color: #5a6c7d; font-size: 15px; line-height: 1.6; margin-bottom: 32px; }}
        .document-list {{ background-color: #fff; border-left: 3px solid #1890ff; padding: 16px 20px; 
                         margin: 20px 0; border-radius: 4px; }}
        .document-list ul {{ margin: 0; padding-left: 20px; color: #333; }}
        .button-container {{ text-align: center; margin: 32px 0; }}
        .button {{ display: inline-block; background-color: #1890ff; color: #ffffff; text-decoration: none; 
                   padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; }}
        .footer {{ padding: 30px; background-color: #ffffff; text-align: center; color: #999; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>Baltic Van Lines</h1>
        </div>
        <div class="content">
            <div class="title">Please Review and Sign - {first_doc_title}</div>
            <div class="greeting">Hello {estimate.customer.full_name},</div>
            <div class="message">
                Please review and complete a document related to your move by using the button below.
            </div>
            {f'<div class="document-list"><strong>Documents to sign:</strong><ul>{document_list_html}</ul></div>' if document_count > 1 else ''}
            <div class="contact">
                If you have any questions please contact us at <strong>647-931-5244</strong> or send an email to 
                <strong>Info@BalticVanLines.ca</strong>
            </div>
            <div class="button-container">
                <a href="{document_link}" class="button">View Document</a>
            </div>
        </div>
        <div class="footer">
            <p>&copy; 2024 Baltic Van Lines. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    """
    
    # Plain text fallback
    text_message = f"""
Hello {estimate.customer.full_name},

Please review and complete a document related to your move by using the link below:

{document_link}

If you have any questions please contact us at 647-931-5244 or send an email to Info@BalticVanLines.ca

Best regards,
Baltic Van Lines Team
"""
    
    # Send email
    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_message,
            from_email=settings.EMAIL_HOST_USER,
            to=[estimate.customer.email]
        )
        email.attach_alternative(html_message, "text/html")
        email.send(fail_silently=False)
        
        # Update batch email sent timestamp
        batch.email_sent_at = timezone.now()
        batch.save()
        
        return True, f"Document signature request sent to {estimate.customer.email}"
    except Exception as e:
        return False, str(e)

