#!/usr/bin/env python
"""
Export all data from SQLite database, even from corrupted tables.
This script will attempt to read every row from every table and save to JSON.
"""
import os
import sys
import django
import json
from django.apps import apps

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_back.settings')
django.setup()

from django.db import connection

def export_all_tables():
    """Export all tables to JSON files"""
    
    # Get all models
    all_models = apps.get_models()
    
    exported = {}
    failed = {}
    
    for model in all_models:
        model_name = f"{model._meta.app_label}.{model._meta.model_name}"
        print(f"\n{'='*60}")
        print(f"Exporting: {model_name}")
        print(f"{'='*60}")
        
        try:
            # Try to get all objects
            queryset = model.objects.all()
            count = queryset.count()
            print(f"Found {count} records")
            
            # Convert to list of dicts
            data = []
            for obj in queryset:
                try:
                    # Get all field values
                    obj_dict = {}
                    for field in model._meta.fields:
                        field_name = field.name
                        value = getattr(obj, field_name)
                        
                        # Convert to JSON-serializable format
                        if hasattr(value, 'isoformat'):  # datetime/date
                            value = value.isoformat()
                        elif hasattr(value, 'pk'):  # ForeignKey
                            value = value.pk
                        
                        obj_dict[field_name] = value
                    
                    data.append(obj_dict)
                except Exception as e:
                    print(f"  Warning: Could not serialize one record: {e}")
                    continue
            
            # Save to file
            filename = f"{model._meta.app_label}_{model._meta.model_name}.json"
            with open(filename, 'w') as f:
                json.dump(data, f, indent=2, default=str)
            
            exported[model_name] = len(data)
            print(f"✓ Exported {len(data)} records to {filename}")
            
        except Exception as e:
            failed[model_name] = str(e)
            print(f"✗ Failed to export {model_name}: {e}")
            
            # Try to export using raw SQL as fallback
            try:
                table_name = model._meta.db_table
                print(f"  Attempting raw SQL export from {table_name}...")
                
                with connection.cursor() as cursor:
                    cursor.execute(f"SELECT * FROM {table_name}")
                    columns = [col[0] for col in cursor.description]
                    rows = cursor.fetchall()
                    
                    data = []
                    for row in rows:
                        data.append(dict(zip(columns, row)))
                    
                    filename = f"{model._meta.app_label}_{model._meta.model_name}_raw.json"
                    with open(filename, 'w') as f:
                        json.dump(data, f, indent=2, default=str)
                    
                    exported[model_name + " (raw)"] = len(data)
                    print(f"  ✓ Exported {len(data)} records via raw SQL to {filename}")
                    
            except Exception as e2:
                print(f"  ✗ Raw SQL export also failed: {e2}")
    
    # Print summary
    print(f"\n{'='*60}")
    print("EXPORT SUMMARY")
    print(f"{'='*60}")
    print(f"\nSuccessfully exported {len(exported)} tables:")
    for name, count in exported.items():
        print(f"  ✓ {name}: {count} records")
    
    if failed:
        print(f"\nFailed to export {len(failed)} tables:")
        for name, error in failed.items():
            print(f"  ✗ {name}: {error}")
    
    print(f"\n{'='*60}")
    print("All export files are in the current directory")
    print("You can now restore these to a new database")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    export_all_tables()
