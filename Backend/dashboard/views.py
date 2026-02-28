from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count, Sum, Avg, Q, F
from django.utils import timezone
from .models import Dashboard, DashboardWidget, CustomMetric
from .serializers import DashboardSerializer, DashboardWidgetSerializer, CustomMetricSerializer
from transactiondata.models import Estimate, Invoice, PaymentReceipt, Expense, Purchase
from masterdata.models import Customer, Branch
from sitevisits.models import SiteVisit
from django.db.models.functions import TruncMonth, TruncDay
from crm_back.custom_methods import isAuthenticatedCustom, isAdminUser
from datetime import timedelta

class DashboardViewSet(viewsets.ModelViewSet):
    queryset = Dashboard.objects.all()
    serializer_class = DashboardSerializer
    permission_classes = (isAuthenticatedCustom,)

    def get_queryset(self):
        user = self.request.user
        org = getattr(self.request, 'organization', None)
        
        show_templates = self.request.query_params.get('show_templates', 'false').lower() == 'true'
        
        # If we are selecting a template for cloning, or specifically asking for templates
        if show_templates or self.action == 'create_from_template':
            # 1. Global templates (organization=None)
            # 2. Templates belonging to the current organization
            template_q = Q(is_template=True, is_active=True)
            if org:
                return Dashboard.objects.filter(template_q & (Q(organization=None) | Q(organization=org)))
            return Dashboard.objects.filter(template_q & Q(organization=None))

        # Superusers can see and manage everything
        if user.is_superuser:
            # If it's a direct ID lookup (retrieve, update, delete), allow all
            if self.detail or self.action in ['retrieve', 'update', 'partial_update', 'destroy', 'create_from_template']:
                return Dashboard.objects.all()

            show_all = self.request.query_params.get('show_all', 'false').lower() == 'true'
            if show_all:
                if not org:
                    return Dashboard.objects.all()
                return Dashboard.objects.filter(Q(organization=org) | Q(organization=None))
            
            # Default list view: standard dashboards for org, or all standard dashboards if no org
            base_q = Q(is_template=False)
            if not org:
                return Dashboard.objects.filter(base_q)
            return Dashboard.objects.filter(base_q & Q(organization=org))
        
        if not org:
            return Dashboard.objects.none()
        
        show_all = self.request.query_params.get('show_all', 'false').lower() == 'true'
        if show_all:
            return Dashboard.objects.filter(organization=org)
        
        user_memberships = user.memberships.filter(organization=org)
        if not user_memberships.exists():
            return Dashboard.objects.none()
        
        user_role_ids = user_memberships.values_list('role_id', flat=True)
        queryset = Dashboard.objects.filter(organization=org, is_active=True)
        
        queryset = queryset.annotate(
            role_count=Count('shared_with_roles')
        ).filter(
            Q(role_count=0) |
            Q(shared_with_roles__id__in=user_role_ids)
        ).distinct()
        
        return queryset

    def perform_create(self, serializer):
        org = getattr(self.request, 'organization', None)
        if not org and self.request.user.is_superuser:
            org_id = self.request.data.get('organization')
            if org_id:
                from users.models import Organization
                org = Organization.objects.filter(id=org_id).first()
        serializer.save(organization=org, created_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='create-from-template')
    def create_from_template(self, request, pk=None):
        template = self.get_object()
        if not template.is_template:
            return Response({"error": "This dashboard is not a template"}, status=status.HTTP_400_BAD_REQUEST)
        
        org = getattr(request, 'organization', None)
        if not org:
            return Response({"error": "No active organization found"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Clone the dashboard
        new_dashboard = Dashboard.objects.create(
            name=f"{template.name} (Cloned)",
            organization=org,
            description=template.description,
            is_template=False,
            category=template.category,
            created_by=request.user,
            global_filters=template.global_filters
        )
        
        # Clone widgets
        for widget in template.widgets.all():
            DashboardWidget.objects.create(
                dashboard=new_dashboard,
                title=widget.title,
                widget_type=widget.widget_type,
                widget_category=widget.widget_category,
                chart_library=widget.chart_library,
                data_source=widget.data_source,
                config=widget.config,
                enable_click=widget.enable_click,
                click_action=widget.click_action,
                click_target=widget.click_target,
                layout=widget.layout,
                is_active=widget.is_active
            )
        
        serializer = self.get_serializer(new_dashboard)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class CustomMetricViewSet(viewsets.ModelViewSet):
    queryset = CustomMetric.objects.all()
    serializer_class = CustomMetricSerializer
    permission_classes = (isAuthenticatedCustom,)

    def get_queryset(self):
        user = self.request.user
        org = getattr(self.request, 'organization', None)
        if user.is_superuser:
            if not org:
                return CustomMetric.objects.all()
            return CustomMetric.objects.filter(Q(organization=org) | Q(organization__isnull=True))
        
        if not org:
            return CustomMetric.objects.none()
        return CustomMetric.objects.filter(organization=org)

    def perform_create(self, serializer):
        org = getattr(self.request, 'organization', None)
        if not org and self.request.user.is_superuser:
            # Fallback to data provided in request if superuser is acting without header context
            org_id = self.request.data.get('organization')
            if org_id:
                from users.models import Organization
                org = Organization.objects.filter(id=org_id).first()
        
        if not org:
            # Last resort fallback to first organization if superuser (optional but safer for dev)
            if self.request.user.is_superuser:
                from users.models import Organization
                org = Organization.objects.first()
                
        serializer.save(organization=org, created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        from .models import DashboardWidget
        
        # Check if any widget uses this custom metric
        # Custom metrics are stored as 'custom_<id>' in data_source
        usage_exists = DashboardWidget.objects.filter(data_source=f"custom_{instance.id}").exists()
        
        if usage_exists:
            return Response(
                {"error": "This metric cannot be deleted because it is being used in one or more dashboards."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        return super().destroy(request, *args, **kwargs)

def calculate_trend(current, previous):
    if not previous or previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 1)

class AnalyticsDataView(APIView):
    """
    Generic endpoint to fetch data for dashboard widgets.
    """
    permission_classes = (isAuthenticatedCustom,)

    def get(self, request):
        source = request.query_params.get('source')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        time_range = request.query_params.get('time_range')
        branch_id = request.query_params.get('branch_id')
        rep_id = request.query_params.get('rep_id')
        limit = int(request.query_params.get('limit', 10))

        org = getattr(request, 'organization', None)
        if not org:
            return Response({"error": "Organization ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
        org_id = org.id
        data = []
        
        # Check if source is a Custom Metric ID
        custom_metric = None
        if source and source.startswith('custom_'):
            try:
                cm_id = source.split('_')[1]
                custom_metric = CustomMetric.objects.get(id=cm_id, organization=org)
            except:
                pass
        
        # Date range parsing
        if start_date and end_date:
            try:
                from django.utils.dateparse import parse_date
                from dateutil.relativedelta import relativedelta
                
                # The user's selected date (usually the end of a month)
                target_end = parse_date(end_date)
                target_start = parse_date(start_date)
                
                # Base end point for all relative calculations
                end = target_end
                
                # Default start point
                start = target_start

                # Overrides based on widget-specific time_range, anchored to the selected end_date
                if time_range == 'last_7_days':
                    start = end - timedelta(days=7)
                elif time_range == 'last_30_days':
                    # Anchor to start of the selected month
                    start = (end + timedelta(days=1)) - relativedelta(months=1)
                elif time_range == 'last_90_days':
                    start = (end + timedelta(days=1)) - relativedelta(months=3)
                elif time_range == 'last_6_months':
                    start = (end + timedelta(days=1)) - relativedelta(months=6)
                elif time_range == 'last_12_months':
                    start = (end + timedelta(days=1)) - relativedelta(months=12)
                elif time_range == 'this_year':
                    start = end.replace(month=1, day=1)
                elif time_range == 'future':
                    start = target_start # Keep future logic
                    end = start + timedelta(days=730)
                elif time_range == 'all_time':
                    start = end = None
                
                # Standard period-over-period comparison (length-normalized)
                if start and end:
                    days_diff = (end - start).days
                    prev_start = start - timedelta(days=days_diff + 1)
                    prev_end = start - timedelta(days=1)
                else:
                    prev_start = prev_end = None

            except Exception as e:
                print(f"Date parsing error: {e}")
                start = end = prev_start = prev_end = None
        def apply_filters(qs, date_field='created_at'):
            if branch_id:
                if hasattr(qs.model, 'branch_id'):
                    qs = qs.filter(branch_id=branch_id)
                elif hasattr(qs.model, 'customer'):
                    qs = qs.filter(customer__branch_id=branch_id)
                elif hasattr(qs.model, 'invoice'):
                    qs = qs.filter(invoice__customer__branch_id=branch_id)

            if rep_id:
                if hasattr(qs.model, 'assigned_to'):
                    qs = qs.filter(assigned_to_id=rep_id)
                elif hasattr(qs.model, 'invoice'):
                    # For PaymentReceipt, check invoice assignee first
                    qs = qs.filter(invoice__assigned_to_id=rep_id)
                elif hasattr(qs.model, 'customer'):
                    qs = qs.filter(customer__assigned_to_id=rep_id)
                elif hasattr(qs.model, 'created_by'):
                    qs = qs.filter(created_by_id=rep_id)
            
            # Mappings for display labels to DB keys
            from masterdata.models import SOURCE_CHOICES, STAGE_CHOICES
            SOURCE_MAP = {v: k for k, v in SOURCE_CHOICES}
            STAGE_MAP = {v: k for k, v in STAGE_CHOICES}
            
            # Case-insensitive versions for better matching
            SOURCE_MAP_LOWER = {k.lower(): v for k, v in SOURCE_MAP.items()}
            STAGE_MAP_LOWER = {k.lower(): v for k, v in STAGE_MAP.items()}

            # Handle dynamic filters from dashboard interactivity
            for key, value in request.query_params.items():
                if key.startswith('f_'):
                    field_name = key[2:] # Remove f_ prefix
                    
                    # If chart sends generic keys, try to infer the actual field
                    if field_name in ['name', 'category', 'label', 'xAxisKey']:
                        val_lower = str(value).lower()
                        if val_lower in SOURCE_MAP_LOWER:
                            field_name = 'source'
                            value = SOURCE_MAP_LOWER[val_lower]
                        elif val_lower in STAGE_MAP_LOWER:
                            field_name = 'stage'
                            value = STAGE_MAP_LOWER[val_lower]
                        # Special case: if it's "Google", "Facebook" etc, it's definitely a source
                        elif val_lower in ['google', 'moveit', 'referral', 'facebook']:
                            field_name = 'source'
                    
                    # Map display value to DB key if applicable (for specific fields)
                    if field_name == 'source':
                        val_lower = str(value).lower()
                        if val_lower in SOURCE_MAP_LOWER: value = SOURCE_MAP_LOWER[val_lower]
                    elif field_name == 'stage':
                        val_lower = str(value).lower()
                        if val_lower in STAGE_MAP_LOWER: value = STAGE_MAP_LOWER[val_lower]

                    # Apply the filter based on the target model
                    if hasattr(qs.model, field_name):
                        qs = qs.filter(**{field_name: value})
                    elif hasattr(qs.model, 'customer'):
                        # Check Customer model for the field
                        from masterdata.models import Customer
                        if hasattr(Customer, field_name):
                            qs = qs.filter(**{f'customer__{field_name}': value})
                    elif hasattr(qs.model, 'invoice'):
                        # PaymentReceipt -> Invoice -> Customer
                        from masterdata.models import Customer
                        if hasattr(Customer, field_name):
                            qs = qs.filter(**{f'invoice__customer__{field_name}': value})
                        
            return qs


        def get_metric_value(m_source):
            """Helper to get just the numerical value for a base metric."""
            if m_source == 'total_leads':
                qs = Customer.objects.filter(organization_id=org_id)
                qs = apply_filters(qs)
                return qs.filter(created_at__range=[start, end]).count() if start else qs.count()
            elif m_source == 'total_revenue':
                qs = PaymentReceipt.objects.filter(organization_id=org_id)
                qs = apply_filters(qs, 'payment_date')
                if not start: return float(qs.aggregate(total=Sum('amount'))['total'] or 0)
                return float(qs.filter(payment_date__range=[start, end]).aggregate(total=Sum('amount'))['total'] or 0)
            elif m_source == 'payment_count':
                qs = PaymentReceipt.objects.filter(organization_id=org_id)
                qs = apply_filters(qs, 'payment_date')
                return qs.filter(payment_date__range=[start, end]).count() if start else qs.count()
            elif m_source == 'active_jobs':
                qs = Customer.objects.filter(organization_id=org_id, stage__in=['booked', 'opportunity', 'in_progress'])
                return apply_filters(qs).count()
            elif m_source == 'pipeline_value':
                qs = Estimate.objects.filter(organization_id=org_id, status__in=['sent', 'approved', 'booked'])
                return float(apply_filters(qs, 'created_at').aggregate(total=Sum('total_amount'))['total'] or 0)
            elif source == 'due_invoices_amount':
                qs = Invoice.objects.filter(organization_id=org_id).exclude(status='void')
                return float(apply_filters(qs, 'issue_date').aggregate(total=Sum('balance_due'))['total'] or 0)
            elif m_source == 'total_expenses':
                qs = Expense.objects.filter(organization_id=org_id)
                qs = apply_filters(qs, 'expense_date')
                if not start: return float(qs.aggregate(total=Sum('amount'))['total'] or 0)
                return float(qs.filter(expense_date__range=[start, end]).aggregate(total=Sum('amount'))['total'] or 0)
            elif m_source == 'total_purchases':
                qs = Purchase.objects.filter(organization_id=org_id)
                qs = apply_filters(qs, 'purchase_date')
                if not start: return float(qs.aggregate(total=Sum('total_amount'))['total'] or 0)
                return float(qs.filter(purchase_date__range=[start, end]).aggregate(total=Sum('total_amount'))['total'] or 0)
            return 0

        # Handle Custom Metric Formula Calculation
        if custom_metric:
            try:
                import re
                formula = custom_metric.formula
                # Find all {{variable}} patterns
                variables = re.findall(r'\{\{([^}]+)\}\}', formula)
                
                # Resolve each variable to its current value
                context = {}
                for var in variables:
                    context[var] = get_metric_value(var)
                
                # Replace placeholders with actual values
                clean_formula = formula
                for var, val in context.items():
                    clean_formula = clean_formula.replace(f'{{{{{var}}}}}', str(val))
                
                # Safe evaluation (only allow basic arithmetic)
                # Note: In production you might want a more robust parser like 'Simpleeval'
                # but for internal use with controlled formulas, a restricted eval or replace is okay.
                # Here we'll use a simple regex-guarded eval for MVP
                if re.match(r'^[\d\s\+\-\*\/\(\)\.]+$', clean_formula):
                    # Zero division protection
                    clean_formula = clean_formula.replace('/0', '/1') # Simple fallback
                    value = eval(clean_formula)
                else:
                    value = 0
                
                # Calculate trend (same formula, but for previous period)
                # To keep it simple, we'll just return value for now, or could re-run context with prev dates
                
                data = {
                    "value": round(float(value), 2),
                    "trend": 0,
                    "subtext": custom_metric.description or custom_metric.name,
                    "prefix": custom_metric.unit if custom_metric.unit == '$' else "",
                    "suffix": custom_metric.unit if custom_metric.unit != '$' else "",
                    "is_custom": True
                }
                return Response(data)
            except Exception as e:
                return Response({"error": f"Formula calculation failed: {str(e)}"}, status=400)

        if source == 'total_leads':
            qs = Customer.objects.filter(organization_id=org_id)
            qs = apply_filters(qs)
            
            value = qs.filter(created_at__range=[start, end]).count() if start else qs.count()
            prev_value = qs.filter(created_at__range=[prev_start, prev_end]).count() if prev_start else 0
            
            history = qs.filter(created_at__range=[start, end]).annotate(
                day=TruncDay('created_at')
            ).values('day').annotate(value=Count('id')).order_by('day') if start else []
            
            data = {
                "value": value,
                "trend": calculate_trend(value, prev_value),
                "subtext": "Results for this period",
                "history": [{"date": i['day'], "value": i['value']} for i in history]
            }

        elif source == 'total_revenue':
            # definitively use PaymentReceipt for actual money in
            qs = PaymentReceipt.objects.filter(organization_id=org_id)
            qs = apply_filters(qs, 'payment_date')
            
            # If start is None (e.g., for 'all_time' or no date range specified), calculate for all time
            if not start:
                value = qs.aggregate(total=Sum('amount'))['total'] or 0
                prev_value = 0 # No previous period for 'all_time'
            else:
                value = qs.filter(payment_date__range=[start, end]).aggregate(total=Sum('amount'))['total'] or 0
                prev_value = qs.filter(payment_date__range=[prev_start, prev_end]).aggregate(total=Sum('amount'))['total'] or 0 if prev_start else 0
            
            history = qs.filter(payment_date__range=[start, end]).annotate(
                day=TruncDay('payment_date')
            ).values('day').annotate(value=Sum('amount')).order_by('day') if start else []

            data = {
                "value": float(value),
                "trend": calculate_trend(value, prev_value),
                "subtext": "Actual cash collected",
                "history": [{"date": i['day'], "value": float(i['value'] or 0)} for i in history],
                "prefix": "$"
            }

        elif source == 'payment_count':
            qs = PaymentReceipt.objects.filter(organization_id=org_id)
            qs = apply_filters(qs, 'payment_date')

            if not start:
                value = qs.count()
                prev_value = 0
            else:
                value = qs.filter(payment_date__range=[start, end]).count()
                prev_value = qs.filter(payment_date__range=[prev_start, prev_end]).count() if prev_start else 0

            history = qs.filter(payment_date__range=[start, end]).annotate(
                day=TruncDay('payment_date')
            ).values('day').annotate(value=Count('id')).order_by('day') if start else []

            data = {
                "value": value,
                "trend": calculate_trend(value, prev_value),
                "subtext": "Activity for this period",
                "history": [{"date": i['day'], "value": i['value']} for i in history]
            }

        elif source == 'average_payment':
            qs = PaymentReceipt.objects.filter(organization_id=org_id)
            qs = apply_filters(qs, 'payment_date')

            if not start:
                value = qs.aggregate(avg=Avg('amount'))['avg'] or 0
                prev_value = 0
            else:
                value = qs.filter(payment_date__range=[start, end]).aggregate(avg=Avg('amount'))['avg'] or 0
                prev_value = qs.filter(payment_date__range=[prev_start, prev_end]).aggregate(avg=Avg('amount'))['avg'] or 0 if prev_start else 0

            data = {
                "value": round(float(value), 2),
                "trend": calculate_trend(value, prev_value),
                "subtext": "Performance this period",
                "prefix": "$"
            }

        elif source == 'win_rate':
            qs = Customer.objects.filter(organization_id=org_id)
            qs = apply_filters(qs)
            
            if time_range != 'all_time' and start:
                period_qs = qs.filter(created_at__range=[start, end])
                prev_period_qs = qs.filter(created_at__range=[prev_start, prev_end]) if prev_start else None
            else:
                period_qs = qs
                prev_period_qs = None

            def get_rate(q):
                if not q: return 0
                total = q.count()
                if total == 0: return 0
                won = q.filter(stage__in=['booked', 'closed']).count()
                return (won / total * 100)

            curr_rate = get_rate(period_qs)
            prev_rate = get_rate(prev_period_qs) if prev_period_qs else 0
            
            data = {
                "value": round(curr_rate, 1),
                "trend": round(curr_rate - prev_rate, 1),
                "subtext": "Conversion for this period",
                "suffix": "%"
            }

        elif source == 'lead_volume':
            qs = Customer.objects.filter(organization_id=org_id)
            qs = apply_filters(qs)
            if start and end:
                qs = qs.filter(created_at__range=[start, end])
            
            leads = qs.annotate(
                day=TruncDay('created_at')
            ).values('day').annotate(value=Count('id')).order_by('day')
            data = [{"date": item['day'], "value": item['value']} for item in leads]

        elif source == 'revenue_trends':
            qs = Invoice.objects.filter(organization_id=org_id, status='paid')
            qs = apply_filters(qs, 'issue_date')
            if start and end:
                qs = qs.filter(issue_date__range=[start, end])

            revenue = qs.annotate(
                period=TruncDay('issue_date') if (start and end and (end-start).days <= 31) else TruncMonth('issue_date')
            ).values('period').annotate(value=Sum('total_amount')).order_by('period')
            data = [{"date": item['period'], "value": float(item['value'] or 0)} for item in revenue]

        elif source == 'branch_performance':
            qs = Customer.objects.filter(organization_id=org_id, stage__in=['booked', 'closed'])
            qs = apply_filters(qs, 'move_date')
            if start and end:
                qs = qs.filter(move_date__range=[start, end])

            performance = qs.values(name=F('branch__name')).annotate(
                value=Count('id')
            ).order_by('-value')
            data = [{"name": i['name'] or "Unassigned", "value": i['value']} for i in performance]

        elif source == 'deals_by_stage':
            qs = Customer.objects.filter(organization_id=org_id)
            qs = apply_filters(qs)
            stages = qs.values(name=F('stage')).annotate(value=Count('id')).order_by('-value')
            data = [{"name": i['name'], "value": i['value']} for i in stages]

        elif source == 'lead_source_distribution':
            qs = Customer.objects.filter(organization_id=org_id)
            qs = apply_filters(qs)
            if start and end:
                qs = qs.filter(created_at__range=[start, end])
            
            sources = qs.values('source').annotate(value=Count('id')).order_by('-value')
            
            # Map keys to labels for better visualization
            labels = {
                'moveit': 'Moveit',
                'mymovingloads': 'MyMovingLoads',
                'moving24': 'Moving24',
                'baltic_website': 'Baltic Website',
                'n1m_website': 'N1M Website',
                'google': 'Google',
                'referral': 'Referral',
                'other': 'Other'
            }
            
            data = [
                {
                    "name": labels.get(i['source'], (i['source'] or "Other").replace('_', ' ').title()), 
                    "value": i['value']
                } 
                for i in sources
            ]

        elif source == 'upcoming_jobs':
            # Include all booked customers that are either in the future or have no date set yet
            qs = Customer.objects.filter(
                organization_id=org_id, 
                stage='booked'
            ).filter(
                Q(move_date__gte=timezone.now().date()) | Q(move_date__isnull=True)
            )
            qs = apply_filters(qs, 'move_date')
            # Order nulls last (assuming they are less urgent than dated jobs)
            customers = qs.order_by(F('move_date').asc(nulls_last=True))[:limit]
            
            data = []
            for c in customers:
                est = c.estimates.filter(status__in=['approved', 'booked', 'invoiced']).first()
                data.append({
                    "id": c.id,
                    "customer": c.full_name,
                    "date": c.move_date,
                    "amount": float(est.total_amount) if est else 0,
                    "service": c.service_type.service_type if c.service_type else "General",
                    "estimate_id": est.id if est else None
                })

        elif source == 'active_jobs':
            qs = Customer.objects.filter(organization_id=org_id, stage__in=['booked', 'opportunity', 'in_progress'])
            qs = apply_filters(qs)
            
            value = qs.count()
            data = {
                "value": value,
                "trend": 0,
                "subtext": "Current status",
                "history": [] 
            }

        elif source == 'average_deal_size':
            qs = Invoice.objects.filter(organization_id=org_id, status='paid')
            qs = apply_filters(qs, 'issue_date')
            avg = qs.aggregate(avg=Avg('total_amount'))['avg'] or 0
            data = {
                "value": round(float(avg), 2),
                "trend": 0,
                "prefix": "$"
            }

        elif source == 'pipeline_value':
            qs = Estimate.objects.filter(organization_id=org_id, status__in=['sent', 'approved', 'booked'])
            qs = apply_filters(qs, 'created_at')
            value = qs.aggregate(total=Sum('total_amount'))['total'] or 0
            data = {
                "value": float(value),
                "trend": 0,
                "prefix": "$"
            }

        elif source == 'due_invoices_amount':
            qs = Invoice.objects.filter(organization_id=org_id).exclude(status='void')
            qs = apply_filters(qs, 'issue_date')
            total = qs.aggregate(total=Sum('balance_due'))['total'] or 0
            
            # Simple history for the trend
            history = qs.filter(issue_date__range=[start, end]).annotate(
                day=TruncDay('issue_date')
            ).values('day').annotate(value=Sum('balance_due')).order_by('day') if start else []

            data = {
                "value": float(total),
                "trend": 0,
                "subtext": "Total outstanding balance",
                "prefix": "$",
                "history": [{"date": i['day'], "value": float(i['value'] or 0)} for i in history]
            }

        elif source == 'accounts_receivable':
            qs = Invoice.objects.filter(organization_id=org_id, balance_due__gt=0).exclude(status='void')
            qs = apply_filters(qs, 'issue_date')
            receivables = qs.values(
                'customer__id', 'customer__full_name'
            ).annotate(
                pending_amount=Sum('balance_due'),
                invoice_count=Count('id')
            ).order_by('-pending_amount')[:limit]
            
            data = [
                {
                    "id": r['customer__id'],
                    "customer": r['customer__full_name'],
                    "amount": float(r['pending_amount']),
                    "count": r['invoice_count'],
                    "type": "Pending Balance",
                    "date": timezone.now().date()
                }
                for r in receivables
            ]

        elif source == 'due_invoices':
            qs = Invoice.objects.filter(organization_id=org_id, balance_due__gt=0).exclude(status='void')
            qs = apply_filters(qs, 'issue_date')
            invoices = qs.select_related('customer').order_by('-balance_due')[:limit]
            
            data = [
                {
                    "id": inv.id,
                    "invoice_id": inv.id,
                    "title": inv.invoice_number,
                    "customer": inv.customer.full_name,
                    "date": inv.issue_date,
                    "amount": float(inv.balance_due),
                    "total_amount": float(inv.total_amount),
                    "type": f"Invoice {inv.invoice_number}",
                    "status": inv.get_status_display()
                }
                for inv in invoices
            ]

        elif source == 'revenue_by_service_type':
            qs = Invoice.objects.filter(organization_id=org_id, status='paid')
            qs = apply_filters(qs, 'issue_date')
            breakdown = qs.values(name=F('service_type__service_type')).annotate(
                value=Sum('total_amount')
            ).order_by('-value')
            data = [{"name": i['name'] or "General", "value": float(i['value'] or 0)} for i in breakdown]

        elif source == 'recent_activities':
            qs = Customer.objects.filter(organization_id=org_id).order_by('-updated_at')[:limit]
            data = [
                {
                    "id": c.id,
                    "customer": c.full_name,
                    "date": c.updated_at,
                    "type": "Stage Update",
                    "description": f"Moved to {c.get_stage_display()}"
                }
                for c in qs
            ]

        elif source == 'recent_invoices':
            qs = Invoice.objects.filter(organization_id=org_id).order_by('-issue_date')[:limit]
            data = [
                {
                    "id": inv.id,
                    "title": inv.invoice_number,
                    "customer": inv.customer.full_name,
                    "date": inv.issue_date,
                    "amount": float(inv.total_amount),
                    "status": inv.get_status_display()
                }
                for inv in qs
            ]

        elif source == 'recent_payments':
            qs = PaymentReceipt.objects.filter(organization_id=org_id).order_by('-payment_date')[:limit]
            data = [
                {
                    "id": p.id,
                    "title": f"Payment for {p.invoice.invoice_number}",
                    "customer": p.invoice.customer.full_name,
                    "date": p.payment_date,
                    "amount": float(p.amount),
                    "type": p.get_payment_method_display()
                }
                for p in qs
            ]

        elif source == 'service_funnel':
            qs = Customer.objects.filter(organization_id=org_id)
            qs = apply_filters(qs)
            if start and end:
                qs = qs.filter(created_at__range=[start, end])
            
            stages = ['new_lead', 'opportunity', 'booked', 'closed']
            data = []
            for stage in stages:
                count = qs.filter(stage=stage).count()
                data.append({"step": stage.replace('_', ' ').title(), "value": count})

        elif source == 'site_visits':
            qs = SiteVisit.objects.filter(organization_id=org_id)
            qs = apply_filters(qs, 'scheduled_at')
            if start and end:
                qs = qs.filter(scheduled_at__date__range=[start, end])
            
            # Simple list for calendar
            visits = qs.select_related('customer').order_by('scheduled_at')
            data = [
                {
                    "id": v.id,
                    "title": v.customer.full_name,
                    "start": v.scheduled_at,
                    "end": v.scheduled_at + timedelta(hours=2), # Default 2hr duration for viz
                    "status": v.status,
                    "description": v.notes
                }
                for v in visits
            ]

        elif source == 'total_expenses':
            qs = Expense.objects.filter(organization_id=org_id)
            qs = apply_filters(qs, 'expense_date')

            if not start:
                value = qs.aggregate(total=Sum('amount'))['total'] or 0
                prev_value = 0
            else:
                value = qs.filter(expense_date__range=[start, end]).aggregate(total=Sum('amount'))['total'] or 0
                prev_value = qs.filter(expense_date__range=[prev_start, prev_end]).aggregate(total=Sum('amount'))['total'] or 0 if prev_start else 0

            history = qs.filter(expense_date__range=[start, end]).annotate(
                day=TruncDay('expense_date')
            ).values('day').annotate(value=Sum('amount')).order_by('day') if start else []

            data = {
                "value": float(value),
                "trend": calculate_trend(value, prev_value),
                "subtext": "Operational expenses",
                "prefix": "$",
                "history": [{"date": i['day'], "value": float(i['value'] or 0)} for i in history]
            }

        elif source == 'total_purchases':
            qs = Purchase.objects.filter(organization_id=org_id)
            qs = apply_filters(qs, 'purchase_date')

            if not start:
                value = qs.aggregate(total=Sum('total_amount'))['total'] or 0
                prev_value = 0
            else:
                value = qs.filter(purchase_date__range=[start, end]).aggregate(total=Sum('total_amount'))['total'] or 0
                prev_value = qs.filter(purchase_date__range=[prev_start, prev_end]).aggregate(total=Sum('total_amount'))['total'] or 0 if prev_start else 0

            history = qs.filter(purchase_date__range=[start, end]).annotate(
                day=TruncDay('purchase_date')
            ).values('day').annotate(value=Sum('total_amount')).order_by('day') if start else []

            data = {
                "value": float(value),
                "trend": calculate_trend(value, prev_value),
                "subtext": "Asset & Inventory purchases",
                "prefix": "$",
                "history": [{"date": i['day'], "value": float(i['value'] or 0)} for i in history]
            }

        elif source == 'recent_expenses':
            qs = Expense.objects.filter(organization_id=org_id).order_by('-expense_date')[:limit]
            data = [
                {
                    "id": e.id,
                    "title": e.title,
                    "category": e.category.name if e.category else "Uncategorized",
                    "date": e.expense_date,
                    "amount": float(e.amount),
                    "type": "Expense"
                }
                for e in qs
            ]

        elif source == 'recent_purchases':
            qs = Purchase.objects.filter(organization_id=org_id).order_by('-purchase_date')[:limit]
            data = [
                {
                    "id": p.id,
                    "title": p.item_name,
                    "vendor": p.vendor,
                    "date": p.purchase_date,
                    "amount": float(p.total_amount),
                    "type": "Purchase"
                }
                for p in qs
            ]

        return Response({
            "source": source,
            "data": data,
            "timestamp": timezone.now()
        })
