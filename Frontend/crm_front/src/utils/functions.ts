import axios, { AxiosResponse } from "axios"
import { tokenName, id, role, fullname, email, is_superuser } from "./data"
import {
  MeUrl, UsersUrl, CustomersUrl, CustomerStatisticsUrl, BranchesUrl, ServiceTypesUrl, DocumentsUrl, DocumentMappingsUrl,
  MoveTypesUrl, RoomSizesUrl,
  ChargeCategoriesUrl, ChargeDefinitionsUrl, EstimateTemplatesUrl, TemplateLineItemsUrl,
  EstimatesUrl, EstimateLineItemsUrl, CustomerActivitiesUrl, EstimateDocumentsUrl,
  InvoicesUrl, PaymentsUrl, AccountingUrl, RolesUrl, PermissionsUrl, OrganizationsUrl, GlobalUsersUrl,
  TransactionCategoriesUrl, ExpensesUrl, PurchasesUrl
} from "./network"
import {
  AuthTokenType, UserType, UserProps, CustomerProps, CustomerStatsProps, BranchProps, ServiceTypeProps, DocumentProps, DocumentMappingProps,
  MoveTypeProps, RoomSizeProps,
  ChargeCategoryProps, ChargeDefinitionProps, EstimateTemplateProps, TemplateLineItemProps,
  EstimateProps, EstimateLineItemProps, CustomerActivityProps, EstimateDocumentProps,
  InvoiceProps, PaymentReceiptProps, AccountingStatsProps, RoleProps, PermissionProps, OrganizationProps,
  TransactionCategoryProps, ExpenseProps, PurchaseProps
} from "./types"


export const getAuthToken = (): AuthTokenType | null => {
  const accessToken = localStorage.getItem(tokenName)
  const orgId = localStorage.getItem('current_org_id')

  if (!accessToken) {
    return null
  }

  const headers: { Authorization: string;[key: string]: string } = { Authorization: `Bearer ${accessToken}` }

  if (orgId) {
    headers['X-Organization-ID'] = orgId
  }

  return { headers }

}

export const setOrganizationContext = (orgId: number | string) => {
  localStorage.setItem('current_org_id', orgId.toString());
  // Force reload to apply new context? Or let app handle it.
  // window.location.reload(); 
}

export const logout = () => {
  localStorage.clear()
  window.location.href = "/login"

}

export const getCurrentUser = () => {
  const orgsString = localStorage.getItem('user_organizations');
  let organizations = [];
  try {
    organizations = orgsString ? JSON.parse(orgsString) : [];
  } catch (e) {
    organizations = [];
  }

  return {
    id: localStorage.getItem(id),
    role: localStorage.getItem(role) || 'user',
    fullname: localStorage.getItem(fullname) || 'User',
    email: localStorage.getItem(email) || '',
    is_superuser: localStorage.getItem(is_superuser) === 'true',
    organizations: organizations
  };
}

export const authHandler = async (): Promise<UserType | null> => {
  const headers = getAuthToken()
  if (!headers) {
    return null
  }

  const attemptFetch = async (currentHeaders: any): Promise<UserType | null> => {
    try {
      const response: AxiosResponse = await axios.get(MeUrl, currentHeaders);
      if (response && response.data) {
        const user = response.data as UserType;

        // Refresh organizations in localStorage
        if (user.organizations) {
          localStorage.setItem('user_organizations', JSON.stringify(user.organizations));
          localStorage.setItem(is_superuser, user.is_superuser ? 'true' : 'false');

          // If current_org_id is missing or not in the list, set default
          const storedOrgId = localStorage.getItem('current_org_id');
          if (!storedOrgId || !user.organizations.some(o => o.id.toString() === storedOrgId)) {
            const defaultOrg = user.organizations.find(o => o.is_default) || user.organizations[0];
            if (defaultOrg) {
              localStorage.setItem('current_org_id', defaultOrg.id.toString());
            }
          }
        }
        return user;
      }
    } catch (e: any) {
      console.error('Auth handler error:', e);

      // If it's a 403 (Permission Denied for Org) or CORS error (no response)
      // and we haven't tried without the org header yet
      if ((e.response?.status === 403 || !e.response) && currentHeaders.headers['X-Organization-ID']) {
        console.log('Org context might be invalid or causing CORS issue, retrying without X-Organization-ID');
        localStorage.removeItem('current_org_id');

        // Remove org header and try again
        const { 'X-Organization-ID': _, ...restHeaders } = currentHeaders.headers;
        return attemptFetch({ headers: restHeaders });
      }

      return null;
    }
    return null;
  };

  return attemptFetch(headers);
}


