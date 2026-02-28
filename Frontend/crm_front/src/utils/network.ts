export const BaseUrl = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api/"
export const FrontendUrl = process.env.REACT_APP_FRONTEND_URL || "http://127.0.0.1:3000"


export const LoginUrl = BaseUrl + "user/login"
export const MeUrl = BaseUrl + "user/Me"
export const CreateUserUrl = BaseUrl + "user/create-user"
export const UsersUrl = BaseUrl + "user/users"
export const GlobalUsersUrl = BaseUrl + "user/users/global_users"
export const OrganizationsUrl = BaseUrl + "user/organizations"
export const UpdatePasswordUrl = BaseUrl + "user/update-password"
export const ForgotPasswordUrl = BaseUrl + "user/ForgotPasswordView"
export const ResetPasswordUrl = BaseUrl + "user/ResetPasswordView"
export const RolesUrl = BaseUrl + "user/roles"
export const PermissionsUrl = BaseUrl + "user/permissions"

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

// Accounting URLs
export const InvoicesUrl = BaseUrl + "transactiondata/invoices"
export const PaymentsUrl = BaseUrl + "transactiondata/payments"
export const AccountingUrl = BaseUrl + "transactiondata/accounting"

// Public URLs
export const LeadIngestionUrl = BaseUrl + "masterdata/lead-ingestion"
export const EndpointsUrl = BaseUrl + "masterdata/endpoint-configs"
export const RawEndpointLeadsUrl = BaseUrl + "masterdata/raw-endpoint-leads"
export const SchedulesUrl = BaseUrl + "masterdata/schedules"

export const FeedbackUrl = BaseUrl + "transactiondata/feedback"

// Contractor URLs
export const WorkOrdersUrl = BaseUrl + "transactiondata/work-orders"
export const ContractorLineItemsUrl = BaseUrl + "transactiondata/contractor-line-items"
export const TransactionCategoriesUrl = BaseUrl + "transactiondata/categories";
export const ExpensesUrl = BaseUrl + "transactiondata/expenses";
export const PurchasesUrl = BaseUrl + "transactiondata/purchases";

// Site Visit URLs
export const SiteVisitsUrl = BaseUrl + "sitevisits/visits"
export const SiteVisitObservationsUrl = BaseUrl + "sitevisits/observations"
export const SiteVisitPhotosUrl = BaseUrl + "sitevisits/photos"

// Table Settings URLs
export const tableDimensionsUrl = BaseUrl + "user/table-dimensions"
export const updateAllUsersTableDimensionsUrl = BaseUrl + "user/update-all-users-table-dimensions"

// Dashboard & Analytics
export const DashboardsUrl = BaseUrl + "dashboard/dashboards/"
export const AnalyticsDataUrl = BaseUrl + "dashboard/analytics/data/"
export const CustomMetricsUrl = BaseUrl + "dashboard/custom-metrics/"


