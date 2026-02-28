from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TimeWindowViewSet, ChargeCategoryViewSet, ChargeDefinitionViewSet, EstimateTemplateViewSet,
    TemplateLineItemViewSet, EstimateViewSet, EstimateLineItemViewSet,
    CustomerActivityViewSet, EstimateDocumentViewSet,
    InvoiceViewSet, PaymentReceiptViewSet, AccountingViewSet, FeedbackViewSet,
    WorkOrderViewSet, ContractorEstimateLineItemViewSet,
    TransactionCategoryViewSet, ExpenseViewSet, PurchaseViewSet,
    track_email_open
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
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'payments', PaymentReceiptViewSet, basename='payment')
router.register(r'accounting', AccountingViewSet, basename='accounting')
router.register(r'feedback', FeedbackViewSet, basename='feedback')
router.register(r'work-orders', WorkOrderViewSet, basename='work-orders')
router.register(r'contractor-line-items', ContractorEstimateLineItemViewSet, basename='contractor-line-items')
router.register(r'categories', TransactionCategoryViewSet, basename='transaction-category')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'purchases', PurchaseViewSet, basename='purchase')

urlpatterns = [
    path('track/<str:token>/', track_email_open, name='track_email_open'),
    path('', include(router.urls)),
]
