from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from crm_back.custom_methods import isAuthenticatedCustom
from crm_back.mixins import OrganizationContextMixin
from .models import SiteVisit, SiteVisitObservation, SiteVisitPhoto
from .serializers import SiteVisitSerializer, SiteVisitObservationSerializer, SiteVisitPhotoSerializer

class SiteVisitViewSet(OrganizationContextMixin, viewsets.ModelViewSet):
    queryset = SiteVisit.objects.all()
    serializer_class = SiteVisitSerializer
    permission_classes = (isAuthenticatedCustom,)

    def get_queryset(self):
        queryset = super().get_queryset()
        customer_id = self.request.query_params.get('customer')
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        
        surveyor_id = self.request.query_params.get('surveyor')
        if surveyor_id:
            queryset = queryset.filter(surveyor_id=surveyor_id)
            
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
            
        return queryset

    def perform_create(self, serializer):
        kwargs = {'created_by': self.request.user}
        if hasattr(self.request, 'organization') and self.request.organization:
            kwargs['organization'] = self.request.organization
        visit = serializer.save(**kwargs)
        
        # Log activity
        try:
            from transactiondata.models import CustomerActivity
            CustomerActivity.objects.create(
                customer=visit.customer,
                activity_type='other',
                title='Site Visit Scheduled',
                description=f'Site visit scheduled for {visit.scheduled_at.strftime("%Y-%m-%d %H:%M")}',
                created_by=self.request.user
            )
        except Exception as e:
            print(f"Failed to log activity: {e}")

    @action(detail=True, methods=['post'])
    def start_visit(self, request, pk=None):
        visit = self.get_object()
        from django.utils import timezone
        visit.status = 'IN_PROGRESS'
        visit.started_at = timezone.now()
        visit.save()
        
        # Log activity
        try:
            from transactiondata.models import CustomerActivity
            CustomerActivity.objects.create(
                customer=visit.customer,
                activity_type='other',
                title='Site Visit Started',
                description=f'Site visit started by {request.user.fullname}',
                created_by=request.user
            )
        except Exception as e:
            print(f"Failed to log activity: {e}")

        return Response(self.get_serializer(visit).data)

    @action(detail=True, methods=['post'])
    def complete_visit(self, request, pk=None):
        visit = self.get_object()
        from django.utils import timezone
        visit.status = 'COMPLETED'
        visit.completed_at = timezone.now()
        visit.save()

        # Log activity
        try:
            from transactiondata.models import CustomerActivity
            CustomerActivity.objects.create(
                customer=visit.customer,
                activity_type='other',
                title='Site Visit Completed',
                description=f'Site visit completed by {request.user.fullname}',
                created_by=request.user
            )
        except Exception as e:
            print(f"Failed to log activity: {e}")

        return Response(self.get_serializer(visit).data)

class SiteVisitObservationViewSet(viewsets.ModelViewSet):
    queryset = SiteVisitObservation.objects.all()
    serializer_class = SiteVisitObservationSerializer
    permission_classes = (isAuthenticatedCustom,)

    def get_queryset(self):
        visit_id = self.request.query_params.get('visit')
        if visit_id:
            return self.queryset.filter(visit_id=visit_id)
        return self.queryset

class SiteVisitPhotoViewSet(viewsets.ModelViewSet):
    queryset = SiteVisitPhoto.objects.all()
    serializer_class = SiteVisitPhotoSerializer
    permission_classes = (isAuthenticatedCustom,)

    def get_queryset(self):
        visit_id = self.request.query_params.get('visit')
        if visit_id:
            return self.queryset.filter(visit_id=visit_id)
        return self.queryset

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)
