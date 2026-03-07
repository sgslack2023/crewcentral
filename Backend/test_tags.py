import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.join(os.getcwd(), 'Backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_back.settings')
django.setup()

from transactiondata.email_utils import render_email_template
from transactiondata.models import Customer, Estimate, EstimateTemplate
from masterdata.models import ServiceType

def test_tag_replacement():
    print("Testing tag replacement...")
    
    from datetime import datetime
    from decimal import Decimal

    # Create mock customer
    customer = Customer(
        full_name="John Doe",
        email="john@example.com",
        phone="1234567890"
    )
    customer.id = 1
    # Customer property workarounds if needed
    
    # Create mock service type
    service_type = ServiceType(service_type="Local Move")

    # Create mock estimate
    estimate = Estimate(
        id=999,
        customer=customer,
        service_type=service_type,
        subtotal=Decimal('1000.00'),
        tax_amount=Decimal('50.00'),
        tax_percentage=Decimal('5.00'),
        total_amount=Decimal('1050.00'),
        weight_lbs=2000,
        labour_hours=8
    )
    estimate.created_at = datetime.now()
    
    # Test template content with various tags and SunEditor quirks
    template_content = """
    <div>
        <p>Hello {{customer_name}},</p>
        <p>Your job number is {{job_number}}.</p>
        <p>Your phone is {{customer_phone}}.</p>
        <p>Estimate total: {{estimate_total}}</p>
        <p>Service: {{service_type}}</p>
        <p>SunEditor quirky tag: <span>{{customer_name}}</span></p>
        <p>Hidden character tag: {{customer\u200b_name}}</p>
    </div>
    """
    
    context = {'feedback_link': 'https://feedback.com'}
    
    # In order to test render_email_template, we need a DocumentLibrary object or bypass it
    # We'll test by providing the body directly in a way that mimics how it's used
    
    print("\n--- Testing Render Logic ---")
    
    # Since we can't easily mock the DB DocumentLibrary in a simple script without saving,
    # we'll test the core logic by calling process_document_template directly as render_email_template does
    from transactiondata.utils import process_document_template
    
    processed = process_document_template(template_content, customer, estimate)
    
    print("Processed Content:")
    print(processed)
    
    # Assertions
    assert "John Doe" in processed
    assert "1000" in processed
    assert "1234567890" in processed
    assert "$1,050.00" in processed
    assert "Local Move" in processed
    
    print("\nAll assertions passed!")

if __name__ == "__main__":
    try:
        test_tag_replacement()
    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()
