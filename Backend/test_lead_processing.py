"""
Test script to manually process raw endpoint leads
Run this with: python test_lead_processing.py
"""
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_back.settings')
django.setup()

from masterdata.tasks import process_raw_endpoint_leads
from masterdata.models import RawEndpointLead, Customer

print("=" * 60)
print("LEAD PROCESSING TEST")
print("=" * 60)

# Check pending leads
pending_leads = RawEndpointLead.objects.filter(processed=False)
print(f"\n[INFO] Found {pending_leads.count()} pending lead(s)")

if pending_leads.count() == 0:
    print("\n[WARNING] No pending leads to process")
    print("Run test_lead_ingestion.py first to create a test lead")
else:
    for lead in pending_leads:
        print(f"\n  - Lead ID: {lead.id}")
        print(f"    Endpoint: {lead.endpoint_config.name if lead.endpoint_config else 'Unknown'}")
        print(f"    Has mapping: {bool(lead.endpoint_config.mapping_config if lead.endpoint_config else False)}")

    print("\n" + "-" * 60)
    print("Processing leads...")
    print("-" * 60)
    
    # Run the processing task
    result = process_raw_endpoint_leads()
    
    print(f"\n[RESULTS]")
    print(f"  Processed: {result['processed']}")
    print(f"  Errors: {result['errors']}")
    print(f"  Total: {result['total']}")
    
    if result['processed'] > 0:
        print("\n[SUCCESS] Leads processed successfully!")
        print("\n" + "=" * 60)
        print("VERIFICATION:")
        print("=" * 60)
        print("1. Go to Customers page - new customer(s) should appear")
        print("2. Check 'View Data Logs' in Endpoints - status should be PROCESSED")
        
        # Show the newly created customers
        recent_customers = Customer.objects.order_by('-id')[:5]
        print(f"\n[INFO] Recent customers:")
        for customer in recent_customers:
            print(f"  - {customer.full_name} ({customer.email}) - Stage: {customer.stage}")
    
    if result['errors'] > 0:
        print("\n[WARNING] Some leads had errors")
        print("Check 'View Data Logs' for error messages")
        
        # Show leads with errors
        error_leads = RawEndpointLead.objects.filter(processed=True, error_message__isnull=False).order_by('-id')[:3]
        if error_leads:
            print("\n[ERROR DETAILS]")
            for lead in error_leads:
                print(f"  - Lead ID {lead.id}: {lead.error_message}")

print("\n" + "=" * 60)
