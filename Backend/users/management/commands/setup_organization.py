from django.core.management.base import BaseCommand
from django.db import transaction
from users.models import CustomUser, Organization, OrganizationRole, OrganizationMember, SystemPermission


class Command(BaseCommand):
    help = 'Creates an organization with an admin user'

    def add_arguments(self, parser):
        parser.add_argument('--org-name', type=str, required=True, help='Organization name')
        parser.add_argument('--email', type=str, required=True, help='Admin user email')
        parser.add_argument('--password', type=str, required=True, help='Admin user password')
        parser.add_argument('--fullname', type=str, default='Admin User', help='Admin user full name')
        parser.add_argument('--org-type', type=str, default='company', choices=['company', 'franchisee', 'contractor'], help='Organization type')

    @transaction.atomic
    def handle(self, *args, **options):
        org_name = options['org_name']
        email = options['email']
        password = options['password']
        fullname = options['fullname']
        org_type = options['org_type']

        # Check if organization already exists
        if Organization.objects.filter(name=org_name).exists():
            self.stdout.write(self.style.ERROR(f'Organization "{org_name}" already exists.'))
            return

        # Check if user already exists
        if CustomUser.objects.filter(email=email).exists():
            self.stdout.write(self.style.ERROR(f'User with email "{email}" already exists.'))
            return

        # Create the organization
        self.stdout.write(f'Creating organization: {org_name}...')
        organization = Organization.objects.create(
            name=org_name,
            org_type=org_type,
            is_active=True
        )

        # Create admin role with all permissions
        self.stdout.write('Creating admin role with all permissions...')
        admin_role = OrganizationRole.objects.create(
            organization=organization,
            name='Admin',
            is_default_admin=True
        )
        
        # Assign all system permissions to the admin role
        all_permissions = SystemPermission.objects.all()
        if all_permissions.exists():
            admin_role.permissions.set(all_permissions)
            self.stdout.write(f'  Assigned {all_permissions.count()} permissions to Admin role.')
        else:
            self.stdout.write(self.style.WARNING('  No system permissions found. Run "python manage.py seed_permissions" first.'))

        # Create the admin user
        self.stdout.write(f'Creating admin user: {email}...')
        user = CustomUser.objects.create(
            email=email,
            fullname=fullname,
            role='Admin',
            is_active=True,
            is_staff=True,
            approved=True
        )
        user.set_password(password)
        user.save()

        # Create organization membership
        self.stdout.write('Linking user to organization...')
        OrganizationMember.objects.create(
            user=user,
            organization=organization,
            role=admin_role,
            is_default=True
        )

        self.stdout.write(self.style.SUCCESS(f'''
Setup complete!
  Organization: {org_name} (ID: {organization.id})
  Admin User: {email}
  Role: Admin (with all permissions)

You can now log in with:
  Email: {email}
  Password: {password}
'''))
