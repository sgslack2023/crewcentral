from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TimeWindowViewSet, ChargeCategoryViewSet, ChargeDefinitionViewSet, EstimateTemplateViewSet,
    TemplateLineItemViewSet, EstimateViewSet, EstimateLineItemViewSet,
    CustomerActivityViewSet, EstimateDocumentViewSet
)

router = DefaultRouter(trailing_slash=False)
router.register(r'time-windows', TimeWindowViewSet, basename='time-window')
router.register(r'charge-categories', ChargeCategoryViewSet, basename='charge-category')
router.register(r'charge-definitions', ChargeDefinitionViewSet, basename='charge-definition')
router.register(r'estimate-templates', EstimateTemplateViewSet, basename='estimate-template')
router.register(r'template-line-items', TemplateLineItemViewSet, basename='template-line-item')
router.register(r'estimates', EstimateViewSet, basename='estimate')
router.register(r'estimate-line-items', EstimateLineItemViewSet, basename='estimate-line-item')
router.register(r'customer-activities', CustomerActivityViewSet, basename='customer-activity')
router.register(r'estimate-documents', EstimateDocumentViewSet, basename='estimate-document')

urlpatterns = [
    path('', include(router.urls)),
]
