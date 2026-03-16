"""
Run this script in Django shell to diagnose the template/image issue:
    python manage.py shell < check_template.py
"""
import re

# Get the document ID from your automation
# Change this to match your automation's document_id
DOCUMENT_ID = None  # Set this to your document ID, e.g., 5

if DOCUMENT_ID is None:
    # Try to find from automation
    from django_q.models import Schedule
    schedules = Schedule.objects.filter(func__contains='new_lead').values('kwargs')
    print("Found automations:")
    for s in schedules:
        print(f"  {s}")
    print("\nSet DOCUMENT_ID in this script and run again")
else:
    from masterdata.models import DocumentLibrary
    
    try:
        doc = DocumentLibrary.objects.get(id=DOCUMENT_ID)
        print(f"Document: {doc.title} (ID: {doc.id})")
        print(f"Has file: {bool(doc.file)}")
        print(f"Is active: {doc.is_active}")
        
        if doc.file:
            print(f"File path: {doc.file.name}")
            
            # Read the file
            with doc.file.open('rb') as f:
                content = f.read().decode('utf-8', errors='replace')
            
            print(f"File size: {len(content)} bytes")
            
            # Find images
            img_tags = re.findall(r'<img[^>]+>', content, flags=re.IGNORECASE)
            print(f"Found {len(img_tags)} img tags")
            
            for i, tag in enumerate(img_tags):
                src_match = re.search(r'src=["\'](.*?)["\']', tag, flags=re.IGNORECASE)
                if src_match:
                    src = src_match.group(1)
                    if src.startswith('data:image'):
                        print(f"  Image {i+1}: BASE64 ({len(src)} chars)")
                    elif src.startswith('blob:'):
                        print(f"  Image {i+1}: BLOB URL (THIS IS THE PROBLEM!) - {src}")
                    else:
                        print(f"  Image {i+1}: URL - {src[:80]}...")
        else:
            print("No file attached - using description field")
            if doc.description:
                img_tags = re.findall(r'<img[^>]+>', doc.description, flags=re.IGNORECASE)
                print(f"Found {len(img_tags)} img tags in description")
            
    except DocumentLibrary.DoesNotExist:
        print(f"Document with ID {DOCUMENT_ID} not found")
