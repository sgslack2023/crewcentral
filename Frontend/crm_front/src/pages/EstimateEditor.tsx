import React, { useState, useEffect } from 'react';
import {
  Card, Button, Tag, notification, Table, InputNumber,
  Space, Avatar, DatePicker, Select, Modal, Form,
  Radio, Input, Tabs, Tooltip, Empty, Divider,
  List, Typography
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  CalculatorOutlined,
  DollarOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  UserOutlined,
  TagsOutlined,
  FileTextOutlined,
  TeamOutlined,
  PlusOutlined,
  DeleteOutlined,
  SendOutlined,
  CopyOutlined,
  PercentageOutlined,
  CalendarOutlined,
  TagOutlined,
  FilePdfOutlined,
  CameraOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  getAuthToken, getEstimateById, recalculateEstimate,
  getEstimateDocuments, getCurrentUser
} from '../utils/functions';
import {
  EstimatesUrl, EstimateLineItemsUrl, EstimateDocumentsUrl, FrontendUrl,
  BaseUrl, OrganizationsUrl, WorkOrdersUrl,
  ContractorLineItemsUrl, SiteVisitsUrl, InvoicesUrl,
  PaymentsUrl
} from '../utils/network';
import {
  EstimateProps, EstimateLineItemProps, EstimateDocumentProps,
  TimeWindowProps, AuthTokenType, DocumentProps,
  WorkOrderProps, ContractorEstimateLineItemProps,
  SiteVisitProps, SiteVisitObservationProps, SiteVisitPhotoProps
} from '../utils/types';
import { fullname, role, email } from '../utils/data';
import Header from '../components/Header';
import AddEstimateLineItemForm from '../components/AddEstimateLineItemForm';
import AttachDocumentsForm from '../components/AttachDocumentsForm';
import { WhiteButton, BlackButton } from '../components';

const TimeWindowsUrl = BaseUrl + 'transactiondata/time-windows';
const { Option } = Select;

