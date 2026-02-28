from rest_framework import viewsets, status
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Count, Q, Sum
from django.http import HttpResponse, FileResponse
from io import BytesIO
from crm_back.custom_methods import isAuthenticatedCustom
from crm_back.mixins import OrganizationContextMixin
from .models import (
    ChargeCategory, ChargeDefinition, EstimateTemplate, TemplateLineItem,
    Estimate, EstimateLineItem, CustomerActivity, EstimateDocument, DocumentSigningBatch, TimeWindow,
    Invoice, PaymentReceipt, Feedback, WorkOrder, ContractorEstimateLineItem,
    TransactionCategory, Expense, Purchase, EmailLog
)
from .serializers import (
    ChargeCategorySerializer, ChargeDefinitionSerializer, EstimateTemplateSerializer,
    TemplateLineItemSerializer, EstimateSerializer, EstimateLineItemSerializer,
    ChargeCategorySimpleSerializer, ChargeDefinitionSimpleSerializer, EstimateTemplateSimpleSerializer,
    ChargeCategorySimpleSerializer, ChargeDefinitionSimpleSerializer, EstimateTemplateSimpleSerializer,
    CustomerActivitySerializer, EstimateDocumentSerializer, TimeWindowSerializer, TimeWindowSimpleSerializer,
    InvoiceSerializer, PaymentReceiptSerializer, FeedbackSerializer,
    WorkOrderSerializer, ContractorEstimateLineItemSerializer,
    TransactionCategorySerializer, ExpenseSerializer, PurchaseSerializer
)
from .utils import create_estimate_from_template, calculate_estimate, process_document_template, generate_invoice_pdf
from .email_utils import send_estimate_email, send_document_signature_email, send_invoice_pdf_email, send_receipt_pdf_email
from masterdata.models import Customer
from django.utils import timezone
from rest_framework.permissions import AllowAny
import random
import string
from datetime import date


class TimeWindowViewSet(OrganizationContextMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing time windows
    """
    queryset = TimeWindow.objects.all()
    serializer_class = TimeWindowSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset
    
    def perform_create(self, serializer):
        kwargs = {'created_by': self.request.user}
        if hasattr(self.request, 'organization') and self.request.organization:
            kwargs['organization'] = self.request.organization
        serializer.save(**kwargs)
    
    @action(detail=False, methods=['get'])
    def simple(self, request):
        """
        Get simple list for dropdowns
        """
        windows = TimeWindow.objects.filter(is_active=True)
        serializer = TimeWindowSimpleSerializer(windows, many=True)
        return Response(serializer.data)


class ChargeCategoryViewSet(OrganizationContextMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing charge categories
    """
    queryset = ChargeCategory.objects.all()
    serializer_class = ChargeCategorySerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search)
            )
        
        return queryset
    
    def perform_create(self, serializer):
        kwargs = {'created_by': self.request.user}
        if hasattr(self.request, 'organization') and self.request.organization:
            kwargs['organization'] = self.request.organization
        serializer.save(**kwargs)
    
    @action(detail=False, methods=['get'])
    def simple(self, request):
        """
        Get simple list for dropdowns
        """
        categories = ChargeCategory.objects.filter(is_active=True)
        serializer = ChargeCategorySimpleSerializer(categories, many=True)
        return Response(serializer.data)


