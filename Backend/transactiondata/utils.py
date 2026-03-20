from decimal import Decimal
import logging
from .models import Estimate, EstimateLineItem, ChargeType, Invoice, PaymentReceipt, WorkOrder
from datetime import datetime
from io import BytesIO
from django.core.files.base import ContentFile
from xhtml2pdf import pisa
import os

logger = logging.getLogger(__name__)


def create_estimate_from_template(template, customer, weight=None, labour_hours=None, 
                                  pickup_date_from=None, pickup_date_to=None, pickup_time_window_id=None,
                                  delivery_date_from=None, delivery_date_to=None, delivery_time_window_id=None,
                                  created_by=None, organization=None):
    """
    Create a new estimate from a template
    """
    # Get time window objects if IDs provided
    from .models import TimeWindow
    pickup_time_window = None
    delivery_time_window = None
    
    if pickup_time_window_id:
        try:
            pickup_time_window = TimeWindow.objects.get(id=pickup_time_window_id)
        except TimeWindow.DoesNotExist:
            pass
    
    if delivery_time_window_id:
        try:
            delivery_time_window = TimeWindow.objects.get(id=delivery_time_window_id)
        except TimeWindow.DoesNotExist:
            pass
    
    estimate = Estimate.objects.create(
        customer=customer,
        organization=organization,
        template_used=template,
        service_type=template.service_type,
        weight_lbs=weight,
        labour_hours=labour_hours,
        pickup_date_from=pickup_date_from,
        pickup_date_to=pickup_date_to,
        pickup_time_window=pickup_time_window,
        delivery_date_from=delivery_date_from,
        delivery_date_to=delivery_date_to,
        delivery_time_window=delivery_time_window,
        created_by=created_by
    )
    
    # Copy template items to estimate items
    for idx, template_item in enumerate(template.items.all()):
        EstimateLineItem.objects.create(
            estimate=estimate,
            charge=template_item.charge,
            charge_name=template_item.charge.name,
            charge_type=template_item.charge.charge_type,
            rate=template_item.rate or template_item.charge.default_rate,
            percentage=template_item.percentage or template_item.charge.default_percentage,
            display_order=idx
        )
    
    # Calculate the estimate
    calculate_estimate(estimate)
    
    return estimate


def calculate_estimate(estimate):
    """
    Calculate all line items and total for an estimate
    """
    subtotal_map = {}  # Store amounts by charge id for percentage calculations
    
    # STEP 1: Calculate direct charges (per_lb, hourly, flat)
    direct_items = estimate.items.exclude(charge_type=ChargeType.PERCENT).order_by('display_order')
    
    for item in direct_items:
        if item.charge_type == ChargeType.PER_LB:
            item.amount = Decimal(estimate.weight_lbs or 0) * Decimal(item.rate or 0)
        elif item.charge_type == ChargeType.HOURLY:
            item.amount = Decimal(estimate.labour_hours or 0) * Decimal(item.rate or 0)
        elif item.charge_type == ChargeType.FLAT:
            item.amount = Decimal(item.rate or 0) * Decimal(item.quantity or 1)
        
        item.save()
        if item.charge_id:
            subtotal_map[item.charge_id] = item.amount
    
    # STEP 2: Calculate percentage-based charges
    percent_items = estimate.items.filter(charge_type=ChargeType.PERCENT).order_by('display_order')
    
    for item in percent_items:
        base_amount = Decimal(0)
        
        if item.charge and item.charge.percent_applied_on_id:
            # Find the base charge amount
            base_amount = subtotal_map.get(item.charge.percent_applied_on_id, Decimal(0))
        
        item.amount = (base_amount * Decimal(item.percentage or 0)) / Decimal(100)
        item.save()
        if item.charge_id:
            subtotal_map[item.charge_id] = item.amount
    
    # STEP 3: Calculate totals with discount and tax
    subtotal = sum(item.amount for item in estimate.items.all())
    estimate.subtotal = subtotal
    
    # Calculate discount
    discount_amount = Decimal(0)
    if estimate.discount_type and estimate.discount_value:
        if estimate.discount_type == 'flat':
            discount_amount = Decimal(estimate.discount_value)
        elif estimate.discount_type == 'percent':
            discount_amount = (subtotal * Decimal(estimate.discount_value)) / Decimal(100)
    estimate.discount_amount = discount_amount
    
    # Subtotal after discount
    subtotal_after_discount = subtotal - discount_amount
    
    # Get tax percentage - use existing value if already set, otherwise get from branch
    if estimate.tax_percentage is None or estimate.tax_percentage == Decimal(0):
        # First time or not set - get from customer's branch
        tax_percentage = Decimal(0)
        if estimate.customer.branch and estimate.customer.branch.sales_tax_percentage:
            tax_percentage = Decimal(estimate.customer.branch.sales_tax_percentage)
        estimate.tax_percentage = tax_percentage
    else:
        # Use the manually set tax percentage
        tax_percentage = estimate.tax_percentage
    
    # Calculate tax amount on subtotal after discount
    estimate.tax_amount = (subtotal_after_discount * tax_percentage) / Decimal(100)
    
    # Calculate total (subtotal after discount + tax)
    estimate.total_amount = subtotal_after_discount + estimate.tax_amount
    
    # Recalculate balance due based on existing payments
    estimate.calculate_balance()
    
    estimate.save()
    
    return estimate


