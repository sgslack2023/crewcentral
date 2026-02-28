import requests
import json
import time
import subprocess
import os

BASE_URL = "http://127.0.0.1:8000/api"

def ensure_test_user():
    print("--- Ensuring Test User exists via management command ---")
    script = """
from users.models import CustomUser, Organization, OrganizationMember, OrganizationRole
try:
    u = CustomUser.objects.get(email='sgslack2023@gmail.com')
    print(f'User {u.email} already exists.')
except CustomUser.DoesNotExist:
    u = CustomUser.objects.create(email='sgslack2023@gmail.com', fullname='Admin User', is_active=True, is_staff=True, is_superuser=True, role='Admin', approved=True)
    print(f'User {u.email} created.')

u.set_password('admin')
u.save()

if not u.memberships.exists():
    org, _ = Organization.objects.get_or_create(name='Test Baltic Org', defaults={'org_type': 'company'})
    role, _ = OrganizationRole.objects.get_or_create(name='Owner', organization=org, defaults={'is_default_admin': True})
    OrganizationMember.objects.get_or_create(user=u, organization=org, defaults={'role': role, 'is_default': True})
    print(f'User linked to organization: {org.name}')
"""
    backend_dir = r"d:\Projects\CRM_Adrian\Backend"
    try:
        res = subprocess.run(["python", "manage.py", "shell", "-c", script], cwd=backend_dir, check=True, capture_output=True, text=True)
        print(res.stdout)
        print("User creation/update successful.")
    except subprocess.CalledProcessError as e:
        print(f"Error ensuring user: {e.stderr}")
        print(f"Output: {e.stdout}")

def test_workflow():
    print("--- Starting CRM Workflow Test ---")
    
    # Ensure user exists before trying to login
    ensure_test_user()
    
    timestamp = int(time.time())
    
    # --- CONFIGURATION ---
    ADMIN_EMAIL = "sgslack2023@gmail.com" 
    ADMIN_PASSWORD = "admin" 
    CUSTOMER_EMAIL = "sgarg27790@gmail.com"
    # ---------------------

    print(f"\n2. Logging in as {ADMIN_EMAIL}...")
    login_data = {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    login_res = requests.post(f"{BASE_URL}/user/login", json=login_data)
    
    if login_res.status_code != 200:
        print(f"Login failed: {login_res.text}")
        return

    login_json = login_res.json()
    token = login_json['access']
    org_id = login_json['organizations'][0]['id']
    
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Organization-ID": str(org_id),
        "Content-Type": "application/json"
    }
    print(f"Logged in. Org ID: {org_id}")

    # 4. Create a Customer (Lead)
    print(f"\n4. Creating a new Lead with email {CUSTOMER_EMAIL}...")
    customer_data = {
        "full_name": f"Test Customer {timestamp}",
        "email": CUSTOMER_EMAIL,
        "phone": "555-0199",
        "source": "other",
        "stage": "new_lead"
    }
    cust_res = requests.post(f"{BASE_URL}/masterdata/customers", json=customer_data, headers=headers)
    if cust_res.status_code not in [200, 201]:
        if "email" in cust_res.text and "exists" in cust_res.text:
             print("Customer already exists, fetching existing one...")
             # Search for customer by email
             search_res = requests.get(f"{BASE_URL}/masterdata/customers?search={CUSTOMER_EMAIL}", headers=headers)
             search_data = search_res.json()
             if isinstance(search_data, list):
                 results = search_data
             else:
                 results = search_data.get('results', [])
                 
             if results:
                 customer_id = results[0]['id']
             else:
                 print(f"Failed to find existing customer. Response: {search_res.text}")
                 return
        else:
            print(f"Customer creation failed: {cust_res.text}")
            return
    else:
        customer_id = cust_res.json().get('id')
    
    print(f"Customer ID: {customer_id}")

    # 5. Create an Estimate
    print("\n5. Creating an Estimate with Automation Templates...")
    # Get a service type
    st_res = requests.get(f"{BASE_URL}/masterdata/service-types", headers=headers)
    st_data = st_res.json()
    st_results = st_data.get('results', st_data) if isinstance(st_data, dict) else st_data
    service_type_id = st_results[0]['id'] if st_results else 1
    
    estimate_data = {
        "customer": customer_id,
        "service_type": service_type_id,
        "status": "draft",
        "weight_lbs": 5000,
        "labour_hours": 10.0,
        "tax_percentage": 5.0,
        "invoice_template": 10,           
        "email_template": 7,              
        "payment_receipt_template": 9,    
        "estimate_email_template": 7,     
        "invoice_email_template": 7,      
        "receipt_email_template": 7       
    }
    est_res = requests.post(f"{BASE_URL}/transactiondata/estimates", json=estimate_data, headers=headers)
    estimate_id = est_res.json().get('id')
    print(f"Estimate created with ID: {estimate_id}")

    # 5.1 Sync Send Estimate Email
    print("\n5.1 Sending Estimate Email...")
    send_res = requests.post(f"{BASE_URL}/transactiondata/estimates/{estimate_id}/send_to_customer", json={"base_url": "http://localhost:3000"}, headers=headers)
    if send_res.status_code == 200:
        print("Estimate email sent successfully.")
    else:
        print(f"Failed to send estimate email: {send_res.text}")

    # 7. Create an Invoice
    print("\n7. Generating an Invoice from the estimate...")
    invoice_data = {
        "customer": customer_id,
        "estimate": estimate_id,
        "invoice_number": f"INV-{timestamp}",
        "issue_date": time.strftime("%Y-%m-%d"),
        "due_date": time.strftime("%Y-%m-%d"),
        "subtotal": 1200.00,
        "tax_amount": 60.00,
        "total_amount": 1260.00,
        "balance_due": 1260.00,
        "status": "sent"
    }
    inv_res = requests.post(f"{BASE_URL}/transactiondata/invoices", json=invoice_data, headers=headers)
    invoice_id = inv_res.json().get('id')
    print(f"Invoice created with ID: {invoice_id}")

    # 7.1 Sync Send Invoice Email
    print("\n7.1 Sending Invoice Email...")
    send_inv_res = requests.post(f"{BASE_URL}/transactiondata/invoices/{invoice_id}/send_to_customer", json={}, headers=headers)
    if send_inv_res.status_code == 200:
        print("Invoice email sent successfully.")
    else:
        print(f"Failed to send invoice email: {send_inv_res.text}")

    # 8. Record a Payment
    print("\n8. Recording a payment...")
    payment_data = {
        "invoice": invoice_id,
        "amount": 500.00,
        "payment_date": time.strftime("%Y-%m-%d"),
        "payment_method": "credit_card",
        "notes": "Deposit paid via phone"
    }
    pay_res = requests.post(f"{BASE_URL}/transactiondata/payments", json=payment_data, headers=headers)
    payment_id = pay_res.json().get('id')
    print(f"Payment recorded with ID: {payment_id}")

    # 8.1 Sync Send Receipt Email
    print("\n8.1 Sending Receipt Email...")
    send_pay_res = requests.post(f"{BASE_URL}/transactiondata/payments/{payment_id}/send_to_customer", json={}, headers=headers)
    if send_pay_res.status_code == 200:
        print("Receipt email sent successfully.")
    else:
        print(f"Failed to send receipt email: {send_pay_res.text}")

    print("\n--- Workflow Test Completed. Please check your email: " + CUSTOMER_EMAIL + " ---")

if __name__ == "__main__":
    test_workflow()
