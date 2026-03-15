import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "crm_back.settings")
django.setup()

from transactiondata.models import ContractorEstimateLineItem

items = ContractorEstimateLineItem.objects.filter(estimate_item__isnull=False)
count = 0
for item in items:
    if item.charge_type != item.estimate_item.charge_type or item.percentage != item.estimate_item.percentage:
        print(f"Updating {item.description}: {item.charge_type} -> {item.estimate_item.charge_type}")
        item.charge_type = item.estimate_item.charge_type
        item.percentage = item.estimate_item.percentage
        item.save()  # This will trigger recalculation and update the work order
        count += 1

print(f"Updated {count} items")