def convert_images_to_base64(html_content):
    """
    Convert all image URLs in HTML to base64 for PDF generation
    """
    import re
    import base64
    import requests
    from django.conf import settings
    
    # Log image tags found in content for debugging
    img_tags = re.findall(r'<img[^>]+>', html_content, flags=re.IGNORECASE)
    logger.info(f"convert_images_to_base64: Found {len(img_tags)} img tags in content")
    for i, tag in enumerate(img_tags[:5]):  # Log first 5
        logger.info(f"  Image {i+1}: {tag[:200]}...")  # Truncate long base64
    
    def replace_img_src(match):
        full_tag = match.group(0)
        src = match.group(1)
        
        logger.info(f"Processing image src: {src[:100]}...")  # Log what we're processing
        
        # Skip if already base64
        if src.startswith('data:image'):
            logger.info(f"  -> Already base64, keeping as-is")
            return full_tag
        
        # Detect blob URLs (temporary browser URLs that won't work)
        if src.startswith('blob:'):
            logger.warning(f"Blob URL found in document image: {src}. This image will not render. Configure SunEditor to use base64.")
            return full_tag
        
        try:
            # Handle Local paths (starts with /media/ or /static/)
            if src.startswith('/media/') or src.startswith('/static/'):
                # Resolve local file path
                if src.startswith('/media/'):
                    file_path = os.path.join(settings.MEDIA_ROOT, src.replace('/media/', ''))
                else:
                    file_path = os.path.join(settings.STATIC_ROOT, src.replace('/static/', ''))
                
                if os.path.exists(file_path):
                    with open(file_path, "rb") as image_file:
                        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                        content_type = "image/png" # Default, could be more dynamic
                        if src.endswith('.jpg') or src.endswith('.jpeg'):
                            content_type = "image/jpeg"
                        elif src.endswith('.gif'):
                            content_type = "image/gif"
                        elif src.endswith('.svg'):
                            content_type = "image/svg+xml"
                        return full_tag.replace(src, f'data:{content_type};base64,{encoded_string}')

            # Check if it's a URL
            if src.startswith('http://') or src.startswith('https://'):
                # Download image
                response = requests.get(src, timeout=10)
                if response.status_code == 200:
                    content_type = response.headers.get('content-type', 'image/png')
                    image_base64 = base64.b64encode(response.content).decode('utf-8')
                    return full_tag.replace(src, f'data:{content_type};base64,{image_base64}')
            
            # Handle if it's an absolute path but missing the domain (common in some editors)
            if not src.startswith('http') and not src.startswith('/'):
                 # Try to see if it's just a filename in media
                 file_path = os.path.join(settings.MEDIA_ROOT, src)
                 if os.path.exists(file_path):
                    with open(file_path, "rb") as image_file:
                        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                        return full_tag.replace(src, f'data:image/png;base64,{encoded_string}')

            return full_tag
        except Exception as e:
            logger.error(f"Error converting image {src}: {e}")
            return full_tag
    
    # Replace all img src attributes
    html_content = re.sub(r'<img[^>]+src=["\']([^"\']+)["\']', replace_img_src, html_content, flags=re.IGNORECASE)
    
    return html_content


