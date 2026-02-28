import secrets
from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

def generate_public_token():
    """Generate a secure random token for public access"""
    return secrets.token_urlsafe(32)


def process_and_attach_documents(email, attachments, customer=None, estimate=None):
    """
    Process HTML documents (convert to PDF with context) or attach static files.
    """
    from .utils import process_document_template, generate_pdf_from_html
    from django.core.files.base import ContentFile
    
    import os
    logger.info(f"Processing {len(attachments)} attachments for email")
    
    for doc in attachments:
        try:
            logger.info(f"Processing attachment: {doc.title} (Type: {doc.document_type}, Has file: {bool(doc.file)})")
            
            # Case 1: HTML Document (needs processing and PDF conversion)
            if doc.document_type == 'HTML Document' or (doc.file and doc.file.name.endswith('.html')):
                html_content = ""
                if doc.file:
                    try:
                        with doc.file.open('rb') as f:
                            raw_content = f.read()
                            html_content = raw_content.decode('utf-8', errors='replace')
                    except Exception as fe:
                        logger.warning(f"Failed to read attachment file {doc.file.name}: {fe}")
                        html_content = doc.description or doc.subject or ""
                else:
                    html_content = doc.description or doc.subject or ""
                
                if not html_content:
                    logger.warning(f"No content found for attachment {doc.title}, skipping.")
                    continue
                
                # Clean up zero-width spaces and other invisible characters
                html_content = html_content.replace('\u200b', '').replace('\ufeff', '').replace('â€‹', '')
                
                # Extract body if full HTML
                import re
                body_match = re.search(r'<body[^>]*>([\s\S]*)</body>', html_content, re.IGNORECASE)
                if body_match:
                    html_content = body_match.group(1).strip()
                
                # Process template tags
                processed_html = process_document_template(html_content, customer, estimate)
                
                # Wrap in basic style for PDF
                full_html = f"<html><head><style>body {{ font-family: Arial, sans-serif; }}</style></head><body>{processed_html}</body></html>"
                
                # Convert to PDF
                pdf_content = generate_pdf_from_html(full_html)
                if pdf_content:
                    # Clean filename
                    safe_title = "".join([c for c in doc.title if c.isalnum() or c in (' ', '-', '_')]).strip()
                    if not safe_title: safe_title = f"attachment_{doc.id}"
                    email.attach(f"{safe_title}.pdf", pdf_content, 'application/pdf')
                    logger.info(f"Attached processed PDF: {safe_title}.pdf")
                else:
                    logger.error(f"Failed to generate PDF for attachment: {doc.title}")
            
            # Case 2: Static file (attach as is)
            elif doc.file:
                filename = os.path.basename(doc.file.name)
                with doc.file.open('rb') as f:
                    email.attach(filename, f.read(), doc.document_type or 'application/octet-stream')
                    logger.info(f"Attached static file: {filename}")
            
            else:
                logger.warning(f"Attachment {doc.title} has no file and is not an HTML document. Skipping.")
        
        except Exception as e:
            logger.error(f"Failed to attach document {doc.title}: {e}")


def send_feedback_email(customer, organization, base_url=None):
    if base_url is None:
        base_url = settings.FRONTEND_URL.rstrip('/')

    """
    Send a feedback request email to a customer.
    """
    from .models import Feedback
    
    # Create or get pending feedback request
    feedback, created = Feedback.objects.get_or_create(
        customer=customer,
        organization=organization,
        status='draft',
        defaults={'public_token': generate_public_token()}
    )
    
    if not feedback.public_token:
        feedback.public_token = generate_public_token()
        feedback.save()

    # Build feedback link
    feedback_link = f"{base_url}/feedback/{feedback.public_token}"
    
    # Context for rendering
    context = {
        'customer_name': customer.full_name,
        'customer_first_name': customer.full_name.split()[0] if customer.full_name else 'Customer',
        'feedback_link': feedback_link,
        'organization_name': organization.name if organization else 'Baltic Van Lines'
    }
    
    # Default content
    default_subject = f"Your Feedback matters - {organization.name if organization else 'Baltic Van Lines'}"
    default_html = f"""
    <p>Dear {context['customer_first_name']},</p>
    <p>Thank you for choosing {context['organization_name']}. We hope you had a great experience!</p>
    <p>We would love to hear your feedback. Please click the button below to leave a review:</p>
    {{{{feedback_button}}}}
    <p>Thank you!</p>
    """
    
    # Render template (if a document with "Closed Email" purpose exists, it will be used)
    # Note: render_email_template fetches by title, but we might want to fetch by purpose later.
    # For now, we'll look for a template titled "Feedback Request" or "Closed Email"
    subject, html_message, text_message, attachments = render_email_template(
        "Feedback Request", context, default_subject, default_html
    )
    
    # Send email
    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_message,
            from_email=settings.EMAIL_HOST_USER,
            to=[customer.email]
        )
        email.attach_alternative(html_message, "text/html")
        
        # Process and attach documents
        process_and_attach_documents(email, attachments, customer=customer)
        
        email.send(fail_silently=False)
        
        # Update feedback status
        feedback.status = 'requested'
        feedback.request_sent_at = timezone.now()
        feedback.save()
        
        return True, "Feedback email sent successfully"
    except Exception as e:
        logger.error(f"Failed to send feedback email: {e}")
        return False, str(e)


