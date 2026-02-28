from django.db import models
from users.models import CustomUser, Organization
from masterdata.models import Customer

class SiteVisit(models.Model):
    STATUS_CHOICES = [
        ('SCHEDULED', 'Scheduled'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='site_visits')
    surveyor = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='surveys')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    
    scheduled_at = models.DateTimeField()
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')
    notes = models.TextField(blank=True, default='')
    
    # Appointment details
    appointment_confirmed_by = models.CharField(max_length=100, blank=True)  # Customer contact name
    appointment_phone = models.CharField(max_length=20, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='+')

    def __str__(self):
        return f"Site Visit for {self.customer.full_name} on {self.scheduled_at}"

class SiteVisitObservation(models.Model):
    visit = models.ForeignKey(SiteVisit, on_delete=models.CASCADE, related_name='observations')
    key = models.CharField(max_length=100)  # e.g., "stairs_count", "narrow_hallway"
    value = models.JSONField()  # Supports strings, numbers, booleans, arrays
    display_order = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.key}: {self.value}"

class SiteVisitPhoto(models.Model):
    visit = models.ForeignKey(SiteVisit, on_delete=models.CASCADE, related_name='photos')
    image = models.ImageField(upload_to='site_visits/%Y/%m/%d/')
    caption = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"Photo for visit {self.visit.id}"