def process_document_template(html_content, customer=None, estimate=None, signatures=None, text_inputs=None, invoice=None, payment=None):
    """
    Replace template tags with actual customer and estimate data
    signatures: dict like {'0': 'base64_signature_data', '1': '...'}
    text_inputs: dict like {'0': 'text value', '1': 'another value'}
    invoice: optional Invoice object for invoice-specific tags
    payment: optional PaymentReceipt object for payment-specific tags
    """
    if not html_content:
        return html_content

    # Normalize hidden chars / nbsp that break tag matching (SunEditor often inserts these)
    # Keep this BEFORE any tag checks.
    try:
        html_content = (
            html_content
            .replace('\u200b', '')  # zero-width space
            .replace('\ufeff', '')  # BOM
            .replace('&nbsp;', ' ')
            .replace('&#160;', ' ')
        )
    except Exception:
        pass

    # Customer tags
    if customer:
        html_content = html_content.replace('{{job_number}}', str(customer.job_number) if customer.job_number else '')
        html_content = html_content.replace('{{customer_name}}', customer.full_name or '')
        html_content = html_content.replace('{{customer_email}}', customer.email or '')
        html_content = html_content.replace('{{customer_phone}}', customer.phone or '')
        html_content = html_content.replace('{{customer_company}}', customer.company or '')
        html_content = html_content.replace('{{customer_address}}', customer.address or '')
        html_content = html_content.replace('{{customer_city}}', customer.city or '')
        html_content = html_content.replace('{{customer_state}}', customer.state or '')
        html_content = html_content.replace('{{origin_address}}', customer.origin_address or '')
        html_content = html_content.replace('{{destination_address}}', customer.destination_address or '')
    
    # Estimate tags
    if estimate:
        html_content = html_content.replace('{{estimate_id}}', str(estimate.id))
        html_content = html_content.replace('{{estimate_date}}', estimate.created_at.strftime('%B %d, %Y') if estimate.created_at else '')
        html_content = html_content.replace('{{estimate_subtotal}}', f'${estimate.subtotal:,.2f}')
        html_content = html_content.replace('{{estimate_tax}}', f'${estimate.tax_amount:,.2f}')
        html_content = html_content.replace('{{estimate_tax_percent}}', f'{estimate.tax_percentage:.2f}%')
        html_content = html_content.replace('{{estimate_total}}', f'${estimate.total_amount:,.2f}')
        html_content = html_content.replace('{{service_type}}', estimate.service_type.service_type if estimate.service_type else '')
        html_content = html_content.replace('{{move_date}}', estimate.customer.move_date.strftime('%B %d, %Y') if estimate.customer.move_date else '')
        # Handle bracketed and single brace versions requested by user
        formatted_date = estimate.customer.move_date.strftime('%B %d, %Y') if estimate.customer.move_date else ''
        html_content = html_content.replace('[move_date]', formatted_date)
        html_content = html_content.replace('{move_date}', formatted_date)

        html_content = html_content.replace('{{weight}}', f'{estimate.weight_lbs} lbs' if estimate.weight_lbs else '')
        html_content = html_content.replace('{{labour_hours}}', f'{estimate.labour_hours} hours' if estimate.labour_hours else '')
        
        # Time windows and Date Ranges
        html_content = html_content.replace('{{pickup_time_window}}', str(estimate.pickup_time_window) if estimate.pickup_time_window else '')
        html_content = html_content.replace('{{delivery_time_window}}', str(estimate.delivery_time_window) if estimate.delivery_time_window else '')
        
        pickup_range_str = ''
        if getattr(estimate, 'pickup_date_from', None) and getattr(estimate, 'pickup_date_to', None):
            pickup_range_str = f"{estimate.pickup_date_from.strftime('%B %d, %Y')} - {estimate.pickup_date_to.strftime('%B %d, %Y')}"
        elif getattr(estimate, 'pickup_date_from', None):
            pickup_range_str = estimate.pickup_date_from.strftime('%B %d, %Y')
        html_content = html_content.replace('{{pickup_date_range}}', pickup_range_str)

        delivery_range_str = ''
        if getattr(estimate, 'delivery_date_from', None) and getattr(estimate, 'delivery_date_to', None):
            delivery_range_str = f"{estimate.delivery_date_from.strftime('%B %d, %Y')} - {estimate.delivery_date_to.strftime('%B %d, %Y')}"
        elif getattr(estimate, 'delivery_date_from', None):
            delivery_range_str = estimate.delivery_date_from.strftime('%B %d, %Y')
        html_content = html_content.replace('{{delivery_date_range}}', delivery_range_str)

        # Generate line items table (tolerate whitespace + escaped braces)
        import re
        # NOTE: braces must be escaped once for regex (NOT double-escaped)
        table_pattern = r'(\{\{|&#123;&#123;)(?:\s|&nbsp;|&#160;)*estimate_line_items_table(?:\s|&nbsp;|&#160;)*(\}\}|&#125;&#125;)'
        if re.search(table_pattern, html_content, flags=re.IGNORECASE):
            table_html = generate_line_items_table(estimate)
            html_content = re.sub(table_pattern, table_html, html_content, flags=re.IGNORECASE)
    
    # Generate deposits table - works for both estimate and invoice (moved outside estimate block)
    import re
    deposits_table_pattern = r'(\{\{|&#123;&#123;)(?:\s|&nbsp;|&#160;)*deposits_table(?:\s|&nbsp;|&#160;)*(\}\}|&#125;&#125;)'
    if re.search(deposits_table_pattern, html_content, flags=re.IGNORECASE):
        deposits_html = generate_combined_deposits_table(estimate, invoice)
        html_content = re.sub(deposits_table_pattern, deposits_html, html_content, flags=re.IGNORECASE)
    
    # Payment tags - process when payment object is passed OR when we have estimate/invoice
    # Use the passed payment object if available, otherwise query for the last payment
    if payment:
        payment_obj = payment
    elif estimate:
        payment_obj = (
            PaymentReceipt.objects.filter(estimate=estimate).last() or 
            PaymentReceipt.objects.filter(invoice__estimate=estimate).last()
        )
    elif invoice:
        payment_obj = invoice.payments.last()
    else:
        payment_obj = None
    
    if payment_obj:
        html_content = html_content.replace('{{payment_amount}}', f"${payment_obj.amount:.2f}")
        html_content = html_content.replace('{{payment_date}}', payment_obj.payment_date.strftime('%B %d, %Y') if payment_obj.payment_date else '')
        html_content = html_content.replace('{{payment_type}}', payment_obj.get_payment_method_display())
    else:
        html_content = html_content.replace('{{payment_amount}}', '')
        html_content = html_content.replace('{{payment_date}}', '')
        html_content = html_content.replace('{{payment_type}}', '')
    
    # Individual deposit summary tags (total deposits and balance due)
    # Combine deposits from both estimate and invoice (avoiding duplicates)
    if estimate or invoice:
        total_deposits = calculate_total_deposits(estimate, invoice)
        if invoice:
            balance_due = invoice.total_amount - total_deposits
        elif estimate:
            balance_due = estimate.total_amount - total_deposits
        else:
            balance_due = 0
        html_content = html_content.replace('{{total_deposits}}', f'${total_deposits:,.2f}')
        html_content = html_content.replace('{{balance_due}}', f'${balance_due:,.2f}')
    
    # Invoice tags
    if invoice:
        import re
        html_content = html_content.replace('{{invoice_number}}', invoice.invoice_number or '')
        html_content = html_content.replace('{{invoice_date}}', invoice.issue_date.strftime('%B %d, %Y') if invoice.issue_date else '')
        html_content = html_content.replace('{{invoice_due_date}}', invoice.due_date.strftime('%B %d, %Y') if invoice.due_date else '')
        html_content = html_content.replace('{{invoice_subtotal}}', f'${invoice.subtotal:,.2f}')
        html_content = html_content.replace('{{invoice_tax}}', f'${invoice.tax_amount:,.2f}')
        html_content = html_content.replace('{{invoice_total}}', f'${invoice.total_amount:,.2f}')
        
        # Calculate invoice balance due including deposits from both estimate and invoice
        invoice_total_deposits = calculate_total_deposits(invoice.estimate, invoice) if invoice.estimate else calculate_total_deposits(None, invoice)
        invoice_balance = invoice.total_amount - invoice_total_deposits
        html_content = html_content.replace('{{invoice_balance_due}}', f'${invoice_balance:,.2f}')
        html_content = html_content.replace('{{invoice_notes}}', invoice.notes or '')
        
        # Generate invoice line items table
        invoice_table_pattern = r'(\{\{|&#123;&#123;)(?:\s|&nbsp;|&#160;)*invoice_line_items_table(?:\s|&nbsp;|&#160;)*(\}\}|&#125;&#125;)'
        if re.search(invoice_table_pattern, html_content, flags=re.IGNORECASE):
            table_html = generate_invoice_line_items_table(invoice)
            html_content = re.sub(invoice_table_pattern, table_html, html_content, flags=re.IGNORECASE)

    # Signature fields - handle multiple signatures with unique IDs
    import re
    import json
    
    # Parse signatures if provided as JSON string
    signature_dict = {}
    if signatures:
        if isinstance(signatures, str):
            try:
                signature_dict = json.loads(signatures)
            except:
                signature_dict = {}
        elif isinstance(signatures, dict):
            signature_dict = signatures
    
    # Find all {{signature}} tags and assign unique indices
    signature_index = 0
    
    def replace_signature_tag(match):
        nonlocal signature_index
        current_index = signature_index
        signature_index += 1
        
        # Check if this signature is filled
        sig_data = signature_dict.get(str(current_index))
        
        if sig_data:
            # Signed - show signature image
            inner = f'<img src="{sig_data}" style="max-width: 140px; max-height: 40px; height: auto; vertical-align: middle; display: inline-block;" alt="Signature"/>'
        else:
            # Not signed - show placeholder
            inner = 'Sign'
        
        # Return with data-signature-index attribute
        return f'<span class="signature-box-container" data-signature-index="{current_index}" style="display: inline-block; border: 2px dashed #1890ff; background-color: #f0f9ff; border-radius: 6px; padding: 4px 8px; font-weight: 600; color: #1890ff; white-space: nowrap; cursor: pointer;">{inner}</span>'
    
    # Replace all {{signature}} tags
    html_content = re.sub(r'\{\{signature\}\}', replace_signature_tag, html_content)
    
    # Text box fields - handle multiple text inputs with unique IDs
    text_inputs_dict = {}
    if text_inputs:
        if isinstance(text_inputs, str):
            try:
                text_inputs_dict = json.loads(text_inputs)
            except:
                text_inputs_dict = {}
        elif isinstance(text_inputs, dict):
            text_inputs_dict = text_inputs
    
    # Find all {{textbox}} tags and assign unique indices
    textbox_index = 0
    
    def replace_textbox_tag(match):
        nonlocal textbox_index
        current_index = textbox_index
        textbox_index += 1
        
        # Check if this text box is filled
        text_value = text_inputs_dict.get(str(current_index))
        
        if text_value:
            # Filled - show the text (Removed forced black/normal style - Change #8)
            inner = f'<span>{text_value}</span>'
        else:
            # Not filled - show placeholder
            inner = 'Click to type'
        
        # Return with data-textbox-index attribute
        return f'<span class="textbox-container" data-textbox-index="{current_index}" style="display: inline-block; border: 2px dashed #52c41a; background-color: #f6ffed; border-radius: 6px; padding: 4px 8px; font-weight: 600; color: #52c41a; min-width: 150px; cursor: pointer;">{inner}</span>'
    
    # Replace all {{textbox}} tags
    html_content = re.sub(r'\{\{textbox\}\}', replace_textbox_tag, html_content)
    
    # Convert any remaining images to base64 for better PDF rendering
    html_content = convert_images_to_base64(html_content)
    
    return html_content


