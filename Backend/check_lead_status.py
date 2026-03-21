"""
Check the status of lead processing
Run this with: python manage.py shell < check_lead_status.py
"""
from masterdata.models import RawEndpointLead, Customer, EndpointConfiguration
from django_q.models import Schedule, Task

print("=" * 60)
print("LEAD PROCESSING STATUS CHECK")
print("=" * 60)

# Check endpoint configurations
configs = EndpointConfiguration.objects.filter(is_active=True)
print(f"\n[ENDPOINT CONFIGS] {configs.count()} active")
for config in configs:
    print(f"  - {config.name} (ID: {config.id})")
    print(f"    Has mapping: {bool(config.mapping_config)}")
    if config.mapping_config:
        print(f"    Mapped fields: {list(config.mapping_config.keys())}")

# Check raw leads
print(f"\n[RAW LEADS]")
total_leads = RawEndpointLead.objects.all().count()
pending_leads = RawEndpointLead.objects.filter(processed=False)
processed_leads = RawEndpointLead.objects.filter(processed=True, error_message__isnull=True)
error_leads = RawEndpointLead.objects.filter(processed=True, error_message__isnull=False)

print(f"  Total: {total_leads}")
print(f"  Pending: {pending_leads.count()}")
print(f"  Processed: {processed_leads.count()}")
print(f"  Errors: {error_leads.count()}")

if pending_leads.exists():
    print(f"\n[PENDING LEADS]")
    for lead in pending_leads[:5]:
        print(f"  - Lead ID: {lead.id}")
        print(f"    Endpoint: {lead.endpoint_config.name if lead.endpoint_config else 'Unknown'}")
        print(f"    Received: {lead.created_at}")
        if lead.endpoint_config and not lead.endpoint_config.mapping_config:
            print(f"    WARNING: No mapping configured!")

if error_leads.exists():
    print(f"\n[ERROR LEADS]")
    for lead in error_leads[:3]:
        print(f"  - Lead ID: {lead.id}: {lead.error_message}")

# Check automation schedule
print(f"\n[AUTOMATION SCHEDULE]")
lead_schedules = Schedule.objects.filter(func__contains='process_raw_endpoint_leads')
if lead_schedules.exists():
    for schedule in lead_schedules:
        print(f"  - {schedule.name}")
        print(f"    Type: {schedule.schedule_type}")
        print(f"    Next run: {schedule.next_run}")
        print(f"    Repeats: {schedule.repeats}")
        print(f"    Enabled: {schedule.repeats != 0}")
else:
    print("  WARNING: No lead processing automation found!")
    print("  Create one in Settings > Automations with task type 'Endpoint Lead Processing'")

# Check recent tasks
print(f"\n[RECENT TASKS]")
recent_tasks = Task.objects.filter(func__contains='process_raw_endpoint_leads').order_by('-stopped')[:3]
if recent_tasks.exists():
    for task in recent_tasks:
        print(f"  - {task.name or 'Unnamed'}")
        print(f"    Started: {task.started}")
        print(f"    Success: {task.success}")
        if task.result:
            print(f"    Result: {task.result}")
else:
    print("  No tasks have run yet")
    print("  Wait for the schedule to trigger, or click 'Run Now' in Settings")

# Check recent customers
print(f"\n[RECENT CUSTOMERS]")
recent_customers = Customer.objects.order_by('-id')[:5]
if recent_customers.exists():
    for customer in recent_customers:
        print(f"  - {customer.full_name} ({customer.email})")
        print(f"    Source: {customer.source}, Stage: {customer.stage}")
else:
    print("  No customers found")

print("\n" + "=" * 60)
