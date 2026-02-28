from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomerViewSet, CustomerStatisticsViewSet, BranchViewSet, 
    ServiceTypeViewSet, DocumentLibraryViewSet, DocumentMappingViewSet,
    MoveTypeViewSet, RoomSizeViewSet, LeadIngestionView,
    EndpointConfigurationViewSet, RawEndpointLeadViewSet,
    ScheduleViewSet
)

router = DefaultRouter(trailing_slash=False)
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'customer-statistics', CustomerStatisticsViewSet, basename='customer-statistics')
router.register(r'branches', BranchViewSet, basename='branch')
router.register(r'service-types', ServiceTypeViewSet, basename='service-type')
router.register(r'documents', DocumentLibraryViewSet, basename='document')
router.register(r'document-mappings', DocumentMappingViewSet, basename='document-mapping')
router.register(r'move-types', MoveTypeViewSet, basename='move-type')
router.register(r'room-sizes', RoomSizeViewSet, basename='room-size')
router.register(r'endpoint-configs', EndpointConfigurationViewSet, basename='endpoint-config')
router.register(r'raw-endpoint-leads', RawEndpointLeadViewSet, basename='raw-endpoint-lead')
router.register(r'schedules', ScheduleViewSet, basename='schedule')

urlpatterns = [
    path('', include(router.urls)),
    path('lead-ingestion', LeadIngestionView.as_view(), name='lead-ingestion'),
    path('lead-ingestion/<int:config_id>', LeadIngestionView.as_view(), name='lead-ingestion-with-id'),
]