def generate_line_items_table(estimate):
    """
    Generate a compact HTML table with all estimate line items
    """
    rows_html = ''

    for item in estimate.items.all().order_by('display_order', 'id'):
        # Build details column based on charge type
        details = ''
        if item.charge_type == ChargeType.PER_LB:
            details = f'${item.rate:.2f}/lb × {estimate.weight_lbs or 0} lbs'
        elif item.charge_type == ChargeType.HOURLY:
            details = f'${item.rate:.2f}/hr × {estimate.labour_hours or 0} hrs'
        elif item.charge_type == ChargeType.FLAT:
            details = f'${item.rate:.2f} × {item.quantity}'
        elif item.charge_type == ChargeType.PERCENT:
            details = f'{item.percentage:.2f}%'
        
        rows_html += f'''
        <tr>
            <td style="border: 1px solid #000; padding: 4px 6px; font-size: 9pt;">{item.charge_name}</td>
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; font-size: 9pt;">{item.get_charge_type_display()}</td>
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; font-size: 9pt;">{details}</td>
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-size: 9pt;">${item.amount:,.2f}</td>
        </tr>
        '''
    
    # Build tax row conditionally
    tax_row = ''
    if estimate.tax_percentage and estimate.tax_percentage > 0:
        tax_row = f'''
            <tr style="background-color: #fff7e6;">
                <td colspan="3" style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-size: 9pt;">
                    <strong>Sales Tax ({estimate.tax_percentage:.2f}%):</strong>
                </td>
                <td style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-size: 9pt;">
                    <strong>${estimate.tax_amount:,.2f}</strong>
                </td>
            </tr>
        '''
    
    table_html = f'''
    <table style="width: 100%; border-collapse: collapse; margin: 10px 0; border: 1px solid #000; font-size: 9pt;">
        <thead>
            <tr style="background-color: #e8e8e8;">
                <th style="border: 1px solid #000; padding: 5px 6px; text-align: left; font-size: 9pt;">Description</th>
                <th style="border: 1px solid #000; padding: 5px 6px; text-align: center; font-size: 9pt;">Type</th>
                <th style="border: 1px solid #000; padding: 5px 6px; text-align: center; font-size: 9pt;">Details</th>
                <th style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-size: 9pt;">Amount</th>
            </tr>
        </thead>
        <tbody>
            {rows_html}
        </tbody>
        <tfoot>
            <tr style="background-color: #f0f9ff;">
                <td colspan="3" style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-size: 9pt;">
                    <strong>Subtotal:</strong>
                </td>
                <td style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-size: 9pt;">
                    <strong>${estimate.subtotal:,.2f}</strong>
                </td>
            </tr>
            {tax_row}
            <tr style="background-color: #e6ffe6;">
                <td colspan="3" style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-size: 10pt;">
                    <strong>TOTAL:</strong>
                </td>
                <td style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-size: 10pt;">
                    <strong>${estimate.total_amount:,.2f}</strong>
                </td>
            </tr>
        </tfoot>
    </table>
    '''
    
    return table_html


