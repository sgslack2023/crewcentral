from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DashboardViewSet, AnalyticsDataView, CustomMetricViewSet

router = DefaultRouter()
router.register(r'dashboards', DashboardViewSet)
router.register(r'custom-metrics', CustomMetricViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('analytics/data/', AnalyticsDataView.as_view(), name='analytics-data'),
]
