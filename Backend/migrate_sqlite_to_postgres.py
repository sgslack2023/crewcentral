#!/usr/bin/env python
"""
Migrate data from SQLite to PostgreSQL
Run this AFTER setting up PostgreSQL and running migrations
"""
import sqlite3
import psycopg2
import json
from datetime import datetime

# SQLite connection (your recovered database)
SQLITE_PATH = 'db.sqlite3'  # or 'recovered.db' if that's what you named it

# PostgreSQL connection
PG_CONFIG = {
    'dbname': 'postgres',
    'user': 'postgres',
    'password': 'postgres',
    'host': 'localhost',
    'port': '5432'
}

# Tables to skip (Django system tables that will be recreated)
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
    'sqlite_sequence',
]

def get_sqlite_tables(cursor):
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    return [row[0] for row in cursor.fetchall()]

def get_table_columns(cursor, table):
    cursor.execute(f"PRAGMA table_info({table})")
    return [row[1] for row in cursor.fetchall()]

def migrate_table(sqlite_cursor, pg_cursor, table):
    """Migrate a single table from SQLite to PostgreSQL"""
    
    # Get columns
    columns = get_table_columns(sqlite_cursor, table)
    
    # Get data from SQLite
    sqlite_cursor.execute(f"SELECT * FROM {table}")
    rows = sqlite_cursor.fetchall()
    
    if not rows:
        print(f"  No data in {table}")
        return 0
    
    # Build INSERT statement
    placeholders = ', '.join(['%s'] * len(columns))
    columns_str = ', '.join([f'"{col}"' for col in columns])
    insert_sql = f'INSERT INTO {table} ({columns_str}) VALUES ({placeholders})'
    
    # Insert into PostgreSQL
    count = 0
    for row in rows:
        try:
            # Convert row to list and handle special types
            row_data = []
            for val in row:
                if isinstance(val, bytes):
                    val = val.decode('utf-8', errors='ignore')
                row_data.append(val)
            
            pg_cursor.execute(insert_sql, row_data)
            count += 1
        except Exception as e:
            print(f"  Error inserting row in {table}: {e}")
            continue
    
    return count

def reset_sequences(pg_cursor, pg_conn):
    """Reset PostgreSQL sequences after data import"""
    pg_cursor.execute("""
        SELECT 'SELECT SETVAL(' ||
               quote_literal(quote_ident(sequence_namespace.nspname) || '.' || quote_ident(class_sequence.relname)) ||
               ', COALESCE(MAX(' || quote_ident(pg_attribute.attname) || '), 1)) FROM ' ||
               quote_ident(table_namespace.nspname) || '.' || quote_ident(class_table.relname) || ';'
        FROM pg_depend
        JOIN pg_class AS class_sequence ON class_sequence.oid = pg_depend.objid AND class_sequence.relkind = 'S'
        JOIN pg_class AS class_table ON class_table.oid = pg_depend.refobjid
        JOIN pg_attribute ON pg_attribute.attrelid = class_table.oid AND pg_depend.refobjsubid = pg_attribute.attnum
        JOIN pg_namespace AS sequence_namespace ON sequence_namespace.oid = class_sequence.relnamespace
        JOIN pg_namespace AS table_namespace ON table_namespace.oid = class_table.relnamespace
        WHERE class_table.relkind = 'r';
    """)
    
    sequence_queries = pg_cursor.fetchall()
    for query_tuple in sequence_queries:
        try:
            pg_cursor.execute(query_tuple[0])
        except Exception as e:
            print(f"  Sequence reset warning: {e}")
    
    pg_conn.commit()

def main():
    print("="*60)
    print("SQLite to PostgreSQL Migration")
    print("="*60)
    
    # Connect to SQLite
    print(f"\nConnecting to SQLite: {SQLITE_PATH}")
    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_cursor = sqlite_conn.cursor()
    
    # Connect to PostgreSQL
    print(f"Connecting to PostgreSQL: {PG_CONFIG['dbname']}")
    pg_conn = psycopg2.connect(**PG_CONFIG)
    pg_cursor = pg_conn.cursor()
    
    # Get tables
    tables = get_sqlite_tables(sqlite_cursor)
    print(f"\nFound {len(tables)} tables in SQLite")
    
    # Migrate each table
    migrated = {}
    failed = {}
    
    for table in tables:
        if table in SKIP_TABLES:
            print(f"\nSkipping: {table}")
            continue
            
        print(f"\nMigrating: {table}")
        try:
            count = migrate_table(sqlite_cursor, pg_cursor, table)
            pg_conn.commit()
            migrated[table] = count
            print(f"  ✓ Migrated {count} rows")
        except Exception as e:
            pg_conn.rollback()
            failed[table] = str(e)
            print(f"  ✗ Failed: {e}")
    
    # Reset sequences
    print("\nResetting PostgreSQL sequences...")
    reset_sequences(pg_cursor, pg_conn)
    
    # Close connections
    sqlite_conn.close()
    pg_cursor.close()
    pg_conn.close()
    
    # Summary
    print("\n" + "="*60)
    print("MIGRATION SUMMARY")
    print("="*60)
    print(f"\nSuccessfully migrated {len(migrated)} tables:")
    for table, count in sorted(migrated.items()):
        print(f"  ✓ {table}: {count} rows")
    
    if failed:
        print(f"\nFailed to migrate {len(failed)} tables:")
        for table, error in sorted(failed.items()):
            print(f"  ✗ {table}: {error}")
    
    print(f"\nTotal rows migrated: {sum(migrated.values())}")
    print("="*60)

if __name__ == '__main__':
    main()