def generate_invoice_line_items_table(invoice):
    """
    Generate a compact HTML table with all invoice line items
    """
    rows_html = ''

    for item in invoice.items.all().order_by('display_order', 'id'):
        details = f'${item.rate:,.2f} × {item.quantity}'
        
        rows_html += f'''
        <tr>
            <td style="border: 1px solid #000; padding: 4px 6px; font-size: 9pt;">{item.description}</td>
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; font-size: 9pt;">{details}</td>
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-size: 9pt;">${item.amount:,.2f}</td>
        </tr>
        '''
    
    # Build tax row conditionally
    tax_row = ''
    if invoice.tax_amount and invoice.tax_amount > 0:
        # Try to get tax percentage from estimate if available
        tax_pct = invoice.estimate.tax_percentage if invoice.estimate and invoice.estimate.tax_percentage else 0
        tax_label = f'Sales Tax ({tax_pct:.2f}%):' if tax_pct else 'Sales Tax:'
        tax_row = f'''
            <tr style="background-color: #fff7e6;">
                <td colspan="2" style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-size: 9pt;">
                    <strong>{tax_label}</strong>
                </td>
                <td style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-size: 9pt;">
                    <strong>${invoice.tax_amount:,.2f}</strong>
                </td>
            </tr>
        '''
    
    table_html = f'''
    <table style="width: 100%; border-collapse: collapse; margin: 10px 0; border: 1px solid #000; font-size: 9pt;">
        <thead>
            <tr style="background-color: #e8e8e8;">
                <th style="border: 1px solid #000; padding: 5px 6px; text-align: left; font-size: 9pt;">Description</th>
                <th style="border: 1px solid #000; padding: 5px 6px; text-align: center; font-size: 9pt;">Details</th>
                <th style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-size: 9pt;">Amount</th>
            </tr>
        </thead>
        <tbody>
            {rows_html}
        </tbody>
        <tfoot>
            <tr style="background-color: #f0f9ff;">
                <td colspan="2" style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-size: 9pt;">
                    <strong>Subtotal:</strong>
                </td>
                <td style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-size: 9pt;">
                    <strong>${invoice.subtotal:,.2f}</strong>
                </td>
            </tr>
            {tax_row}
            <tr style="background-color: #e6ffe6;">
                <td colspan="2" style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-size: 10pt;">
                    <strong>TOTAL:</strong>
                </td>
                <td style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-size: 10pt;">
                    <strong>${invoice.total_amount:,.2f}</strong>
                </td>
            </tr>
        </tfoot>
    </table>
    '''
    
    return table_html


