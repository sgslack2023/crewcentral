//export const BaseUrl="http://127.0.0.1:8000/api/"

export const BaseUrl="http://3.17.95.130/api/"


export const LoginUrl = BaseUrl+ "user/login"
export const MeUrl = BaseUrl + "user/Me"
export const CreateUserUrl = BaseUrl + "user/create-user"
export const UsersUrl = BaseUrl + "user/users"
export const UpdatePasswordUrl = BaseUrl + "user/update-password"
export const ForgotPasswordUrl = BaseUrl + "user/ForgotPasswordView"
export const ResetPasswordUrl = BaseUrl + "user/ResetPasswordView"

// Customer Management URLs
export const CustomersUrl = BaseUrl + "masterdata/customers"
export const CustomerStatisticsUrl = BaseUrl + "masterdata/customer-statistics"

// Branch URLs
export const BranchesUrl = BaseUrl + "masterdata/branches"

// Service Type URLs
export const ServiceTypesUrl = BaseUrl + "masterdata/service-types"

// Document Library URLs
export const DocumentsUrl = BaseUrl + "masterdata/documents"
export const DocumentMappingsUrl = BaseUrl + "masterdata/document-mappings"

// Move Type URLs
export const MoveTypesUrl = BaseUrl + "masterdata/move-types"

// Room Size URLs
export const RoomSizesUrl = BaseUrl + "masterdata/room-sizes"

// Transaction Data URLs
export const ChargeCategoriesUrl = BaseUrl + "transactiondata/charge-categories"
export const ChargeDefinitionsUrl = BaseUrl + "transactiondata/charge-definitions"
export const EstimateTemplatesUrl = BaseUrl + "transactiondata/estimate-templates"
export const TemplateLineItemsUrl = BaseUrl + "transactiondata/template-line-items"
export const EstimatesUrl = BaseUrl + "transactiondata/estimates"
export const EstimateLineItemsUrl = BaseUrl + "transactiondata/estimate-line-items"
export const CustomerActivitiesUrl = BaseUrl + "transactiondata/customer-activities"
export const EstimateDocumentsUrl = BaseUrl + "transactiondata/estimate-documents"



