#!/usr/bin/env python
"""
Script 2: Import JSON data to PostgreSQL
Run this AFTER:
1. PostgreSQL is set up
2. settings.py is configured for PostgreSQL
3. python manage.py migrate has been run
4. extract_from_sqlite.py has been run
"""
import os
import sys
import json
import django

# Log file
LOG_FILE = 'import_log.txt'
log_file = open(LOG_FILE, 'w')

def log(msg):
    print(msg)
    log_file.write(msg + '\n')
    log_file.flush()

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_back.settings')
django.setup()

from django.db import connection
from django.conf import settings

# Input directory with JSON files
INPUT_DIR = 'postgres_data'

# Tables to skip
SKIP_TABLES = [
    'django_migrations',
    'django_content_type',
    'auth_permission',
    'django_admin_log',
    'django_session',
]

def get_table_columns(cursor, table):
    """Get column names for a table in PostgreSQL"""
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = %s 
        ORDER BY ordinal_position
    """, [table])
    return [row[0] for row in cursor.fetchall()]

def convert_sqlite_to_pg_value(value, col_name):
    """Convert SQLite values to PostgreSQL compatible values"""
    # Convert integer booleans to actual booleans
    boolean_columns = [
        'is_active', 'is_staff', 'is_superuser', 'is_default', 'is_default_admin',
        'approved', 'enabled', 'is_archived', 'processed', 'link_active',
        'is_editable', 'is_opened', 'is_locked', 'is_template', 'enable_click'
    ]
    
    if col_name in boolean_columns:
        if value == 1 or value == '1' or value is True:
            return True
        elif value == 0 or value == '0' or value is False or value is None:
            return False
    
    return value

def import_table(cursor, table, data):
    """Import data into a PostgreSQL table"""
    if not data:
        log(f"  No data in JSON file")
        return 0
    
    log(f"  JSON has {len(data)} rows")
    
    # Get actual columns in the PostgreSQL table
    pg_columns = get_table_columns(cursor, table)
    if not pg_columns:
        log(f"  Warning: Table {table} not found in PostgreSQL")
        return 0
    
    # Filter data columns to only those that exist in PostgreSQL
    first_row = data[0]
    json_columns = list(first_row.keys())
    
    common_columns = [col for col in json_columns if col in pg_columns]
    
    if not common_columns:
        log(f"  Warning: No matching columns for {table}")
        return 0
    
    log(f"  Matching {len(common_columns)} columns")
    
    # Build INSERT statement
    columns_str = ', '.join([f'"{col}"' for col in common_columns])
    placeholders = ', '.join(['%s'] * len(common_columns))
    insert_sql = f'INSERT INTO "{table}" ({columns_str}) VALUES ({placeholders})'
    
    count = 0
    errors = 0
    for row in data:
        try:
            # Convert values, especially booleans
            values = [convert_sqlite_to_pg_value(row.get(col), col) for col in common_columns]
            cursor.execute(insert_sql, values)
            count += 1
        except Exception as e:
            errors += 1
            if errors <= 3:
                log(f"  Row error: {e}")
            continue
    
    if errors > 3:
        log(f"  ... and {errors - 3} more errors")
    
    log(f"  Inserted {count} rows, {errors} errors")
    return count

def reset_sequences(cursor):
    """Reset all PostgreSQL sequences after data import"""
    log("\nResetting sequences...")
    cursor.execute("""
        SELECT 'SELECT SETVAL(' ||
               quote_literal(quote_ident(PGT.schemaname) || '.' || quote_ident(S.relname)) ||
               ', COALESCE(MAX(' || quote_ident(C.attname) || '), 1)) FROM ' ||
               quote_ident(PGT.schemaname) || '.' || quote_ident(T.relname) || ';'
        FROM pg_class AS S
        JOIN pg_depend AS D ON S.oid = D.objid
        JOIN pg_class AS T ON D.refobjid = T.oid
        JOIN pg_attribute AS C ON D.refobjid = C.attrelid AND D.refobjsubid = C.attnum
        JOIN pg_tables AS PGT ON T.relname = PGT.tablename
        WHERE S.relkind = 'S' AND PGT.schemaname = 'public';
    """)
    
    for row in cursor.fetchall():
        try:
            cursor.execute(row[0])
        except Exception as e:
            pass  # Ignore sequence errors

def clear_all_tables(cursor):
    """Clear all data from tables before import"""
    log("\nClearing existing data from PostgreSQL tables...")
    
    # Get all tables except Django system tables
    cursor.execute("""
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('django_migrations', 'django_content_type', 'auth_permission')
    """)
    tables = [row[0] for row in cursor.fetchall()]
    
    # Disable foreign key checks
    cursor.execute("SET session_replication_role = 'replica';")
    
    for table in tables:
        try:
            cursor.execute(f'TRUNCATE TABLE "{table}" CASCADE;')
            log(f"  ✓ Cleared {table}")
        except Exception as e:
            log(f"  ✗ Could not clear {table}: {e}")
    
    # Re-enable foreign key checks
    cursor.execute("SET session_replication_role = 'origin';")
    log("  Done clearing tables.\n")

def main():
    log("="*60)
    log("STEP 2: Import data to PostgreSQL")
    log("="*60)
    
    # Verify we're using PostgreSQL
    db_engine = settings.DATABASES['default']['ENGINE']
    if 'postgresql' not in db_engine:
        log(f"\nERROR: Database is not PostgreSQL!")
        log(f"Current engine: {db_engine}")
        log("\nPlease update settings.py to use PostgreSQL first.")
        sys.exit(1)
    
    log(f"\nDatabase: {settings.DATABASES['default']['NAME']}")
    log(f"Host: {settings.DATABASES['default']['HOST']}")
    
    # Check if input directory exists
    if not os.path.exists(INPUT_DIR):
        log(f"\nERROR: '{INPUT_DIR}' folder not found!")
        log("Run 'python extract_from_sqlite.py' first.")
        sys.exit(1)
    
    # Clear existing data
    with connection.cursor() as cursor:
        clear_all_tables(cursor)
        connection.commit()
    
    # Get all JSON files - ignore the predefined order, just use what exists
    available_files = [f.replace('.json', '') for f in os.listdir(INPUT_DIR) if f.endswith('.json') and not f.startswith('_')]
    
    # Define import order (parent tables first, then child tables)
    table_order = [
        # Users and Organizations first (no dependencies)
        'users_organization',
        'users_systempermission',
        'users_organizationrole',
        'users_customuser',
        'users_organizationmember',
        'users_organizationrole_permissions',
        'users_customuser_groups',
        'users_customuser_user_permissions',
        
        # Master data (depends on users/org)
        'masterdata_branch',
        'masterdata_servicetype',
        'masterdata_movetype',
        'masterdata_roomsize',
        'masterdata_documentlibrary',
        'masterdata_documentlibrary_attachments',
        'masterdata_customer',
        'masterdata_documentservicetypebranchmapping',
        'masterdata_endpointconfiguration',
        'masterdata_rawendpointlead',
        
        # Transaction data
        'transactiondata_timewindow',
        'transactiondata_chargecategory',
        'transactiondata_chargedefinition',
        'transactiondata_chargedefinition_applies_to',
        'transactiondata_estimatetemplate',
        'transactiondata_templatelineitem',
        'transactiondata_transactioncategory',
        'transactiondata_estimate',
        'transactiondata_estimatelineitem',
        'transactiondata_estimatedocument',
        'transactiondata_documentsigningbatch',
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
        'dashboard_dashboard_shared_with_roles',
        'dashboard_dashboardwidget',
        'dashboard_custommetric',
        
        # Auth
        'auth_group',
        'auth_group_permissions',
    ]
    
    # Build map of available JSON files
    available_files_map = {f.replace('.json', ''): f for f in os.listdir(INPUT_DIR) if f.endswith('.json') and not f.startswith('_')}
    
    imported = {}
    failed = {}
    
    with connection.cursor() as cursor:
        # Disable foreign key checks temporarily
        cursor.execute("SET session_replication_role = 'replica';")
        
        # Import tables in order
        for table in table_order:
            if table in SKIP_TABLES:
                continue
            
            if table not in available_files_map:
                continue
            
            json_file = os.path.join(INPUT_DIR, available_files_map[table])
            log(f"\nImporting: {table}")
            
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                if not data:
                    log(f"  No data to import")
                    continue
                
                count = import_table(cursor, table, data)
                connection.commit()
                imported[table] = count
                log(f"  ✓ Imported {count} rows")
                
            except Exception as e:
                connection.rollback()
                failed[table] = str(e)
                log(f"  ✗ Failed: {e}")
        
        # Import any remaining tables not in the order list
        for table, filename in available_files_map.items():
            if table in imported or table in failed or table in SKIP_TABLES or table in table_order:
                continue
            
            json_file = os.path.join(INPUT_DIR, filename)
            log(f"\nImporting: {table}")
            
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                count = import_table(cursor, table, data)
                connection.commit()
                imported[table] = count
                log(f"  ✓ Imported {count} rows")
                
            except Exception as e:
                connection.rollback()
                failed[table] = str(e)
                log(f"  ✗ Failed: {e}")
        
        # Re-enable foreign key checks
        cursor.execute("SET session_replication_role = 'origin';")
        
        # Reset sequences
        reset_sequences(cursor)
        connection.commit()
    
    # Summary
    log("\n" + "="*60)
    log("IMPORT SUMMARY")
    log("="*60)
    log(f"\nSuccessfully imported {len(imported)} tables:")
    for table, count in sorted(imported.items()):
        log(f"  ✓ {table}: {count} rows")
    
    if failed:
        log(f"\nFailed to import {len(failed)} tables:")
        for table, error in sorted(failed.items()):
            log(f"  ✗ {table}: {error}")
    
    log(f"\nTotal rows imported: {sum(imported.values())}")
    log("="*60)
    
    # Verification
    log("\nVerifying data...")
    with connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM masterdata_customer")
        log(f"  Customers: {cursor.fetchone()[0]}")
        cursor.execute("SELECT COUNT(*) FROM transactiondata_estimate")
        log(f"  Estimates: {cursor.fetchone()[0]}")
        cursor.execute("SELECT COUNT(*) FROM users_customuser")
        log(f"  Users: {cursor.fetchone()[0]}")
    
    log(f"\nLog saved to: {LOG_FILE}")
    log_file.close()

if __name__ == '__main__':
    main()