def generate_deposits_table(estimate):
    """
    Generate an HTML table showing all deposits/payments for an estimate
    """
    from .models import PaymentReceipt
    
    payments = PaymentReceipt.objects.filter(estimate=estimate).order_by('payment_date')
    
    if not payments.exists():
        return '<p style="font-size: 9pt; color: #666;">No deposits recorded.</p>'
    
    rows_html = ''
    total_deposits = 0
    
    for payment in payments:
        payment_date = payment.payment_date.strftime('%B %d, %Y') if payment.payment_date else '-'
        payment_method = dict(PaymentReceipt.PAYMENT_METHODS).get(payment.payment_method, payment.payment_method)
        payment_type = 'Deposit' if payment.payment_type == 'deposit' else 'Payment'
        
        rows_html += f'''
        <tr>
            <td style="border: 1px solid #000; padding: 4px 6px; font-size: 9pt;">{payment_date}</td>
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; font-size: 9pt;">{payment_type}</td>
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; font-size: 9pt;">{payment_method}</td>
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-size: 9pt;">${payment.amount:,.2f}</td>
        </tr>
        '''
        total_deposits += payment.amount
    
    table_html = f'''
    <table style="width: 100%; border-collapse: collapse; margin: 10px 0; border: 1px solid #000; font-size: 9pt;">
        <thead>
            <tr style="background-color: #e8f5e9;">
                <th style="border: 1px solid #000; padding: 5px 6px; text-align: left; font-size: 9pt;">Date</th>
                <th style="border: 1px solid #000; padding: 5px 6px; text-align: center; font-size: 9pt;">Type</th>
                <th style="border: 1px solid #000; padding: 5px 6px; text-align: center; font-size: 9pt;">Payment Method</th>
                <th style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-size: 9pt;">Amount</th>
            </tr>
        </thead>
        <tbody>
            {rows_html}
        </tbody>
        <tfoot>
            <tr style="background-color: #c8e6c9;">
                <td colspan="3" style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-size: 9pt;">
                    <strong>Total Deposits:</strong>
                </td>
                <td style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-size: 9pt;">
                    <strong>${total_deposits:,.2f}</strong>
                </td>
            </tr>
        </tfoot>
    </table>
    '''
    
    return table_html


def calculate_total_deposits(estimate, invoice=None):
    """
    Calculate total deposits from both estimate and invoice payments (avoiding duplicates)
    """
    from .models import PaymentReceipt
    from django.db import models as db_models
    
    # Get all unique payment IDs from both estimate and invoice
    payment_ids = set()
    
    if estimate:
        for p in estimate.payments.all():
            payment_ids.add(p.id)
    
    if invoice:
        for p in invoice.payments.all():
            payment_ids.add(p.id)
    
    if not payment_ids:
        return 0
    
    # Sum up all unique payments
    total = PaymentReceipt.objects.filter(id__in=payment_ids).aggregate(
        total=db_models.Sum('amount')
    )['total'] or 0
    
    return total


