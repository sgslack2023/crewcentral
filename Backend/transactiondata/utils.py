from decimal import Decimal
from .models import Estimate, EstimateLineItem, ChargeType


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
