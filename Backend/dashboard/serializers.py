from rest_framework import serializers
from .models import Dashboard, DashboardWidget, CustomMetric


class CustomMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomMetric
        fields = '__all__'
        read_only_fields = ['created_by', 'organization']
from users.models import OrganizationRole

class OrganizationRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationRole
        fields = ['id', 'name']

class DashboardWidgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = DashboardWidget
        fields = '__all__'

class DashboardSerializer(serializers.ModelSerializer):
    widgets = DashboardWidgetSerializer(many=True, required=False)
    shared_with_roles_details = OrganizationRoleSerializer(many=True, read_only=True, source='shared_with_roles')
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = Dashboard
        fields = [
            'id', 'name', 'organization', 'organization_name', 'description', 
            'is_template', 'category', 'is_locked', 'is_active', 'created_by', 
            'shared_with_roles', 'shared_with_roles_details',
            'widgets', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by']

    def create(self, validated_data):
        widgets_data = validated_data.pop('widgets', [])
        shared_with_roles = validated_data.pop('shared_with_roles', [])
        
        dashboard = Dashboard.objects.create(**validated_data)
        
        # Set shared roles
        if shared_with_roles:
            dashboard.shared_with_roles.set(shared_with_roles)
        
        # Create widgets
        for widget_data in widgets_data:
            widget_data.pop('id', None) # Remove frontend-generated ID
            DashboardWidget.objects.create(dashboard=dashboard, **widget_data)
        
        return dashboard

    def update(self, instance, validated_data):
        widgets_data = validated_data.pop('widgets', None)
        shared_with_roles = validated_data.pop('shared_with_roles', None)
        
        # Update dashboard fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update shared roles if provided
        if shared_with_roles is not None:
            instance.shared_with_roles.set(shared_with_roles)

        if widgets_data is not None:
            # Simple sync strategy: Delete existing and recreate
            instance.widgets.all().delete()
            for widget_data in widgets_data:
                widget_data.pop('id', None) # Remove frontend-generated ID
                DashboardWidget.objects.create(dashboard=instance, **widget_data)
        
        return instance