def render_email_template(template_name, context, default_subject, default_body, purpose=None, organization=None, template=None, tracking_token=None):
    """
    Fetch email template from DB (by purpose or title) or use default.
    If 'template' is provided directly, it bypasses the lookup.
    Returns (subject, html_body, text_body, attachments)
    """
    from masterdata.models import DocumentLibrary
    
    subject = default_subject
    html_body = default_body
    attachments = []
    
    # Try to find active template in DocumentLibrary if not provided
    try:
        if not template:
            # 1. Try to find by purpose (preferred)
            if purpose:
                from django.db.models import Q
                query = DocumentLibrary.objects.filter(document_purpose=purpose, is_active=True)
                if organization:
                    query = query.filter(Q(organization=organization) | Q(organization__isnull=True)).order_by('-organization')
                template = query.first()
                
            # 2. Try to find by title (legacy fallback)
            if not template and template_name:
                from django.db.models import Q
                query = DocumentLibrary.objects.filter(title=template_name, is_active=True)
                if organization:
                    query = query.filter(Q(organization=organization) | Q(organization__isnull=True)).order_by('-organization')
                template = query.first()

        if template:
            # Fetch attachments
            attachments = list(template.attachments.all())
            logger.info(f"Found template: {template.title}, attachments count: {len(attachments)}")
            subject = template.subject if template.subject else default_subject
            
            # Load HTML body from file if available, otherwise use description
            if template.file:
                try:
                    # Read the HTML file content
                    logger.info(f"Reading template file: {template.file.name}")
                    with template.file.open('r') as f:
                        raw_bytes = f.read()
                    # Handle encoding: if opened as bytes, decode; if string, encode/decode to ensure UTF-8
                    if isinstance(raw_bytes, bytes):
                        file_content = raw_bytes.decode('utf-8', errors='replace')
                    else:
                        # Re-encode from system default and decode as UTF-8
                        try:
                            file_content = raw_bytes.encode('latin-1').decode('utf-8', errors='replace')
                        except (UnicodeDecodeError, UnicodeEncodeError):
                            file_content = raw_bytes
                    logger.info(f"File content length: {len(file_content)}")
                    # Extract body content from HTML (files saved from DocumentEditor have full HTML structure)
                    import re
                    body_match = re.search(r'<body[^>]*>([\s\S]*)</body>', file_content, re.IGNORECASE)
                    if body_match:
                        html_body = body_match.group(1).strip()
                        logger.info(f"Extracted body content, length: {len(html_body)}")
                    else:
                        html_body = file_content
                        logger.info(f"No body tag found, using full content")
                except Exception as e:
                    logger.warning(f"Failed to read template file: {e}, falling back to description")
                    html_body = template.description if template.description else default_body
            else:
                html_body = template.description if template.description else default_body
                logger.info(f"Using description field, length: {len(html_body)}")
            
            # Clean up zero-width spaces and other invisible characters added by SunEditor
            html_body = html_body.replace('\u200b', '')  # Zero-width space (Unicode)
            html_body = html_body.replace('\ufeff', '')  # Zero-width no-break space
            html_body = html_body.replace('â€‹', '')  # Zero-width space as read on Windows (cp1252)
            
            # Strip SunEditor's styled span wrapper around feedback_button tag
            # SunEditor inserts: <span style="...">{{feedback_button}}</span>
            import re
            html_body = re.sub(
                r'<span[^>]*>\s*\{\{feedback_button\}\}\s*</span>',
                '{{feedback_button}}',
                html_body
            )
            
            # Support both {tag} and {{tag}} substitution
            for key, value in context.items():
                placeholders = ["{" + str(key) + "}", "{{" + str(key) + "}}"]
                for placeholder in placeholders:
                    if placeholder in subject:
                        subject = subject.replace(placeholder, str(value))
                    if placeholder in html_body:
                        html_body = html_body.replace(placeholder, str(value))

            # Special tag for feedback button (process after context substitution)
            if "{{feedback_button}}" in html_body or "{feedback_button}" in html_body:
                logger.info("Found feedback_button tag, replacing with button HTML")
                feedback_link = context.get('feedback_link', '#')
                button_html = f"""
                <div style="margin: 20px 0; text-align: center;">
                    <a href="{feedback_link}" style="background-color: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                        Leave Feedback
                    </a>
                </div>
                """
                html_body = html_body.replace("{{feedback_button}}", button_html)
                html_body = html_body.replace("{feedback_button}", button_html)
            else:
                logger.info(f"No feedback_button tag found in body (length: {len(html_body)})")
                    
    except Exception as e:
        logger.warning(f"Error loading/rendering email template '{template_name}' (purpose: {purpose}): {e}")

    # Append tracking pixel if token is provided
    if tracking_token:
        tracking_url = f"{settings.BACKEND_URL}/api/transactiondata/track/{tracking_token}/"
        pixel_tag = f'<img src="{tracking_url}" width="1" height="1" style="display:none !important;" />'
        if '</body>' in html_body:
            html_body = html_body.replace('</body>', f'{pixel_tag}</body>')
        else:
            html_body += pixel_tag

    # Text body generation
    from django.utils.html import strip_tags
    text_body = strip_tags(html_body)
    
    return subject, html_body, text_body, attachments


