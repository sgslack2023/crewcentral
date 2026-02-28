from django.core.management.base import BaseCommand
from users.models import SystemPermission

class Command(BaseCommand):
    help = 'Seeds the database with standard system permissions'

    def handle(self, *args, **options):
        # Define the canonical list of permissions
        # Format: (codename, name, category)
        permissions = [
            # Master Data
            ('view_customers', 'View Customers', 'Master Data'),
            ('create_customers', 'Create Customers', 'Master Data'),
            ('edit_customers', 'Edit Customers', 'Master Data'),
            ('delete_customers', 'Delete Customers', 'Master Data'),
            ('view_branches', 'View Branches', 'Master Data'),
            ('manage_branches', 'Manage Branches', 'Master Data'),

            # Transaction Data
            ('view_estimates', 'View Estimates', 'Transaction Data'),
            ('create_estimates', 'Create Estimates', 'Transaction Data'),
            ('edit_estimates', 'Edit Estimates', 'Transaction Data'),
            ('approve_estimates', 'Approve Estimates', 'Transaction Data'),

            # Operations
            ('view_site_visits', 'View Site Visits', 'Operations'),
            ('create_site_visits', 'Schedule Site Visits', 'Operations'),
            ('edit_site_visits', 'Perform Site Visits', 'Operations'),

            # User Management
            ('view_users', 'View Users', 'User Management'),
            ('manage_users', 'Manage Users', 'User Management'),
            ('view_roles', 'View Roles', 'User Management'),
            ('manage_roles', 'Manage Roles', 'User Management'),
        ]

        self.stdout.write('Seeding system permissions...')
        
        created_count = 0
        updated_count = 0

        for codename, name, category in permissions:
            obj, created = SystemPermission.objects.update_or_create(
                codename=codename,
                defaults={
                    'name': name,
                    'category': category
                }
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully seeded permissions: {created_count} created, {updated_count} updated.'))
