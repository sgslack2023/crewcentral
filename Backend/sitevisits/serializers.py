from rest_framework import serializers
from .models import SiteVisit, SiteVisitObservation, SiteVisitPhoto
from users.models import CustomUser
from masterdata.models import Customer

class SiteVisitObservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteVisitObservation
        fields = ['id', 'visit', 'key', 'value', 'display_order', 'created_at']
        read_only_fields = ['created_at']

class SiteVisitPhotoSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = SiteVisitPhoto
        fields = ['id', 'visit', 'image', 'image_url', 'caption', 'uploaded_at', 'uploaded_by', 'uploaded_by_name']
        read_only_fields = ['uploaded_at']

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.fullname if obj.uploaded_by else None

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url if obj.image else None

class SiteVisitSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    surveyor_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    observations = SiteVisitObservationSerializer(many=True, read_only=True)
    photos = SiteVisitPhotoSerializer(many=True, read_only=True)

    class Meta:
        model = SiteVisit
        fields = [
            'id', 'customer', 'customer_name', 'surveyor', 'surveyor_name', 
            'organization', 'scheduled_at', 'started_at', 'completed_at', 
            'status', 'notes', 'appointment_confirmed_by', 'appointment_phone', 
            'created_at', 'updated_at', 'created_by', 'created_by_name',
            'observations', 'photos'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'organization']

    def get_customer_name(self, obj):
        return obj.customer.full_name if obj.customer else None

    def get_surveyor_name(self, obj):
        return obj.surveyor.fullname if obj.surveyor else None

    def get_created_by_name(self, obj):
        return obj.created_by.fullname if obj.created_by else None