def send_estimate_email(estimate, base_url=None, backend_base_url=None):
    if base_url is None:
        base_url = settings.FRONTEND_URL.rstrip('/')
        
    """
    Send estimate to customer via email
    base_url: Frontend URL for public estimate view
    backend_base_url: Backend URL for API endpoints (defaults to base_url with port 8000)
    """
    from django.core.mail import EmailMultiAlternatives
    
    # Generate token if not exists
    if not estimate.public_token:
        estimate.public_token = generate_public_token()
        estimate.save()
    
    # Determine backend URL
    if backend_base_url is None:
        # Try to derive backend URL from frontend URL
        if ':3000' in base_url:
            backend_base_url = base_url.replace(':3000', ':8000')
        else:
            backend_base_url = settings.BACKEND_URL
    
    # Remove trailing slash from backend_base_url to avoid double slash
    backend_base_url = backend_base_url.rstrip('/')
    
    # Build public link (frontend)
    public_link = f"{base_url}/public-estimate/{estimate.public_token}"
    # Build PDF download link (backend API) - no trailing slash for router with trailing_slash=False
    pdf_download_link = f"{backend_base_url}/api/transactiondata/estimates/download_pdf?token={estimate.public_token}"
    
    # Get service type name
    service_type_name = estimate.service_type.service_type if estimate.service_type else "Relocation Services"
    
    # Get job number
    job_number = estimate.customer.job_number if estimate.customer and estimate.customer.job_number else "N/A"
    
    # Customer first name (for greeting)
    customer_name = estimate.customer.full_name if estimate.customer else "Customer"
    customer_first_name = customer_name.split()[0] if customer_name else "Customer"
    
    # Context for template
    context = {
        'service_type_name': service_type_name,
        'job_number': job_number,
        'customer_name': customer_name,
        'customer_first_name': customer_first_name,
        'public_link': public_link,
        'pdf_download_link': pdf_download_link,
        'base_url': base_url
    }
    
    # Default Content
    default_subject = f"Your Estimate for {service_type_name} - Baltic Van Lines"
    
    default_html_message = f"""
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
        .button-container {{ text-align: center; margin: 32px 0; }}
        .button {{ display: inline-block; background-color: #1890ff; color: #ffffff; text-decoration: none;
                   padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; margin: 8px; }}
        .button-secondary {{ display: inline-block; background-color: #1890ff; color: #ffffff; text-decoration: none;
                            padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; margin: 8px; }}
        .contact {{ color: #5a6c7d; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }}
        .job-number {{ color: #5a6c7d; font-size: 15px; line-height: 1.6; margin-bottom: 32px; font-weight: 600; }}
        .footer {{ padding: 30px; background-color: #ffffff; text-align: center; color: #999; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>Baltic Van Lines</h1>
        </div>
        <div class="content">
            <div class="title">Your Estimate for {service_type_name}</div>
            <div class="greeting">Hello {customer_first_name},</div>
            <div class="message">
                Thank you for inquiring for a Estimate for <strong>{service_type_name}</strong> with Baltic Van Lines.<br><br>
                We all know how stressful moving can be, that's why we do our part in putting all the information out there for you to see.
            </div>
            <div class="message">
                To view your estimate and see more information please click the big button below!
            </div>
            <div class="button-container">
                <a href="{public_link}" class="button">View Estimate</a>
            </div>
            <div class="message">
                If you would like to download a PDF copy of your current estimate feel free to click the button below.
            </div>
            <div class="button-container">
                <a href="{pdf_download_link}" class="button-secondary">Download PDF</a>
            </div>
            <div class="contact">
                If you have any questions don't hesitate at any time to contact our office. You can respond to this email or call us at <strong>+1(647)931-5244</strong>.
            </div>
            <div class="job-number">
                To save time when calling please have your Job Number handy : <strong>{job_number}</strong>
            </div>
            <div class="footer">
                <p>Baltic Van Lines</p>
                <p>+1(647)931-5244 </p>
                <p>6685 Kennedy Rd, Mississauga, ON L5T 3A5</p>
                <p>balticvanlines.ca</p>
            </div>
        </div>
    </div>
</body>
</html>
    """

    # Get rendered content
    subject, html_message, text_message, attachments = render_email_template(
        "Estimate Email", context, default_subject, default_html_message, 
        purpose='estimate_email', organization=estimate.organization
    )
    
    # Send email
    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_message,
            from_email=settings.EMAIL_HOST_USER,
            to=[estimate.customer.email]
        )
        email.attach_alternative(html_message, "text/html")
        
        # Process and attach library documents
        process_and_attach_documents(email, attachments, customer=estimate.customer, estimate=estimate)
        
        # Attach PDF
        try:
            from .utils import generate_pdf_from_html, process_document_template
            from masterdata.models import DocumentLibrary
            
            # 1. Try to find PDF template from "System Mapping" (estimate_pdf)
            pdf_template = DocumentLibrary.objects.filter(
                organization=estimate.organization, 
                document_purpose='estimate_pdf', 
                is_active=True
            ).first()
            
            # 2. Fallback to estimate settings
            if not pdf_template:
                pdf_template = getattr(estimate, 'template_used', None) or estimate.email_template
            
            if pdf_template:
                 p_html = pdf_template.description if pdf_template.description else pdf_template.subject
                 if p_html:
                     processed_p_html = process_document_template(p_html, estimate.customer, estimate)
                     p_pdf_content = generate_pdf_from_html(processed_p_html)
                     if p_pdf_content:
                         email.attach(f"Estimate_{estimate.id}.pdf", p_pdf_content, 'application/pdf')
        except Exception as e:
            logger.error(f"Error attaching PDF to estimate email: {e}")

        email.send(fail_silently=False)
        
        # Update email sent timestamp
        estimate.email_sent_at = timezone.now()
        estimate.status = 'sent'
        estimate.save()
        
        return True, "Email sent successfully"
    except Exception as e:
        logger.error(f"Failed to send estimate email: {e}")
        return False, str(e)