def generate_combined_deposits_table(estimate, invoice=None):
    """
    Generate an HTML table showing all deposits/payments from both estimate and invoice
    (avoiding duplicates - a deposit might be linked to both)
    """
    from .models import PaymentReceipt
    
    # Get all unique payment IDs from both estimate and invoice
    payment_ids = set()
    
    if estimate:
        for p in estimate.payments.all():
            payment_ids.add(p.id)
    
    if invoice:
        for p in invoice.payments.all():
            payment_ids.add(p.id)
    
    if not payment_ids:
        return '<p style="font-size: 9pt; color: #666;">No deposits recorded.</p>'
    
    # Fetch unique payments ordered by date
    payments = PaymentReceipt.objects.filter(id__in=payment_ids).order_by('payment_date')
    
    rows_html = ''
    total_deposits = 0
    
    for payment in payments:
        payment_date = payment.payment_date.strftime('%B %d, %Y') if payment.payment_date else '-'
        payment_method = dict(PaymentReceipt.PAYMENT_METHODS).get(payment.payment_method, payment.payment_method)
        payment_type = 'Deposit' if payment.payment_type == 'deposit' else 'Payment'
        
        rows_html += f'''
        <tr>
            <td style="border: 1px solid #000; padding: 4px 6px; font-size: 9pt;">{payment_date}</td>
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; font-size: 9pt;">{payment_type}</td>
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; font-size: 9pt;">{payment_method}</td>
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-size: 9pt;">${payment.amount:,.2f}</td>
        </tr>
        '''
        total_deposits += payment.amount
    
    table_html = f'''
    <table style="width: 100%; border-collapse: collapse; margin: 10px 0; border: 1px solid #000; font-size: 9pt;">
        <thead>
            <tr style="background-color: #e8f5e9;">
                <th style="border: 1px solid #000; padding: 5px 6px; text-align: left; font-size: 9pt;">Date</th>
                <th style="border: 1px solid #000; padding: 5px 6px; text-align: center; font-size: 9pt;">Type</th>
                <th style="border: 1px solid #000; padding: 5px 6px; text-align: center; font-size: 9pt;">Payment Method</th>
                <th style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-size: 9pt;">Amount</th>
            </tr>
        </thead>
        <tbody>
            {rows_html}
        </tbody>
        <tfoot>
            <tr style="background-color: #c8e6c9;">
                <td colspan="3" style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-size: 9pt;">
                    <strong>Total Deposits:</strong>
                </td>
                <td style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-size: 9pt;">
                    <strong>${total_deposits:,.2f}</strong>
                </td>
            </tr>
        </tfoot>
    </table>
    '''
    
    return table_html


def generate_pdf_from_html(html_content):
    """
    Generate a PDF from HTML content using xhtml2pdf
    """
    # Pre-process HTML to ensure images are base64 encoded for PDF generation
    html_content = convert_images_to_base64(html_content)
    
    result = BytesIO()
    pisa_status = pisa.CreatePDF(html_content, dest=result)
    if pisa_status.err:
        logger.error(f"Error generating PDF: {pisa_status.err}")
        return None
    return result.getvalue()


def generate_invoice_pdf(invoice):
    """
    Generate PDF for an invoice based on Document Library mapping
    """
    estimate = invoice.estimate
    from masterdata.models import DocumentLibrary

    # 1. Try to find by category (Main)
    template = DocumentLibrary.objects.filter(
        organization=invoice.organization,
        category='Invoice',
        is_active=True
    ).first()

    # 2. Fallback to purpose if category not found
    if not template:
        template = DocumentLibrary.objects.filter(
            organization=invoice.organization,
            document_purpose='invoice_pdf',
            is_active=True
        ).first()

    if not template:
        logger.warning(f"No invoice template found for Invoice {invoice.id}")
        return False

    html_content = ""

    if template.file and (template.document_type == 'HTML Document' or str(template.file).endswith('.html')):
        try:
            with template.file.open('rb') as f:
                html_content = f.read().decode('utf-8')
        except Exception as e:
            logger.error(f"Error reading invoice template file: {e}")
            return False
    else:
        html_content = template.description if template.description else template.subject

    if not html_content:
        logger.warning(f"No content found for invoice template {template.id}")
        return False

    processed_html = process_document_template(
        html_content,
        customer=invoice.customer,
        estimate=estimate,
        invoice=invoice
    )

    pdf_content = generate_pdf_from_html(processed_html)
    if pdf_content:
        filename = f"Invoice_{invoice.invoice_number}.pdf"
        invoice.pdf_file.save(filename, ContentFile(pdf_content))
        return True
    return False


