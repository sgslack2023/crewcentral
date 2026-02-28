from rest_framework import serializers
from .models import CustomUser, UserActivities, Roles, OrganizationMember, Organization, SystemPermission, OrganizationRole

class CreateUserSerializer(serializers.Serializer):
    email=serializers.EmailField()
    fullname=serializers.CharField()

    role=serializers.ChoiceField(Roles)
    approved=serializers.BooleanField(default=False, required=False)
    organization_name = serializers.CharField(required=True, max_length=255)

class LoginSerializer(serializers.Serializer):
        email=serializers.EmailField()
        password=serializers.CharField(required=False)
        is_new_user=serializers.BooleanField(default=False,required=False)


class UpdatePasswordSerializer(serializers.Serializer):
    user_id=serializers.CharField()
    password=serializers.CharField()

class CustomUserSerializer(serializers.ModelSerializer):
    organizations = serializers.SerializerMethodField()
    
    class Meta:
        model=CustomUser
        exclude=("password",)
        
    def get_organizations(self, obj):
        from .models import SystemPermission, Organization, OrganizationMember
        if obj.is_superuser:
            # Superusers see all organizations
            orgs = Organization.objects.filter(is_active=True)
            all_perms = list(SystemPermission.objects.values_list('codename', flat=True))
            return [{
                "id": o.id,
                "name": o.name,
                "type": o.org_type,
                "role": "Superuser",
                "is_default": i == 0,
                "permissions": all_perms,
                "google_business_link": o.google_business_link
            } for i, o in enumerate(orgs)]
            
        memberships = OrganizationMember.objects.filter(user=obj).select_related('organization', 'role')
        result = []
        member_org_ids = []
        
        for m in memberships:
            perms = []
            if m.role:
                if m.role.is_default_admin:
                    perms = list(SystemPermission.objects.values_list('codename', flat=True))
                else:
                    perms = list(m.role.permissions.values_list('codename', flat=True))
            
            member_org_ids.append(m.organization.id)
            result.append({
                "id": m.organization.id,
                "name": m.organization.name,
                "type": m.organization.org_type,
                "role": m.role.name if m.role else "Member",
                "is_default": m.is_default,
                "permissions": perms,
                "google_business_link": m.organization.google_business_link
            })
            
        # Also include sub-organizations of organizations they are members of
        # This allows a Company admin to switch to a Franchisee context
        sub_orgs = Organization.objects.filter(parent_organization_id__in=member_org_ids, is_active=True)
        for s in sub_orgs:
            if s.id in member_org_ids:
                continue
                
            # Inherit permissions from parent organization membership
            parent_m = next(m for m in memberships if m.organization.id == s.parent_organization_id)
            perms = []
            if parent_m.role:
                if parent_m.role.is_default_admin:
                    perms = list(SystemPermission.objects.values_list('codename', flat=True))
                else:
                    perms = list(parent_m.role.permissions.values_list('codename', flat=True))
            
            result.append({
                "id": s.id,
                "name": s.name,
                "type": s.org_type,
                "role": f"{parent_m.role.name} (Parent)" if parent_m.role else "Parent Member",
                "is_default": False,
                "permissions": perms,
                "google_business_link": s.google_business_link
            })
            
        return result


class UserActivitiesSerializer(serializers.ModelSerializer):
    class Meta:
        model=UserActivities
        fields=("__all__")



class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("User with this email does not exist.")
        return value
    

class ResetPasswordSerializer(serializers.Serializer):
    password = serializers.CharField(max_length=128)
    token = serializers.CharField(max_length=256)


class OrganizationSerializer(serializers.ModelSerializer):
    parent_organization_name = serializers.CharField(source='parent_organization.name', read_only=True)
    
    class Meta:
        model = Organization
        fields = ('id', 'name', 'org_type', 'parent_organization', 'parent_organization_name', 'is_active', 'google_business_link', 'created_at')
        read_only_fields = ('created_at',)

class OrganizationDetailSerializer(serializers.ModelSerializer):
    parent_organization_name = serializers.CharField(source='parent_organization.name', read_only=True)
    sub_organizations = OrganizationSerializer(many=True, read_only=True)
    
    class Meta:
        model = Organization
        fields = ('id', 'name', 'org_type', 'parent_organization', 'parent_organization_name', 'is_active', 'google_business_link', 'created_at', 'sub_organizations')

class SystemPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemPermission
        fields = '__all__'

class OrganizationRoleSerializer(serializers.ModelSerializer):
    permissions_details = SystemPermissionSerializer(source='permissions', many=True, read_only=True)
    
    class Meta:
        model = OrganizationRole
        fields = ('id', 'organization', 'name', 'permissions', 'permissions_details', 'is_default_admin')
        extra_kwargs = {
            'permissions': {'write_only': True},
            'organization': {'read_only': True}
        }

class OrganizationMemberSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_fullname = serializers.CharField(source='user.fullname', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    role_name = serializers.SerializerMethodField()
    
    class Meta:
        model = OrganizationMember
        fields = ('id', 'user', 'user_id', 'user_email', 'user_fullname', 'organization', 'role', 'role_name', 'is_default')

    def get_role_name(self, obj):
        return obj.role.name if obj.role else None