import sqlite3
import json
import os

db_path = 'db.sqlite3'
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row  # This enables column access by name
cursor = conn.cursor()

# Get all table names
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
tables = [row[0] for row in cursor.fetchall()]

print(f"Found {len(tables)} tables")

exported = {}
failed = {}

for table in tables:
    print(f"\nExporting table: {table}")
    try:
        cursor.execute(f"SELECT * FROM {table}")
        rows = cursor.fetchall()
        
        # Convert rows to list of dicts
        data = []
        for row in rows:
            data.append(dict(row))
        
        # Save to JSON
        filename = f"direct_{table}.json"
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2, default=str)
        
        exported[table] = len(data)
        print(f"  ✓ Exported {len(data)} rows to {filename}")
        
    except Exception as e:
        failed[table] = str(e)
        print(f"  ✗ Failed: {e}")

conn.close()

print(f"\n{'='*60}")
print("DIRECT EXPORT SUMMARY")
print(f"{'='*60}")
print(f"\nSuccessfully exported {len(exported)} tables:")
for name, count in sorted(exported.items()):
    print(f"  ✓ {name}: {count} rows")

if failed:
    print(f"\nFailed to export {len(failed)} tables:")
    for name, error in sorted(failed.items()):
        print(f"  ✗ {name}: {error}")

print(f"\nTotal rows exported: {sum(exported.values())}")
