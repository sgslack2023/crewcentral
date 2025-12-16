import  {AxiosError} from 'axios'

export interface DataProps{
    [key: string]:string|boolean|number|null|React.ReactElement|((text: string) => React.ReactNode)| undefined;
    
 
}

export interface CustomAxiosError extends Omit<AxiosError,'response'>{
    response? :{
        data:{
            error?:string
            message?:string
            status?:string
        } 
    }
}

export interface AuthTokenType{
    headers:{
        Authorization:string}
}

export interface UserType{
    email:string
    fullname:string
    id:number
    created_at:string
    role:string
    last_login:string
    
}

export interface AuthProps{
    errorCallBack?:()=>void,
    successCallBack?:()=>void,
}


export interface StoreProps{
    user:UserType | null,
    updatePasswordUserId:number|null
}

export enum ActionTypes{
    UPDATE_USER_INFO ="[action] update user info",
    UPDATE_PASSWORD_USER_ID ="[action] update password id"
}

export type ActionProps={
    type: ActionTypes.UPDATE_USER_INFO,
    payload:UserType | null
}| {
    type: ActionTypes.UPDATE_PASSWORD_USER_ID,
    payload:number | null
}

export interface StoreProviderProps{
    state:StoreProps,
    dispatch:(arg:ActionProps)=>void
}




export interface UserProps{
    created_at:string
    email:string
    fullname:string
    is_active:boolean
    last_login:string
    role:string
    key?:number
    id:number
    approved?:boolean
    denial_reason?:string
  
}
  

 
  export interface AddGroupFormModalProps{
    isVisible?:boolean
    onSuccessCallBack:()=>void
    onClose: () =>void
}

export interface AddUserFormModalProps{
    isVisible?:boolean
    onSuccessCallBack:()=>void
    onClose: () =>void
    editingUser?: UserProps | null;
    onCloseWithoutEditing:()=>void

}

// Customer Management Types
export interface CustomerProps {
    id?: number;
    job_number?: number;
    full_name: string;
    email: string;
    phone?: string;
    company?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    source: string;
    stage: string;
    assigned_to?: number;
    assigned_to_name?: string;
    service_type?: number;
    service_type_name?: string;
    move_date?: string;
    move_size?: number;
    move_size_name?: string;
    branch?: number;
    branch_name?: string;
    origin_address?: string;
    destination_address?: string;
    notes?: string;
    created_at?: string;
    updated_at?: string;
    created_by?: number;
    created_by_name?: string;
}

export interface CustomerStatsProps {
    total_customers: number;
    total_leads: number;
    unassigned_leads: number;
    by_stage: Record<string, number>;
    by_source: Record<string, number>;
}

// Branch Types
export interface BranchProps {
    id?: number;
    name: string;
    destination?: string;
    dispatch_location: string;
    sales_tax_percentage?: number;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
    created_by?: number;
    created_by_name?: string;
}

// Service Type Types
export interface ServiceTypeProps {
    id?: number;
    service_type: string;
    scaling_factor: number;
    color?: string;
    enabled?: boolean;
    created_at?: string;
    updated_at?: string;
    created_by?: number;
    created_by_name?: string;
}

// Time Window Types
export interface TimeWindowProps {
    id?: number;
    name: string;
    start_time: string;
    end_time: string;
    time_display?: string;
    is_active?: boolean;
    display_order?: number;
    created_at?: string;
    updated_at?: string;
    created_by?: number;
    created_by_name?: string;
}

// Document Library Types
export interface DocumentProps {
    id?: number;
    title: string;
    description?: string;
    file?: any;
    file_url?: string;
    document_type?: string;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
    created_by?: number;
    created_by_name?: string;
    service_types?: string[];
    branches?: string[];
}

// Document Mapping Types
export interface DocumentMappingProps {
    id?: number;
    document: number;
    document_title?: string;
    service_type?: number;
    service_type_name?: string;
    branch?: number;
    branch_name?: string;
    created_at?: string;
    created_by?: number;
    created_by_name?: string;
}

