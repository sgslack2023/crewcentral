from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from django.http import HttpResponse, FileResponse
from io import BytesIO
from crm_back.custom_methods import isAuthenticatedCustom
from .models import (
    ChargeCategory, ChargeDefinition, EstimateTemplate, TemplateLineItem,
    Estimate, EstimateLineItem, CustomerActivity, EstimateDocument, DocumentSigningBatch, TimeWindow
)
from .serializers import (
    ChargeCategorySerializer, ChargeDefinitionSerializer, EstimateTemplateSerializer,
    TemplateLineItemSerializer, EstimateSerializer, EstimateLineItemSerializer,
    ChargeCategorySimpleSerializer, ChargeDefinitionSimpleSerializer, EstimateTemplateSimpleSerializer,
    CustomerActivitySerializer, EstimateDocumentSerializer, TimeWindowSerializer, TimeWindowSimpleSerializer
)
from .utils import create_estimate_from_template, calculate_estimate, process_document_template
from .email_utils import send_estimate_email, send_document_signature_email
from masterdata.models import Customer
from django.utils import timezone
from rest_framework.permissions import AllowAny


class TimeWindowViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing time windows
    """
    queryset = TimeWindow.objects.all()
    serializer_class = TimeWindowSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = TimeWindow.objects.all()
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def simple(self, request):
        """
        Get simple list for dropdowns
        """
        windows = TimeWindow.objects.filter(is_active=True)
        serializer = TimeWindowSimpleSerializer(windows, many=True)
        return Response(serializer.data)


class ChargeCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing charge categories
    """
    queryset = ChargeCategory.objects.all()
    serializer_class = ChargeCategorySerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = ChargeCategory.objects.all()
        
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
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def simple(self, request):
        """
        Get simple list for dropdowns
        """
        categories = ChargeCategory.objects.filter(is_active=True)
        serializer = ChargeCategorySimpleSerializer(categories, many=True)
        return Response(serializer.data)


class ChargeDefinitionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing charge definitions
    """
    queryset = ChargeDefinition.objects.all()
    serializer_class = ChargeDefinitionSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = ChargeDefinition.objects.all()
        
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
        serializer.save(created_by=self.request.user)
    
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


class EstimateTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing estimate templates
    """
    queryset = EstimateTemplate.objects.all()
    serializer_class = EstimateTemplateSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = EstimateTemplate.objects.all()
        
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
        serializer.save(created_by=self.request.user)
    
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


class EstimateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing estimates
    """
    queryset = Estimate.objects.all()
    serializer_class = EstimateSerializer
    permission_classes = (isAuthenticatedCustom,)
    
    def get_queryset(self):
        queryset = Estimate.objects.all()
        
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
        serializer.save(created_by=self.request.user)
    
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
            request.user
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
    def duplicate(self, request, pk=None):
        """
        Duplicate an estimate
        """
        estimate = self.get_object()
        
        # Create new estimate
        new_estimate = Estimate.objects.create(
            customer=estimate.customer,
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
        serializer.save(created_by=self.request.user)


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