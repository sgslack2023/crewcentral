from decimal import Decimal
from .models import Estimate, EstimateLineItem, ChargeType
from datetime import datetime


def create_estimate_from_template(template, customer, weight=None, labour_hours=None, created_by=None):
    """
    Create a new estimate from a template
    """
    estimate = Estimate.objects.create(
        customer=customer,
        template_used=template,
        service_type=template.service_type,
        weight_lbs=weight,
        labour_hours=labour_hours,
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
    
    # STEP 3: Calculate totals with tax
    subtotal = sum(item.amount for item in estimate.items.all())
    estimate.subtotal = subtotal
    
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
    
    # Calculate tax amount
    estimate.tax_amount = (subtotal * tax_percentage) / Decimal(100)
    
    # Calculate total (subtotal + tax)
    estimate.total_amount = subtotal + estimate.tax_amount
    
    estimate.save()
    
    return estimate


def process_document_template(html_content, customer=None, estimate=None, signatures=None):
    """
    Replace template tags with actual customer and estimate data
    signatures: dict like {'customer': 'base64_signature_data', 'witness': '...'}
    """
    if not html_content:
        return html_content
    
    # Customer tags
    if customer:
        html_content = html_content.replace('{{customer_name}}', customer.full_name or '')
        html_content = html_content.replace('{{customer_email}}', customer.email or '')
        html_content = html_content.replace('{{customer_phone}}', customer.phone or '')
        html_content = html_content.replace('{{customer_company}}', customer.company or '')
        html_content = html_content.replace('{{customer_address}}', customer.address or '')
        html_content = html_content.replace('{{customer_city}}', customer.city or '')
        html_content = html_content.replace('{{customer_state}}', customer.state or '')
    
    # Estimate tags
    if estimate:
        html_content = html_content.replace('{{estimate_id}}', str(estimate.id))
        html_content = html_content.replace('{{estimate_date}}', estimate.created_at.strftime('%B %d, %Y'))
        html_content = html_content.replace('{{estimate_subtotal}}', f'${estimate.subtotal:,.2f}')
        html_content = html_content.replace('{{estimate_tax}}', f'${estimate.tax_amount:,.2f}')
        html_content = html_content.replace('{{estimate_tax_percent}}', f'{estimate.tax_percentage:.2f}%')
        html_content = html_content.replace('{{estimate_total}}', f'${estimate.total_amount:,.2f}')
        html_content = html_content.replace('{{service_type}}', estimate.service_type.service_type if estimate.service_type else '')
        html_content = html_content.replace('{{move_date}}', estimate.customer.move_date.strftime('%B %d, %Y') if estimate.customer.move_date else '')
        html_content = html_content.replace('{{weight}}', f'{estimate.weight_lbs} lbs' if estimate.weight_lbs else '')
        html_content = html_content.replace('{{labour_hours}}', f'{estimate.labour_hours} hours' if estimate.labour_hours else '')
        
        # Generate line items table
        if '{{estimate_line_items_table}}' in html_content:
            table_html = generate_line_items_table(estimate)
            html_content = html_content.replace('{{estimate_line_items_table}}', table_html)
    
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
    
    return html_content


def generate_line_items_table(estimate):
    """
    Generate a professional HTML table with all estimate line items
    """
    rows_html = ''
    
    for item in estimate.items.all():
        # Build details column based on charge type
        details = ''
        if item.charge_type == ChargeType.PER_LB:
            details = f'${item.rate:.2f}/lb × {estimate.weight_lbs or 0} lbs'
        elif item.charge_type == ChargeType.HOURLY:
            details = f'${item.rate:.2f}/hour × {estimate.labour_hours or 0} hours'
        elif item.charge_type == ChargeType.FLAT:
            details = f'${item.rate:.2f} × {item.quantity}'
        elif item.charge_type == ChargeType.PERCENT:
            details = f'{item.percentage:.2f}%'
        
        rows_html += f'''
        <tr>
            <td style="border: 1px solid #000; padding: 10px;">{item.charge_name}</td>
            <td style="border: 1px solid #000; padding: 10px; text-align: center;">{item.get_charge_type_display()}</td>
            <td style="border: 1px solid #000; padding: 10px; text-align: center;">{details}</td>
            <td style="border: 1px solid #000; padding: 10px; text-align: right;">${item.amount:,.2f}</td>
        </tr>
        '''
    
    # Build tax row conditionally
    tax_row = ''
    if estimate.tax_percentage and estimate.tax_percentage > 0:
        tax_row = f'''
            <tr style="background-color: #fff7e6;">
                <td colspan="3" style="border: 1px solid #000; padding: 12px; text-align: right;">
                    <strong>Sales Tax ({estimate.tax_percentage:.2f}%):</strong>
                </td>
                <td style="border: 1px solid #000; padding: 12px; text-align: right;">
                    <strong>${estimate.tax_amount:,.2f}</strong>
                </td>
            </tr>
        '''
    
    table_html = f'''
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 2px solid #000;">
        <thead>
            <tr style="background-color: #f4f4f4;">
                <th style="border: 1px solid #000; padding: 12px; text-align: left;">Charge Description</th>
                <th style="border: 1px solid #000; padding: 12px; text-align: center;">Type</th>
                <th style="border: 1px solid #000; padding: 12px; text-align: center;">Details</th>
                <th style="border: 1px solid #000; padding: 12px; text-align: right;">Amount</th>
            </tr>
        </thead>
        <tbody>
            {rows_html}
        </tbody>
        <tfoot>
            <tr style="background-color: #f0f9ff;">
                <td colspan="3" style="border: 1px solid #000; padding: 12px; text-align: right;">
                    <strong>Subtotal:</strong>
                </td>
                <td style="border: 1px solid #000; padding: 12px; text-align: right;">
                    <strong>${estimate.subtotal:,.2f}</strong>
                </td>
            </tr>
            {tax_row}
            <tr style="background-color: #f6ffed;">
                <td colspan="3" style="border: 1px solid #000; padding: 12px; text-align: right;">
                    <strong>TOTAL AMOUNT:</strong>
                </td>
                <td style="border: 1px solid #000; padding: 12px; text-align: right;">
                    <strong style="font-size: 16px;">${estimate.total_amount:,.2f}</strong>
                </td>
            </tr>
        </tfoot>
    </table>
    '''
    
    return table_html