export const getUsers = async (
  setUsers: (data: any) => void,
  setFetching: (val: boolean) => void
) => {
  const headers = getAuthToken() as AuthTokenType;
  setFetching(true);

  try {
    const response: AxiosResponse = await axios.get(UsersUrl, headers);

    setUsers(response.data);
  } finally {
    setFetching(false);
  }
};

export const getGlobalUsers = async (
  setUsers: (data: UserProps[]) => void,
  setFetching: (val: boolean) => void
) => {
  const headers = getAuthToken() as AuthTokenType;
  setFetching(true);

  try {
    const response: AxiosResponse = await axios.get(GlobalUsersUrl, headers);
    setUsers(response.data);
  } catch (error) {
    console.error('Error fetching global users:', error);
    setUsers([]);
  } finally {
    setFetching(false);
  }
};

// Customer Management Functions
export const getCustomers = async (
  setCustomers: (data: CustomerProps[]) => void,
  setFetching: (val: boolean) => void
) => {
  const headers = getAuthToken() as AuthTokenType;
  setFetching(true);

  try {
    const response: AxiosResponse = await axios.get(CustomersUrl, headers);
    setCustomers(response.data);
  } catch (error) {
    console.error('Error fetching customers:', error);
    setCustomers([]);
  } finally {
    setFetching(false);
  }
};

export const getCustomerStatistics = async (): Promise<CustomerStatsProps | null> => {
  const headers = getAuthToken();
  if (!headers) {
    throw new Error('Authentication required');
  }

  try {
    const response: AxiosResponse = await axios.get(CustomerStatisticsUrl, headers);
    return response.data;
  } catch (error) {
    console.error('Error fetching customer statistics:', error);
    throw error;
  }
};

// Branch Management Functions
export const getBranches = async (
  setBranches: (data: BranchProps[]) => void,
  setFetching: (val: boolean) => void
) => {
  const headers = getAuthToken() as AuthTokenType;
  setFetching(true);

  try {
    const response: AxiosResponse = await axios.get(BranchesUrl, headers);
    setBranches(response.data);
  } catch (error) {
    console.error('Error fetching branches:', error);
    setBranches([]);
  } finally {
    setFetching(false);
  }
};

// Service Type Management Functions
export const getServiceTypes = async (
  setServiceTypes: (data: ServiceTypeProps[]) => void,
  setFetching: (val: boolean) => void
) => {
  const headers = getAuthToken() as AuthTokenType;
  setFetching(true);

  try {
    const response: AxiosResponse = await axios.get(ServiceTypesUrl, headers);
    setServiceTypes(response.data);
  } catch (error) {
    console.error('Error fetching service types:', error);
    setServiceTypes([]);
  } finally {
    setFetching(false);
  }
};

// Organization Management Functions
export const getOrganizations = async (
  setOrganizations: (data: OrganizationProps[]) => void,
  setFetching: (val: boolean) => void
) => {
  const headers = getAuthToken() as AuthTokenType;
  setFetching(true);

  try {
    // Add cache buster to avoid stale organizations lists
    const response: AxiosResponse = await axios.get(`${OrganizationsUrl}?_t=${Date.now()}`, headers);
    setOrganizations(response.data);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    setOrganizations([]);
  } finally {
    setFetching(false);
  }
};

// Document Library Management Functions
export const getDocuments = async (
  setDocuments: (data: DocumentProps[]) => void,
  setFetching: (val: boolean) => void
) => {
  const headers = getAuthToken() as AuthTokenType;
  setFetching(true);

  try {
    const response: AxiosResponse = await axios.get(DocumentsUrl, headers);
    setDocuments(response.data);
  } catch (error) {
    console.error('Error fetching documents:', error);
    setDocuments([]);
  } finally {
    setFetching(false);
  }
};

// Document Mapping Management Functions
export const getDocumentMappings = async (
  setMappings: (data: DocumentMappingProps[]) => void,
  setFetching: (val: boolean) => void
) => {
  const headers = getAuthToken() as AuthTokenType;
  setFetching(true);

  try {
    const response: AxiosResponse = await axios.get(DocumentMappingsUrl, headers);
    setMappings(response.data);
  } catch (error) {
    console.error('Error fetching document mappings:', error);
    setMappings([]);
  } finally {
    setFetching(false);
  }
};

