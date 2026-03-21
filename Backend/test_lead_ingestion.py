"""
Test script for lead ingestion endpoint
Run this with: python test_lead_ingestion.py
"""
import requests
import json

# Configuration
BASE_URL = "http://127.0.0.1:8000/api"
ENDPOINT_CONFIG_ID = 1  # Change this to your actual endpoint config ID

# Test lead data
test_lead = {
    "name": "Test Lead",
    "email": "testlead@example.com",
    "phone": "555-000-1234",
    "address": "456 Test Avenue",
    "city": "Toronto",
    "state": "ON",
    "zip_code": "M5V 2A1",
    "move_date": "2026-05-01",
    "description": "This is a test lead from the ingestion endpoint"
}

print("=" * 60)
print("LEAD INGESTION TEST")
print("=" * 60)
print(f"\nSending test lead to: {BASE_URL}/masterdata/lead-ingestion/{ENDPOINT_CONFIG_ID}")
print(f"\nTest data:")
print(json.dumps(test_lead, indent=2))
print("\n" + "-" * 60)

try:
    # Send the lead
    response = requests.post(
        f"{BASE_URL}/masterdata/lead-ingestion/{ENDPOINT_CONFIG_ID}",
        json=test_lead,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"\n[OK] Status Code: {response.status_code}")
    
    if response.status_code == 201:
        print("[SUCCESS] Lead received and stored!")
        response_data = response.json()
        print(f"[INFO] Raw Lead ID: {response_data.get('id')}")
        print(f"\n{response_data.get('message')}")
        
        print("\n" + "=" * 60)
        print("NEXT STEPS:")
        print("=" * 60)
        print("1. Check 'View Data Logs' in Endpoints page - should see PENDING lead")
        print("2. Configure field mapping if not done already")
        print("3. Run the processing automation or manually process:")
        print("   - Via Django shell: from masterdata.tasks import process_raw_endpoint_leads; process_raw_endpoint_leads()")
        print("   - Or click 'Run Now' on your Leads automation in Settings")
        print("4. Check Customers page - new customer should appear")
        print("5. Check 'View Data Logs' again - status should be PROCESSED")
        
    else:
        print(f"[ERROR] Status: {response.status_code}")
        print(f"Response: {response.text}")
        
except requests.exceptions.ConnectionError:
    print("\n[ERROR] Could not connect to backend server")
    print("Make sure Django is running: python manage.py runserver")
    
except Exception as e:
    print(f"\n[ERROR] {str(e)}")

print("\n" + "=" * 60)
