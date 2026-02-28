import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Login from "./pages/Login"
import CheckUser from "./pages/CheckUser"
import Home from "./pages/Home"
import AuthRoute from './components/AuthRoute';
import User from './pages/User';
import Customers from './pages/Customers';
import Branches from './pages/Branches';
import ServiceTypes from './pages/ServiceTypes';
import Documents from './pages/Documents';
import Settings from './pages/Settings';
import MoveTypes from './pages/MoveTypes';
import RoomSizes from './pages/RoomSizes';
import EstimateTemplates from './pages/EstimateTemplates';
import TemplateLineItems from './pages/TemplateLineItems';
import Estimates from './pages/Estimates';
import EstimateEditor from './pages/EstimateEditor';
import CustomerTimeline from './pages/CustomerTimeline';
import TimeWindows from './pages/TimeWindows';
import PublicEstimateView from './pages/PublicEstimateView';
import PublicDocumentSigning from './pages/PublicDocumentSigning';
import UpdateUserPassword from './pages/UpdateUserPassword';
import ResetPassword from './pages/ResetPassword';
import ForgetPassword from './pages/ForgotPassword';
import RequestAccount from './pages/RequestAccount';
import Finance from './pages/Finance';
import PublicFeedback from './pages/PublicFeedback';
import FeedbackList from './pages/FeedbackList';
import Organizations from './pages/Organizations';
import Endpoints from './pages/Endpoints';
import Membership from './pages/Membership';
import PublicWorkOrderPortal from './pages/PublicWorkOrderPortal';
import Deals from './pages/Deals';
import CustomDashboard from './pages/CustomDashboard';
import Schedulers from './pages/Schedulers';
import SiteVisits from './pages/SiteVisits';
import SiteVisitCapture from './pages/SiteVisitCapture';
import { DashboardProvider } from './contexts/DashboardContext';


function Router() {
  return (
    <BrowserRouter>
      <DashboardProvider>
        <Routes>

          <Route path="/login" element={<Login />} />
          <Route path="/check-user" element={<CheckUser />} />
          <Route path="/create-password" element={<UpdateUserPassword />} />
          <Route path="/forgotpassword" element={<ForgetPassword />} />
          <Route path="/resetpassword" element={<ResetPassword />} />
          <Route path="/signup" element={<RequestAccount />} />
          <Route path="/public-estimate/:token" element={<PublicEstimateView />} />
          <Route path="/sign-documents/:token" element={<PublicDocumentSigning />} />
          <Route path="/feedback/:token" element={<PublicFeedback />} />
          <Route path="/contractor/portal/:token" element={<PublicWorkOrderPortal />} />


          <Route path="/" element={<AuthRoute><Home /></AuthRoute>} />
          <Route path="/users" element={<AuthRoute><User /></AuthRoute>} />
          <Route path="/customers" element={<AuthRoute><Customers /></AuthRoute>} />
          <Route path="/customer-feedback" element={<AuthRoute><FeedbackList /></AuthRoute>} />
          <Route path="/branches" element={<AuthRoute><Branches /></AuthRoute>} />
          <Route path="/service-types" element={<AuthRoute><ServiceTypes /></AuthRoute>} />
          <Route path="/documents" element={<AuthRoute><Documents /></AuthRoute>} />
          <Route path="/move-types" element={<AuthRoute><MoveTypes /></AuthRoute>} />
          <Route path="/room-sizes" element={<AuthRoute><RoomSizes /></AuthRoute>} />
          <Route path="/time-windows" element={<AuthRoute><TimeWindows /></AuthRoute>} />
          <Route path="/estimate-templates" element={<AuthRoute><EstimateTemplates /></AuthRoute>} />
          <Route path="/template-line-items/:templateId" element={<AuthRoute><TemplateLineItems /></AuthRoute>} />
          <Route path="/estimates" element={<AuthRoute><Estimates /></AuthRoute>} />
          <Route path="/estimate-editor/:estimateId" element={<AuthRoute><EstimateEditor /></AuthRoute>} />
          <Route path="/customer-timeline/:customerId" element={<AuthRoute><CustomerTimeline /></AuthRoute>} />
          <Route path="/finance" element={<AuthRoute><Finance /></AuthRoute>} />
          <Route path="/deals" element={<AuthRoute><Deals /></AuthRoute>} />
          <Route path="/organizations" element={<AuthRoute><Organizations /></AuthRoute>} />
          <Route path="/endpoints" element={<AuthRoute><Endpoints /></AuthRoute>} />
          <Route path="/membership" element={<AuthRoute><Membership /></AuthRoute>} />
          <Route path="/settings" element={<AuthRoute><Settings /></AuthRoute>} />
          <Route path="/dashboard" element={<AuthRoute><CustomDashboard /></AuthRoute>} />
          <Route path="/schedulers" element={<AuthRoute><Schedulers /></AuthRoute>} />
          <Route path="/site-visits" element={<AuthRoute><SiteVisits /></AuthRoute>} />
          <Route path="/site-visit-capture/:visitId" element={<AuthRoute><SiteVisitCapture /></AuthRoute>} />




        </Routes>
      </DashboardProvider>
    </BrowserRouter>
  )
}
export default Router