// Discount Modal Component
const DiscountModal: React.FC<{
  visible: boolean;
  estimate: EstimateProps | null;
  estimateId: string | undefined;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ visible, estimate, estimateId, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [discountType, setDiscountType] = useState<'flat' | 'percent' | null>(
    estimate?.discount_type || null
  );

  useEffect(() => {
    if (visible && estimate) {
      form.setFieldsValue({
        discount_type: estimate.discount_type || 'flat',
        discount_value: estimate.discount_value || 0
      });
      setDiscountType(estimate.discount_type || 'flat');
    }
  }, [visible, estimate, form]);

  const handleSubmit = async (values: any) => {
    try {
      const headers = getAuthToken() as AuthTokenType;
      await axios.patch(
        `${EstimatesUrl}/${estimateId}`,
        {
          discount_type: values.discount_type || null,
          discount_value: values.discount_value || null
        },
        headers
      );

      // Recalculate estimate
      if (estimateId) {
        await recalculateEstimate(parseInt(estimateId));
      }

      notification.success({
        message: 'Discount Applied',
        description: 'Discount has been applied and estimate recalculated.',
        title: 'Success'
      });

      onSuccess();
    } catch (error: any) {
      notification.error({
        message: 'Error',
        description: error.response?.data?.error || 'Failed to apply discount.',
        title: 'Error'
      });
    }
  };

  const handleClearDiscount = async () => {
    try {
      const headers = getAuthToken() as AuthTokenType;
      await axios.patch(
        `${EstimatesUrl}/${estimateId}`,
        {
          discount_type: null,
          discount_value: null
        },
        headers
      );

      if (estimateId) {
        await recalculateEstimate(parseInt(estimateId));
      }

      notification.success({
        message: 'Discount Removed',
        description: 'Discount has been removed.',
        title: 'Success'
      });

      onSuccess();
    } catch (error: any) {
      notification.error({
        message: 'Error',
        description: error.response?.data?.error || 'Failed to remove discount.',
        title: 'Error'
      });
    }
  };

  return (
    <Modal
      title="Apply Discount"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          label="Discount Type"
          name="discount_type"
          rules={[{ required: true, message: 'Please select discount type' }]}
        >
          <Radio.Group onChange={(e) => setDiscountType(e.target.value)}>
            <Radio value="flat">Flat Amount</Radio>
            <Radio value="percent">Percentage</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          label="Discount Value"
          name="discount_value"
          rules={[
            { required: true, message: 'Please enter discount value' },
            { type: 'number', min: 0, message: 'Discount must be greater than or equal to 0' }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={0.01}
            precision={2}
            placeholder={discountType === 'percent' ? 'Enter percentage' : 'Enter amount'}
            addonAfter={discountType === 'percent' ? '%' : '$'}
          />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <WhiteButton onClick={handleClearDiscount}>
              Clear Discount
            </WhiteButton>
            <BlackButton htmlType="submit">
              Apply Discount
            </BlackButton>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

const EstimateEditor: React.FC = () => {
  const navigate = useNavigate();
  const { estimateId } = useParams<{ estimateId: string }>();
  const [estimate, setEstimate] = useState<EstimateProps | null>(null);
  const [lineItems, setLineItems] = useState<EstimateLineItemProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [editedValues, setEditedValues] = useState<Record<number, any>>({});
  const [isAddLineItemVisible, setIsAddLineItemVisible] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [attachedDocuments, setAttachedDocuments] = useState<EstimateDocumentProps[]>([]);
  const [isAttachDocsVisible, setIsAttachDocsVisible] = useState(false);
  const [sendingDocs, setSendingDocs] = useState(false);
  const [editingTax, setEditingTax] = useState(false);
  const [tempTaxPercentage, setTempTaxPercentage] = useState<number>(0);
  const [editingDates, setEditingDates] = useState(false);
  const [tempPickupFrom, setTempPickupFrom] = useState<any>(null);
  const [tempPickupTo, setTempPickupTo] = useState<any>(null);
  const [tempPickupTimeWindow, setTempPickupTimeWindow] = useState<number | null>(null);
  const [tempDeliveryFrom, setTempDeliveryFrom] = useState<any>(null);
  const [tempDeliveryTo, setTempDeliveryTo] = useState<any>(null);
  const [tempDeliveryTimeWindow, setTempDeliveryTimeWindow] = useState<number | null>(null);
  const [timeWindows, setTimeWindows] = useState<TimeWindowProps[]>([]);
  const [editingWeightHours, setEditingWeightHours] = useState(false);
  const [tempWeight, setTempWeight] = useState<number | null>(null);
  const [tempLabourHours, setTempLabourHours] = useState<number | null>(null);
  const [isDiscountModalVisible, setIsDiscountModalVisible] = useState(false);
  const [editingExternalNotes, setEditingExternalNotes] = useState(false);
  const [tempExternalNotes, setTempExternalNotes] = useState('');
  const [editingContractor, setEditingContractor] = useState(false);
  const [tempContractor, setTempContractor] = useState<number | null>(null);
  const [contractors, setContractors] = useState<any[]>([]);
  const [documents, setDocuments] = useState<DocumentProps[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [invoicing, setInvoicing] = useState(false);
  const [activeTab, setActiveTab] = useState('customer');
  const [workOrders, setWorkOrders] = useState<WorkOrderProps[]>([]);
  const internalWorkOrder = workOrders.find(wo => String(wo.work_order_type).toLowerCase() === 'internal');
  const externalWorkOrder = workOrders.find(wo => String(wo.work_order_type).toLowerCase() === 'external' || !wo.work_order_type);
  const [contractorLineItems, setContractorLineItems] = useState<ContractorEstimateLineItemProps[]>([]);
  const [generatingWorkOrder, setGeneratingWorkOrder] = useState(false);
  const [editingContractorKey, setEditingContractorKey] = useState<number | null>(null);
  const [editedContractorValues, setEditedContractorValues] = useState<Record<number, any>>({});
  const [isWOModalVisible, setIsWOModalVisible] = useState(false);
  const [siteVisits, setSiteVisits] = useState<SiteVisitProps[]>([]);

  const currentUser = getCurrentUser();

  useEffect(() => {
    if (estimateId) {
      fetchEstimate();
      fetchAttachedDocuments();
      fetchTimeWindows();
      fetchContractors();
      fetchDocuments();
      fetchWorkOrder();
      fetchInvoices();
      fetchPayments();
    }
  }, [estimateId]);

  const fetchEstimate = async () => {
    if (!estimateId) return;
    setLoading(true);
    const data = await getEstimateById(estimateId);
    if (data) {
      setEstimate(data);
      setLineItems(data.items || []);

      if (data.customer) {
        fetchSiteVisits(data.customer);
      }
    } else {
      notification.error({
        message: 'Error',
        description: 'Failed to fetch estimate details',
        title: 'Error'
      });
    }
    setLoading(false);
  };

  const fetchWorkOrder = async () => {
    if (!estimateId) return;
    try {
      const headers = getAuthToken() as any;
      const response = await axios.get(`${WorkOrdersUrl}?estimate_id=${estimateId}`, headers);
      // Handle both paginated and non-paginated responses
      const data = response.data.results || response.data;
      if (Array.isArray(data)) {
        setWorkOrders(data);
        const extWO = data.find((wo: any) => wo.work_order_type === 'external' || !wo.work_order_type);
        if (extWO) {
          fetchContractorLineItems(extWO.id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch work orders', error);
    }
  };

  const fetchContractorLineItems = async (workOrderId: number) => {
    try {
      const headers = getAuthToken() as any;
      const response = await axios.get(`${ContractorLineItemsUrl}?work_order_id=${workOrderId}`, headers);
      setContractorLineItems(response.data.results ? response.data.results : response.data);
    } catch (error) {
      console.error('Error fetching contractor line items:', error);
    }
  };

  const fetchSiteVisits = async (customerId: number) => {
    try {
      const headers = getAuthToken() as any;
      const response = await axios.get(`${SiteVisitsUrl}?customer=${customerId}`, headers);
      setSiteVisits(response.data);
    } catch (error) {
      console.error('Error fetching site visits:', error);
    }
  };

  const fetchTimeWindows = async () => {
    try {
      const headers = getAuthToken() as any;
      const response = await axios.get(`${TimeWindowsUrl}/simple`, headers);
      setTimeWindows(response.data);
    } catch (error) {
      console.error('Error fetching time windows:', error);
    }
  };

  const fetchContractors = async () => {
    try {
      const headers = getAuthToken() as any;
      const response = await axios.get(`${OrganizationsUrl}?type=contractor`, headers);
      setContractors(response.data.results ? response.data.results : response.data);
    } catch (error) {
      console.error('Error fetching contractors:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const headers = getAuthToken() as any;
      const response = await axios.get(`${BaseUrl}masterdata/documents`, headers);
      setDocuments(response.data.results ? response.data.results : response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchInvoices = async () => {
    if (!estimateId) return;
    try {
      const headers = getAuthToken() as any;
      const response = await axios.get(`${InvoicesUrl}?estimate_id=${estimateId}`, headers);
      const data = response.data.results || response.data;
      if (Array.isArray(data)) {
        setInvoices(data);
      }
    } catch (error) {
      console.error('Failed to fetch invoices', error);
    }
  };

  const fetchPayments = async () => {
    if (!estimateId) return;
    try {
      const headers = getAuthToken() as any;
      const response = await axios.get(`${PaymentsUrl}?estimate_id=${estimateId}`, headers);
      const data = response.data.results || response.data;
      if (Array.isArray(data)) {
        setPayments(data);
      }
    } catch (error) {
      console.error('Failed to fetch payments', error);
    }
  };

  const handleUpdateExternalNotes = async () => {
    if (!estimateId) return;
    try {
      const headers = getAuthToken() as any;
      await axios.patch(`${EstimatesUrl}/${estimateId}`, {
        external_notes: tempExternalNotes
      }, headers);
      notification.success({
        message: 'Saved',
        description: 'External notes updated successfully',
        title: 'Success'
      });
      setEditingExternalNotes(false);
      fetchEstimate();
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'Failed to update external notes',
        title: 'Error'
      });
    }
  };

  const handleUpdateContractor = async () => {
    if (!estimateId) return;
    try {
      const headers = getAuthToken() as any;
      await axios.patch(`${EstimatesUrl}/${estimateId}`, {
        assigned_contractor: tempContractor
      }, headers);
      notification.success({
        message: 'Saved',
        description: 'Contractor assigned successfully',
        title: 'Success'
      });
      setEditingContractor(false);
      fetchEstimate();
      fetchWorkOrder();
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'Failed to assign contractor',
        title: 'Error'
      });
    }
  };

  const handleRecalculate = async () => {
    if (!estimateId) return;
    const success = await recalculateEstimate(estimateId);
    if (success) {
      notification.success({
        message: 'Recalculated',
        description: 'Estimate has been recalculated successfully',
        title: 'Success'
      });
      fetchEstimate();
    } else {
      notification.error({
        message: 'Recalculation Error',
        description: 'Failed to recalculate estimate',
        title: 'Error'
      });
    }
  };


  const handleInvoiceEstimate = async () => {
    if (!estimateId) return;
    setInvoicing(true);
    try {
      const headers = getAuthToken() as any;
      await axios.post(`${EstimatesUrl}/${estimateId}/change_status`, {
        status: 'invoiced'
      }, headers);
      notification.success({
        message: 'Invoiced',
        description: 'Estimate converted to Invoice and PDF generated',
        title: 'Success'
      });
      fetchEstimate();
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'Failed to invoice estimate',
        title: 'Error'
      });
    } finally {
      setInvoicing(false);
    }
  };

  const handleGenerateWorkOrder = async () => {
    if (!estimateId) return;
    setGeneratingWorkOrder(true);
    try {
      const headers = getAuthToken() as any;
      const response = await axios.post(`${EstimatesUrl}/${estimateId}/generate_work_order`, {}, headers);
      if (response.data.success) {
        notification.success({
          message: 'Work Order Generated',
          description: response.data.message,
          title: 'Success'
        });
        fetchWorkOrder();
        setActiveTab('contractor');
      } else {
        notification.error({
          message: 'Error',
          description: response.data.message,
          title: 'Error'
        });
      }
    } catch (error: any) {
      notification.error({
        message: 'Error',
        description: error.response?.data?.message || 'Failed to generate work order',
        title: 'Error'
      });
    } finally {
      setGeneratingWorkOrder(false);
    }
  };

  const handleShareWorkOrder = async () => {
    if (!externalWorkOrder) return;

    try {
      const headers = getAuthToken() as AuthTokenType;
      const response = await axios.post(`${WorkOrdersUrl}/${externalWorkOrder.id}/share`, {}, headers);
      if (response.data.public_token) {
        notification.success({
          message: 'Sharing Link Generated',
          description: 'A sharing link has been generated. You can now copy the link to share with the contractor.',
          title: 'Success'
        });
        fetchWorkOrder();
      }
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'Failed to generate sharing link',
        title: 'Error'
      });
    }
  };

  const handleUpdateWorkOrderStatus = async (woId: number, status: string) => {
    try {
      const headers = getAuthToken() as AuthTokenType;
      await axios.patch(`${WorkOrdersUrl}/${woId}/update_status`, { status }, headers);
      notification.success({
        message: 'Status Updated',
        description: `Work order status changed to ${status}`,
        title: 'Success'
      });
      fetchWorkOrder();
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'Failed to update status',
        title: 'Error'
      });
    }
  };

  const handleSaveContractorLineItem = async (itemId: number) => {
    const values = editedContractorValues[itemId];
    if (!values) return;

    try {
      const headers = getAuthToken() as any;
      await axios.patch(`${ContractorLineItemsUrl}/${itemId}`, values, headers);
      notification.success({
        message: 'Saved',
        description: 'Contractor item updated',
        title: 'Success'
      });
      setEditingContractorKey(null);
      if (externalWorkOrder?.id) fetchContractorLineItems(externalWorkOrder.id);
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'Failed to update contractor item',
        title: 'Error'
      });
    }
  };

  const handleFieldChangeContractor = (itemId: number, field: string, value: any) => {
    setEditedContractorValues(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        [field]: value
      }
    }));
  };

  const handleGenerateWorkOrderPDF = async () => {
    if (!externalWorkOrder) return;
    try {
      const headers = getAuthToken() as any;
      await axios.post(`${WorkOrdersUrl}/${externalWorkOrder.id}/generate_pdf`, {}, headers);
      notification.success({
        message: 'PDF Generated',
        description: 'Work order PDF has been generated successfully',
        title: 'Success'
      });
      fetchWorkOrder();
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'Failed to generate work order PDF',
        title: 'Error'
      });
    }
  };

  const handleConvertToWorkOrder = async () => {
    if (!estimateId) return;
    setGeneratingWorkOrder(true);
    try {
      const headers = getAuthToken() as any;
      const response = await axios.post(`${EstimatesUrl}/${estimateId}/convert_to_work_order`, {}, headers);

      notification.success({
        message: 'Converted',
        description: 'Estimate converted to internal work order',
        title: 'Success'
      });

      // Update work orders state directly from the created work order
      if (response.data) {
        setWorkOrders(prev => {
          // Check if it already exists to avoid duplicates
          if (prev.find(wo => wo.id === response.data.id)) return prev;
          return [...prev, response.data];
        });
      }

      await fetchEstimate();
      // await fetchWorkOrder(); // No need if we updated state directly, but safe to keep or remove
      setActiveTab('internal_wo');
    } catch (error: any) {
      notification.error({
        message: 'Error',
        description: error.response?.data?.error || 'Failed to convert to work order',
        title: 'Error'
      });
    } finally {
      setGeneratingWorkOrder(false);
    }
  };

  const handleGenerateInvoiceFromWO = async (woId: number) => {
    setInvoicing(true);
    try {
      const headers = getAuthToken() as any;
      await axios.post(`${WorkOrdersUrl}/${woId}/generate_invoice`, {}, headers);
      notification.success({
        message: 'Invoiced',
        description: 'Invoice generated successfully',
        title: 'Success'
      });
      await fetchEstimate();
      await fetchWorkOrder();
      await fetchInvoices();
    } catch (error: any) {
      notification.error({
        message: 'Error',
        description: error.response?.data?.error || 'Failed to generate invoice',
        title: 'Error'
      });
    } finally {
      setInvoicing(false);
    }
  };

  const handleUpdateTaxPercentage = async () => {
    if (!estimateId || !estimate) return;

    try {
      const headers = getAuthToken() as any;
      await axios.patch(`${EstimatesUrl}/${estimateId}`, {
        tax_percentage: tempTaxPercentage
      }, headers);

      // Recalculate to update tax amount and total
      await recalculateEstimate(estimateId);

      notification.success({
        message: 'Tax Updated',
        description: 'Sales tax percentage has been updated',
        title: 'Success'
      });

      setEditingTax(false);
      fetchEstimate();
    } catch (error) {
      notification.error({
        message: 'Update Error',
        description: 'Failed to update tax percentage',
        title: 'Error'
      });
    }
  };

  const handleUpdateDates = async () => {
    if (!estimateId || !estimate) return;

    try {
      const headers = getAuthToken() as any;
      await axios.patch(`${EstimatesUrl}/${estimateId}`, {
        pickup_date_from: tempPickupFrom ? tempPickupFrom.format('YYYY-MM-DD') : null,
        pickup_date_to: tempPickupTo ? tempPickupTo.format('YYYY-MM-DD') : null,
        pickup_time_window: tempPickupTimeWindow,
        delivery_date_from: tempDeliveryFrom ? tempDeliveryFrom.format('YYYY-MM-DD') : null,
        delivery_date_to: tempDeliveryTo ? tempDeliveryTo.format('YYYY-MM-DD') : null,
        delivery_time_window: tempDeliveryTimeWindow
      }, headers);

      notification.success({
        message: 'Dates Updated',
        description: 'Pickup and delivery dates have been updated',
        title: 'Success'
      });

      setEditingDates(false);
      fetchEstimate();
    } catch (error) {
      notification.error({
        message: 'Update Error',
        description: 'Failed to update dates',
        title: 'Error'
      });
    }
  };

  const handleUpdateWeightHours = async () => {
    if (!estimateId || !estimate) return;

    try {
      const headers = getAuthToken() as any;
      await axios.patch(`${EstimatesUrl}/${estimateId}`, {
        weight_lbs: tempWeight,
        labour_hours: tempLabourHours
      }, headers);

      // Recalculate to update any weight/hour-dependent charges
      await recalculateEstimate(estimateId);

      notification.success({
        message: 'Updated',
        description: 'Weight and labour hours have been updated',
        title: 'Success'
      });

      setEditingWeightHours(false);
      fetchEstimate();
    } catch (error) {
      notification.error({
        message: 'Update Error',
        description: 'Failed to update weight and labour hours',
        title: 'Error'
      });
    }
  };

  const handleEdit = (record: EstimateLineItemProps) => {
    setEditingKey(record.id!);
    setEditedValues({
      ...editedValues,
      [record.id!]: {
        rate: record.rate,
        percentage: record.percentage,
        quantity: record.quantity
      }
    });
  };

  const handleSaveLineItem = async (lineItemId: number) => {
    try {
      const headers = getAuthToken() as any;
      const values = editedValues[lineItemId];

      await axios.patch(`${EstimateLineItemsUrl}/${lineItemId}`, values, headers);

      notification.success({
        message: 'Line Item Updated',
        description: 'Line item has been updated. Recalculating...',
        title: 'Success'
      });

      setEditingKey(null);
      // Recalculate happens automatically in backend on update
      fetchEstimate();
    } catch (error) {
      notification.error({
        message: 'Update Error',
        description: 'Failed to update line item',
        title: 'Error'
      });
    }
  };

  const handleCancel = () => {
    setEditingKey(null);
  };

  const handleFieldChange = (lineItemId: number, field: string, value: any) => {
    setEditedValues({
      ...editedValues,
      [lineItemId]: {
        ...(editedValues[lineItemId] || {}),
        [field]: value
      }
    });
  };

  const handleDeleteLineItem = async (lineItemId: number) => {
    try {
      const headers = getAuthToken() as any;
      await axios.delete(`${EstimateLineItemsUrl}/${lineItemId}`, headers);

      notification.success({
        message: 'Line Item Deleted',
        description: 'Charge has been removed from the estimate.',
        title: 'Success'
      });

      fetchEstimate();
    } catch (error) {
      notification.error({
        message: 'Delete Error',
        description: 'Failed to delete line item',
        title: 'Error'
      });
    }
  };

  const handleSendToCustomer = async () => {
    setSendingEmail(true);
    try {
      const headers = getAuthToken() as any;

      const response = await axios.post(
        `${EstimatesUrl}/${estimateId}/send_to_customer`,
        { base_url: FrontendUrl },
        headers
      );

      if (response.data.success) {
        notification.success({
          message: 'Email Sent',
          description: `Estimate has been sent to ${estimate?.customer_name}`,
          title: 'Success'
        });
        fetchEstimate(); // Refresh to get updated status
      }
    } catch (error: any) {
      notification.error({
        message: 'Email Error',
        description: error.response?.data?.message || 'Failed to send email',
        title: 'Error'
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCopyPublicLink = () => {
    if (estimate?.public_token) {
      const publicLink = `${window.location.origin}/public-estimate/${estimate.public_token}`;
      navigator.clipboard.writeText(publicLink);
      notification.success({
        message: 'Link Copied',
        description: 'Public estimate link copied to clipboard',
        title: 'Success'
      });
    }
  };

  const handleDownloadPDF = async () => {
    if (!estimate || !estimateId) return;

    try {
      // Ensure public token exists
      let token = estimate.public_token;
      if (!token) {
        // Generate token if it doesn't exist
        const headers = getAuthToken() as AuthTokenType;
        const response = await axios.patch(
          `${EstimatesUrl}/${estimateId}`,
          {},
          headers
        );
        token = response.data.public_token;
      }

      if (token) {
        // Get backend URL - remove /api and any trailing slash
        const backendUrl = BaseUrl.replace('/api', '').replace(/\/$/, '');
        const pdfUrl = `${backendUrl}/api/transactiondata/estimates/download_pdf?token=${token}`;

        // Open in new window to trigger download
        window.open(pdfUrl, '_blank');
      }
    } catch (error: any) {
      notification.error({
        message: 'Download Error',
        description: error.response?.data?.error || 'Failed to download PDF',
        title: 'Error'
      });
    }
  };

  const fetchAttachedDocuments = async () => {
    if (!estimateId) return;
    getEstimateDocuments(estimateId, setAttachedDocuments, () => { });
  };

  const handleSendDocuments = async () => {
    if (attachedDocuments.length === 0) {
      notification.warning({
        message: 'No Documents',
        description: 'Please attach documents before sending',
        title: 'Warning'
      });
      return;
    }

    setSendingDocs(true);
    try {
      const headers = getAuthToken() as any;
      const baseUrl = window.location.origin;

      await axios.post(
        `${EstimatesUrl}/${estimateId}/send_documents_for_signature`,
        { base_url: baseUrl },
        headers
      );

      notification.success({
        message: 'Documents Sent',
        description: 'Document signature request sent to customer',
        title: 'Success'
      });
    } catch (error: any) {
      notification.error({
        message: 'Email Error',
        description: error.response?.data?.message || 'Failed to send documents',
        title: 'Error'
      });
    } finally {
      setSendingDocs(false);
    }
  };

  const handleCopyDocumentLink = () => {
    if (estimate?.document_signing_token) {
      const docLink = `${window.location.origin}/sign-documents/${estimate.document_signing_token}`;
      navigator.clipboard.writeText(docLink);
      notification.success({
        message: 'Link Copied',
        description: 'Document signing link copied to clipboard',
        title: 'Success'
      });
    } else {
      notification.warning({
        message: 'No Link Available',
        description: 'Please send documents for signature first to generate a link',
        title: 'Warning'
      });
    }
  };

  const contractorColumns = [
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => <span style={{ fontWeight: 600 }}>{text}</span>
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      render: (quantity: number) => <span>{Number(quantity).toFixed(2)}</span>
    },
    {
      title: 'Contractor Rate',
      dataIndex: 'contractor_rate',
      key: 'contractor_rate',
      width: 120,
      render: (rate: number, record: ContractorEstimateLineItemProps) => {
        const isEditing = editingContractorKey === record.id;
        return isEditing ? (
          <InputNumber
            value={editedContractorValues[record.id!]?.contractor_rate ?? rate}
            onChange={(value) => handleFieldChangeContractor(record.id!, 'contractor_rate', value)}
            style={{ width: '100%' }}
            min={0}
            step={0.01}
            prefix="$"
          />
        ) : (
          <span>${rate ? Number(rate).toFixed(2) : '0.00'}</span>
        );
      }
    },
    {
      title: 'Total Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      render: (amount: number) => (
        <span style={{ fontWeight: 600, color: '#5b6cf9' }}>
          ${amount ? Number(amount).toFixed(2) : '0.00'}
        </span>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (record: ContractorEstimateLineItemProps) => {
        const isEditing = editingContractorKey === record.id;
        return isEditing ? (
          <Space>
            <Button
              size="small"
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => handleSaveContractorLineItem(record.id!)}
            >
              Save
            </Button>
            <Button
              size="small"
              icon={<CloseOutlined />}
              onClick={() => setEditingContractorKey(null)}
            >
              Cancel
            </Button>
          </Space>
        ) : (
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingContractorKey(record.id!);
              setEditedContractorValues({
                [record.id!]: { contractor_rate: record.contractor_rate }
              });
            }}
          >
            Edit Rate
          </Button>
        );
      }
    }
  ];

  const columns = [
    {
      title: 'Order',
      dataIndex: 'display_order',
      key: 'display_order',
      width: 70,
      render: (order: number) => <Tag color="purple">{order}</Tag>
    },
    {
      title: 'Description',
      dataIndex: 'charge_name',
      key: 'charge_name',
      ellipsis: true,
      render: (name: string, record: EstimateLineItemProps) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            <Tag color="purple" style={{ fontSize: '10px' }}>{record.charge_type}</Tag>
            {record.category_name && <span>{record.category_name}</span>}
          </div>
        </div>
      )
    },
    {
      title: 'Rate',
      dataIndex: 'rate',
      key: 'rate',
      width: 110,
      render: (rate: number, record: EstimateLineItemProps) => {
        if (record.charge_type === 'percent') return '-';

        const isEditing = editingKey === record.id;
        return isEditing ? (
          <InputNumber
            value={editedValues[record.id!]?.rate ?? rate}
            onChange={(value) => handleFieldChange(record.id!, 'rate', value)}
            style={{ width: '100%' }}
            min={0}
            step={0.01}
            prefix="$"
          />
        ) : (
          <span>${rate ? Number(rate).toFixed(2) : '0.00'}</span>
        );
      }
    },
    {
      title: 'Percentage',
      dataIndex: 'percentage',
      key: 'percentage',
      width: 100,
      render: (percentage: number, record: EstimateLineItemProps) => {
        if (record.charge_type !== 'percent') return '-';

        const isEditing = editingKey === record.id;
        return isEditing ? (
          <InputNumber
            value={editedValues[record.id!]?.percentage ?? percentage}
            onChange={(value) => handleFieldChange(record.id!, 'percentage', value)}
            style={{ width: '100%' }}
            min={0}
            max={100}
            step={0.01}
            suffix="%"
          />
        ) : (
          <span>{percentage ? Number(percentage).toFixed(2) : '0.00'}%</span>
        );
      }
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 90,
      render: (quantity: number, record: EstimateLineItemProps) => {
        const isEditing = editingKey === record.id;
        return isEditing ? (
          <InputNumber
            value={editedValues[record.id!]?.quantity ?? quantity}
            onChange={(value) => handleFieldChange(record.id!, 'quantity', value)}
            style={{ width: '100%' }}
            min={0}
            step={0.1}
          />
        ) : (
          <span>{quantity ? Number(quantity).toFixed(2) : '1.00'}</span>
        );
      }
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 110,
      render: (amount: number) => {
        const amountNum = amount ? Number(amount) : 0;
        return (
          <span style={{ fontWeight: 600, color: '#5b6cf9' }}>
            ${amountNum.toFixed(2)}
          </span>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 130,
      render: (record: EstimateLineItemProps) => {
        const isEditing = editingKey === record.id;
        return isEditing ? (
          <Space>
            <Tooltip title="Save">
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => handleSaveLineItem(record.id!)}
              />
            </Tooltip>
            <Tooltip title="Cancel">
              <Button
                size="small"
                icon={<CloseOutlined />}
                onClick={handleCancel}
              />
            </Tooltip>
          </Space>
        ) : (
          <Space>
            <Tooltip title="Edit">
              <Button
                size="small"
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                disabled={editingKey !== null}
                style={{ color: '#5b6cf9' }}
              />
            </Tooltip>
            <Tooltip title="Delete">
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => record.id && handleDeleteLineItem(record.id)}
                disabled={editingKey !== null}
              />
            </Tooltip>
          </Space>
        );
      }
    }
  ];

  return (
    <div style={{ padding: '8px 16px 24px 16px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>
        {`
          .estimate-editor-tabs {
            display: flex;
            flex-direction: column;
            height: 100%;
            overflow: hidden;
          }
          .estimate-editor-tabs .ant-tabs-content-holder {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            min-height: 0;
          }
          .estimate-editor-tabs .ant-tabs-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            height: 100%;
          }
          .estimate-editor-tabs .ant-tabs-tabpane {
            flex: 1;
            display: flex;
            flex-direction: column;
            height: 100%;
            overflow: hidden;
          }
          .tab-scroll-container {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 12px;
            min-height: 0;
            display: flex;
            flex-direction: column;
          }

          /* Overrides for Purple Tabs */
          .estimate-editor-tabs .ant-tabs-nav::before {
            border-bottom-color: #f0f0f0;
          }
          .estimate-editor-tabs .ant-tabs-tab {
            color: #666;
            font-weight: 500;
          }
          .estimate-editor-tabs .ant-tabs-tab:hover {
            color: #5b6cf9 !important;
          }
          .estimate-editor-tabs .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
            color: #5b6cf9 !important;
            font-weight: 600;
            text-shadow: 0 0 0.25px currentcolor;
          }
          .estimate-editor-tabs .ant-tabs-ink-bar {
            background: #5b6cf9 !important;
          }
        `}
      </style>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: '#1a1a2e' }}>
                Review Estimate #{estimateId}
                {estimate?.customer_job_number && (
                  <span style={{ fontSize: '18px', color: '#8e8ea8', fontWeight: 400, marginLeft: '12px' }}>
                    (Job #{estimate.customer_job_number})
                  </span>
                )}
              </h1>
              {estimate && (
                <Tag color={estimate.status === 'draft' ? 'orange' : estimate.status === 'sent' ? 'purple' : estimate.status === 'approved' ? 'green' : estimate.status === 'work_order' ? 'purple' : estimate.status === 'invoiced' ? 'cyan' : 'red'} style={{ fontSize: '11px' }}>
                  {estimate.status?.toUpperCase()}
                </Tag>
              )}
            </div>
            <p style={{ color: '#8e8ea8', margin: '4px 0 0 0', fontSize: '13px' }}>
              Review and edit line items before finalizing
            </p>
          </div>
          <WhiteButton
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/customers')}
          >
            Back
          </WhiteButton>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Estimate Summary Card */}
        {estimate && (
          <div style={{ height: '100%', overflow: 'hidden' }}>
            <Card
              style={{
                borderRadius: '12px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
              bodyStyle={{
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
              }}
            >
              <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Customer & Service - Premium Compact */}
                  <div style={{
                    padding: '12px',
                    background: 'linear-gradient(135deg, #f0f2ff 0%, #ffffff 100%)',
                    borderRadius: '10px',
                    border: '1px solid #efdbff'
                  }}>
                    <div style={{ fontSize: '10px', color: '#5b6cf9', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      <UserOutlined /> Job Details
                    </div>
                    <div style={{ fontSize: '14px', color: '#1a1a2e', fontWeight: 600, marginBottom: '2px' }}>
                      {estimate.customer_name}
                    </div>
                    {estimate.customer_job_number && (
                      <div style={{ fontSize: '11px', color: '#8e8ea8', marginBottom: '8px' }}>
                        ID: #{estimate.customer_job_number}
                      </div>
                    )}
                    {estimate.service_type_name && (
                      <div style={{
                        marginTop: '8px',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(91, 108, 249, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <TagsOutlined style={{ color: '#5b6cf9', fontSize: '12px' }} />
                        <span style={{ fontSize: '12px', color: '#595959' }}>{estimate.service_type_name}</span>
                      </div>
                    )}
                    {estimate.template_name && (
                      <div style={{
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <FileTextOutlined style={{ color: '#5b6cf9', fontSize: '12px' }} />
                        <span style={{ fontSize: '11px', color: '#8c8c8c', fontStyle: 'italic' }}>{estimate.template_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Physical Specs & Logistics */}
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    border: '1px solid #f0f0f0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px'
                    }}>
                      <div style={{ fontSize: '10px', color: '#5b6cf9', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                        <TeamOutlined /> Logistics & Metrics
                      </div>
                      {!editingWeightHours && (
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => {
                            setEditingWeightHours(true);
                            setTempWeight(estimate.weight_lbs || null);
                            setTempLabourHours(estimate.labour_hours || null);
                          }}
                          style={{ padding: '0', height: 'auto', color: '#5b6cf9' }}
                        />
                      )}
                    </div>

                    {editingWeightHours ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '10px', color: '#8c8c8c', marginBottom: '4px' }}>WEIGHT (LBS)</div>
                            <InputNumber size="small" value={tempWeight} onChange={setTempWeight} style={{ width: '100%' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '10px', color: '#8c8c8c', marginBottom: '4px' }}>HOURS</div>
                            <InputNumber size="small" value={tempLabourHours} onChange={setTempLabourHours} style={{ width: '100%' }} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <Button size="small" type="primary" onClick={handleUpdateWeightHours} style={{ flex: 1, backgroundColor: '#5b6cf9' }}>Save</Button>
                          <Button size="small" onClick={() => setEditingWeightHours(false)} style={{ flex: 1 }}>X</Button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#8c8c8c', marginBottom: '2px' }}>Weight</div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{estimate.weight_lbs ? `${estimate.weight_lbs} lbs` : '—'}</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#8c8c8c', marginBottom: '2px' }}>Labour</div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{estimate.labour_hours ? `${Number(estimate.labour_hours).toFixed(1)} hrs` : '—'}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Schedule Matrix */}
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    border: '1px solid #f0f0f0'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px'
                    }}>
                      <div style={{ fontSize: '10px', color: '#5b6cf9', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                        <CalendarOutlined /> Schedule Matrix
                      </div>
                      {!editingDates && (
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => {
                            setEditingDates(true);
                            setTempPickupFrom(estimate.pickup_date_from ? dayjs(estimate.pickup_date_from, 'YYYY-MM-DD', true) : null);
                            setTempPickupTo(estimate.pickup_date_to ? dayjs(estimate.pickup_date_to, 'YYYY-MM-DD', true) : null);
                            setTempPickupTimeWindow(estimate.pickup_time_window || null);
                            setTempDeliveryFrom(estimate.delivery_date_from ? dayjs(estimate.delivery_date_from, 'YYYY-MM-DD', true) : null);
                            setTempDeliveryTo(estimate.delivery_date_to ? dayjs(estimate.delivery_date_to, 'YYYY-MM-DD', true) : null);
                            setTempDeliveryTimeWindow(estimate.delivery_time_window || null);
                          }}
                          style={{ padding: '0', height: 'auto', color: '#5b6cf9' }}
                        />
                      )}
                    </div>

                    {editingDates ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div>
                          <div style={{ fontSize: '10px', color: '#8c8c8c', marginBottom: '4px' }}>PICKUP RANGE</div>
                          <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                            <DatePicker value={tempPickupFrom} onChange={setTempPickupFrom} size="small" style={{ flex: 1 }} placeholder="Start" />
                            <DatePicker value={tempPickupTo} onChange={setTempPickupTo} size="small" style={{ flex: 1 }} placeholder="End" />
                          </div>
                          <Select size="small" value={tempPickupTimeWindow} onChange={setTempPickupTimeWindow} style={{ width: '100%' }} placeholder="Window" allowClear>
                            {timeWindows.map(tw => <Option key={tw.id} value={tw.id}>{tw.name}</Option>)}
                          </Select>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: '#8c8c8c', marginBottom: '4px' }}>DELIVERY RANGE</div>
                          <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                            <DatePicker value={tempDeliveryFrom} onChange={setTempDeliveryFrom} size="small" style={{ flex: 1 }} placeholder="Start" />
                            <DatePicker value={tempDeliveryTo} onChange={setTempDeliveryTo} size="small" style={{ flex: 1 }} placeholder="End" />
                          </div>
                          <Select size="small" value={tempDeliveryTimeWindow} onChange={setTempDeliveryTimeWindow} style={{ width: '100%' }} placeholder="Window" allowClear>
                            {timeWindows.map(tw => <Option key={tw.id} value={tw.id}>{tw.name}</Option>)}
                          </Select>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <Button size="small" type="primary" onClick={handleUpdateDates} style={{ flex: 2, backgroundColor: '#5b6cf9' }}>Apply Dates</Button>
                          <Button size="small" onClick={() => setEditingDates(false)} style={{ flex: 1 }}>X</Button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#8c8c8c', marginBottom: '2px' }}>Pickup</div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>
                            {estimate.pickup_date_from ? dayjs(estimate.pickup_date_from).format('MMM D') : '—'}
                            {estimate.pickup_date_to && ` to ${dayjs(estimate.pickup_date_to).format('MMM D')}`}
                          </div>
                          {estimate.pickup_time_window_display && <div style={{ fontSize: '10px', color: '#595959' }}>{estimate.pickup_time_window_display}</div>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#8c8c8c', marginBottom: '2px' }}>Delivery</div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>
                            {estimate.delivery_date_from ? dayjs(estimate.delivery_date_from).format('MMM D') : '—'}
                            {estimate.delivery_date_to && ` to ${dayjs(estimate.delivery_date_to).format('MMM D')}`}
                          </div>
                          {estimate.delivery_time_window_display && <div style={{ fontSize: '10px', color: '#595959' }}>{estimate.delivery_time_window_display}</div>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Contractor & External Notes - Unified Access */}
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    border: '1px solid #f0f0f0'
                  }}>
                    <div style={{ fontSize: '10px', color: '#5b6cf9', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                      <FileTextOutlined /> Execution Details
                    </div>

                    {/* Contractor */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '6px 8px',
                      backgroundColor: '#fafafa',
                      borderRadius: '6px',
                      marginBottom: '8px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '10px', color: '#8c8c8c' }}>CONTRACTOR</div>
                        <div style={{ fontSize: '12px', fontWeight: 500 }}>
                          {editingContractor ? (
                            <Select size="small" value={tempContractor} onChange={setTempContractor} style={{ width: '100%' }} allowClear>
                              {contractors.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                            </Select>
                          ) : (
                            estimate?.assigned_contractor_name || 'Unassigned'
                          )}
                        </div>
                      </div>
                      <Button
                        type="text"
                        size="small"
                        icon={editingContractor ? <CheckOutlined /> : <EditOutlined />}
                        onClick={editingContractor ? handleUpdateContractor : () => {
                          setEditingContractor(true);
                          setTempContractor(estimate.assigned_contractor || null);
                        }}
                        style={{ color: '#5b6cf9' }}
                      />
                    </div>

                    {/* External Notes */}
                    <div style={{
                      padding: '6px 8px',
                      backgroundColor: '#fafafa',
                      borderRadius: '6px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ fontSize: '10px', color: '#8c8c8c' }}>EXTERNAL NOTES</div>
                        <Button
                          type="text"
                          size="small"
                          icon={editingExternalNotes ? <CheckOutlined /> : <EditOutlined />}
                          onClick={editingExternalNotes ? handleUpdateExternalNotes : () => {
                            setEditingExternalNotes(true);
                            setTempExternalNotes(estimate.external_notes || '');
                          }}
                          style={{ color: '#5b6cf9', height: 'auto', padding: 0 }}
                        />
                      </div>
                      {editingExternalNotes ? (
                        <Input.TextArea size="small" value={tempExternalNotes} onChange={(e) => setTempExternalNotes(e.target.value)} autoSize={{ minRows: 2 }} style={{ fontSize: '11px' }} />
                      ) : (
                        <div style={{ fontSize: '11px', color: '#595959', fontStyle: estimate.external_notes ? 'normal' : 'italic' }}>
                          {estimate.external_notes || 'No customer-facing notes...'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial Overview */}
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{
                      padding: '16px 12px',
                      background: 'linear-gradient(135deg, #5b6cf9 0%, #531dab 100%)',
                      borderRadius: '10px',
                      textAlign: 'center',
                      boxShadow: '0 4px 12px rgba(91, 108, 249, 0.2)'
                    }}>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                        Settlement Amount
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff' }}>
                        ${estimate.total_amount ? Number(estimate.total_amount).toFixed(2) : '0.00'}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* All Actions - Elegant Icons like Deals */}
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '2px',
                      padding: '8px 4px',
                      borderTop: '1px dashed #f0f0f0',
                      marginTop: '8px'
                    }}>
                      <Tooltip title="Recalculate">
                        <Button
                          size="small"
                          type="text"
                          icon={<CalculatorOutlined style={{ fontSize: '16px' }} />}
                          onClick={handleRecalculate}
                          style={{ color: '#5b6cf9', padding: '0 2px', height: '28px', minWidth: '32px' }}
                        />
                      </Tooltip>

                      <Tooltip title="Download PDF">
                        <Button
                          size="small"
                          type="text"
                          icon={<FilePdfOutlined style={{ fontSize: '16px' }} />}
                          onClick={handleDownloadPDF}
                          style={{ color: '#5b6cf9', padding: '0 2px', height: '28px', minWidth: '32px' }}
                        />
                      </Tooltip>

                      <Tooltip title="Copy Public Link">
                        <Button
                          size="small"
                          type="text"
                          icon={<CopyOutlined style={{ fontSize: '16px' }} />}
                          onClick={handleCopyPublicLink}
                          disabled={!estimate.public_token}
                          style={{ color: '#5b6cf9', padding: '0 2px', height: '28px', minWidth: '32px' }}
                        />
                      </Tooltip>

                      <Tooltip title="Send to Customer">
                        <Button
                          size="small"
                          type="text"
                          icon={<SendOutlined style={{ fontSize: '16px' }} />}
                          onClick={handleSendToCustomer}
                          loading={sendingEmail}
                          style={{ color: '#5b6cf9', padding: '0 2px', height: '28px', minWidth: '32px' }}
                        />
                      </Tooltip>

                      {estimate?.status === 'approved' && !internalWorkOrder && (
                        <Tooltip title="Convert to Work Order">
                          <Button
                            size="small"
                            type="text"
                            icon={<CalculatorOutlined style={{ fontSize: '16px' }} />}
                            onClick={handleConvertToWorkOrder}
                            loading={generatingWorkOrder}
                            style={{ color: '#5b6cf9', padding: '0 2px', height: '28px', minWidth: '32px' }}
                          />
                        </Tooltip>
                      )}

                      {estimate?.status === 'work_order' && internalWorkOrder?.status === 'completed' && (
                        <Tooltip title="Generate Invoice">
                          <Button
                            size="small"
                            type="text"
                            icon={<DollarOutlined style={{ fontSize: '16px' }} />}
                            onClick={() => handleGenerateInvoiceFromWO(internalWorkOrder.id!)}
                            loading={invoicing}
                            style={{ color: '#5b6cf9', padding: '0 2px', height: '28px', minWidth: '32px' }}
                          />
                        </Tooltip>
                      )}

                      {estimate?.status === 'invoiced' && invoices.length > 0 && invoices[0].pdf_file && (
                        <Tooltip title="Invoice PDF">
                          <Button
                            size="small"
                            type="text"
                            icon={<FilePdfOutlined style={{ fontSize: '16px' }} />}
                            href={`${BaseUrl}transactiondata/invoices/${invoices[0].id}/download_pdf?token=${estimate?.public_token}`}
                            target="_blank"
                            style={{ color: '#5b6cf9', padding: '0 2px', height: '28px', minWidth: '32px' }}
                          />
                        </Tooltip>
                      )}

                      {estimate?.status === 'invoiced' && payments.length > 0 && payments[0].pdf_file && (
                        <Tooltip title="Receipt PDF">
                          <Button
                            size="small"
                            type="text"
                            icon={<FilePdfOutlined style={{ fontSize: '16px' }} />}
                            href={`${BaseUrl}transactiondata/payments/${payments[0].id}/download_pdf?token=${estimate?.public_token}`}
                            target="_blank"
                            style={{ color: '#5b6cf9', padding: '0 2px', height: '28px', minWidth: '32px' }}
                          />
                        </Tooltip>
                      )}

                      <Tooltip title="Save & Close">
                        <Button
                          size="small"
                          type="text"
                          icon={<SaveOutlined style={{ fontSize: '16px' }} />}
                          onClick={() => {
                            notification.success({
                              message: 'Estimate Saved',
                              description: 'Estimate has been saved successfully',
                              title: 'Success'
                            });
                            navigate('/customers');
                          }}
                          style={{ color: '#5b6cf9', padding: '0 2px', height: '28px', minWidth: '32px' }}
                        />
                      </Tooltip>

                      {estimate?.status === 'invoiced' && (
                        <div style={{
                          textAlign: 'center',
                          padding: '4px 8px',
                          backgroundColor: '#f0f2ff',
                          color: '#5b6cf9',
                          borderRadius: '4px',
                          fontWeight: 600,
                          fontSize: '10px',
                          width: '100%',
                          marginTop: '4px',
                          border: '1px solid #efdbff'
                        }}>
                          ✓ INVOICED
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Document Management Section */}
                  {estimate.status !== 'draft' && (
                    <div style={{
                      marginTop: '16px',
                      padding: '12px',
                      backgroundColor: '#ffffff',
                      borderRadius: '10px',
                      border: '1px solid #f0f0f0'
                    }}>
                      <div style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        marginBottom: '10px',
                        color: '#5b6cf9',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <FilePdfOutlined /> Signed Documents ({attachedDocuments.length})
                      </div>

                      {attachedDocuments.length > 0 && (
                        <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {attachedDocuments.map(doc => (
                            <div
                              key={doc.id}
                              style={{
                                padding: '6px 8px',
                                backgroundColor: doc.customer_signed ? '#f0f2ff' : '#fafafa',
                                borderRadius: '6px',
                                border: '1px solid',
                                borderColor: doc.customer_signed ? '#efdbff' : '#f0f0f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <div style={{ fontSize: '11px', fontWeight: 500, color: '#333' }}>
                                {doc.document_title}
                              </div>
                              <span style={{
                                fontSize: '9px',
                                color: doc.customer_signed ? '#5b6cf9' : '#bfbfbf',
                                fontWeight: 700
                              }}>
                                {doc.customer_signed ? 'SIGNED' : 'PENDING'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '4px' }}>
                        <Button
                          size="small"
                          onClick={() => {
                            setIsAttachDocsVisible(true);
                            fetchAttachedDocuments();
                          }}
                          style={{ flex: 1, fontSize: '11px' }}
                        >
                          Manage
                        </Button>

                        {attachedDocuments.length > 0 && (
                          <Button
                            size="small"
                            type="primary"
                            icon={<SendOutlined />}
                            onClick={handleSendDocuments}
                            loading={sendingDocs}
                            style={{ flex: 2, fontSize: '11px', backgroundColor: '#5b6cf9' }}
                          >
                            Send for Sign
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Line Items Table Card */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileTextOutlined style={{ fontSize: '18px', color: '#5b6cf9' }} />
              <span style={{ fontSize: '16px', fontWeight: 600 }}>
                Line Items
              </span>
              <Tag color="purple" style={{ marginLeft: '8px' }}>{lineItems.length}</Tag>
            </div>
          }
          extra={
            <Space>
              <BlackButton
                icon={<TagOutlined />}
                onClick={() => setIsDiscountModalVisible(true)}
              >
                Discount
              </BlackButton>
              <BlackButton
                icon={<PlusOutlined />}
                onClick={() => setIsAddLineItemVisible(true)}
              >
                Add Charge
              </BlackButton>
            </Space>
          }
          style={{
            borderRadius: '12px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
          bodyStyle={{
            padding: '0',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '0px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              type="line"
              className="estimate-editor-tabs"
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
              tabBarStyle={{
                margin: 0,
                padding: '0 16px',
                backgroundColor: '#ffffff',
                borderBottom: '1px solid #f0f0f0'
              }}
              items={[
                {
                  key: 'customer',
                  label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px', fontSize: '13px' }}>
                      <UserOutlined /> Customer Pricing
                    </span>
                  ),
                  children: (
                    <div className="tab-scroll-container">
                      <div style={{
                        marginBottom: '12px',
                        padding: '8px 12px',
                        backgroundColor: '#fafafa',
                        borderRadius: '8px',
                        border: '1px solid #f0f0f0',
                        color: '#8c8c8c',
                        fontStyle: 'italic',
                        fontSize: '12px'
                      }}>
                        💡 Click "Edit" on any line item to modify rates, percentages, or quantities. Changes are saved automatically.
                      </div>
                      <Table
                        columns={columns}
                        dataSource={lineItems}
                        loading={loading}
                        rowKey="id"
                        size="small"
                        pagination={false}
                        style={{ borderRadius: '0' }}
                        sticky
                        summary={(pageData) => {
                          const subtotal = estimate?.subtotal ? Number(estimate.subtotal) : 0;
                          const discountAmount = estimate?.discount_amount ? Number(estimate.discount_amount) : 0;
                          const taxAmount = estimate?.tax_amount ? Number(estimate.tax_amount) : 0;
                          const taxPercentage = estimate?.tax_percentage ? Number(estimate.tax_percentage) : 0;
                          const totalAmount = estimate?.total_amount ? Number(estimate.total_amount) : 0;

                          return (
                            <Table.Summary>
                              {/* Subtotal Row */}
                              <Table.Summary.Row style={{ backgroundColor: '#fafafa' }}>
                                <Table.Summary.Cell index={0} colSpan={5}>
                                  <strong style={{ fontSize: '14px' }}>Subtotal</strong>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={1}>
                                  <strong style={{ fontSize: '16px', color: '#5b6cf9' }}>
                                    ${subtotal.toFixed(2)}
                                  </strong>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={2} />
                              </Table.Summary.Row>

                              {/* Discount Row */}
                              {discountAmount > 0 && (
                                <Table.Summary.Row style={{ backgroundColor: '#fff1f0' }}>
                                  <Table.Summary.Cell index={0} colSpan={5}>
                                    <strong style={{ fontSize: '14px', color: '#f5222d' }}>
                                      Discount
                                      {estimate?.discount_type === 'percent' && estimate?.discount_value && (
                                        <span style={{ marginLeft: '8px', fontWeight: 'normal' }}>
                                          ({estimate.discount_value}%)
                                        </span>
                                      )}
                                    </strong>
                                  </Table.Summary.Cell>
                                  <Table.Summary.Cell index={1}>
                                    <strong style={{ fontSize: '16px', color: '#f5222d' }}>
                                      -${discountAmount.toFixed(2)}
                                    </strong>
                                  </Table.Summary.Cell>
                                  <Table.Summary.Cell index={2} />
                                </Table.Summary.Row>
                              )}

                              {/* Tax Row - Editable */}
                              <Table.Summary.Row style={{ backgroundColor: '#fafafa' }}>
                                <Table.Summary.Cell index={0} colSpan={5}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {editingTax ? (
                                      <>
                                        <strong style={{ fontSize: '14px' }}>Sales Tax</strong>
                                        <InputNumber
                                          value={tempTaxPercentage}
                                          onChange={(value) => setTempTaxPercentage(value || 0)}
                                          min={0}
                                          max={100}
                                          step={0.01}
                                          precision={2}
                                          addonAfter="%"
                                          size="small"
                                          style={{ width: '120px' }}
                                        />
                                        <Button
                                          size="small"
                                          type="primary"
                                          icon={<CheckOutlined />}
                                          onClick={handleUpdateTaxPercentage}
                                          style={{ backgroundColor: '#5b6cf9' }}
                                        />
                                        <Button
                                          size="small"
                                          icon={<CloseOutlined />}
                                          onClick={() => setEditingTax(false)}
                                        />
                                      </>
                                    ) : (
                                      <>
                                        <strong style={{ fontSize: '14px' }}>
                                          Sales Tax ({taxPercentage.toFixed(2)}%)
                                        </strong>
                                        <Button
                                          size="small"
                                          type="link"
                                          icon={<EditOutlined />}
                                          onClick={() => {
                                            setEditingTax(true);
                                            setTempTaxPercentage(estimate?.tax_percentage || 0);
                                          }}
                                          style={{ padding: '0 4px', height: '22px', color: '#5b6cf9' }}
                                        >
                                          Edit
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={1}>
                                  <strong style={{ fontSize: '16px', color: '#5b6cf9' }}>
                                    ${taxAmount.toFixed(2)}
                                  </strong>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={2} />
                              </Table.Summary.Row>

                              {/* Total Row */}
                              <Table.Summary.Row style={{ backgroundColor: '#f0f2ff' }}>
                                <Table.Summary.Cell index={0} colSpan={5}>
                                  <strong style={{ fontSize: '15px' }}>Total Amount</strong>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={1}>
                                  <strong style={{ fontSize: '18px', color: '#5b6cf9' }}>
                                    ${totalAmount.toFixed(2)}
                                  </strong>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={2} />
                              </Table.Summary.Row>
                            </Table.Summary>
                          );
                        }}
                      />
                    </div>
                  )
                },
                {
                  key: 'internal_wo',
                  label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px', fontSize: '13px' }}>
                      <FileTextOutlined /> Internal Work Order
                    </span>
                  ),
                  children: (
                    <div className="tab-scroll-container">
                      {!internalWorkOrder ? (
                        <div style={{
                          padding: '40px 0',
                          textAlign: 'center',
                          backgroundColor: '#fafafa',
                          borderRadius: '8px',
                          border: '1px dashed #d9d9d9'
                        }}>
                          <Avatar size={64} icon={<FileTextOutlined />} style={{ backgroundColor: '#faad14', marginBottom: '16px' }} />
                          <h3>No Internal Work Order</h3>
                          <p style={{ color: '#666', marginBottom: '24px' }}>
                            Convert this estimate to an internal work order to track execution.
                          </p>
                          <BlackButton
                            icon={<PlusOutlined />}
                            onClick={handleConvertToWorkOrder}
                            loading={generatingWorkOrder}
                            disabled={estimate?.status !== 'approved'}
                          >
                            Convert to Work Order
                          </BlackButton>
                        </div>
                      ) : (
                        <div>
                          <div style={{
                            marginBottom: '16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px',
                            backgroundColor: '#ffffff',
                            borderRadius: '8px',
                            border: '1px solid #f0f0f0'
                          }}>
                            <div>
                              <div style={{ fontSize: '12px', color: '#5b6cf9', fontWeight: 600 }}>
                                INTERNAL WORK ORDER #{internalWorkOrder.id}
                              </div>
                              <div style={{ fontSize: '14px', fontWeight: 600 }}>
                                Work Order Details
                              </div>
                            </div>
                            <Space>
                              <Select
                                size="small"
                                value={internalWorkOrder.status}
                                onChange={(value) => handleUpdateWorkOrderStatus(internalWorkOrder.id!, value)}
                                style={{ width: '130px' }}
                              >
                                <Option value="pending">PENDING</Option>
                                <Option value="accepted">ACCEPTED</Option>
                                <Option value="completed">COMPLETED</Option>
                                <Option value="disputed">DISPUTED</Option>
                                <Option value="cancelled">CANCELLED</Option>
                              </Select>
                              {estimate?.status === 'work_order' && internalWorkOrder.status === 'completed' && (
                                <BlackButton
                                  size="small"
                                  icon={<DollarOutlined />}
                                  onClick={() => handleGenerateInvoiceFromWO(internalWorkOrder.id!)}
                                  loading={invoicing}
                                >
                                  Invoice Order
                                </BlackButton>
                              )}
                            </Space>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            <Card size="small" title="Order Metrics" style={{ borderRadius: '8px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                <div><span style={{ color: '#666' }}>Weight:</span> {internalWorkOrder.weight_lbs} lbs</div>
                                <div><span style={{ color: '#666' }}>Labour:</span> {internalWorkOrder.labour_hours} hours</div>
                                <div><span style={{ color: '#666' }}>Created At:</span> {dayjs(internalWorkOrder.created_at).format('MMM D, YYYY')}</div>
                              </div>
                            </Card>
                            <Card size="small" title="Order Schedule" style={{ borderRadius: '8px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
                                <div><span style={{ color: '#666' }}>Pickup:</span> {internalWorkOrder.pickup_date_from} ({internalWorkOrder.pickup_time_window_display || 'Anytime'})</div>
                                <div><span style={{ color: '#666' }}>Delivery:</span> {internalWorkOrder.delivery_date_from} ({internalWorkOrder.delivery_time_window_display || 'Anytime'})</div>
                              </div>
                            </Card>
                          </div>

                          {internalWorkOrder.notes && (
                            <div style={{ marginBottom: '20px' }}>
                              <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>Work Order Notes</div>
                              <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px', fontStyle: 'italic', minHeight: '60px' }}>
                                {internalWorkOrder.notes}
                              </div>
                            </div>
                          )}

                          <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>Work Order Line Items</div>
                          <Table
                            columns={columns.filter(c => c.key !== 'actions')}
                            dataSource={lineItems}
                            pagination={false}
                            size="small"
                            bordered
                          />
                        </div>
                      )}
                    </div>
                  )
                },
                {
                  key: 'contractor',
                  label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px', fontSize: '13px' }}>
                      <TeamOutlined /> Contractor Costs
                    </span>
                  ),
                  children: (
                    <div className="tab-scroll-container">
                      {!externalWorkOrder ? (
                        <div style={{
                          padding: '40px 0',
                          textAlign: 'center',
                          backgroundColor: '#fafafa',
                          borderRadius: '8px',
                          border: '1px dashed #d9d9d9'
                        }}>
                          <Avatar size={64} icon={<TeamOutlined />} style={{ backgroundColor: '#5b6cf9', marginBottom: '16px' }} />
                          <h3>No Work Order Generated</h3>
                          <p style={{ color: '#666', marginBottom: '24px' }}>
                            Generate a work order once a contractor is assigned to this estimate.
                          </p>
                          <BlackButton
                            icon={<PlusOutlined />}
                            onClick={handleGenerateWorkOrder}
                            loading={generatingWorkOrder}
                            disabled={!estimate?.assigned_contractor}
                          >
                            Generate Work Order
                          </BlackButton>
                          {!estimate?.assigned_contractor && (
                            <p style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '8px' }}>
                              Please assign a contractor in the sidebar first.
                            </p>
                          )}
                        </div>
                      ) : (
                        <>
                          <div style={{
                            marginBottom: '16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px',
                            backgroundColor: '#f0f2ff',
                            borderRadius: '8px',
                            border: '1px solid #efdbff'
                          }}>
                            <div>
                              <div style={{ fontSize: '12px', color: '#5b6cf9', fontWeight: 600 }}>
                                WORK ORDER #{externalWorkOrder.id}
                              </div>
                              <div style={{ fontSize: '14px', fontWeight: 600 }}>
                                Contractor: {externalWorkOrder.contractor_name}
                              </div>
                            </div>
                            <Space>
                              <Select
                                size="small"
                                value={externalWorkOrder.status}
                                onChange={(value) => handleUpdateWorkOrderStatus(externalWorkOrder.id!, value)}
                                style={{ width: '130px' }}
                              >
                                <Option value="pending">PENDING</Option>
                                <Option value="accepted">ACCEPTED</Option>
                                <Option value="completed">COMPLETED</Option>
                                <Option value="disputed">DISPUTED</Option>
                                <Option value="cancelled">CANCELLED</Option>
                              </Select>
                              {externalWorkOrder.public_token ? (
                                <Button
                                  size="small"
                                  icon={<CopyOutlined />}
                                  onClick={() => {
                                    const url = `${window.location.origin}/contractor/portal/${externalWorkOrder.public_token}`;
                                    navigator.clipboard.writeText(url);
                                    notification.success({
                                      message: 'Copied',
                                      description: 'Sharing link copied to clipboard',
                                      title: 'Success'
                                    });
                                  }}
                                >
                                  Copy Link
                                </Button>
                              ) : (
                                <Button
                                  size="small"
                                  icon={<SendOutlined />}
                                  onClick={handleShareWorkOrder}
                                >
                                  Share
                                </Button>
                              )}
                              <Button
                                size="small"
                                icon={<FilePdfOutlined />}
                                onClick={handleGenerateWorkOrderPDF}
                              >
                                Update PDF
                              </Button>
                              {externalWorkOrder.pdf_file && (
                                <Button
                                  size="small"
                                  type="primary"
                                  icon={<FilePdfOutlined />}
                                  href={`${BaseUrl.replace('/api/', '')}${externalWorkOrder.pdf_file}`}
                                  target="_blank"
                                >
                                  View PDF
                                </Button>
                              )}
                              {estimate?.status === 'work_order' && (
                                <Button
                                  size="small"
                                  type="primary"
                                  icon={<DollarOutlined />}
                                  onClick={() => handleGenerateInvoiceFromWO(externalWorkOrder.id!)}
                                  loading={invoicing}
                                  style={{ backgroundColor: '#5b6cf9', borderColor: '#5b6cf9' }}
                                >
                                  Invoice Order
                                </Button>
                              )}
                            </Space>
                          </div>

                          <Table
                            columns={contractorColumns}
                            dataSource={contractorLineItems}
                            loading={loading}
                            rowKey="id"
                            size="small"
                            pagination={false}
                            sticky
                            summary={() => (
                              <Table.Summary.Row style={{ backgroundColor: '#f0f2ff' }}>
                                <Table.Summary.Cell index={0} colSpan={3}>
                                  <strong style={{ fontSize: '14px' }}>Total Contractor Amount</strong>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={1}>
                                  <strong style={{ fontSize: '16px', color: '#5b6cf9' }}>
                                    ${Number(externalWorkOrder.total_contractor_amount).toFixed(2)}
                                  </strong>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={2} />
                              </Table.Summary.Row>
                            )}
                          />
                        </>
                      )}
                    </div>
                  )
                },
                {
                  key: 'site-visit',
                  label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px', fontSize: '13px' }}>
                      <CameraOutlined /> Site Visit Info
                    </span>
                  ),
                  children: (
                    <div className="tab-scroll-container">
                      {siteVisits.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center' }}>
                          <Empty description="No site visits found for this customer" />
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {siteVisits.map(visit => (
                            <Card
                              key={visit.id}
                              size="small"
                              title={`Visit on ${new Date(visit.scheduled_at).toLocaleDateString()} - ${visit.status}`}
                              style={{ borderRadius: '8px', border: '1px solid #f0f0f0' }}
                            >
                              <div style={{ marginBottom: '12px' }}>
                                <Typography.Text type="secondary" style={{ fontSize: '12px' }}>Surveyor: {visit.surveyor_name}</Typography.Text>
                              </div>

                              <Divider orientation={"left" as any} style={{ margin: '8px 0', fontSize: '12px' }}>Observations</Divider>
                              <List
                                size="small"
                                dataSource={visit.observations}
                                renderItem={(obs: SiteVisitObservationProps) => (
                                  <List.Item style={{ padding: '4px 0' }}>
                                    <div style={{ fontSize: '13px' }}>
                                      <strong style={{ color: '#5b6cf9' }}>{obs.key}:</strong> {obs.value}
                                    </div>
                                  </List.Item>
                                )}
                                locale={{ emptyText: <span style={{ fontSize: '11px', color: '#bfbfbf' }}>No observations recorded</span> }}
                              />

                              <Divider orientation={"left" as any} style={{ margin: '16px 0 8px 0', fontSize: '12px' }}>Photos</Divider>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
                                {visit.photos?.map((photo: SiteVisitPhotoProps) => (
                                  <div key={photo.id} style={{ textAlign: 'center' }}>
                                    <img
                                      src={photo.image_url}
                                      alt="Site"
                                      style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', border: '1px solid #f0f0f0' }}
                                      onClick={() => window.open(photo.image_url, '_blank')}
                                    />
                                    {photo.caption && <div style={{ fontSize: '10px', marginTop: '4px', color: '#8c8c8c' }}>{photo.caption}</div>}
                                  </div>
                                ))}
                                {(!visit.photos || visit.photos.length === 0) && (
                                  <span style={{ fontSize: '11px', color: '#bfbfbf' }}>No photos uploaded</span>
                                )}
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }
              ]}
            />
          </div>
        </Card>
      </div>

      {/* Add Line Item Form */}
      <AddEstimateLineItemForm
        isVisible={isAddLineItemVisible}
        estimateId={estimateId ? parseInt(estimateId) : null}
        onClose={() => setIsAddLineItemVisible(false)}
        onSuccessCallBack={() => {
          setIsAddLineItemVisible(false);
          fetchEstimate();
        }}
      />

      {/* Attach Documents Form */}
      <AttachDocumentsForm
        isVisible={isAttachDocsVisible}
        estimateId={estimateId ? parseInt(estimateId) : null}
        serviceTypeId={estimate?.service_type || null}
        attachedDocuments={attachedDocuments}
        onClose={() => setIsAttachDocsVisible(false)}
        onSuccessCallBack={() => {
          fetchAttachedDocuments();
        }}
      />

      {/* Discount Modal */}
      <DiscountModal
        visible={isDiscountModalVisible}
        estimate={estimate}
        estimateId={estimateId}
        onClose={() => setIsDiscountModalVisible(false)}
        onSuccess={() => {
          setIsDiscountModalVisible(false);
          fetchEstimate();
        }}
      />

      {/* Internal Work Order Detail Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileTextOutlined style={{ color: '#faad14' }} />
            <span>Internal Work Order Detail</span>
          </div>
        }
        open={isWOModalVisible}
        onCancel={() => setIsWOModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsWOModalVisible(false)}>
            Close
          </Button>,
          estimate?.status === 'work_order' && internalWorkOrder && (
            <Button
              key="invoice"
              type="primary"
              icon={<DollarOutlined />}
              loading={invoicing}
              onClick={() => {
                handleGenerateInvoiceFromWO(internalWorkOrder.id!);
                setIsWOModalVisible(false);
              }}
              style={{ backgroundColor: '#5b6cf9', borderColor: '#5b6cf9' }}
            >
              Invoice Order
            </Button>
          )
        ]}
        width={700}
      >
        {internalWorkOrder ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <Card size="small" title="Snapshot Status" style={{ borderRadius: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div><span style={{ color: '#666' }}>WO Number:</span> <strong>#{internalWorkOrder.id}</strong></div>
                  <div><span style={{ color: '#666' }}>Status:</span> <Tag color="blue">{internalWorkOrder.status.toUpperCase()}</Tag></div>
                  <div><span style={{ color: '#666' }}>Created At:</span> {dayjs(internalWorkOrder.created_at).format('MMM D, YYYY')}</div>
                </div>
              </Card>
              <Card size="small" title="Logistics Snapshot" style={{ borderRadius: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
                  <div><span style={{ color: '#666' }}>Weight:</span> {internalWorkOrder.weight_lbs} lbs</div>
                  <div><span style={{ color: '#666' }}>Labour:</span> {internalWorkOrder.labour_hours} hours</div>
                  <div><span style={{ color: '#666' }}>Pickup:</span> {internalWorkOrder.pickup_date_from} ({internalWorkOrder.pickup_time_window_display || 'Anytime'})</div>
                  <div><span style={{ color: '#666' }}>Delivery:</span> {internalWorkOrder.delivery_date_from} ({internalWorkOrder.delivery_time_window_display || 'Anytime'})</div>
                </div>
              </Card>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>Snapshot Notes</div>
              <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px', fontStyle: 'italic', minHeight: '60px' }}>
                {internalWorkOrder.notes || 'No specific notes recorded at time of conversion.'}
              </div>
            </div>

            <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>Order Line Items</div>
            <Table
              columns={columns.filter(c => c.key !== 'actions')}
              dataSource={lineItems}
              pagination={false}
              size="small"
              bordered
            />
          </div>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center' }}>No internal work order found.</div>
        )}
      </Modal>
    </div>
  );
};

export default EstimateEditor;