// Move Type Functions
export const getMoveTypes = async (
  setMoveTypes: (data: MoveTypeProps[]) => void,
  setFetching: (val: boolean) => void
) => {
  const headers = getAuthToken() as AuthTokenType;
  setFetching(true);
  try {
    const response: AxiosResponse = await axios.get(MoveTypesUrl, headers);
    setMoveTypes(response.data);
  } catch (error) {
    console.error('Error fetching move types:', error);
    setMoveTypes([]);
  } finally {
    setFetching(false);
  }
};

// Room Size Functions
export const getRoomSizes = async (
  setRoomSizes: (data: RoomSizeProps[]) => void,
  setFetching: (val: boolean) => void
) => {
  const headers = getAuthToken() as AuthTokenType;
  setFetching(true);
  try {
    const response: AxiosResponse = await axios.get(RoomSizesUrl, headers);
    setRoomSizes(response.data);
  } catch (error) {
    console.error('Error fetching room sizes:', error);
    setRoomSizes([]);
  } finally {
    setFetching(false);
  }
};

// Estimate Functions
export const getEstimates = async (
  setEstimates: (data: EstimateProps[]) => void,
  setFetching: (val: boolean) => void
) => {
  const headers = getAuthToken() as AuthTokenType;
  setFetching(true);
  try {
    const response: AxiosResponse = await axios.get(EstimatesUrl, headers);
    setEstimates(response.data);
  } catch (error) {
    console.error('Error fetching estimates:', error);
    setEstimates([]);
  } finally {
    setFetching(false);
  }
};

export const getEstimateById = async (id: string | number): Promise<EstimateProps | null> => {
  const headers = getAuthToken();
  if (!headers) return null;
  try {
    const response: AxiosResponse = await axios.get(`${EstimatesUrl}/${id}`, headers);
    return response.data;
  } catch (error) {
    console.error('Error fetching estimate:', error);
    return null;
  }
};

export const recalculateEstimate = async (id: string | number): Promise<boolean> => {
  const headers = getAuthToken();
  if (!headers) return false;
  try {
    await axios.post(`${EstimatesUrl}/${id}/recalculate`, {}, headers);
    return true;
  } catch (error) {
    console.error('Error recalculating estimate:', error);
    return false;
  }
};

// Role and Permission Management
export const getRoles = async (
  setRoles: (data: RoleProps[]) => void,
  setFetching: (val: boolean) => void
) => {
  const headers = getAuthToken() as AuthTokenType;
  setFetching(true);
  try {
    const response: AxiosResponse = await axios.get(RolesUrl, headers);
    setRoles(response.data);
  } catch (error) {
    console.error('Error fetching roles:', error);
    setRoles([]);
  } finally {
    setFetching(false);
  }
};

export const getPermissions = async (
  setPermissions: (data: PermissionProps[]) => void,
  setFetching: (val: boolean) => void
) => {
  const headers = getAuthToken() as AuthTokenType;
  setFetching(true);
  try {
    const response: AxiosResponse = await axios.get(`${PermissionsUrl}?_t=${Date.now()}`, headers);
    setPermissions(response.data);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    setPermissions([]);
  } finally {
    setFetching(false);
  }
};

export const saveRole = async (role: RoleProps): Promise<boolean> => {
  const headers = getAuthToken();
  if (!headers) return false;
  try {
    if (role.id) {
      await axios.patch(`${RolesUrl}/${role.id}`, role, headers);
    } else {
      await axios.post(RolesUrl, role, headers);
    }
    return true;
  } catch (error) {
    console.error('Error saving role:', error);
    return false;
  }
};

export const deleteRole = async (id: number): Promise<boolean> => {
  const headers = getAuthToken();
  if (!headers) return false;
  try {
    await axios.delete(`${RolesUrl}/${id}`, headers);
    return true;
  } catch (error) {
    console.error('Error deleting role:', error);
    return false;
  }
};

// Estimate Template Functions
export const getEstimateTemplates = async (
  setTemplates: (data: EstimateTemplateProps[]) => void,
  setFetching: (val: boolean) => void
) => {
  const headers = getAuthToken() as AuthTokenType;
  setFetching(true);
  try {
    const response: AxiosResponse = await axios.get(EstimateTemplatesUrl, headers);
    setTemplates(response.data);
  } catch (error) {
    console.error('Error fetching templates:', error);
    setTemplates([]);
  } finally {
    setFetching(false);
  }
};

