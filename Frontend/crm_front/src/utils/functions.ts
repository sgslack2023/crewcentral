import axios,{AxiosResponse} from "axios"
import {tokenName} from "./data"
import {
  MeUrl,UsersUrl,CustomersUrl,CustomerStatisticsUrl,BranchesUrl,ServiceTypesUrl,DocumentsUrl,DocumentMappingsUrl,
  MoveTypesUrl,RoomSizesUrl,
  ChargeCategoriesUrl,ChargeDefinitionsUrl,EstimateTemplatesUrl,TemplateLineItemsUrl,
  EstimatesUrl,EstimateLineItemsUrl,CustomerActivitiesUrl,EstimateDocumentsUrl
} from "./network"
import { 
  AuthTokenType,UserType,CustomerProps,CustomerStatsProps,BranchProps,ServiceTypeProps,DocumentProps,DocumentMappingProps,
  MoveTypeProps,RoomSizeProps,
  ChargeCategoryProps,ChargeDefinitionProps,EstimateTemplateProps,TemplateLineItemProps,
  EstimateProps,EstimateLineItemProps,CustomerActivityProps,EstimateDocumentProps
} from "./types"


export const getAuthToken= ():AuthTokenType|null=>{
    const accessToken =localStorage.getItem(tokenName)
    if(!accessToken){
        return null
    }

    return {headers:{Authorization:`Bearer ${accessToken}`}}

}

export const logout =()=>{
    localStorage.removeItem(tokenName)
    window.location.href="/login"

}

export const authHandler=async ():Promise<UserType | null>=>{
    const headers=getAuthToken()
        if(!headers){
            return null
    }
    const response:AxiosResponse =await axios.get(MeUrl,headers).catch(
        (e)=>{}
    ) as AxiosResponse
    if(response){
        return response.data as UserType
    }
    return null

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












