from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SiteVisitViewSet, SiteVisitObservationViewSet, SiteVisitPhotoViewSet

router = DefaultRouter()
router.register(r'visits', SiteVisitViewSet)
router.register(r'observations', SiteVisitObservationViewSet)
router.register(r'photos', SiteVisitPhotoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
