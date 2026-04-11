#!/usr/bin/env python
"""
Script 1: Extract all data from SQLite database to JSON files
Run this with SQLite as your database
"""
import sqlite3
import json
import os

# SQLite database path
SQLITE_PATH = 'db.sqlite3'

# Output directory for JSON files
OUTPUT_DIR = 'postgres_data'

# Tables to skip (Django system tables)
SKIP_TABLES = [
    'django_migrations',
    'django_content_type', 
    'auth_permission',
    'django_admin_log',
    'django_session',
    'django_q_task',
    'django_q_success', 
    'django_q_failure',
    'django_q_ormq',
    'django_q_schedule',
    'sqlite_sequence',
]

def main():
    print("="*60)
    print("STEP 1: Extract data from SQLite")
    print("="*60)
    
    # Create output directory
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
    
    # Connect to SQLite
    print(f"\nConnecting to SQLite: {SQLITE_PATH}")
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [row[0] for row in cursor.fetchall()]
    print(f"Found {len(tables)} tables")
    
    exported = {}
    
    for table in tables:
        if table in SKIP_TABLES:
            print(f"\nSkipping: {table}")
            continue
        
        print(f"\nExporting: {table}")
        try:
            cursor.execute(f"SELECT * FROM {table}")
            rows = cursor.fetchall()
            
            # Convert to list of dicts
            data = []
            for row in rows:
                row_dict = dict(row)
                # Convert bytes to string
                for key, val in row_dict.items():
                    if isinstance(val, bytes):
                        row_dict[key] = val.decode('utf-8', errors='ignore')
                data.append(row_dict)
            
            # Save to JSON
            filename = os.path.join(OUTPUT_DIR, f"{table}.json")
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, default=str, ensure_ascii=False)
            
            exported[table] = len(data)
            print(f"  ✓ Exported {len(data)} rows to {filename}")
            
        except Exception as e:
            print(f"  ✗ Failed: {e}")
    
    conn.close()
    
    # Save table order for import (respecting foreign keys)
    # Order matters! Parent tables first, then child tables
    table_order = [
        # Users and Organizations first
        'users_organization',
        'users_customuser',
        'users_role',
        'users_organizationmember',
        
        # Master data
        'masterdata_branch',
        'masterdata_servicetype',
        'masterdata_movetype',
        'masterdata_roomsize',
        'masterdata_documentlibrary',
        'masterdata_customer',
        'masterdata_documentmapping',
        'masterdata_endpointconfiguration',
        'masterdata_rawendpointlead',
        'masterdata_schedule',
        
        # Transaction data - order matters for foreign keys
        'transactiondata_timewindow',
        'transactiondata_charge',
        'transactiondata_estimatetemplate',
        'transactiondata_transactioncategory',
        'transactiondata_estimate',
        'transactiondata_estimatelineitem',
        'transactiondata_estimatedocument',
        'transactiondata_invoice',
        'transactiondata_invoicelineitem',
        'transactiondata_paymentreceipt',
        'transactiondata_workorder',
        'transactiondata_contractorestimatelineitem',
        'transactiondata_feedback',
        'transactiondata_emaillog',
        'transactiondata_customeractivity',
        'transactiondata_expense',
        'transactiondata_purchase',
        
        # Site visits
        'sitevisits_sitevisit',
        'sitevisits_sitevisitobservation',
        'sitevisits_sitevisitphoto',
        
        # Dashboard
        'dashboard_dashboard',
        'dashboard_dashboardwidget',
        'dashboard_custommetric',
        
        # Auth
        'auth_group',
        'auth_group_permissions',
        'users_customuser_groups',
        'users_customuser_user_permissions',
    ]
    
    with open(os.path.join(OUTPUT_DIR, '_table_order.json'), 'w') as f:
        json.dump(table_order, f, indent=2)
    
    # Summary
    print("\n" + "="*60)
    print("EXPORT SUMMARY")
    print("="*60)
    print(f"\nExported {len(exported)} tables to '{OUTPUT_DIR}/' folder:")
    for table, count in sorted(exported.items()):
        print(f"  ✓ {table}: {count} rows")
    print(f"\nTotal rows exported: {sum(exported.values())}")
    print(f"\nNext step: Run 'python import_to_postgres.py' after setting up PostgreSQL")
    print("="*60)

if __name__ == '__main__':
    main()
