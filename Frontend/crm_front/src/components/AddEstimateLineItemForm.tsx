import React, { FC, useEffect, useState } from "react";
import { Modal, notification, Form, InputNumber, Button, Select, Tabs, Input, Switch, Card } from "antd";
import { 
  DollarOutlined, 
  PercentageOutlined,
  PlusOutlined,
  UnorderedListOutlined,
  TagsOutlined
} from "@ant-design/icons";
import { AuthTokenType, ChargeDefinitionProps, ChargeCategoryProps, ServiceTypeProps } from "../utils/types";
import { getAuthToken, getServiceTypes } from "../utils/functions";
import axios, { AxiosResponse } from "axios";
import { EstimateLineItemsUrl, ChargeDefinitionsUrl, EstimatesUrl, ChargeCategoriesUrl } from "../utils/network";

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface AddEstimateLineItemFormProps {
  isVisible: boolean;
  onSuccessCallBack: () => void;
  onClose: () => void;
  estimateId: number | null;
}

const AddEstimateLineItemForm: FC<AddEstimateLineItemFormProps> = ({
  isVisible = false,
  onSuccessCallBack,
  onClose,
  estimateId,
}) => {
  const [form] = Form.useForm();
  const [newChargeForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [chargeDefinitions, setChargeDefinitions] = useState<ChargeDefinitionProps[]>([]);
  const [selectedCharge, setSelectedCharge] = useState<ChargeDefinitionProps | null>(null);
  const [activeTab, setActiveTab] = useState<string>('existing');
  const [categories, setCategories] = useState<ChargeCategoryProps[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeProps[]>([]);
  const [newChargeType, setNewChargeType] = useState<string>('');

  useEffect(() => {
    if (isVisible) {
      fetchChargeDefinitions();
      fetchCategories();
      fetchServiceTypes();
    }
  }, [isVisible]);

  const fetchChargeDefinitions = async () => {
    try {
      const headers = getAuthToken() as AuthTokenType;
      // Include all charges (including estimate-only ones) for the estimate editor
      const response = await axios.get(`${ChargeDefinitionsUrl}?include_estimate_only=true`, headers);
      setChargeDefinitions(response.data.filter((cd: ChargeDefinitionProps) => cd.is_active));
    } catch (error) {
      console.error('Error fetching charge definitions:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const headers = getAuthToken() as AuthTokenType;
      const response = await axios.get(`${ChargeCategoriesUrl}/simple`, headers);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchServiceTypes = async () => {
    getServiceTypes((data) => {
      setServiceTypes(data.filter((st: ServiceTypeProps) => st.enabled));
    }, () => {});
  };

  const handleFormClose = () => {
    form.resetFields();
    newChargeForm.resetFields();
    setSelectedCharge(null);
    setActiveTab('existing');
    setNewChargeType('');
    onClose?.();
  };

  const handleChargeChange = (chargeId: number) => {
    const charge = chargeDefinitions.find(cd => cd.id === chargeId);
    setSelectedCharge(charge || null);
    
    if (charge) {
      // Set default values from charge definition
      form.setFieldsValue({
        rate: charge.default_rate,
        percentage: charge.default_percentage,
        quantity: 1
      });
    }
  };

  const onSubmit = async (values: any) => {
    if (!estimateId || !selectedCharge) return;
    
    setLoading(true);
    const headers = getAuthToken() as AuthTokenType;

    const submitData = {
      estimate: estimateId,
      charge: values.charge,
      charge_name: selectedCharge.name,
      charge_type: selectedCharge.charge_type,
      rate: values.rate,
      percentage: values.percentage,
      quantity: values.quantity || 1,
      display_order: 999 // Add at the end
    };

    try {
      await axios.post(EstimateLineItemsUrl, submitData, headers);
      
      // Trigger recalculation on backend (backend already does this, but being explicit)
      await axios.post(`${EstimatesUrl}/${estimateId}/recalculate`, {}, headers);
      
      notification.success({
        message: "Line Item Added",
        description: "New charge has been added and estimate recalculated.",
        title: "Success"
      });

      setLoading(false);
      form.resetFields();
      setSelectedCharge(null);
      onSuccessCallBack?.();
      onClose?.();
    } catch (error: any) {
      notification.error({
        message: "Operation Error",
        description: error.response?.data?.error || "An error occurred while adding the line item.",
        title: "Operation Error"
      });
      setLoading(false);
    }
  };

  const onSubmitNewCharge = async (values: any) => {
    if (!estimateId) return;
    
    setLoading(true);
    const headers = getAuthToken() as AuthTokenType;

    try {
      // First, create the charge definition with is_estimate_only flag
      const chargeData = {
        name: values.name,
        category: values.category,
        charge_type: values.charge_type,
        default_rate: values.default_rate,
        default_percentage: values.default_percentage,
        applies_to: values.applies_to || [],
        is_active: true,
        is_required: false,
        is_estimate_only: values.is_estimate_only || false,
        description: values.description || ''
      };

      const chargeResponse = await axios.post(ChargeDefinitionsUrl, chargeData, headers);
      const newCharge = chargeResponse.data;

      // Then add it as a line item to the estimate
      const lineItemData = {
        estimate: estimateId,
        charge: newCharge.id,
        charge_name: newCharge.name,
        charge_type: newCharge.charge_type,
        rate: values.default_rate,
        percentage: values.default_percentage,
        quantity: values.quantity || 1,
        display_order: 999
      };

      await axios.post(EstimateLineItemsUrl, lineItemData, headers);
      
      // Trigger recalculation
      await axios.post(`${EstimatesUrl}/${estimateId}/recalculate`, {}, headers);
      
      notification.success({
        message: "Charge Created & Added",
        description: `New charge "${newCharge.name}" has been created and added to the estimate.`,
        title: "Success"
      });

      setLoading(false);
      newChargeForm.resetFields();
      setNewChargeType('');
      fetchChargeDefinitions(); // Refresh the list
      onSuccessCallBack?.();
      onClose?.();
    } catch (error: any) {
      notification.error({
        message: "Operation Error",
        description: error.response?.data?.error || "An error occurred while creating the charge.",
        title: "Operation Error"
      });
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Add Charge to Estimate"
      open={isVisible}
      onCancel={handleFormClose}
      footer={null}
      destroyOnClose
      width={600}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane 
          tab={
            <span>
              <UnorderedListOutlined />
              Select Existing
            </span>
          } 
          key="existing"
        >
          <Form layout="vertical" onFinish={onSubmit} form={form} initialValues={{ quantity: 1 }}>
            <Form.Item
              label="Charge Definition"
              name="charge"
              rules={[{ required: true, message: 'Please select a charge!' }]}
              style={{ marginBottom: '12px' }}
            >
              <Select 
                placeholder="Select Charge Definition" 
                onChange={handleChargeChange}
                showSearch
                optionFilterProp="children"
              >
                {chargeDefinitions.map(cd => (
                  <Option key={cd.id} value={cd.id}>
                    <div>
                      <div>{cd.name} {cd.is_estimate_only && <span style={{color: '#f59e0b', fontSize: '11px'}}>(Estimate Only)</span>}</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        {cd.category_name} • {cd.charge_type}
                      </div>
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {selectedCharge && (
              <div style={{
                padding: '12px',
                backgroundColor: '#f0f9ff',
                borderRadius: '6px',
                border: '1px solid #bae6fd',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '12px', color: '#0284c7' }}>
                  <strong>Type:</strong> {selectedCharge.charge_type} | 
                  <strong> Category:</strong> {selectedCharge.category_name}
                </div>
              </div>
            )}

            {selectedCharge?.charge_type === 'percent' ? (
              <Form.Item
                label="Percentage"
                name="percentage"
                rules={[{ required: true, message: 'Please input the percentage!' }]}
                style={{ marginBottom: '12px' }}
              >
                <InputNumber 
                  placeholder={`${selectedCharge.default_percentage || 0}`}
                  style={{ width: '100%' }}
                  min={0}
                  max={100}
                  step={0.01}
                  addonAfter="%"
                />
              </Form.Item>
            ) : (
              <Form.Item
                label="Rate"
                name="rate"
                rules={[{ required: true, message: 'Please input the rate!' }]}
                style={{ marginBottom: '12px' }}
              >
                <InputNumber 
                  placeholder={`${selectedCharge?.default_rate || 0}`}
                  style={{ width: '100%' }}
                  min={0}
                  step={0.01}
                  addonBefore="$"
                />
              </Form.Item>
            )}

            {selectedCharge?.charge_type === 'flat' && (
              <Form.Item
                label="Quantity"
                name="quantity"
                style={{ marginBottom: '12px' }}
              >
                <InputNumber 
                  placeholder="1" 
                  style={{ width: '100%' }}
                  min={0}
                  step={1}
                />
              </Form.Item>
            )}

            <Form.Item style={{ marginBottom: '0', marginTop: '24px' }}>
              <Button htmlType="submit" type="primary" block loading={loading} size="large">
                Add Charge
              </Button>
            </Form.Item>
          </Form>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <PlusOutlined />
              Create New
            </span>
          } 
          key="new"
        >
          <Form 
            layout="vertical" 
            onFinish={onSubmitNewCharge} 
            form={newChargeForm} 
            initialValues={{ quantity: 1, is_estimate_only: true, applies_to: [] }}
          >
            <Card size="small" style={{ marginBottom: '16px', backgroundColor: '#fffbeb', borderColor: '#fcd34d' }}>
              <div style={{ fontSize: '12px', color: '#92400e' }}>
                <strong>Note:</strong> You can create a new charge definition from scratch. By default, it will be marked as "Estimate Only" and won't appear in the Configure section.
              </div>
            </Card>

            <Form.Item
              label="Charge Name"
              name="name"
              rules={[{ required: true, message: 'Please input the charge name!' }]}
              style={{ marginBottom: '12px' }}
            >
              <Input prefix={<DollarOutlined />} placeholder="e.g., Special Handling Fee" />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Form.Item
                label="Category"
                name="category"
                rules={[{ required: true, message: 'Please select a category!' }]}
                style={{ marginBottom: '12px' }}
              >
                <Select placeholder="Select Category">
                  {categories.map(cat => (
                    <Option key={cat.id} value={cat.id}>
                      {cat.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                label="Charge Type"
                name="charge_type"
                rules={[{ required: true, message: 'Please select charge type!' }]}
                style={{ marginBottom: '12px' }}
              >
                <Select placeholder="Select Type" onChange={setNewChargeType}>
                  <Option value="per_lb">Per Pound</Option>
                  <Option value="percent">Percentage</Option>
                  <Option value="flat">Flat Fee</Option>
                  <Option value="hourly">Hourly</Option>
                </Select>
              </Form.Item>
            </div>

            {newChargeType === 'percent' ? (
              <Form.Item
                label="Default Percentage"
                name="default_percentage"
                rules={[{ required: true, message: 'Please input the percentage!' }]}
                style={{ marginBottom: '12px' }}
              >
                <InputNumber 
                  placeholder="10.00" 
                  style={{ width: '100%' }}
                  min={0}
                  max={100}
                  step={0.01}
                  addonAfter="%"
                />
              </Form.Item>
            ) : newChargeType ? (
              <Form.Item
                label="Default Rate"
                name="default_rate"
                rules={[{ required: true, message: 'Please input the rate!' }]}
                style={{ marginBottom: '12px' }}
              >
                <InputNumber 
                  placeholder="0.00" 
                  style={{ width: '100%' }}
                  min={0}
                  step={0.01}
                  addonBefore="$"
                />
              </Form.Item>
            ) : null}

            {newChargeType === 'flat' && (
              <Form.Item
                label="Quantity"
                name="quantity"
                style={{ marginBottom: '12px' }}
              >
                <InputNumber 
                  placeholder="1" 
                  style={{ width: '100%' }}
                  min={0}
                  step={1}
                />
              </Form.Item>
            )}

            <Form.Item
              label="Description (Optional)"
              name="description"
              style={{ marginBottom: '12px' }}
            >
              <TextArea 
                placeholder="Brief description of this charge" 
                rows={2}
              />
            </Form.Item>

            <Form.Item
              label="Applies To Service Types (Optional)"
              name="applies_to"
              style={{ marginBottom: '12px' }}
              help="Leave empty to apply to all service types"
            >
              <Select 
                mode="multiple"
                placeholder="Select Service Types"
                allowClear
              >
                {serviceTypes.map(st => (
                  <Option key={st.id} value={st.id}>
                    {st.service_type}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Estimate Only"
              name="is_estimate_only"
              valuePropName="checked"
              style={{ marginBottom: '12px' }}
              help="If checked, this charge will only appear for estimates and won't show in the Configure section"
            >
              <Switch 
                checkedChildren="Yes" 
                unCheckedChildren="No"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: '0', marginTop: '24px' }}>
              <Button htmlType="submit" type="primary" block loading={loading} size="large">
                Create & Add Charge
              </Button>
            </Form.Item>
          </Form>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default AddEstimateLineItemForm;