def send_document_signature_email(estimate, base_url=None, tracking_token=None):
    if base_url is None:
        base_url = settings.FRONTEND_URL.rstrip('/')
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
    
    # Document list (can be used in template)
    document_list_html = "".join([
        f"<li style='margin-bottom: 8px;'>{doc.document.title}</li>" 
        for doc in estimate.estimate_documents.all()
    ])
    
    context = {
        'customer_name': estimate.customer.full_name,
        'customer_first_name': estimate.customer.full_name.split()[0],
        'document_link': document_link,
        'first_doc_title': first_doc_title,
        'document_count': document_count,
        'document_list_html': document_list_html
    }
    
    # Default content
    default_subject = f"Please Review and Sign - {first_doc_title}"
    
    default_html_message = f"""
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
                If you have any questions please contact us at <strong>+1(647)931-5244</strong> or send an email to 
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

    # Get rendered content
    subject, html_message, text_message, attachments = render_email_template(
        "Document Signature Email", context, default_subject, default_html_message,
        tracking_token=tracking_token, organization=estimate.organization
    )
    
    # Send email
    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_message,
            from_email=settings.EMAIL_HOST_USER,
            to=[estimate.customer.email]
        )
        email.attach_alternative(html_message, "text/html")
        
        # Process and attach library documents
        process_and_attach_documents(email, attachments, customer=estimate.customer, estimate=estimate)
        
        email.send(fail_silently=False)
        
        # Update batch email sent timestamp
        batch.email_sent_at = timezone.now()
        batch.save()
        
        return True, f"Document signature request sent to {estimate.customer.email}"
    except Exception as e:
        logger.error(f"Failed to send signature email: {e}")
        return False, str(e)




def send_feedback_email(feedback, base_url=None, tracking_token=None):
    if base_url is None:
        base_url = settings.FRONTEND_URL.rstrip('/')
    """
    Send feedback request to customer
    """
    from django.core.mail import EmailMultiAlternatives
    
    # Generate token if not exists
    if not feedback.public_token:
        feedback.public_token = generate_public_token()
        feedback.save()
        
    # Build feedback link
    feedback_link = f"{base_url}/feedback/{feedback.public_token}"
    
    # Context
    context = {
        'customer_name': feedback.customer.full_name,
        'customer_first_name': feedback.customer.full_name.split()[0],
        'feedback_link': feedback_link,
    }
    
    # Default content
    default_subject = f"How was your experience with Baltic Van Lines?"
    
    default_html_message = f"""
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
            <div class="title">How was your move?</div>
            <div class="greeting">Hello {feedback.customer.full_name.split()[0]},</div>
            <div class="message">
                We hope you are settling in nicely! We would love to hear about your experience with us.
            </div>
            <div class="button-container">
                <a href="{feedback_link}" class="button">Leave Feedback</a>
            </div>
            <div class="message">
                Your feedback helps us improve our services for future customers.
            </div>
        </div>
        <div class="footer">
            <p>&copy; 2024 Baltic Van Lines. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    """

    # Get rendered content
    subject, html_message, text_message, attachments = render_email_template(
        "Feedback Request Email", context, default_subject, default_html_message,
        tracking_token=tracking_token, organization=feedback.organization
    )
    
    # Send email
    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_message,
            from_email=settings.EMAIL_HOST_USER,
            to=[feedback.customer.email]
        )
        email.attach_alternative(html_message, "text/html")
        
        # Process and attach library documents
        process_and_attach_documents(email, attachments, customer=feedback.customer)
        
        email.send(fail_silently=False)
        
        return True, "Feedback request sent successfully"
    except Exception as e:
        logger.error(f"Failed to send feedback email: {e}")
        return False, str(e)


def send_invoice_pdf_email(invoice, template=None, tracking_token=None):
    """
    Send invoice PDF to customer using specified template or default mapping.
    The invoice PDF should already be generated.
    """
    estimate = invoice.estimate
    try:
        # Build context
        context = {
            'customer_name': estimate.customer.full_name,
            'customer_first_name': estimate.customer.full_name.split()[0] if estimate.customer.full_name else 'Customer',
            'invoice_number': invoice.invoice_number,
            'total_amount': f"${invoice.total_amount:.2f}",
            'job_number': estimate.customer.job_number if estimate.customer else 'N/A'
        }
        
        # Default content
        default_subject = f"Your Invoice {invoice.invoice_number} - Baltic Van Lines"
        default_html = f"""
        <p>Dear {context['customer_first_name']},</p>
        <p>Please find attached your invoice for the services provided.</p>
        <p>Invoice Number: {context['invoice_number']}</p>
        <p>Total Amount: {context['total_amount']}</p>
        <p>Thank you for your business!</p>
        """
        
        # Render template
        template_title = template.title if template else "Invoice Email"
        subject, html_message, text_message, attachments = render_email_template(
            template_title, context, default_subject, default_html,
            purpose='invoice_email', organization=estimate.organization,
            template=template, tracking_token=tracking_token
        )
        
        # Create email
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_message,
            from_email=settings.EMAIL_HOST_USER,
            to=[estimate.customer.email]
        )
        email.attach_alternative(html_message, "text/html")
        
        # Process and attach library documents
        process_and_attach_documents(email, attachments, customer=estimate.customer, estimate=estimate)
        
        # Attach PDF if it exists, or generate it
        if not invoice.pdf_file:
            logger.info(f"PDF missing for Invoice {invoice.id}, attempting generation...")
            from .utils import generate_invoice_pdf
            gen_success = generate_invoice_pdf(invoice)
            if gen_success:
                invoice.refresh_from_db()
                logger.info(f"PDF generated successfully for Invoice {invoice.id}")
            else:
                logger.warning(f"Failed to generate PDF for Invoice {invoice.id}")

        if invoice.pdf_file:
            try:
                invoice.pdf_file.open('rb')
                email.attach(
                    f"Invoice_{invoice.invoice_number}.pdf",
                    invoice.pdf_file.read(),
                    'application/pdf'
                )
                invoice.pdf_file.close()
                logger.info(f"PDF attached to Invoice {invoice.id} email")
            except Exception as e:
                logger.error(f"Error attaching PDF to invoice email: {e}")
        else:
            logger.warning(f"No PDF file found to attach for Invoice {invoice.id}")

        email.send(fail_silently=False)
        
        logger.info(f"Invoice email sent for Invoice {invoice.id}")
        return True, "Invoice email sent successfully"
        
    except Exception as e:
        logger.error(f"Failed to send invoice email for Invoice {invoice.id}: {e}")
        return False, str(e)


def send_receipt_pdf_email(receipt, template=None, tracking_token=None):
    """
    Send payment receipt PDF to customer using specified template or default mapping.
    """
    try:
        invoice = receipt.invoice
        estimate = invoice.estimate
        
        # Build context
        context = {
            'customer_name': estimate.customer.full_name,
            'customer_first_name': estimate.customer.full_name.split()[0] if estimate.customer.full_name else 'Customer',
            'receipt_number': f"REC-{receipt.id}",
            'payment_amount': f"${receipt.amount:.2f}",
            'payment_date': receipt.payment_date.strftime('%B %d, %Y') if receipt.payment_date else 'N/A',
            'job_number': estimate.customer.job_number if estimate.customer else 'N/A'
        }
        
        # Default content
        default_subject = f"Payment Receipt #{receipt.id} - Baltic Van Lines"
        default_html = f"""
        <p>Dear {context['customer_first_name']},</p>
        <p>Thank you for your payment. Please find attached your payment receipt.</p>
        <p>Receipt Number: {context['receipt_number']}</p>
        <p>Amount Paid: {context['payment_amount']}</p>
        <p>Payment Date: {context['payment_date']}</p>
        <p>We appreciate your business!</p>
        """
        
        # Render template
        template_title = template.title if template else "Receipt Email"
        subject, html_message, text_message, attachments = render_email_template(
            template_title, context, default_subject, default_html,
            purpose='receipt_email', organization=estimate.organization,
            template=template, tracking_token=tracking_token
        )
        
        # Create email
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_message,
            from_email=settings.EMAIL_HOST_USER,
            to=[estimate.customer.email]
        )
        email.attach_alternative(html_message, "text/html")
        
        # Process and attach library documents
        process_and_attach_documents(email, attachments, customer=estimate.customer, estimate=estimate)
        
        # Attach PDF if it exists, or generate it
        if not receipt.pdf_file:
            from .utils import generate_payment_receipt_pdf
            generate_payment_receipt_pdf(receipt)
            receipt.refresh_from_db()

        if receipt.pdf_file:
            try:
                receipt.pdf_file.open('rb')
                email.attach(
                    f"Receipt_{receipt.id}.pdf",
                    receipt.pdf_file.read(),
                    'application/pdf'
                )
                receipt.pdf_file.close()
            except Exception as e:
                logger.error(f"Error attaching PDF to receipt email: {e}")
        
        email.send(fail_silently=False)
        
        logger.info(f"Receipt email sent for Receipt {receipt.id}")
        return True, "Receipt email sent successfully"
        
    except Exception as e:
        logger.error(f"Failed to send receipt email for Receipt {receipt.id}: {e}")
        return False, str(e)


def send_estimate_pdf_email(estimate, template=None, tracking_token=None):
    """
    Send estimate PDF to customer using specified template or default mapping.
    """
    try:
        # Build context
        context = {
            'customer_name': estimate.customer.full_name,
            'customer_first_name': estimate.customer.full_name.split()[0] if estimate.customer.full_name else 'Customer',
            'estimate_number': f"EST-{estimate.id}",
            'total_amount': f"${estimate.total_amount:.2f}",
            'service_type': estimate.service_type.service_type if estimate.service_type else 'Services',
            'job_number': estimate.customer.job_number if estimate.customer else 'N/A'
        }
        
        # Default content
        default_subject = f"Your Estimate #{estimate.id} - Baltic Van Lines"
        default_html = f"""
        <p>Dear {context['customer_first_name']},</p>
        <p>Please find attached your estimate for {context['service_type']}.</p>
        <p>Estimate Number: {context['estimate_number']}</p>
        <p>Total Amount: {context['total_amount']}</p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>Thank you for considering Baltic Van Lines!</p>
        """
        
        # Render template
        template_title = template.title if template else "Estimate Email"
        subject, html_message, text_message, attachments = render_email_template(
            template_title, context, default_subject, default_html,
            purpose='estimate_email', organization=estimate.organization,
            template=template, tracking_token=tracking_token
        )
        

        # Create email
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_message,
            from_email=settings.EMAIL_HOST_USER,
            to=[estimate.customer.email]
        )
        email.attach_alternative(html_message, "text/html")
        
        # Process and attach library documents
        process_and_attach_documents(email, attachments, customer=estimate.customer, estimate=estimate)
        
        # Attach PDF if we can generate it
        try:
            from .utils import generate_pdf_from_html, process_document_template
            from masterdata.models import DocumentLibrary
            
            # 1. Try to find PDF template from "System Mapping" (estimate_pdf)
            pdf_template = DocumentLibrary.objects.filter(
                organization=estimate.organization, 
                document_purpose='estimate_pdf', 
                is_active=True
            ).first()
            
            # 2. Fallback to estimate settings (legacy)
            if not pdf_template:
                pdf_template = getattr(estimate, 'estimate_template', None)
            
            if pdf_template:
                # For PDF, we want the body content which is in description
                html_content = pdf_template.description if pdf_template.description else pdf_template.subject
                if html_content:
                    processed_html = process_document_template(html_content, estimate.customer, estimate)
                    pdf_content = generate_pdf_from_html(processed_html)
                    if pdf_content:
                        email.attach(f"Estimate_{estimate.id}.pdf", pdf_content, 'application/pdf')
        except Exception as e:
            logger.error(f"Error attaching PDF to estimate email: {e}")
        
        email.send(fail_silently=False)
        
        logger.info(f"Estimate email sent for Estimate {estimate.id}")
        return True, "Estimate email sent successfully"
        
    except Exception as e:
        logger.error(f"Failed to send estimate email for Estimate {estimate.id}: {e}")
        return False, str(e)


def send_new_lead_email(customer, template=None, tracking_token=None):
    """
    Send a welcome email to a new lead.
    """
    try:
        # Build context
        context = {
            'customer_name': customer.full_name,
            'customer_first_name': customer.full_name.split()[0] if customer.full_name else 'Customer',
            'job_number': customer.job_number if customer.job_number else 'N/A'
        }
        
        # Default content
        default_subject = f"Welcome to Baltic Van Lines"
        default_html = f"""
        <p>Dear {context['customer_first_name']},</p>
        <p>Thank you for your interest in Baltic Van Lines! We have received your inquiry and one of our specialists will be in touch with you shortly.</p>
        <p>Your Job Number for future reference: <strong>{context['job_number']}</strong></p>
        <p>Thank you!</p>
        """
        
        # Render template
        template_title = template.title if template else "New Lead Email"
        subject, html_message, text_message, attachments = render_email_template(
            template_title, context, default_subject, default_html,
            purpose='new_lead_email', organization=customer.organization,
            tracking_token=tracking_token
        )
        
        # Create email
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_message,
            from_email=settings.EMAIL_HOST_USER,
            to=[customer.email]
        )
        email.attach_alternative(html_message, "text/html")
        
        # Process and attach library documents
        process_and_attach_documents(email, attachments, customer=customer)
        
        email.send(fail_silently=False)
        
        logger.info(f"New Lead email sent to {customer.email}")
        return True, "Welcome email sent successfully"
        
    except Exception as e:
        logger.error(f"Failed to send new lead email to {customer.email}: {e}")
        return False, str(e)


def send_booked_email(customer, template=None, tracking_token=None):
    """
    Send an email to a customer when their job is booked.
    """
    try:
        # Build context
        context = {
            'customer_name': customer.full_name,
            'customer_first_name': customer.full_name.split()[0] if customer.full_name else 'Customer',
            'job_number': customer.job_number if customer.job_number else 'N/A',
            'move_date': customer.move_date.strftime('%B %d, %Y') if customer.move_date else 'TBD'
        }
        
        # Default content
        default_subject = f"Your Job is Booked! - Baltic Van Lines"
        default_html = f"""
        <p>Dear {context['customer_first_name']},</p>
        <p>We are excited to confirm that your job has been officially booked with Baltic Van Lines!</p>
        <p>Job Number: <strong>{context['job_number']}</strong></p>
        <p>Move Date: <strong>{context['move_date']}</strong></p>
        <p>Our team will reach out to you as the move date approaches to coordinate the final details.</p>
        <p>Thank you for choosing us!</p>
        """
        
        # Render template
        template_title = template.title if template else "Booked Email"
        subject, html_message, text_message, attachments = render_email_template(
            template_title, context, default_subject, default_html,
            purpose='booked_email', organization=customer.organization,
            tracking_token=tracking_token
        )
        
        # Create email
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_message,
            from_email=settings.EMAIL_HOST_USER,
            to=[customer.email]
        )
        email.attach_alternative(html_message, "text/html")
        
        # Process and attach library documents
        process_and_attach_documents(email, attachments, customer=customer)
        
        email.send(fail_silently=False)
        
        logger.info(f"Booked email sent to {customer.email}")
        return True, "Booked email sent successfully"
        
    except Exception as e:
        logger.error(f"Failed to send booked email to {customer.email}: {e}")
        return False, str(e)


def send_closed_email(customer, feedback_link, template=None, tracking_token=None):
    """
    Send a final email to a customer when their job is closed/completed.
    Includes a feedback button.
    """
    try:
        # Build context
        context = {
            'customer_name': customer.full_name,
            'customer_first_name': customer.full_name.split()[0] if customer.full_name else 'Customer',
            'job_number': customer.job_number if customer.job_number else 'N/A',
            'feedback_link': feedback_link
        }
        
        # Default content
        default_subject = f"Thank you for choosing Baltic Van Lines"
        default_html = f"""
        <p>Dear {context['customer_first_name']},</p>
        <p>Your move with Baltic Van Lines is now complete. We hope you had a great experience!</p>
        <p>We would greatly appreciate it if you could take a moment to leave us some feedback on our service.</p>
        {{{{feedback_button}}}}
        <p>Thank you for your business!</p>
        """
        
        # Render template
        template_title = template.title if template else "Closed Email"
        subject, html_message, text_message, attachments = render_email_template(
            template_title, context, default_subject, default_html,
            purpose='closed_email', organization=customer.organization,
            tracking_token=tracking_token
        )
        
        # Create email
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_message,
            from_email=settings.EMAIL_HOST_USER,
            to=[customer.email]
        )
        email.attach_alternative(html_message, "text/html")
        
        # Process and attach library documents
        process_and_attach_documents(email, attachments, customer=customer)
        
        email.send(fail_silently=False)
        
        logger.info(f"Closed Email sent to {customer.email}")
        return True, "Closed Email sent successfully"
        
    except Exception as e:
        logger.error(f"Failed to send closed email to {customer.email}: {e}")
        return False, str(e)
