"""
Simple script to process leads - run with: python manage.py shell < process_leads.py
"""
from masterdata.tasks import process_raw_endpoint_leads
from masterdata.models import RawEndpointLead, Customer

print("=" * 60)
print("PROCESSING PENDING LEADS")
print("=" * 60)

pending = RawEndpointLead.objects.filter(processed=False)
print(f"\nFound {pending.count()} pending lead(s)")

if pending.count() > 0:
    result = process_raw_endpoint_leads()
    print(f"\nProcessed: {result['processed']}")
    print(f"Errors: {result['errors']}")
    print(f"Total: {result['total']}")
    
    if result['processed'] > 0:
        print("\n[SUCCESS] Check Customers page for new leads")
else:
    print("\n[INFO] No pending leads to process")

print("=" * 60)
