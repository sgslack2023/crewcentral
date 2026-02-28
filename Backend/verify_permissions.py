import os
import django
import sys

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_back.settings')
django.setup()

from users.models import OrganizationRole, SystemPermission, OrganizationMember
from django.db.models import Q

def check_roles():
    print("Checking Roles and Permissions...")
    roles = OrganizationRole.objects.all()
    for role in roles:
        perms = role.permissions.all()
        perm_names = [p.codename for p in perms]
        print(f"Role: {role.name} (Org: {role.organization.name})")
        print(f"  Is Default Admin: {role.is_default_admin}")
        print(f"  Permissions: {perm_names}")
        if 'edit_site_visits' in perm_names:
            print("  -> Matches edit_site_visits")
        else:
            print("  -> DOES NOT match edit_site_visits")
        print("-" * 30)

    print("\nChecking Site Visit Permissions:")
    sv_perms = SystemPermission.objects.filter(category='Operations')
    for p in sv_perms:
        print(f"  {p.name}: {p.codename}")

    print("\nTesting Member Filter for 'edit_site_visits':")
    permission_codename = 'edit_site_visits'
    members = OrganizationMember.objects.filter(
        Q(role__permissions__codename=permission_codename) |
        Q(role__is_default_admin=True)
    ).distinct()
    
    print(f"Found {members.count()} members with {permission_codename}:")
    for m in members:
        print(f"  - User: {m.user.email}, Role: {m.role.name} (Org: {m.organization.name})")
        # Double check permissions for this role
        p_names = [p.codename for p in m.role.permissions.all()]
        print(f"    Role Perms: {p_names}")


if __name__ == "__main__":
    check_roles()
