import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_back.settings')
django.setup()

from rest_framework.test import APIRequestFactory
from transactiondata.views import EstimateViewSet
from transactiondata.serializers import EstimateSerializer
from users.models import CustomUser, OrganizationMember

# Get user
user = CustomUser.objects.get(email='info@balticvanlines.ca')
print(f"User: {user.email}")

# Get membership
membership = OrganizationMember.objects.filter(user=user, is_default=True).first()
if not membership:
    membership = OrganizationMember.objects.filter(user=user).first()
print(f"Membership: {membership.organization.name if membership else 'None'}")

# Create a mock request using DRF's Request wrapper
from rest_framework.request import Request
factory = APIRequestFactory()
wsgi_request = factory.get('/api/transactiondata/estimates/')
request = Request(wsgi_request)
request.user = user
request._request.user = user
request.organization = membership.organization if membership else None
request.org_member = membership

# Create viewset and get queryset
viewset = EstimateViewSet()
viewset.request = request
viewset.format_kwarg = None
viewset.kwargs = {}
viewset.action = 'list'

# Get queryset
queryset = viewset.get_queryset()
print(f"\nQueryset count: {queryset.count()}")

# Serialize and show what API would return
serializer = EstimateSerializer(queryset, many=True)
print("\nSerialized estimates (what API returns):")
for est in serializer.data:
    print(f"  id: {est['id']}, customer: {est['customer']}, customer_name: {est.get('customer_name')}")
