import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, notification, Table, InputNumber, Space, Avatar, DatePicker, Select, Modal, Form, Radio } from 'antd';
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
  FilePdfOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { getAuthToken, getEstimateById, recalculateEstimate, getEstimateDocuments } from '../utils/functions';
import { EstimatesUrl, EstimateLineItemsUrl, EstimateDocumentsUrl, BaseUrl } from '../utils/network';
import { EstimateProps, EstimateLineItemProps, EstimateDocumentProps, TimeWindowProps, AuthTokenType } from '../utils/types';
import { fullname, role, email } from '../utils/data';
import Header from '../components/Header';
import AddEstimateLineItemForm from '../components/AddEstimateLineItemForm';
import AttachDocumentsForm from '../components/AttachDocumentsForm';

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
            <Button onClick={handleClearDiscount}>
              Clear Discount
            </Button>
            <Button type="primary" htmlType="submit">
              Apply Discount
            </Button>
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

  const currentUser = {
    role: localStorage.getItem(role) || 'user',
    fullname: localStorage.getItem(fullname) || 'User',
    email: localStorage.getItem(email) || ''
  };

  useEffect(() => {
    if (estimateId) {
      fetchEstimate();
      fetchAttachedDocuments();
      fetchTimeWindows();
    }
  }, [estimateId]);

  const fetchEstimate = async () => {
    if (!estimateId) return;
    setLoading(true);
    const data = await getEstimateById(estimateId);
    if (data) {
      setEstimate(data);
      setLineItems(data.items || []);
    } else {
      notification.error({
        message: 'Error',
        description: 'Failed to fetch estimate details',
        title: 'Error'
      });
    }
    setLoading(false);
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
      const baseUrl = window.location.origin;
      
      const response = await axios.post(
        `${EstimatesUrl}/${estimateId}/send_to_customer`, 
        { base_url: baseUrl },
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
        // Get backend URL
        const backendUrl = BaseUrl.replace('/api', '');
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
    getEstimateDocuments(estimateId, setAttachedDocuments, () => {});
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

  const columns = [
    {
      title: 'Order',
      dataIndex: 'display_order',
      key: 'display_order',
      width: 70,
      render: (order: number) => <Tag color="blue">{order}</Tag>
    },
    {
      title: 'Charge',
      dataIndex: 'charge_name',
      key: 'charge_name',
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
      width: 150,
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
      width: 150,
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
      width: 120,
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
      width: 120,
      render: (amount: number) => {
        const amountNum = amount ? Number(amount) : 0;
        return (
          <span style={{ fontWeight: 600, color: '#52c41a' }}>
            ${amountNum.toFixed(2)}
          </span>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (record: EstimateLineItemProps) => {
        const isEditing = editingKey === record.id;
        return isEditing ? (
          <Space>
            <Button
              size="small"
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => handleSaveLineItem(record.id!)}
            >
              Save
            </Button>
            <Button
              size="small"
              icon={<CloseOutlined />}
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </Space>
        ) : (
          <Space>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              disabled={editingKey !== null}
            >
              Edit
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => record.id && handleDeleteLineItem(record.id)}
              disabled={editingKey !== null}
            >
              Delete
            </Button>
          </Space>
        );
      }
    }
  ];

  return (
    <div>
      <Header currentUser={currentUser} />
      
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 500, margin: 0, marginBottom: '8px' }}>
                Review Estimate #{estimateId}
                {estimate?.customer_job_number && (
                  <span style={{ fontSize: '20px', color: '#666', fontWeight: 400, marginLeft: '12px' }}>
                    (Job #{estimate.customer_job_number})
                  </span>
                )}
              </h1>
              <p style={{ color: '#666', margin: 0 }}>
                Review and edit line items before finalizing
              </p>
            </div>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/customers')}
            >
              Back
            </Button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px' }}>
          {/* Estimate Summary Card */}
          {estimate && (
            <div>
              <Card 
                style={{ 
                  borderRadius: '12px',
                  position: 'sticky',
                  top: '24px',
                  alignSelf: 'start'
                }}
                bodyStyle={{ padding: '20px' }}
              >
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <Avatar 
                    size={72} 
                    icon={<FileTextOutlined />}
                    style={{ 
                      backgroundColor: '#1890ff',
                      fontSize: '28px',
                      marginBottom: '12px'
                    }}
                  />
                  <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
                    Estimate #{estimateId}
                  </div>
                  <Tag color={estimate.status === 'draft' ? 'orange' : estimate.status === 'sent' ? 'blue' : estimate.status === 'approved' ? 'green' : 'red'} style={{ fontSize: '11px' }}>
                    {estimate.status?.toUpperCase()}
                  </Tag>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Customer */}
                  <div style={{
                    padding: '10px',
                    backgroundColor: '#f0f9ff',
                    borderRadius: '8px',
                    border: '1px solid #bae6fd'
                  }}>
                    <div style={{ fontSize: '10px', color: '#0284c7', fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <UserOutlined /> Customer
                    </div>
                    <div style={{ fontSize: '13px', color: '#000', fontWeight: 600 }}>
                      {estimate.customer_name}
                    </div>
                    {estimate.customer_job_number && (
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                        Job #{estimate.customer_job_number}
                      </div>
                    )}
                  </div>

                  {/* Service Type */}
                  {estimate.service_type_name && (
                    <div style={{
                      padding: '10px',
                      backgroundColor: '#faf5ff',
                      borderRadius: '8px',
                      border: '1px solid #e9d5ff'
                    }}>
                      <div style={{ fontSize: '10px', color: '#9333ea', fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <TagsOutlined /> Service Type
                      </div>
                      <div style={{ fontSize: '13px', color: '#000' }}>
                        {estimate.service_type_name}
                      </div>
                    </div>
                  )}

                  {/* Template */}
                  {estimate.template_name && (
                    <div style={{
                      padding: '10px',
                      backgroundColor: '#f0fdf4',
                      borderRadius: '8px',
                      border: '1px solid #bbf7d0'
                    }}>
                      <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <FileTextOutlined /> Template Used
                      </div>
                      <div style={{ fontSize: '13px', color: '#000' }}>
                        {estimate.template_name}
                      </div>
                    </div>
                  )}

                  {/* Weight and Labour Hours - Editable */}
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#fafafa',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px'
                    }}>
                      <div style={{ fontSize: '11px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <TeamOutlined /> Weight & Hours
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
                          style={{ padding: '2px 8px' }}
                        />
                      )}
                    </div>

                    {editingWeightHours ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '10px', color: '#d97706', fontWeight: 500, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Weight (lbs)
                          </div>
                          <InputNumber
                            value={tempWeight}
                            onChange={(value) => setTempWeight(value)}
                            min={0}
                            placeholder="Enter weight"
                            style={{ width: '100%' }}
                            size="small"
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: 500, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Labour Hours
                          </div>
                          <InputNumber
                            value={tempLabourHours}
                            onChange={(value) => setTempLabourHours(value)}
                            min={0}
                            step={0.5}
                            placeholder="Enter hours"
                            style={{ width: '100%' }}
                            size="small"
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                          <Button
                            size="small"
                            icon={<CheckOutlined />}
                            onClick={handleUpdateWeightHours}
                            type="primary"
                            style={{ flex: 1 }}
                          >
                            Save
                          </Button>
                          <Button
                            size="small"
                            icon={<CloseOutlined />}
                            onClick={() => setEditingWeightHours(false)}
                            style={{ flex: 1 }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{
                          padding: '8px',
                          backgroundColor: '#fffbeb',
                          borderRadius: '6px',
                          border: '1px solid #fde68a'
                        }}>
                          <div style={{ fontSize: '10px', color: '#d97706', fontWeight: 500, marginBottom: '2px' }}>
                            Weight
                          </div>
                          <div style={{ fontSize: '13px', color: '#000', fontWeight: 600 }}>
                            {estimate.weight_lbs ? `${estimate.weight_lbs} lbs` : 'Not set'}
                          </div>
                        </div>
                        <div style={{
                          padding: '8px',
                          backgroundColor: '#fef3f2',
                          borderRadius: '6px',
                          border: '1px solid #fecaca'
                        }}>
                          <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: 500, marginBottom: '2px' }}>
                            Labour Hours
                          </div>
                          <div style={{ fontSize: '13px', color: '#000', fontWeight: 600 }}>
                            {estimate.labour_hours ? `${Number(estimate.labour_hours).toFixed(1)} hours` : 'Not set'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Schedule Section - Editable */}
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#fafafa',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '10px'
                    }}>
                      <div style={{ fontSize: '11px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <CalendarOutlined /> Schedule
                      </div>
                      {!editingDates && (
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => {
                            setEditingDates(true);
                            // Parse dates as local date-only (no timezone conversion)
                            // Using format() ensures dayjs treats it as a local date string
                            setTempPickupFrom(estimate.pickup_date_from ? dayjs(estimate.pickup_date_from, 'YYYY-MM-DD', true) : null);
                            setTempPickupTo(estimate.pickup_date_to ? dayjs(estimate.pickup_date_to, 'YYYY-MM-DD', true) : null);
                            setTempPickupTimeWindow(estimate.pickup_time_window || null);
                            setTempDeliveryFrom(estimate.delivery_date_from ? dayjs(estimate.delivery_date_from, 'YYYY-MM-DD', true) : null);
                            setTempDeliveryTo(estimate.delivery_date_to ? dayjs(estimate.delivery_date_to, 'YYYY-MM-DD', true) : null);
                            setTempDeliveryTimeWindow(estimate.delivery_time_window || null);
                          }}
                          style={{ padding: '2px 8px' }}
                        />
                      )}
                    </div>

                    {editingDates ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Pickup Range */}
                        <div>
                          <div style={{ fontSize: '11px', color: '#d97706', fontWeight: 500, marginBottom: '6px' }}>
                            📤 Pickup
                          </div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                            <DatePicker
                              value={tempPickupFrom}
                              onChange={(date) => setTempPickupFrom(date)}
                              placeholder="From"
                              size="small"
                              style={{ flex: 1 }}
                              format="YYYY-MM-DD"
                            />
                            <DatePicker
                              value={tempPickupTo}
                              onChange={(date) => setTempPickupTo(date)}
                              placeholder="To"
                              size="small"
                              style={{ flex: 1 }}
                              format="YYYY-MM-DD"
                            />
                          </div>
                          <Select
                            value={tempPickupTimeWindow}
                            onChange={(value) => setTempPickupTimeWindow(value)}
                            placeholder="Select time window"
                            size="small"
                            style={{ width: '100%' }}
                            allowClear
                          >
                            {timeWindows.map(tw => (
                              <Option key={tw.id} value={tw.id}>
                                {tw.name} - {tw.time_display}
                              </Option>
                            ))}
                          </Select>
                        </div>

                        {/* Delivery Range */}
                        <div>
                          <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 500, marginBottom: '6px' }}>
                            📥 Delivery
                          </div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                            <DatePicker
                              value={tempDeliveryFrom}
                              onChange={(date) => setTempDeliveryFrom(date)}
                              placeholder="From"
                              size="small"
                              style={{ flex: 1 }}
                              format="YYYY-MM-DD"
                            />
                            <DatePicker
                              value={tempDeliveryTo}
                              onChange={(date) => setTempDeliveryTo(date)}
                              placeholder="To"
                              size="small"
                              style={{ flex: 1 }}
                              format="YYYY-MM-DD"
                            />
                          </div>
                          <Select
                            value={tempDeliveryTimeWindow}
                            onChange={(value) => setTempDeliveryTimeWindow(value)}
                            placeholder="Select time window"
                            size="small"
                            style={{ width: '100%' }}
                            allowClear
                          >
                            {timeWindows.map(tw => (
                              <Option key={tw.id} value={tw.id}>
                                {tw.name} - {tw.time_display}
                              </Option>
                            ))}
                          </Select>
                        </div>

                        {/* Save/Cancel */}
                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                          <Button
                            size="small"
                            type="primary"
                            icon={<CheckOutlined />}
                            onClick={handleUpdateDates}
                            style={{ flex: 1 }}
                          >
                            Save
                          </Button>
                          <Button
                            size="small"
                            icon={<CloseOutlined />}
                            onClick={() => setEditingDates(false)}
                            style={{ flex: 1 }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Pickup Display */}
                        <div>
                          <div style={{ fontSize: '11px', color: '#d97706', fontWeight: 500, marginBottom: '4px' }}>
                            📤 Pickup
                          </div>
                          <div style={{ fontSize: '13px', color: '#000' }}>
                            {estimate.pickup_date_from 
                              ? `${dayjs(estimate.pickup_date_from, 'YYYY-MM-DD').format('MMM D, YYYY')}${estimate.pickup_date_to ? ' - ' + dayjs(estimate.pickup_date_to, 'YYYY-MM-DD').format('MMM D, YYYY') : ''}`
                              : <span style={{ color: '#999' }}>Not set</span>
                            }
                          </div>
                          {estimate.pickup_time_window_display && (
                            <div style={{ fontSize: '11px', color: '#fa541c', marginTop: '4px' }}>
                              🕐 {estimate.pickup_time_window_display}
                            </div>
                          )}
                        </div>

                        {/* Delivery Display */}
                        <div>
                          <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 500, marginBottom: '4px' }}>
                            📥 Delivery
                          </div>
                          <div style={{ fontSize: '13px', color: '#000' }}>
                            {estimate.delivery_date_from 
                              ? `${dayjs(estimate.delivery_date_from, 'YYYY-MM-DD').format('MMM D, YYYY')}${estimate.delivery_date_to ? ' - ' + dayjs(estimate.delivery_date_to, 'YYYY-MM-DD').format('MMM D, YYYY') : ''}`
                              : <span style={{ color: '#999' }}>Not set</span>
                            }
                          </div>
                          {estimate.delivery_time_window_display && (
                            <div style={{ fontSize: '11px', color: '#fa541c', marginTop: '4px' }}>
                              🕐 {estimate.delivery_time_window_display}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Amount Breakdown */}
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Subtotal */}
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#f0f9ff',
                      borderRadius: '8px',
                      border: '1px solid #91d5ff',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#0050b3' }}>Subtotal</span>
                      <span style={{ fontSize: '16px', fontWeight: 600, color: '#000' }}>
                        ${estimate.subtotal ? Number(estimate.subtotal).toFixed(2) : '0.00'}
                      </span>
                    </div>

                    {/* Tax */}
                    {estimate.tax_percentage && Number(estimate.tax_percentage) > 0 ? (
                      <div style={{
                        padding: '12px',
                        backgroundColor: '#fff7e6',
                        borderRadius: '8px',
                        border: '1px solid #ffd591',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#d46b08' }}>
                          Tax ({Number(estimate.tax_percentage).toFixed(2)}%)
                        </span>
                        <span style={{ fontSize: '16px', fontWeight: 600, color: '#000' }}>
                          ${estimate.tax_amount ? Number(estimate.tax_amount).toFixed(2) : '0.00'}
                        </span>
                      </div>
                    ) : null}

                    {/* Total Amount - Highlighted */}
                    <div style={{
                      padding: '16px',
                      background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontWeight: 500, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Total Amount
                      </div>
                      <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>
                        ${estimate.total_amount ? Number(estimate.total_amount).toFixed(2) : '0.00'}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Button
                      block
                      icon={<CalculatorOutlined />}
                      onClick={handleRecalculate}
                    >
                      Recalculate
                    </Button>

                    <Button
                      type="primary"
                      block
                      icon={<SendOutlined />}
                      onClick={handleSendToCustomer}
                      loading={sendingEmail}
                    >
                      Send to Customer
                    </Button>

                    <Button
                      block
                      icon={<FilePdfOutlined />}
                      onClick={handleDownloadPDF}
                    >
                      Download PDF
                    </Button>

                    {estimate.public_token && (
                      <Button
                        block
                        icon={<CopyOutlined />}
                        onClick={handleCopyPublicLink}
                      >
                        Copy Public Link
                      </Button>
                    )}
                    
                    <Button 
                      block
                      icon={<SaveOutlined />}
                      onClick={() => {
                        notification.success({
                          message: 'Estimate Saved',
                          description: 'Estimate has been saved successfully',
                          title: 'Success'
                        });
                        navigate('/customers');
                      }}
                    >
                      Save & Close
                    </Button>
                  </div>

                  {/* Document Management Section */}
                  {estimate.status !== 'draft' && (
                    <>
                      <div style={{ 
                        marginTop: '20px', 
                        paddingTop: '20px', 
                        borderTop: '1px solid #f0f0f0' 
                      }}>
                        <div style={{ 
                          fontSize: '13px', 
                          fontWeight: 600, 
                          marginBottom: '12px',
                          color: '#666'
                        }}>
                          📄 DOCUMENTS ({attachedDocuments.length})
                        </div>

                        {attachedDocuments.length > 0 && (
                          <div style={{ marginBottom: '12px' }}>
                            {attachedDocuments.map(doc => (
                              <div
                                key={doc.id}
                                style={{
                                  padding: '8px',
                                  backgroundColor: doc.customer_signed ? '#f6ffed' : '#fff7e6',
                                  borderRadius: '6px',
                                  marginBottom: '6px',
                                  border: `1px solid ${doc.customer_signed ? '#b7eb8f' : '#ffd591'}`
                                }}
                              >
                                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '2px' }}>
                                  {doc.document_title}
                                </div>
                                <Tag 
                                  color={doc.customer_signed ? 'green' : 'orange'}
                                  style={{ fontSize: '10px' }}
                                >
                                  {doc.customer_signed ? '✓ Signed' : 'Awaiting Signature'}
                                </Tag>
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <Button 
                            block
                            size="small"
                            onClick={() => {
                              setIsAttachDocsVisible(true);
                              fetchAttachedDocuments();
                            }}
                          >
                            Manage Documents
                          </Button>
                          
                          {attachedDocuments.length > 0 && (
                            <>
                              <Button 
                                block
                                size="small"
                                type="primary"
                                icon={<SendOutlined />}
                                onClick={handleSendDocuments}
                                loading={sendingDocs}
                              >
                                Send for Signature
                              </Button>
                              <Button 
                                block
                                size="small"
                                icon={<CopyOutlined />}
                                onClick={handleCopyDocumentLink}
                              >
                                Copy Doc Link
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Line Items Table Card */}
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileTextOutlined style={{ fontSize: '18px' }} />
                <span style={{ fontSize: '16px', fontWeight: 600 }}>
                  Line Items
                </span>
                <Tag color="blue" style={{ marginLeft: '8px' }}>{lineItems.length}</Tag>
              </div>
            }
            extra={
              <Space>
                <Button 
                  type="dashed"
                  icon={<TagOutlined />}
                  onClick={() => setIsDiscountModalVisible(true)}
                >
                  Discount
                </Button>
                <Button 
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => setIsAddLineItemVisible(true)}
                >
                  Add Charge
                </Button>
              </Space>
            }
            style={{ 
              borderRadius: '12px'
            }}
            bodyStyle={{ padding: '0' }}
          >
          <div style={{ padding: '16px' }}>
            <div style={{ 
              marginBottom: '12px',
              padding: '12px',
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              border: '1px solid #bae6fd'
            }}>
              <div style={{ fontSize: '11px', color: '#0284c7', marginBottom: '4px' }}>
                💡 Click "Edit" on any line item to modify rates, percentages, or quantities. Changes are saved automatically.
              </div>
            </div>
          </div>

          <Table
            columns={columns}
            dataSource={lineItems}
            loading={loading}
            rowKey="id"
            size="small"
            pagination={false}
            style={{ borderRadius: '0' }}
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
                      <strong style={{ fontSize: '16px', color: '#1890ff' }}>
                        ${subtotal.toFixed(2)}
                      </strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} />
                  </Table.Summary.Row>
                  
                  {/* Discount Row */}
                  {discountAmount > 0 && (
                    <Table.Summary.Row style={{ backgroundColor: '#fff1f0' }}>
                      <Table.Summary.Cell index={0} colSpan={5}>
                        <strong style={{ fontSize: '14px', color: '#cf1322' }}>
                          Discount
                          {estimate?.discount_type === 'percent' && estimate?.discount_value && (
                            <span style={{ marginLeft: '8px', fontWeight: 'normal' }}>
                              ({estimate.discount_value}%)
                            </span>
                          )}
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>
                        <strong style={{ fontSize: '16px', color: '#cf1322' }}>
                          -${discountAmount.toFixed(2)}
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} />
                    </Table.Summary.Row>
                  )}
                  
                  {/* Tax Row - Editable */}
                  <Table.Summary.Row style={{ backgroundColor: '#fff7e6' }}>
                    <Table.Summary.Cell index={0} colSpan={5}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {editingTax ? (
                          <>
                            <strong style={{ fontSize: '14px', color: '#d46b08' }}>Sales Tax</strong>
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
                            />
                            <Button 
                              size="small" 
                              icon={<CloseOutlined />}
                              onClick={() => setEditingTax(false)}
                            />
                          </>
                        ) : (
                          <>
                            <strong style={{ fontSize: '14px', color: '#d46b08' }}>
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
                              style={{ padding: '0 4px', height: '22px' }}
                            >
                              Edit
                            </Button>
                          </>
                        )}
                      </div>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <strong style={{ fontSize: '16px', color: '#d46b08' }}>
                        ${taxAmount.toFixed(2)}
                      </strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} />
                  </Table.Summary.Row>
                  
                  {/* Total Row */}
                  <Table.Summary.Row style={{ backgroundColor: '#f6ffed' }}>
                    <Table.Summary.Cell index={0} colSpan={5}>
                      <strong style={{ fontSize: '15px' }}>Total Amount</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <strong style={{ fontSize: '18px', color: '#52c41a' }}>
                        ${totalAmount.toFixed(2)}
                      </strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} />
                  </Table.Summary.Row>
                </Table.Summary>
              );
            }}
          />
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
      </div>
    </div>
  );
};

export default EstimateEditor;