def generate_payment_receipt_pdf(payment):
    """
    Generate PDF for a payment receipt based on Document Library mapping
    """
    invoice = payment.invoice
    # Fallback to estimate if no invoice is present (e.g., initial deposits)
    estimate = payment.estimate if not invoice else invoice.estimate
    customer = payment.invoice.customer if payment.invoice else (payment.estimate.customer if payment.estimate else None)
    
    from masterdata.models import DocumentLibrary
    
    # 1. Try to find by category (Main)
    template = DocumentLibrary.objects.filter(
        organization=payment.organization,
        category='Payment Receipt',
        is_active=True
    ).first()

    # 2. Fallback to purpose if category not found
    if not template:
        template = DocumentLibrary.objects.filter(
            organization=payment.organization,
            document_purpose='receipt_pdf',
            is_active=True
        ).first()

    if not template:
        logger.warning(f"No payment receipt template found for Payment {payment.id}")
        return False
    
    template = template # for clarity
    html_content = ""
    
    if template.file and (template.document_type == 'HTML Document' or str(template.file).endswith('.html')):
        try:
            with template.file.open('rb') as f:
                html_content = f.read().decode('utf-8')
        except Exception as e:
            logger.error(f"Error reading receipt template file: {e}")
            return False
    else:
        html_content = template.description if template.description else template.subject
    
    if not html_content:
        logger.warning(f"No content found for receipt template {template.id}")
        return False

    processed_html = process_document_template(
        html_content,
        customer=customer,
        estimate=estimate,
        payment=payment  # Pass the actual payment being processed
    )

    # Add payment specific info (also replace here for payment_method which uses different tag name)
    processed_html = processed_html.replace('{{payment_method}}', payment.get_payment_method_display())
    
    pdf_content = generate_pdf_from_html(processed_html)
    if pdf_content:
        filename = f"Receipt_{payment.id}.pdf"
        payment.pdf_file.save(filename, ContentFile(pdf_content))
        return True
    return False


def generate_work_order_pdf(work_order):
    """
    Generate PDF for a work order based on Document Library mapping
    """
    estimate = work_order.estimate
    from masterdata.models import DocumentLibrary
    
    # 1. Try to find by category (Main)
    template = DocumentLibrary.objects.filter(
        organization=work_order.organization,
        category='Work Order',
        is_active=True
    ).first()

    # 2. Fallback to purpose if category not found
    if not template:
        template = DocumentLibrary.objects.filter(
            organization=work_order.organization,
            document_purpose='work_order_pdf',
            is_active=True
        ).first()

    if not template:
        logger.warning(f"No work order template found for WorkOrder {work_order.id}")
        return False
    
    template_content = template.subject # Default to subject if no file
    
    html_content = process_document_template(
        template_content, 
        customer=estimate.customer, 
        estimate=estimate
    )
    
    # Add work order specific info
    html_content = html_content.replace('{{work_order_id}}', str(work_order.id))
    html_content = html_content.replace('{{contractor_name}}', work_order.contractor.name)
    html_content = html_content.replace('{{contractor_amount}}', f'${work_order.total_contractor_amount:,.2f}')
    
    # Generate contractor line items table
    rows_html = ''
    for item in work_order.items.all():
        rows_html += f'''
        <tr>
            <td style="border: 1px solid #000; padding: 4px 6px;">{item.description}</td>
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: center;">{item.quantity}</td>
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: right;">${item.contractor_rate:,.2f}</td>
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: right;">${item.total_amount:,.2f}</td>
        </tr>
        '''
    
    table_html = f'''
    <table style="width: 100%; border-collapse: collapse; margin: 10px 0; border: 1px solid #000;">
        <thead>
            <tr style="background-color: #f2f2f2;">
                <th style="border: 1px solid #000; padding: 5px 6px; text-align: left;">Description</th>
                <th style="border: 1px solid #000; padding: 5px 6px; text-align: center;">Qty</th>
                <th style="border: 1px solid #000; padding: 5px 6px; text-align: right;">Rate</th>
                <th style="border: 1px solid #000; padding: 5px 6px; text-align: right;">Total</th>
            </tr>
        </thead>
        <tbody>
            {rows_html}
        </tbody>
        <tfoot>
            <tr style="background-color: #e8e8e8;">
                <td colspan="3" style="border: 1px solid #000; padding: 5px 6px; text-align: right;"><strong>TOTAL:</strong></td>
                <td style="border: 1px solid #000; padding: 5px 6px; text-align: right;"><strong>${work_order.total_contractor_amount:,.2f}</strong></td>
            </tr>
        </tfoot>
    </table>
    '''
    
    html_content = html_content.replace('{{contractor_line_items_table}}', table_html)
    
    pdf_content = generate_pdf_from_html(html_content)
    if pdf_content:
        filename = f"WorkOrder_{work_order.id}.pdf"
        work_order.pdf_file.save(filename, ContentFile(pdf_content))
        return True
    return False
