# Create your models here.
from django.db import models
from datetime import timedelta
from django.utils import timezone

# Create your models here.
from django.contrib.auth.models import (
    AbstractBaseUser, PermissionsMixin, BaseUserManager
)

Roles=(("Admin","Admin"),("User","User"))

def default_expiry():
    return timezone.now() + timedelta(hours=1)


class CustomUserManager(BaseUserManager):
    def create_superuser(self,email,password,**extra_fields):
        extra_fields.setdefault('is_staff',True)
        extra_fields.setdefault('is_superuser',True)
        extra_fields.setdefault('is_active',True)
        extra_fields.setdefault('approved',True)  # Automatically approve superusers

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True")
        
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True")
        
        if not email:
            raise ValueError("Email field is required")

        user =self.model(email=email,**extra_fields)
        user.set_password(password)
        user.save()
        return user 

class CustomUser(AbstractBaseUser,PermissionsMixin):
    fullname=models.CharField(max_length = 150)
    role = models.CharField(max_length = 150,choices= Roles)
    email = models.EmailField(unique = True)
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)
    is_staff=models.BooleanField(default=False)
    is_superuser=models.BooleanField(default=False)
    is_active=models.BooleanField(default=True)
    last_login=models.DateTimeField(null=True)
    approved=models.BooleanField(default=False)
    approval_notes=models.TextField(blank=True, null=True)
    denial_reason=models.TextField(blank=True, null=True)

    USERNAME_FIELD="email"
    objects=CustomUserManager()

    def __str__(self):
        return self.email
    
    class Meta:
        ordering=("created_at",)


class UserActivities(models.Model):
    user=models.ForeignKey(CustomUser,related_name="user_activities",null=True, on_delete=models.SET_NULL)
    email = models.EmailField()
    fullname=models.CharField(max_length = 255)
    action = models.TextField()
    created_at=models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering=("-created_at",)

    def __str__(self):
        return f"{self.fullname} {self.action} on {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    


class ResetPasswordToken(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    token = models.CharField(max_length=256)
    expiry = models.DateTimeField(default=default_expiry) 

    def is_valid(self):
        return self.expiry >= timezone.now()


class Organization(models.Model):
    ORG_TYPES = (
        ('company', 'Company'),
        ('franchisee', 'Franchisee'),
        ('contractor', 'Contractor'),
    )

    name = models.CharField(max_length=255)
    org_type = models.CharField(max_length=50, choices=ORG_TYPES, default='company')
    parent_organization = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='sub_organizations')
    is_active = models.BooleanField(default=True)
    google_business_link = models.URLField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class SystemPermission(models.Model):
    codename = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100, help_text="Module or Category e.g. 'Sales', 'HR'")

    def __str__(self):
        return f"{self.category} - {self.name} ({self.codename})"

class OrganizationRole(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='roles')
    name = models.CharField(max_length=100)
    permissions = models.ManyToManyField(SystemPermission, blank=True, related_name='roles')
    is_default_admin = models.BooleanField(default=False, help_text="If true, this role has all permissions by default and cannot be deleted easily.")

    class Meta:
        unique_together = ('organization', 'name')

    def __str__(self):
        return f"{self.organization.name} - {self.name}"

class OrganizationMember(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='memberships')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='members')
    role = models.ForeignKey(OrganizationRole, on_delete=models.SET_NULL, null=True, related_name='members')
    is_default = models.BooleanField(default=False, help_text="Is this the user's default organization?")

    class Meta:
        unique_together = ('user', 'organization')

    def __str__(self):
        role_name = self.role.name if self.role else "No Role"
        return f"{self.user.email} in {self.organization.name} as {role_name}"






