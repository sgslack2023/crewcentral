from django.contrib import admin
from .models import CustomUser, Organization, OrganizationRole, SystemPermission, OrganizationMember

admin.site.register(CustomUser)
admin.site.register(Organization)
admin.site.register(OrganizationRole)
admin.site.register(SystemPermission)
admin.site.register(OrganizationMember)