// Charge Category Functions
export const getChargeCategories = async (
  setCategories: (data: ChargeCategoryProps[]) => void,
  setFetching: (val: boolean) => void
) => {
  const headers = getAuthToken() as AuthTokenType;
  setFetching(true);
  try {
    const response: AxiosResponse = await axios.get(ChargeCategoriesUrl, headers);
    setCategories(response.data);
  } catch (error) {
    console.error('Error fetching charge categories:', error);
    setCategories([]);
  } finally {
    setFetching(false);
  }
};

// Customer Activities
export const getCustomerActivities = async (
  customerId: string | number,
  setActivities: (data: CustomerActivityProps[]) => void,
  setFetching: (val: boolean) => void
) => {
  const headers = getAuthToken() as AuthTokenType;
  setFetching(true);
  try {
    const response: AxiosResponse = await axios.get(`${CustomerActivitiesUrl}?customer=${customerId}`, headers);
    setActivities(response.data);
  } catch (error) {
    console.error('Error fetching activities:', error);
    setActivities([]);
  } finally {
    setFetching(false);
  }
};

// Estimate Documents
export const getEstimateDocuments = async (
  estimateId: string | number,
  setDocuments: (data: EstimateDocumentProps[]) => void,
  setFetching: (val: boolean) => void
) => {
  const headers = getAuthToken() as AuthTokenType;
  setFetching(true);
  try {
    const response: AxiosResponse = await axios.get(`${EstimateDocumentsUrl}?estimate=${estimateId}`, headers);
    setDocuments(response.data);
  } catch (error) {
    console.error('Error fetching estimate documents:', error);
    setDocuments([]);
  } finally {
    setFetching(false);
  }
};

// PDF Blob Fetching (for document viewing)
export const fetchPdfBlob = async (url: string): Promise<string | null> => {
  try {
    const headers = getAuthToken() as AuthTokenType;
    const response = await axios.get(url, {
      ...headers,
      responseType: 'blob'
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    return blobUrl;
  } catch (error) {
    console.error('Error fetching PDF blob:', error);
    return null;
  }
};

// Accounting Functions
export const getInvoices = async (
  setInvoices: (data: InvoiceProps[]) => void,
  setFetching: (val: boolean) => void
) => {
  const headers = getAuthToken() as AuthTokenType;
  setFetching(true);
  try {
    const response: AxiosResponse = await axios.get(InvoicesUrl, headers);
    setInvoices(response.data);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    setInvoices([]);
  } finally {
    setFetching(false);
  }
};

export const getPayments = async (
  setPayments: (data: PaymentReceiptProps[]) => void,
  setFetching: (val: boolean) => void
) => {
  const headers = getAuthToken() as AuthTokenType;
  setFetching(true);
  try {
    const response: AxiosResponse = await axios.get(PaymentsUrl, headers);
    setPayments(response.data);
  } catch (error) {
    console.error('Error fetching payments:', error);
    setPayments([]);
  } finally {
    setFetching(false);
  }
};

export const getAccountingStats = async (
  setStats: (data: AccountingStatsProps | null) => void,
  setFetching: (val: boolean) => void
) => {
  const headers = getAuthToken() as AuthTokenType;
  setFetching(true);
  try {
    const response: AxiosResponse = await axios.get(AccountingUrl, headers);
    setStats(response.data);
  } catch (error) {
    console.error('Error fetching accounting stats:', error);
    setFetching(false);
  }
};


// Transaction Categories
export const getTransactionCategories = async (
  setCategories: (data: TransactionCategoryProps[]) => void,
  setFetching: (val: boolean) => void
) => {
  const headers = getAuthToken() as AuthTokenType;
  setFetching(true);
  try {
    const response: AxiosResponse = await axios.get(TransactionCategoriesUrl, headers);
    setCategories(response.data);
  } catch (error) {
    console.error('Error fetching transaction categories:', error);
    setCategories([]);
  } finally {
    setFetching(false);
  }
};

// Expenses
export const getExpenses = async (
  setExpenses: (data: any[]) => void,
  setFetching: (val: boolean) => void
) => {
  const headers = getAuthToken() as AuthTokenType;
  setFetching(true);
  try {
    const response: AxiosResponse = await axios.get(ExpensesUrl, headers);
    setExpenses(response.data);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    setExpenses([]);
  } finally {
    setFetching(false);
  }
};

// Purchases
export const getPurchases = async (
  setPurchases: (data: any[]) => void,
  setFetching: (val: boolean) => void
) => {
  const headers = getAuthToken() as AuthTokenType;
  setFetching(true);
  try {
    const response: AxiosResponse = await axios.get(PurchasesUrl, headers);
    setPurchases(response.data);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    setPurchases([]);
  } finally {
    setFetching(false);
  }
};












