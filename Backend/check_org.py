import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_back.settings')
django.setup()

from django.db import connection

# Check users
with connection.cursor() as cursor:
    cursor.execute('SELECT id, email, is_superuser FROM users_customuser')
    rows = cursor.fetchall()
    print('=== Users ===')
    for row in rows:
        print(f'  ID: {row[0]}, Email: {row[1]}, Superuser: {row[2]}')

print()

# Check organization membership
with connection.cursor() as cursor:
    cursor.execute('''
        SELECT om.user_id, om.organization_id, u.email, o.name 
        FROM users_organizationmember om
        JOIN users_customuser u ON om.user_id = u.id
        JOIN users_organization o ON om.organization_id = o.id
    ''')
    rows = cursor.fetchall()
    print('=== Organization Memberships ===')
    for row in rows:
        print(f'  User ID: {row[0]}, Org ID: {row[1]}, Email: {row[2]}, Org: {row[3]}')

print()

# Check estimates
with connection.cursor() as cursor:
    cursor.execute('SELECT id, organization_id, customer_id, status FROM transactiondata_estimate ORDER BY id DESC')
    rows = cursor.fetchall()
    print('=== Estimates ===')
    for row in rows:
        print(f'  ID: {row[0]}, Org ID: {row[1]}, Customer ID: {row[2]}, Status: {row[3]}')
