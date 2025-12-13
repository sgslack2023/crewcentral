from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomerViewSet, CustomerStatisticsViewSet, BranchViewSet, 
    ServiceTypeViewSet, DocumentLibraryViewSet, DocumentMappingViewSet,
    MoveTypeViewSet, RoomSizeViewSet
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

urlpatterns = [
    path('', include(router.urls)),
]