class ChargeDefinitionViewSet(OrganizationContextMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing charge definitions
    """
    queryset = ChargeDefinition.objects.all()
    serializer_class = ChargeDefinitionSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # By default, exclude estimate-only charges from configure views
        # unless explicitly requested with include_estimate_only=true
        include_estimate_only = self.request.query_params.get('include_estimate_only', None)
        if include_estimate_only != 'true':
            queryset = queryset.filter(is_estimate_only=False)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by category
        category_id = self.request.query_params.get('category', None)
        if category_id:
            queryset = queryset.filter(category__id=category_id)
        
        # Filter by charge type
        charge_type = self.request.query_params.get('charge_type', None)
        if charge_type:
            queryset = queryset.filter(charge_type=charge_type)
        
        # Filter by applies_to (service type)
        service_type_id = self.request.query_params.get('applies_to', None)
        if service_type_id:
            # Show charges that either apply to this service type OR apply to no specific service types (universal)
            queryset = queryset.filter(Q(applies_to__id=service_type_id) | Q(applies_to__isnull=True)).distinct()
        
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(category__name__icontains=search)
            )
        
        return queryset
    
    def perform_create(self, serializer):
        kwargs = {'created_by': self.request.user}
        if hasattr(self.request, 'organization') and self.request.organization:
            kwargs['organization'] = self.request.organization
        serializer.save(**kwargs)
    
    @action(detail=False, methods=['get'])
    def simple(self, request):
        """
        Get simple list for dropdowns
        """
        charges = ChargeDefinition.objects.filter(is_active=True)
        
        # By default, exclude estimate-only charges unless explicitly requested
        include_estimate_only = self.request.query_params.get('include_estimate_only', None)
        if include_estimate_only != 'true':
            charges = charges.filter(is_estimate_only=False)
        
        # Filter by applies_to if provided (service type)
        service_type_id = self.request.query_params.get('applies_to', None)
        if service_type_id:
            charges = charges.filter(Q(applies_to__id=service_type_id) | Q(applies_to__isnull=True)).distinct()
        
        serializer = ChargeDefinitionSimpleSerializer(charges, many=True)
        return Response(serializer.data)


class EstimateTemplateViewSet(OrganizationContextMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing estimate templates
    """
    queryset = EstimateTemplate.objects.all()
    serializer_class = EstimateTemplateSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by move type
        move_type_id = self.request.query_params.get('move_type', None)
        if move_type_id:
            queryset = queryset.filter(move_type__id=move_type_id)
        
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search)
            )
        
        return queryset
    
    def perform_create(self, serializer):
        kwargs = {'created_by': self.request.user}
        if hasattr(self.request, 'organization') and self.request.organization:
            kwargs['organization'] = self.request.organization
        serializer.save(**kwargs)
    
    @action(detail=False, methods=['get'])
    def simple(self, request):
        """
        Get simple list for dropdowns
        """
        templates = EstimateTemplate.objects.filter(is_active=True)
        
        # Filter by service_type if provided
        service_type_id = self.request.query_params.get('service_type', None)
        if service_type_id:
            templates = templates.filter(service_type__id=service_type_id)
        
        serializer = EstimateTemplateSimpleSerializer(templates, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """
        Duplicate a template with all its line items
        """
        template = self.get_object()
        new_name = request.data.get('name', f"{template.name} (Copy)")
        
        # Create new template
        new_template = EstimateTemplate.objects.create(
            name=new_name,
            service_type=template.service_type,
            description=template.description,
            created_by=request.user
        )
        
        # Copy line items
        for item in template.items.all():
            TemplateLineItem.objects.create(
                template=new_template,
                charge=item.charge,
                rate=item.rate,
                percentage=item.percentage,
                is_editable=item.is_editable,
                display_order=item.display_order
            )
        
        serializer = self.get_serializer(new_template)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TemplateLineItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing template line items
    """
    queryset = TemplateLineItem.objects.all()
    serializer_class = TemplateLineItemSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = TemplateLineItem.objects.all()
        
        # Filter by template
        template_id = self.request.query_params.get('template', None)
        if template_id:
            queryset = queryset.filter(template__id=template_id)
        
        return queryset


class EstimateViewSet(OrganizationContextMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing estimates
    """
    queryset = Estimate.objects.all()
    serializer_class = EstimateSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by customer
        customer_id = self.request.query_params.get('customer', None)
        if customer_id:
            queryset = queryset.filter(customer__id=customer_id)
        
        # Filter by status
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by move type
        move_type_id = self.request.query_params.get('move_type', None)
        if move_type_id:
            queryset = queryset.filter(move_type__id=move_type_id)
        
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(customer__full_name__icontains=search) |
                Q(customer__email__icontains=search) |
                Q(notes__icontains=search)
            )
        
        return queryset
    
    def perform_create(self, serializer):
        kwargs = {'created_by': self.request.user}
        if hasattr(self.request, 'organization') and self.request.organization:
            kwargs['organization'] = self.request.organization
        serializer.save(**kwargs)
    
    @action(detail=False, methods=['post'])
    def create_from_template(self, request):
        """
        Create estimate from template
        POST /estimates/create_from_template/
        {
            "template_id": 1,
            "customer_id": 5,
            "weight_lbs": 5000,
            "labour_hours": 8
        }
        """
        template_id = request.data.get('template_id')
        customer_id = request.data.get('customer_id')
        weight = request.data.get('weight_lbs')
        hours = request.data.get('labour_hours')
        pickup_date_from = request.data.get('pickup_date_from')
        pickup_date_to = request.data.get('pickup_date_to')
        pickup_time_window_id = request.data.get('pickup_time_window')
        delivery_date_from = request.data.get('delivery_date_from')
        delivery_date_to = request.data.get('delivery_date_to')
        delivery_time_window_id = request.data.get('delivery_time_window')
        
        if not template_id or not customer_id:
            return Response(
                {'error': 'template_id and customer_id are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            template = EstimateTemplate.objects.get(id=template_id)
            customer = Customer.objects.get(id=customer_id)
        except (EstimateTemplate.DoesNotExist, Customer.DoesNotExist) as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        
        estimate = create_estimate_from_template(
            template, customer, weight, hours,
            pickup_date_from, pickup_date_to, pickup_time_window_id,
            delivery_date_from, delivery_date_to, delivery_time_window_id,
            request.user, 
            organization=getattr(request, 'organization', None)
        )
        
        # Create activity record
        CustomerActivity.objects.create(
            customer=customer,
            estimate=estimate,
            activity_type='estimate_created',
            title=f'Estimate #{estimate.id} Created',
            description=f'Estimate created using template "{template.name}"',
            created_by=request.user
        )
        
        serializer = self.get_serializer(estimate)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def recalculate(self, request, pk=None):
        """
        Recalculate estimate totals
        POST /estimates/5/recalculate/
        """
        estimate = self.get_object()
        calculate_estimate(estimate)
        serializer = self.get_serializer(estimate)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
        """
        Change estimate status
        POST /estimates/5/change_status/
        {"status": "sent"}
        """
        estimate = self.get_object()
        new_status = request.data.get('status')
        
        if not new_status:
            return Response(
                {'error': 'status is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate status choice
        valid_statuses = [choice[0] for choice in Estimate._meta.get_field('status').choices]
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        estimate.status = new_status
        estimate.save()
        
        # Create activity record for status change
        activity_titles = {
            'sent': 'Estimate Sent to Customer',
            'approved': 'Estimate Approved by Customer',
            'rejected': 'Estimate Rejected by Customer'
        }
        
        if new_status in activity_titles:
            CustomerActivity.objects.create(
                customer=estimate.customer,
                estimate=estimate,
                activity_type=f'estimate_{new_status}',
                title=activity_titles[new_status],
                description=f'Estimate #{estimate.id} status changed to {new_status}',
                created_by=request.user
            )
        
        serializer = self.get_serializer(estimate)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def convert_to_work_order(self, request, pk=None):
        """
        Convert approved estimate to an internal work order
        """
        estimate = self.get_object()
        
        # Check if internal work order already exists
        if WorkOrder.objects.filter(estimate=estimate, work_order_type='internal').exists():
            return Response({'error': 'Internal work order already exists for this estimate'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Create Main WorkOrder Entry (Snapshotting all fields)
        work_order = WorkOrder.objects.create(
            organization=estimate.organization,
            estimate=estimate,
            work_order_type='internal',
            status='pending',
            
            # Snapshots
            service_type=estimate.service_type,
            weight_lbs=estimate.weight_lbs,
            labour_hours=estimate.labour_hours,
            pickup_date_from=estimate.pickup_date_from,
            pickup_date_to=estimate.pickup_date_to,
            pickup_time_window=estimate.pickup_time_window,
            delivery_date_from=estimate.delivery_date_from,
            delivery_date_to=estimate.delivery_date_to,
            delivery_time_window=estimate.delivery_time_window,
            notes=estimate.notes,
            
            created_by=request.user
        )
        
        # Copy Line Items
        for item in estimate.items.all():
            ContractorEstimateLineItem.objects.create(
                work_order=work_order,
                estimate_item=item,
                description=item.charge_name or (item.charge.name if item.charge else "Unknown Charge"),
                quantity=item.quantity,
                contractor_rate=0,
                is_active=True
            )
            
        # Update Estimate Status
        estimate.status = 'work_order'
        estimate.save(update_fields=['status', 'updated_at'])
        
        # Create activity record
        CustomerActivity.objects.create(
            customer=estimate.customer,
            estimate=estimate,
            activity_type='other',
            title='Estimate Converted to Work Order',
            description=f'Estimate #{estimate.id} status changed to work_order and internal work order created.',
            created_by=request.user
        )
        
        return Response(WorkOrderSerializer(work_order).data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """
        Duplicate an estimate
        """
        estimate = self.get_object()
        
        # Create new estimate
        new_estimate = Estimate.objects.create(
            customer=estimate.customer,
            organization=estimate.organization,
            template_used=estimate.template_used,
            service_type=estimate.service_type,
            weight_lbs=estimate.weight_lbs,
            labour_hours=estimate.labour_hours,
            notes=f"Copy of Estimate #{estimate.id}",
            created_by=request.user
        )
        
        # Copy line items
        for item in estimate.items.all():
            EstimateLineItem.objects.create(
                estimate=new_estimate,
                charge=item.charge,
                charge_name=item.charge_name,
                charge_type=item.charge_type,
                rate=item.rate,
                percentage=item.percentage,
                quantity=item.quantity,
                display_order=item.display_order
            )
        
        # Recalculate
        calculate_estimate(new_estimate)
        
        serializer = self.get_serializer(new_estimate)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def send_to_customer(self, request, pk=None):
        """
        Send estimate to customer via email
        POST /estimates/5/send_to_customer/
        """
        estimate = self.get_object()
        
        base_url = request.data.get('base_url', 'http://127.0.0.1:3000')
        backend_base_url = request.data.get('backend_base_url', None)
        # If not provided, try to get from request
        if backend_base_url is None and hasattr(request, 'build_absolute_uri'):
            try:
                backend_base_url = request.build_absolute_uri('/')[:-1]  # Remove trailing slash
            except:
                pass
        
        success, message = send_estimate_email(estimate, base_url, backend_base_url)
        
        if success:
            # Create activity
            CustomerActivity.objects.create(
                customer=estimate.customer,
                estimate=estimate,
                activity_type='estimate_sent',
                title=f'Estimate #{estimate.id} Sent to Customer',
                description=f'Estimate emailed to {estimate.customer.email}',
                created_by=request.user
            )
            
            serializer = self.get_serializer(estimate)
            return Response({
                'success': True,
                'message': message,
                'estimate': serializer.data
            })
        else:
            return Response({
                'success': False,
                'message': message
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def public_view(self, request):
        """
        Public estimate view by token (no authentication required)
        GET /estimates/public_view/?token=xxx
        Allows viewing approved estimates (link_active check removed for approved status)
        """
        token = request.query_params.get('token')
        
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Allow viewing if link is active OR if estimate is approved (approved estimates can always be viewed)
            estimate = Estimate.objects.get(
                public_token=token
            )
            
            # Check if link is active OR estimate is approved
            if not estimate.link_active and estimate.status != 'approved':
                return Response({
                    'error': 'Invalid or expired link'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Track customer view
            if not estimate.customer_viewed_at:
                estimate.customer_viewed_at = timezone.now()
                estimate.save()
            
            serializer = self.get_serializer(estimate)
            return Response(serializer.data)
        except Estimate.DoesNotExist:
            return Response({
                'error': 'Invalid or expired link'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def download_pdf(self, request):
        """
        Download estimate as PDF (public access via token)
        GET /estimates/download_pdf/?token=xxx
        Returns PDF file (always works, even after approval)
        """
        token = request.query_params.get('token')
        
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Allow PDF download even after approval (no link_active check)
            estimate = Estimate.objects.select_related('customer', 'service_type').prefetch_related('items__charge').get(
                public_token=token
            )
            
            # Get line items
            line_items = estimate.items.all().order_by('display_order', 'id')
            
            # Get job number for display
            job_number = estimate.customer.job_number if estimate.customer and estimate.customer.job_number else None
            job_number_display = f" - Job Number: {job_number}" if job_number else ""
            
            # Build HTML for PDF
            html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Baltic Van Lines{job_number_display}</title>
    <style>
        @media print {{
            @page {{
                margin: 20mm;
            }}
        }}
        body {{
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }}
        .header {{
            background-color: #1890ff;
            color: white;
            padding: 20px;
            text-align: center;
            margin-bottom: 20px;
        }}
        .header h1 {{
            margin: 0;
            font-size: 24px;
        }}
        .estimate-info {{
            margin-bottom: 20px;
        }}
        .estimate-info h2 {{
            margin: 0 0 10px 0;
            color: #333;
        }}
        .customer-info {{
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }}
        .line-items {{
            margin: 20px 0;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }}
        th, td {{
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
        }}
        th {{
            background-color: #f0f0f0;
            font-weight: bold;
        }}
        .total-row {{
            background-color: #f9f9f9;
            font-weight: bold;
        }}
        .footer {{
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 12px;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Baltic Van Lines</h1>
        <div>Estimate</div>
    </div>
    
    <div class="estimate-info">
        <h2>Baltic Van Lines{job_number_display}</h2>
        <p><strong>Issue Date:</strong> {estimate.created_at.strftime('%B %d, %Y') if estimate.created_at else 'N/A'}</p>
    </div>
    
    <div class="customer-info">
        <h3>Customer Information</h3>
        <p><strong>Name:</strong> {estimate.customer.full_name if estimate.customer else 'N/A'}</p>
        {f'<p><strong>Job Number:</strong> {job_number}</p>' if job_number else ''}
        {f'<p><strong>Service Type:</strong> {estimate.service_type.service_type}</p>' if estimate.service_type else ''}
    </div>
    
    <div class="line-items">
        <h3>Estimate Breakdown</h3>
        <table>
            <thead>
                <tr>
                    <th>Charge</th>
                    <th>Type</th>
                    <th>Rate</th>
                    <th>Quantity</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
"""
            
            for item in line_items:
                charge_name = item.charge.name if item.charge else 'N/A'
                charge_type = item.charge_type.replace('_', ' ').title() if item.charge_type else 'N/A'
                rate = f"${float(item.rate):.2f}" if item.rate and item.charge_type != 'percent' else '-'
                percentage = f"{float(item.percentage):.2f}%" if item.percentage and item.charge_type == 'percent' else '-'
                quantity = f"{float(item.quantity):.2f}" if item.quantity else '1.00'
                amount = f"${float(item.amount):.2f}" if item.amount else '$0.00'
                
                html_content += f"""
                <tr>
                    <td>{charge_name}</td>
                    <td>{charge_type}</td>
                    <td>{rate if rate != '-' else percentage}</td>
                    <td>{quantity}</td>
                    <td>{amount}</td>
                </tr>
"""
            
            html_content += f"""
            </tbody>
            <tfoot>
                <!-- Subtotal Row -->
                <tr style="background-color: #fafafa;">
                    <td colspan="4" style="text-align: right;"><strong>Subtotal:</strong></td>
                    <td><strong>${float(estimate.subtotal):.2f}</strong></td>
                </tr>
"""
            
            # Add discount row if discount exists
            if estimate.discount_amount and float(estimate.discount_amount) > 0:
                discount_display = f"({estimate.discount_value}%)" if estimate.discount_type == 'percent' and estimate.discount_value else ""
                html_content += f"""
                <!-- Discount Row -->
                <tr style="background-color: #fff1f0;">
                    <td colspan="4" style="text-align: right; color: #cf1322;"><strong>Discount {discount_display}:</strong></td>
                    <td style="color: #cf1322;"><strong>-${float(estimate.discount_amount):.2f}</strong></td>
                </tr>
"""
            
            # Add tax row if tax exists
            if estimate.tax_amount and float(estimate.tax_amount) > 0:
                html_content += f"""
                <!-- Tax Row -->
                <tr style="background-color: #fff7e6;">
                    <td colspan="4" style="text-align: right; color: #d46b08;"><strong>Sales Tax ({float(estimate.tax_percentage):.2f}%):</strong></td>
                    <td style="color: #d46b08;"><strong>${float(estimate.tax_amount):.2f}</strong></td>
                </tr>
"""
            
            html_content += f"""
                <!-- Total Row -->
                <tr class="total-row" style="background-color: #f6ffed;">
                    <td colspan="4" style="text-align: right;"><strong>Total Amount:</strong></td>
                    <td><strong style="color: #52c41a;">${float(estimate.total_amount):.2f}</strong></td>
                </tr>
            </tfoot>
        </table>
    </div>
    
    <div class="footer">
        <p>Baltic Van Lines</p>
        <p>6685 Kennedy Rd, Mississauga, ON L5T 3A5</p>
        <p>Phone: (123) 555-1234 | Email: Info@BalticVanLines.ca</p>
        <p>balticvanlines.ca</p>
    </div>
</body>
</html>
"""
            
            # Try to generate PDF using xhtml2pdf (pisa)
            try:
                from xhtml2pdf import pisa
                from .utils import convert_images_to_base64
                
                # Convert any external images to base64 for PDF rendering
                html_content = convert_images_to_base64(html_content)
                
                # Generate PDF from HTML
                pdf_buffer = BytesIO()
                pisa_status = pisa.CreatePDF(
                    html_content,
                    dest=pdf_buffer,
                    encoding='utf-8'
                )
                
                if pisa_status.err:
                    # If PDF generation fails, fall through to HTML fallback
                    raise Exception("PDF generation failed")
                
                pdf_bytes = pdf_buffer.getvalue()
                
                # Create filename with job number or fallback
                if job_number:
                    filename = f"Estimate_{job_number}.pdf"
                else:
                    filename = "Estimate.pdf"
                
                # Return PDF as file response
                pdf_buffer = BytesIO(pdf_bytes)
                response = FileResponse(pdf_buffer, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
                return response
                
            except ImportError:
                # Fallback to HTML if WeasyPrint is not installed
                if job_number:
                    filename = f"Estimate_{job_number}.html"
                else:
                    filename = "Estimate.html"
                
                response = HttpResponse(html_content, content_type='text/html')
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
                return response
            except Exception as e:
                # If PDF generation fails, return HTML as fallback
                if job_number:
                    filename = f"Estimate_{job_number}.html"
                else:
                    filename = "Estimate.html"
                
                response = HttpResponse(html_content, content_type='text/html')
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
                return response
            
        except Estimate.DoesNotExist:
            return Response({
                'error': 'Invalid or expired link'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def customer_approve(self, request):
        """
        Customer approves estimate via public link
        POST /estimates/customer_approve/
        {"token": "xxx"}
        """
        token = request.data.get('token')
        
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            estimate = Estimate.objects.get(public_token=token, link_active=True)
            
            if estimate.status == 'approved':
                return Response({'error': 'Estimate already approved'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Update estimate
            estimate.status = 'approved'
            estimate.customer_responded_at = timezone.now()
            # Keep link_active=True so PDF download and view still work after approval
            estimate.save()
            
            # Create activity
            CustomerActivity.objects.create(
                customer=estimate.customer,
                estimate=estimate,
                activity_type='estimate_approved',
                title=f'Estimate #{estimate.id} Approved by Customer',
                description=f'{estimate.customer.full_name} approved the estimate',
                created_by=None
            )
            
            serializer = self.get_serializer(estimate)
            return Response({
                'success': True,
                'message': 'Estimate approved successfully',
                'estimate': serializer.data
            })
        except Estimate.DoesNotExist:
            return Response({
                'error': 'Invalid or expired link'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def customer_reject(self, request):
        """
        Customer rejects estimate via public link
        POST /estimates/customer_reject/
        {"token": "xxx", "reason": "optional reason"}
        """
        token = request.data.get('token')
        reason = request.data.get('reason', '')
        
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            estimate = Estimate.objects.get(public_token=token, link_active=True)
            
            if estimate.status in ['approved', 'rejected']:
                return Response({
                    'error': f'Estimate already {estimate.status}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update estimate
            estimate.status = 'rejected'
            estimate.customer_responded_at = timezone.now()
            estimate.link_active = False  # Deactivate link
            if reason:
                estimate.notes = f"{estimate.notes}\n\nRejection reason: {reason}".strip()
            estimate.save()
            
            # Create activity
            CustomerActivity.objects.create(
                customer=estimate.customer,
                estimate=estimate,
                activity_type='estimate_rejected',
                title=f'Estimate #{estimate.id} Rejected by Customer',
                description=f'{estimate.customer.full_name} rejected the estimate. {reason}',
                created_by=None
            )
            
            serializer = self.get_serializer(estimate)
            return Response({
                'success': True,
                'message': 'Estimate rejected',
                'estimate': serializer.data
            })
        except Estimate.DoesNotExist:
            return Response({
                'error': 'Invalid or expired link'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def send_documents_for_signature(self, request, pk=None):
        """
        Send documents for customer signature
        POST /estimates/5/send_documents_for_signature/
        """
        estimate = self.get_object()
        
        base_url = request.data.get('base_url', 'http://127.0.0.1:3000')
        success, message = send_document_signature_email(estimate, base_url)
        
        if success:
            # Create activity
            CustomerActivity.objects.create(
                customer=estimate.customer,
                estimate=estimate,
                activity_type='other',
                title=f'Documents Sent for Signature',
                description=f'Signature request sent to {estimate.customer.email}',
                created_by=request.user
            )
            
            return Response({
                'success': True,
                'message': message
            })
        else:
            return Response({
                'success': False,
                'message': message
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def generate_work_order(self, request, pk=None):
        """
        Generate a work order for the assigned contractor
        POST /estimates/5/generate_work_order/
        """
        estimate = self.get_object()
        if not estimate.assigned_contractor:
            return Response({
                'success': False,
                'message': 'No contractor assigned to this estimate.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create WorkOrder
        work_order, created = WorkOrder.objects.get_or_create(
            estimate=estimate,
            contractor=estimate.assigned_contractor,
            defaults={
                'organization': estimate.organization,
                'created_by': request.user,
                'status': 'pending',
                'work_order_template': estimate.work_order_template
            }
        )
        
        if created:
            # Copy line items
            for item in estimate.items.all():
                ContractorEstimateLineItem.objects.create(
                    work_order=work_order,
                    estimate_item=item,
                    description=item.charge_name,
                    quantity=item.quantity,
                    contractor_rate=0 # Default to 0, user can edit
                )
        
        serializer = WorkOrderSerializer(work_order, context={'request': request})
        return Response({
            'success': True,
            'message': 'Work order generated successfully' if created else 'Work order already exists',
            'data': serializer.data
        })


class EstimateLineItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing estimate line items
    """
    queryset = EstimateLineItem.objects.all()
    serializer_class = EstimateLineItemSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = EstimateLineItem.objects.all()
        
        # Filter by estimate
        estimate_id = self.request.query_params.get('estimate', None)
        if estimate_id:
            queryset = queryset.filter(estimate__id=estimate_id)
        
        return queryset
    
    def perform_create(self, serializer):
        # Save the line item first
        line_item = serializer.save()
        
        # Recalculate the estimate after creating line item
        calculate_estimate(line_item.estimate)
    
    def perform_update(self, serializer):
        # Mark as user modified when updated
        serializer.save(is_user_modified=True)
        
        # Recalculate the estimate after updating line item
        line_item = serializer.instance
        calculate_estimate(line_item.estimate)
    
    def perform_destroy(self, instance):
        # Store estimate reference before deletion
        estimate = instance.estimate
        
        # Delete the line item
        instance.delete()
        
        # Recalculate the estimate after deleting line item
        calculate_estimate(estimate)


class CustomerActivityViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing customer activities
    """
    queryset = CustomerActivity.objects.all()
    serializer_class = CustomerActivitySerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = CustomerActivity.objects.all()
        
        # Filter by customer
        customer_id = self.request.query_params.get('customer', None)
        if customer_id:
            queryset = queryset.filter(customer__id=customer_id)
        
        # Filter by activity type
        activity_type = self.request.query_params.get('activity_type', None)
        if activity_type:
            queryset = queryset.filter(activity_type=activity_type)
        
        # Filter by estimate
        estimate_id = self.request.query_params.get('estimate', None)
        if estimate_id:
            queryset = queryset.filter(estimate__id=estimate_id)
        
        return queryset
    
    def perform_create(self, serializer):
        kwargs = {'created_by': self.request.user}
        if hasattr(self.request, 'organization') and self.request.organization:
            kwargs['organization'] = self.request.organization
        serializer.save(**kwargs)


class EstimateDocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing estimate documents
    """
    queryset = EstimateDocument.objects.all()
    serializer_class = EstimateDocumentSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def get_queryset(self):
        queryset = EstimateDocument.objects.all()
        
        # Filter by estimate
        estimate_id = self.request.query_params.get('estimate', None)
        if estimate_id:
            queryset = queryset.filter(estimate__id=estimate_id)
        
        return queryset
    
    def get_permissions(self):
        # Allow public access for by_token, sign_document, and submit_document actions
        if self.action in ['by_token', 'sign_document', 'submit_document']:
            return [AllowAny()]
        return super().get_permissions()
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def by_token(self, request):
        """
        Get documents for an estimate by signing token (SEPARATE from estimate token)
        GET /estimate-documents/by_token/?token=xxx
        """
        token = request.query_params.get('token')
        
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            batch = DocumentSigningBatch.objects.get(signing_token=token, link_active=True)
            documents = EstimateDocument.objects.filter(estimate=batch.estimate)
            serializer = self.get_serializer(documents, many=True)
            return Response(serializer.data)
        except DocumentSigningBatch.DoesNotExist:
            return Response({'error': 'Invalid or expired link'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def sign_document(self, request, pk=None):
        """
        Customer signs a single signature field in a document (supports multiple signatures)
        POST /estimate-documents/{id}/sign_document/
        {"signature": "base64_image_data", "signature_index": 0, "token": "xxx"}
        """
        estimate_document = self.get_object()
        signature = request.data.get('signature')
        signature_index = request.data.get('signature_index', 0)
        token = request.data.get('token')
        
        if not signature:
            return Response({'error': 'Signature is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify token matches document signing batch (NOT estimate token)
        try:
            batch = DocumentSigningBatch.objects.get(estimate=estimate_document.estimate, signing_token=token, link_active=True)
        except DocumentSigningBatch.DoesNotExist:
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_403_FORBIDDEN)
        
        # Load existing signatures (stored as JSON)
        import json
        signatures = {}
        if estimate_document.customer_signature:
            try:
                signatures = json.loads(estimate_document.customer_signature)
            except:
                signatures = {}
        
        # Add/update this signature
        signatures[str(signature_index)] = signature
        
        # Save signatures as JSON
        estimate_document.customer_signature = json.dumps(signatures)
        
        # Mark as viewed if first time
        if not estimate_document.customer_viewed:
            estimate_document.customer_viewed = True
            estimate_document.customer_viewed_at = timezone.now()
        
        estimate_document.save()
        
        serializer = self.get_serializer(estimate_document)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def fill_textbox(self, request, pk=None):
        """
        Customer fills a single text box field in a document (supports multiple text boxes)
        POST /estimate-documents/{id}/fill_textbox/
        {"text": "user input text", "textbox_index": 0, "token": "xxx"}
        """
        estimate_document = self.get_object()
        text = request.data.get('text')
        textbox_index = request.data.get('textbox_index', 0)
        token = request.data.get('token')
        
        if text is None:
            return Response({'error': 'Text is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify token matches document signing batch (NOT estimate token)
        try:
            batch = DocumentSigningBatch.objects.get(estimate=estimate_document.estimate, signing_token=token, link_active=True)
        except DocumentSigningBatch.DoesNotExist:
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_403_FORBIDDEN)
        
        # Load existing text inputs (stored as JSON)
        import json
        text_inputs = {}
        if estimate_document.customer_text_inputs:
            try:
                text_inputs = json.loads(estimate_document.customer_text_inputs)
            except:
                text_inputs = {}
        
        # Add/update this text input
        text_inputs[str(textbox_index)] = text
        
        # Save text inputs as JSON
        estimate_document.customer_text_inputs = json.dumps(text_inputs)
        
        # Mark as viewed if first time
        if not estimate_document.customer_viewed:
            estimate_document.customer_viewed = True
            estimate_document.customer_viewed_at = timezone.now()
        
        estimate_document.save()
        
        serializer = self.get_serializer(estimate_document)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """
        Download the document as a server-side generated PDF
        GET /estimate-documents/{id}/download_pdf/?token=xxx (public token for signing, no auth)
        OR GET /estimate-documents/{id}/download_pdf/ (authenticated user)
        """
        estimate_document = self.get_object()
        
        # Get the processed content (replaces all tags including {{estimate_line_items_table}})
        serializer = self.get_serializer(estimate_document)
        html_content = serializer.data.get('processed_content')
        
        if not html_content:
            return Response({'error': 'Document content is not available or not an HTML document'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Remove problematic Unicode characters that render as black boxes in xhtml2pdf
        import re
        # Remove zero-width spaces, BOM, and other invisible characters
        html_content = re.sub(r'[\u200b-\u200f\u2028-\u202f\ufeff]', '', html_content)
        # Remove any remaining control characters except newlines and tabs
        html_content = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f]', '', html_content)
        
        # Build full HTML for PDF rendering (simplified for xhtml2pdf compatibility)
        full_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page {{
            size: A4;
            margin: 20mm;
        }}
        body {{
            font-family: Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #000000;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }}
        th, td {{
            border: 1px solid #000000;
            padding: 8px;
            text-align: left;
            vertical-align: top;
        }}
        th {{
            background-color: #f4f4f4;
            font-weight: bold;
        }}
        img {{
            max-width: 100%;
        }}
    </style>
</head>
<body>
{html_content}
</body>
</html>"""
        
        # Generate PDF using xhtml2pdf
        try:
            from xhtml2pdf import pisa
            from .utils import convert_images_to_base64
            
            # Convert images to base64
            full_html = convert_images_to_base64(full_html)
            
            pdf_buffer = BytesIO()
            pisa_status = pisa.CreatePDF(
                full_html,
                dest=pdf_buffer,
                encoding='utf-8'
            )
            
            if pisa_status.err:
                # Return HTML as fallback for debugging
                response = HttpResponse(full_html, content_type='text/html')
                response['Content-Disposition'] = 'attachment; filename="debug.html"'
                return response
            
            pdf_bytes = pdf_buffer.getvalue()
            
            if len(pdf_bytes) == 0:
                return Response({'error': 'PDF generation produced empty file'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Create filename with document title and customer name
            doc_title = estimate_document.document.title.replace(' ', '_').replace('/', '_').replace('\\', '_')
            if estimate_document.estimate and estimate_document.estimate.customer:
                customer_name = estimate_document.estimate.customer.full_name.replace(' ', '_').replace('/', '_').replace('\\', '_')
            else:
                customer_name = "Customer"
            
            # Format: DocumentTitle_CustomerName.pdf
            filename = f"{doc_title}_{customer_name}.pdf"
            
            # Return PDF
            pdf_buffer.seek(0)
            response = FileResponse(pdf_buffer, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
            
        except ImportError:
            return Response({'error': 'PDF library not available'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({'error': f'PDF generation error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def send_request(self, request, pk=None):
        """
        Send document signature request email
        POST /estimate-documents/5/send_request/
        """
        doc = self.get_object()
        base_url = request.data.get('base_url', 'http://127.0.0.1:3000')
        
        # Create a batch if not exists
        batch, created = DocumentSigningBatch.objects.get_or_create(
            estimate=doc.estimate,
            link_active=True,
            defaults={'created_by': request.user}
        )
        
        # Async task
        from django_q.tasks import async_task
        async_task('transactiondata.tasks.process_document_signing', doc.estimate.id, base_url)
        
        return Response({'message': 'Signature request email queued'})

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def submit_document(self, request, pk=None):
        """
        Final submit after all signatures are filled
        POST /estimate-documents/{id}/submit_document/
        {"token": "xxx"}
        """
        estimate_document = self.get_object()
        token = request.data.get('token')
        
        # Verify token
        try:
            batch = DocumentSigningBatch.objects.get(estimate=estimate_document.estimate, signing_token=token, link_active=True)
        except DocumentSigningBatch.DoesNotExist:
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_403_FORBIDDEN)
        
        # Mark as signed
        estimate_document.customer_signed = True
        estimate_document.customer_signed_at = timezone.now()
        estimate_document.save()
        
        # Create activity
        CustomerActivity.objects.create(
            customer=estimate_document.estimate.customer,
            estimate=estimate_document.estimate,
            activity_type='other',
            title=f'Document Signed: {estimate_document.document.title}',
            description=f'Customer completed all signatures for {estimate_document.document.title}',
            created_by=None
        )
        
        serializer = self.get_serializer(estimate_document)
        return Response(serializer.data)


class InvoiceViewSet(OrganizationContextMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing invoices
    """
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by customer
        customer_id = self.request.query_params.get('customer', None)
        if customer_id:
            queryset = queryset.filter(customer__id=customer_id)
            
        # Filter by estimate
        estimate_id = self.request.query_params.get('estimate', None)
        if estimate_id:
            queryset = queryset.filter(estimate__id=estimate_id)
            
        return queryset
        
    def perform_create(self, serializer):
        kwargs = {'created_by': self.request.user}
        if hasattr(self.request, 'organization') and self.request.organization:
            kwargs['organization'] = self.request.organization
        serializer.save(**kwargs)

    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def download_pdf(self, request, pk=None):
        """
        Download invoice as PDF. Supports token-based access for easy viewing.
        """
        from django.http import FileResponse
        # Get invoice regardless of org for public link if token is valid
        try:
            invoice = Invoice.objects.get(pk=pk)
        except Invoice.DoesNotExist:
            return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)
            
        token = request.query_params.get('token')
        # Allow access if authenticated OR if correct estimate token is provided
        is_authenticated = request.user and request.user.is_authenticated
        is_token_valid = token and invoice.estimate and invoice.estimate.public_token == token
        
        if not (is_authenticated or is_token_valid):
            return Response({'error': 'Authentication required or invalid token'}, status=status.HTTP_403_FORBIDDEN)
            
        if not invoice.pdf_file:
            from .utils import generate_invoice_pdf
            success = generate_invoice_pdf(invoice)
            if not success:
                return Response({'error': 'PDF not generated'}, status=status.HTTP_404_NOT_FOUND)
        
        return FileResponse(invoice.pdf_file.open('rb'), content_type='application/pdf')

    @action(detail=True, methods=['post'])
    def send_to_customer(self, request, pk=None):
        """
        Send invoice to customer via email
        """
        invoice = self.get_object()
        success, message = send_invoice_pdf_email(invoice)
        if success:
            return Response({'message': message})
        return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)


class PaymentReceiptViewSet(OrganizationContextMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing payments
    """
    queryset = PaymentReceipt.objects.all()
    serializer_class = PaymentReceiptSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by invoice
        invoice_id = self.request.query_params.get('invoice', None)
        if invoice_id:
            queryset = queryset.filter(invoice__id=invoice_id)
            
        return queryset
    
    def perform_create(self, serializer):
        kwargs = {'created_by': self.request.user}
        if hasattr(self.request, 'organization') and self.request.organization:
            kwargs['organization'] = self.request.organization
        serializer.save(**kwargs)

    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def download_pdf(self, request, pk=None):
        """
        Download payment receipt as PDF. Supports token-based access for easy viewing.
        """
        from django.http import FileResponse
        try:
            receipt = PaymentReceipt.objects.get(pk=pk)
        except PaymentReceipt.DoesNotExist:
            return Response({'error': 'Receipt not found'}, status=status.HTTP_404_NOT_FOUND)
            
        token = request.query_params.get('token')
        # Allow access if authenticated OR if correct estimate token is provided via its invoice
        is_authenticated = request.user and request.user.is_authenticated
        is_token_valid = token and receipt.invoice and receipt.invoice.estimate and receipt.invoice.estimate.public_token == token
        
        if not (is_authenticated or is_token_valid):
            return Response({'error': 'Authentication required or invalid token'}, status=status.HTTP_403_FORBIDDEN)

        if not receipt.pdf_file:
            from .utils import generate_payment_receipt_pdf
            success = generate_payment_receipt_pdf(receipt)
            if not success:
                return Response({'error': 'PDF not generated'}, status=status.HTTP_404_NOT_FOUND)
        
        return FileResponse(receipt.pdf_file.open('rb'), content_type='application/pdf')

    @action(detail=True, methods=['post'])
    def send_to_customer(self, request, pk=None):
        """
        Send payment receipt to customer via email
        """
        receipt = self.get_object()
        success, message = send_receipt_pdf_email(receipt)
        if success:
            return Response({'message': message})
        return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)


class AccountingViewSet(viewsets.ViewSet):
    """
    ViewSet for accounting statistics and aggregations
    """
    permission_classes = (isAuthenticatedCustom,)
    
    def list(self, request):
        """
        Get overall accounting dashboard stats
        """
        # Filter by org
        invoices = Invoice.objects.all()
        if hasattr(request, 'organization') and request.organization:
            invoices = invoices.filter(organization=request.organization)
            
        valid_invoices = invoices.exclude(status__in=['draft', 'void'])
        overall_balance = valid_invoices.aggregate(sum=Sum('balance_due'))['sum'] or 0
        
        # Monthly Stats (for current month)
        now = timezone.now()
        current_month_invoices = valid_invoices.filter(issue_date__month=now.month, issue_date__year=now.year)
        monthly_billed = current_month_invoices.aggregate(sum=Sum('total_amount'))['sum'] or 0
        
        # Payments for current month
        payments = PaymentReceipt.objects.all()
        if hasattr(request, 'organization') and request.organization:
            payments = payments.filter(organization=request.organization)
            
        monthly_collected = payments.filter(payment_date__month=now.month, payment_date__year=now.year).aggregate(sum=Sum('amount'))['sum'] or 0
        
        return Response({
            "overall_balance": overall_balance,
            "current_month": {
                "billed": monthly_billed,
                "collected": monthly_collected,
                "month": now.month,
                "year": now.year
            }
        })

    @action(detail=False, methods=['get'])
    def by_customer(self, request):
        """
        Get balances grouped by customer
        """
        invoices = Invoice.objects.all()
        if hasattr(request, 'organization') and request.organization:
            invoices = invoices.filter(organization=request.organization)
            
        # Group by customer and sum balance_due
        # We also need customer name
        balances = invoices.exclude(status__in=['draft', 'void']).values('customer__id', 'customer__full_name').annotate(
            total_balance=Sum('balance_due'),
            invoice_count=Count('id')
        ).filter(total_balance__gt=0).order_by('-total_balance')
        
        return Response(balances)


class FeedbackViewSet(OrganizationContextMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing customer feedback/reviews
    """
    queryset = Feedback.objects.all()
    serializer_class = FeedbackSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by customer
        customer_id = self.request.query_params.get('customer', None)
        if customer_id:
            queryset = queryset.filter(customer__id=customer_id)
            
        return queryset
        
    def perform_create(self, serializer):
        kwargs = {'created_by': self.request.user}
        if hasattr(self.request, 'organization') and self.request.organization:
            kwargs['organization'] = self.request.organization
        serializer.save(**kwargs)

    @action(detail=True, methods=['post'])
    def send_request(self, request, pk=None):
        """
        Send feedback request email to customer
        POST /feedback/5/send_request/
        """
        feedback = self.get_object()
        
        base_url = request.data.get('base_url', 'http://127.0.0.1:3000')
        from .email_utils import send_feedback_email
        
        success, message = send_feedback_email(feedback, base_url)
        
        if success:
            feedback.status = 'requested'
            feedback.request_sent_at = timezone.now()
            feedback.save()
            return Response({'message': message})
        else:
            return Response({'error': message}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def submit_public(self, request):
        """
        Public endpoint to submit feedback
        POST /feedback/submit_public/
        {
            "token": "xxx",
            "rating": 5,
            "comment": "Great!",
            "source": "Web"
        }
        """
        token = request.data.get('token')
        rating = request.data.get('rating')
        comment = request.data.get('comment', '')
        
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            feedback = Feedback.objects.get(public_token=token)
            
            # Update feedback
            feedback.rating = rating
            feedback.comment = comment
            feedback.source = request.data.get('source', 'Web')
            feedback.status = 'received'
            feedback.save()
            
            # Log activity if customer exists
            if feedback.customer:
                CustomerActivity.objects.create(
                    customer=feedback.customer,
                    activity_type='feedback_received',
                    title='Customer Feedback Received',
                    description=f'Customer rated {rating}/5 stars. Comment: {comment}',
                    # No user for public feedback
                )
                
            # Include Google Business link in response for redirection logic
            google_link = feedback.organization.google_business_link if feedback.organization else None
                
            return Response({
                'message': 'Feedback received successfully',
                'google_business_link': google_link
            })
            
        except Feedback.DoesNotExist:
            return Response({'error': 'Invalid token'}, status=status.HTTP_404_NOT_FOUND)


class WorkOrderViewSet(OrganizationContextMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing contractor work orders
    """
    queryset = WorkOrder.objects.all()
    serializer_class = WorkOrderSerializer
    permission_classes = (isAuthenticatedCustom,)

    def get_queryset(self):
        queryset = super().get_queryset()
        
        estimate_id = self.request.query_params.get('estimate_id', None)
        if estimate_id:
            queryset = queryset.filter(estimate_id=estimate_id)
            
        contractor_id = self.request.query_params.get('contractor_id', None)
        if contractor_id:
            queryset = queryset.filter(contractor_id=contractor_id)
            
        return queryset

    def perform_create(self, serializer):
        kwargs = {'created_by': self.request.user}
        if hasattr(self.request, 'organization') and self.request.organization:
            kwargs['organization'] = self.request.organization
        serializer.save(**kwargs)

    @action(detail=True, methods=['post'], permission_classes=[isAuthenticatedCustom])
    def share(self, request, pk=None):
        """Generate a public token for contractor sharing"""
        work_order = self.get_object()
        if not work_order.public_token:
            import uuid
            work_order.public_token = str(uuid.uuid4())
            work_order.save(update_fields=['public_token'])
        
        return Response({
            'message': 'Work order sharing link generated',
            'public_token': work_order.public_token
        })

    @action(detail=True, methods=['patch'], permission_classes=[isAuthenticatedCustom])
    def update_status(self, request, pk=None):
        """Specifically update work order status and log activity"""
        work_order = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in dict(WorkOrder.STATUS_CHOICES):
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
            
        work_order.status = new_status
        work_order.save(update_fields=['status', 'updated_at'])
        
        # Handle both internal and external work orders
        contractor_name = work_order.contractor.name if work_order.contractor else 'Internal Team'
        
        CustomerActivity.objects.create(
            customer=work_order.estimate.customer,
            estimate=work_order.estimate,
            activity_type='status_changed',
            title=f'Work Order Status Updated: {new_status}',
            description=f'Work Order #{work_order.id} for {contractor_name} changed to {new_status}',
            created_by=request.user,
            organization=request.organization if hasattr(request, 'organization') else None
        )
        
        return Response({'message': f'Status updated to {new_status}'})
    
    @action(detail=True, methods=['post'], permission_classes=[isAuthenticatedCustom])
    def generate_invoice(self, request, pk=None):
        """
        Generate an invoice from a work order
        """
        work_order = self.get_object()
        estimate = work_order.estimate
        
        # Check if invoice already exists for this work order
        if Invoice.objects.filter(work_order=work_order).exists():
             return Response({'error': 'Invoice already exists for this work order'}, status=status.HTTP_400_BAD_REQUEST)
             
        # Create invoice
        invoice_number = f"INV-{''.join(random.choices(string.digits, k=6))}"
        invoice = Invoice.objects.create(
            organization=work_order.organization,
            estimate=estimate,
            work_order=work_order,
            customer=estimate.customer,
            invoice_number=invoice_number,
            issue_date=date.today(),
            due_date=date.today(),
            subtotal=estimate.subtotal,
            tax_amount=estimate.tax_amount,
            total_amount=estimate.total_amount,
            balance_due=estimate.total_amount,
            status='draft',
            created_by=request.user
        )
        
        # Generate PDF
        generate_invoice_pdf(invoice)
        
        # Update estimate status to invoiced
        estimate.status = 'invoiced'
        estimate.save(update_fields=['status', 'updated_at'])
        
        # Create activity
        CustomerActivity.objects.create(
            customer=estimate.customer,
            estimate=estimate,
            activity_type='estimate_invoiced',
            title='Invoice Generated',
            description=f'Invoice #{invoice.invoice_number} generated from Work Order #{work_order.id}',
            created_by=request.user
        )
        
        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='public/(?P<token>[^/.]+)')
    def public_access(self, request, token=None):
        """Public access to a work order via token"""
        try:
            work_order = WorkOrder.objects.get(public_token=token)
            serializer = self.get_serializer(work_order)
            
            # Additional context for public view
            data = serializer.data
            data['estimate_details'] = {
                'pickup_date': work_order.estimate.pickup_date_from,
                'delivery_date': work_order.estimate.delivery_date_from,
                'origin_address': work_order.estimate.customer.origin_address,
                'destination_address': work_order.estimate.customer.destination_address,
                'customer_name': work_order.estimate.customer.full_name,
                'weight_lbs': work_order.estimate.weight_lbs,
                'labour_hours': work_order.estimate.labour_hours
            }
            
            return Response(data)
        except WorkOrder.DoesNotExist:
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], url_path='public/(?P<token>[^/.]+)/respond')
    def public_respond(self, request, token=None):
        """Public response (accept/reject) to a work order"""
        try:
            work_order = WorkOrder.objects.get(public_token=token)
            response_type = request.data.get('response') # 'accepted' or 'cancelled' (rejected)
            
            if response_type not in ['accepted', 'cancelled']:
                 return Response({'error': 'Invalid response'}, status=status.HTTP_400_BAD_REQUEST)
            
            work_order.status = response_type
            work_order.save(update_fields=['status', 'updated_at'])
            
            # Log activity
            CustomerActivity.objects.create(
                customer=work_order.estimate.customer,
                estimate=work_order.estimate,
                activity_type='status_changed',
                title=f'Contractor {response_type.capitalize()} Work Order',
                description=f'Contractor {work_order.contractor.name} has {response_type} Work Order #{work_order.id} via public portal.',
            )
            
            return Response({'message': f'Work order {response_type}'})
        except WorkOrder.DoesNotExist:
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_404_NOT_FOUND)


class ContractorEstimateLineItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing individual items on a contractor work order
    """
    queryset = ContractorEstimateLineItem.objects.all()
    serializer_class = ContractorEstimateLineItemSerializer
    permission_classes = (isAuthenticatedCustom,)

    def get_queryset(self):
        queryset = super().get_queryset()
        
        work_order_id = self.request.query_params.get('work_order_id') or self.request.query_params.get('work_order')
        if work_order_id:
            queryset = queryset.filter(work_order_id=work_order_id)
            
        return queryset


class TransactionCategoryViewSet(OrganizationContextMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing transaction categories
    """
    queryset = TransactionCategory.objects.all()
    serializer_class = TransactionCategorySerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by type (expense, purchase, both)
        category_type = self.request.query_params.get('type', None)
        if category_type:
            queryset = queryset.filter(Q(category_type=category_type) | Q(category_type='both'))
            
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search)
            )
        
        return queryset
    
    def perform_create(self, serializer):
        kwargs = {'created_by': self.request.user}
        if hasattr(self.request, 'organization') and self.request.organization:
            kwargs['organization'] = self.request.organization
        serializer.save(**kwargs)


class ExpenseViewSet(OrganizationContextMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing expenses
    """
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by date range
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        if date_from:
            queryset = queryset.filter(expense_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(expense_date__lte=date_to)
            
        # Filter by category
        category_id = self.request.query_params.get('category', None)
        if category_id:
            queryset = queryset.filter(category__id=category_id)
            
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(amount__icontains=search)
            )
        
        return queryset
    
    def perform_create(self, serializer):
        kwargs = {'created_by': self.request.user}
        if hasattr(self.request, 'organization') and self.request.organization:
            kwargs['organization'] = self.request.organization
        serializer.save(**kwargs)


class PurchaseViewSet(OrganizationContextMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing purchases
    """
    queryset = Purchase.objects.all()
    serializer_class = PurchaseSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by date range
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        if date_from:
            queryset = queryset.filter(purchase_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(purchase_date__lte=date_to)
            
        # Filter by category
        category_id = self.request.query_params.get('category', None)
        if category_id:
            queryset = queryset.filter(category__id=category_id)
            
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(item_name__icontains=search) |
                Q(vendor__icontains=search) |
                Q(description__icontains=search)
            )
        
        return queryset
    
    def perform_create(self, serializer):
        kwargs = {'created_by': self.request.user}
        if hasattr(self.request, 'organization') and self.request.organization:
            kwargs['organization'] = self.request.organization
        serializer.save(**kwargs)
@csrf_exempt
@api_view(['GET'])
@permission_classes([AllowAny])
def track_email_open(request, token):
    """
    Tracking pixel endpoint: serves a 1x1 transparent GIF and records an 'open' event.
    """
    try:
        from .models import EmailLog, CustomerActivity
        from django.utils import timezone
        log = EmailLog.objects.get(tracking_token=token)
        if not log.is_opened:
            log.is_opened = True
            log.opened_at = timezone.now()
            log.save()
            
            # Create activity record
            CustomerActivity.objects.create(
                customer=log.customer,
                organization=log.organization,
                activity_type='email_opened',
                title=f"Email Opened: {log.subject}",
                description=f"Automated tracking: Email with subject '{log.subject}' was opened.",
                created_by=None
            )
    except Exception:
        pass

    # Return 1x1 transparent GIF
    pixel_data = b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b'
    response = HttpResponse(pixel_data, content_type="image/gif")
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response
