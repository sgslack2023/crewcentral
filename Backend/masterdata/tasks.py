import logging
from .models import RawEndpointLead, Customer, EndpointConfiguration
from django.utils import timezone
from datetime import datetime

logger = logging.getLogger(__name__)

def noop_automation(*args, **kwargs):
    """
    A safe no-op function for event-driven automations.
    These automations are triggered by specific code events, 
    but use the Schedule model to store configuration (like document_id).
    Accepts any arguments to avoid TypeError in Django-Q worker.
    """
    logger.debug(f"No-op automation triggered with kwargs: {kwargs}")
    return True

def get_value_by_path(data, path):
    """
    Helper to get value from nested dictionary using dot notation (e.g. 'lead.contact.name')
    """
    if not path or not data:
        return None
    
    parts = path.split('.')
    current = data
    
    for part in parts:
        if isinstance(current, dict) and part in current:
            current = current[part]
        else:
            return None
            
    return current

def process_raw_endpoint_leads(endpoint_config_id=None, **kwargs):
    """
    Task to process unprocessed raw endpoint leads and create customers.
    """
    logger.info("Starting process_raw_endpoint_leads task")
    
    query = RawEndpointLead.objects.filter(processed=False)
    if endpoint_config_id:
        query = query.filter(endpoint_config_id=endpoint_config_id)
        
    leads_to_process = query.select_related('endpoint_config', 'organization')
    
    processed_count = 0
    error_count = 0
    
    for lead in leads_to_process:
        if not lead.endpoint_config or not lead.endpoint_config.mapping_config:
            logger.info(f"Skipping lead {lead.id}: No mapping configuration set yet. Leaving as PENDING.")
            continue
            
        mapping = lead.endpoint_config.mapping_config
        raw_data = lead.raw_data
        
        try:
            # Extract basic info
            customer_data = {
                'organization': lead.organization,
                'full_name': get_value_by_path(raw_data, mapping.get('full_name')),
                'email': get_value_by_path(raw_data, mapping.get('email')),
                'phone': get_value_by_path(raw_data, mapping.get('phone')),
                'company': get_value_by_path(raw_data, mapping.get('company')),
                'address': get_value_by_path(raw_data, mapping.get('address')),
                'city': get_value_by_path(raw_data, mapping.get('city')),
                'state': get_value_by_path(raw_data, mapping.get('state')),
                'postal_code': get_value_by_path(raw_data, mapping.get('zip')),
                'notes': get_value_by_path(raw_data, mapping.get('notes')),
                'source': lead.endpoint_config.name.lower().replace(' ', '_'), # Auto-assign source from endpoint name
            }
            
            # Handle move date if present and valid
            move_date_str = get_value_by_path(raw_data, mapping.get('move_date'))
            if move_date_str:
                try:
                    # Attempt to parse date (assuming ISO format YYYY-MM-DD)
                    # This could be improved to handle multiple formats
                    customer_data['move_date'] = datetime.strptime(move_date_str[:10], '%Y-%m-%d').date()
                except (ValueError, TypeError):
                    logger.warning(f"Could not parse move_date: {move_date_str}")
            
            # Validate required fields (at least name and email)
            if not customer_data['full_name'] or not customer_data['email']:
                lead.error_message = "Missing required fields (full_name and email) based on mapping"
                lead.processed = True # We processed it, but it failed validation
                lead.save()
                error_count += 1
                continue
                
            # Create the customer
            # We use get_or_create or update_or_create to avoid duplicates if same lead sent twice
            customer, created = Customer.objects.update_or_create(
                email=customer_data['email'],
                organization=lead.organization,
                defaults=customer_data
            )
            
            # TRIGGER WELCOME EMAIL FOR NEW CUSTOMERS
            if created and customer.email:
                try:
                    from django_q.tasks import async_task
                    from transactiondata.tasks import send_new_lead_welcome_email, get_active_schedule
                    
                    # Link task to schedule for UI tracking
                    task_name = None
                    if hasattr(customer, 'organization') and customer.organization:
                        schedule = get_active_schedule('new_lead', customer.organization.id)
                        if schedule:
                            task_name = schedule.name
                            
                    async_task(send_new_lead_welcome_email, customer.id, q_options={'name': task_name} if task_name else None)
                except Exception as e:
                    logger.error(f"Failed to trigger welcome email for lead {lead.id}: {e}")

            lead.processed = True
            lead.error_message = None
            lead.save()
            processed_count += 1
            
            logger.info(f"Successfully processed lead {lead.id} -> Customer {customer.id} ({'Created' if created else 'Updated'})")
            
        except Exception as e:
            logger.error(f"Error processing lead {lead.id}: {str(e)}")
            lead.error_message = str(e)
            lead.save()
            error_count += 1
            
    summary = {
        'processed': processed_count,
        'errors': error_count,
        'total': processed_count + error_count
    }
    logger.info(f"process_raw_endpoint_leads completed: {summary}")
    return summary
