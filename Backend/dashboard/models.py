from django.db import models
from users.models import CustomUser, Organization, OrganizationRole

class Dashboard(models.Model):
    """
    Model to store custom dashboard configurations per organization.
    """
    name = models.CharField(max_length=255)
    is_template = models.BooleanField(default=False, help_text="Templates are pre-built dashboards that can be cloned.")
    category = models.CharField(max_length=100, blank=True, null=True, help_text="Category for grouping templates (e.g., 'Sales', 'Finance')")
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='dashboards', null=True, blank=True)
    description = models.TextField(blank=True, null=True)
    is_locked = models.BooleanField(default=False, help_text="Locked dashboards cannot be edited by non-admins.")
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='created_dashboards')
    shared_with_roles = models.ManyToManyField(OrganizationRole, blank=True, related_name='shared_dashboards')
    global_filters = models.JSONField(default=dict, blank=True, help_text="Default global filters for the dashboard")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-created_at',)
        unique_together = ('organization', 'name')

    def __str__(self):
        return f"{self.name} ({self.organization.name})"


class DashboardWidget(models.Model):
    """
    Model to store individual widget configurations within a dashboard.
    """
    WIDGET_TYPES = (
        ('kpi', 'KPI - Single Metric'),
        ('trend', 'Trend - Time Series'),
        ('breakdown', 'Breakdown - Category Comparison'),
        ('funnel', 'Funnel - Stage Conversion'),
        ('table', 'Table - Records'),
        ('activity', 'Activity - Timeline'),
        ('Calendar', 'Calendar View'),
        ('control', 'Control - Filter/Input'),
    )

    WIDGET_CATEGORIES = (
        ('metrics', 'Metrics & KPIs'),
        ('trends', 'Trends & Forecasting'),
        ('comparisons', 'Breakdowns & Comparisons'),
        ('activities', 'Activity & Lists'),
        ('filters', 'Filters & Controls'),
    )

    CHART_LIBRARIES = (
        ('recharts', 'Recharts'),
        ('google_charts', 'Google Charts'),
        ('none', 'None'),
    )

    dashboard = models.ForeignKey(Dashboard, on_delete=models.CASCADE, related_name='widgets')
    title = models.CharField(max_length=255)
    widget_type = models.CharField(max_length=50, choices=WIDGET_TYPES)
    widget_category = models.CharField(max_length=50, choices=WIDGET_CATEGORIES, default='metrics')
    chart_library = models.CharField(max_length=50, choices=CHART_LIBRARIES, default='none')
    
    # data_endpoint refers to a specific analytics function or endpoint slug
    data_source = models.CharField(max_length=100, help_text="Key for the data provider (e.g., 'upcoming_jobs', 'lead_volume')")
    
    # Stores configuration like colors, chart types (pie, bar, etc.), filters
    config = models.JSONField(default=dict, blank=True)
    
    # Interactivity
    enable_click = models.BooleanField(default=False)
    click_action = models.CharField(max_length=50, default='none', choices=[
        ('filter_dashboard', 'Filter Dashboard'),
        ('drill_down', 'Show Details'),
        ('navigate', 'Navigate to Page'),
        ('none', 'No Action')
    ])
    click_target = models.JSONField(default=dict, blank=True)
    
    # Stores grid position and sizing: {x: 0, y: 0, w: 4, h: 2}
    layout = models.JSONField(default=dict)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('created_at',)

    def __str__(self):
        return f"{self.title} on {self.dashboard.name}"


class CustomMetric(models.Model):
    """
    User-defined metrics calculated using formulas based on other metrics.
    Example: {{total_revenue}} / {{num_quotes_accepted}}
    """
    name = models.CharField(max_length=255)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='custom_metrics', null=True, blank=True)
    description = models.TextField(blank=True, null=True)
    formula = models.TextField(help_text="Arithmetic formula using {{metric_key}} placeholders")
    variables = models.JSONField(default=list, help_text="List of metrics keys required for this formula")
    unit = models.CharField(max_length=50, blank=True, null=True, help_text="e.g. $, %, pts")
    
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('name',)
        unique_together = ('organization', 'name')

    def __str__(self):
        return f"{self.name} ({self.organization.name})"