// Move Type Types
export interface MoveTypeProps {
    id?: number;
    name: string;
    description?: string;
    cubic_feet: number;
    weight: number;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
    created_by?: number;
    created_by_name?: string;
}

// Room Size Types
export interface RoomSizeProps {
    id?: number;
    name: string;
    description?: string;
    cubic_feet: number;
    weight: number;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
    created_by?: number;
    created_by_name?: string;
}

// Charge Category Types
export interface ChargeCategoryProps {
    id?: number;
    name: string;
    description?: string;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
    created_by?: number;
    created_by_name?: string;
}

// Charge Definition Types
export interface ChargeDefinitionProps {
    id?: number;
    name: string;
    category: number;
    category_name?: string;
    charge_type: string;
    default_rate?: number;
    default_percentage?: number;
    percent_applied_on?: number;
    percent_applied_on_name?: string;
    applies_to: number[];
    applies_to_names?: string[];
    is_required?: boolean;
    is_active?: boolean;
    is_estimate_only?: boolean;
    created_at?: string;
    updated_at?: string;
    created_by?: number;
    created_by_name?: string;
}

// Template Line Item Types
export interface TemplateLineItemProps {
    id?: number;
    template: number;
    charge: number;
    charge_name?: string;
    charge_type?: string;
    category_name?: string;
    rate?: number;
    percentage?: number;
    is_editable?: boolean;
    display_order?: number;
}

// Estimate Template Types
export interface EstimateTemplateProps {
    id?: number;
    name: string;
    service_type: number;
    service_type_name?: string;
    description?: string;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
    created_by?: number;
    created_by_name?: string;
    items?: TemplateLineItemProps[];
    items_count?: number;
}

// Estimate Line Item Types
export interface EstimateLineItemProps {
    id?: number;
    estimate: number;
    charge?: number;
    charge_name: string;
    charge_type: string;
    category_name?: string;
    rate?: number;
    percentage?: number;
    quantity?: number;
    amount?: number;
    is_user_modified?: boolean;
    display_order?: number;
}

// Estimate Types
export interface EstimateProps {
    id?: number;
    customer: number;
    customer_name?: string;
    customer_job_number?: number;
    template_used?: number;
    template_name?: string;
    service_type: number;
    service_type_name?: string;
    weight_lbs?: number;
    labour_hours?: number;
    pickup_date_from?: string;
    pickup_date_to?: string;
    pickup_time_window?: number | null;
    pickup_time_window_display?: string;
    delivery_date_from?: string;
    delivery_date_to?: string;
    delivery_time_window?: number | null;
    delivery_time_window_display?: string;
    origin_address?: string;
    destination_address?: string;
    subtotal?: number;
    tax_percentage?: number;
    tax_amount?: number;
    total_amount?: number;
    status?: string;
    notes?: string;
    created_at?: string;
    updated_at?: string;
    created_by?: number;
    created_by_name?: string;
    items?: EstimateLineItemProps[];
    items_count?: number;
    public_token?: string;
    email_sent_at?: string;
    customer_viewed_at?: string;
    customer_responded_at?: string;
    link_active?: boolean;
    document_signing_token?: string;
}

// Customer Activity Types
export interface CustomerActivityProps {
    id?: number;
    customer: number;
    customer_name?: string;
    estimate?: number;
    estimate_id?: number;
    activity_type: string;
    title: string;
    description?: string;
    created_at?: string;
    created_by?: number;
    created_by_name?: string;
}

// Estimate Document Types
export interface EstimateDocumentProps {
    id?: number;
    estimate: number;
    document: number;
    document_title?: string;
    document_url?: string;
    document_type?: string;
    processed_content?: string;
    requires_signature?: boolean;
    customer_viewed?: boolean;
    customer_viewed_at?: string;
    customer_signed?: boolean;
    customer_signed_at?: string;
    customer_signature?: string;
    signature_count?: number;
    signatures_required?: number;
    created_at?: string;
}
 