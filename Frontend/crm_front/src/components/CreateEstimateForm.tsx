import React, { FC, useEffect, useState } from "react";
import { Drawer, notification, Form, InputNumber, Button, Card, Select, Divider } from "antd";
import { 
  CalculatorOutlined, 
  CarOutlined,
  FileTextOutlined,
  UserOutlined,
  DashboardOutlined
} from "@ant-design/icons";
import { AuthTokenType, CustomerProps, EstimateTemplateProps, ServiceTypeProps } from "../utils/types";
import { getAuthToken, getServiceTypes } from "../utils/functions";
import axios, { AxiosResponse } from "axios";
import { EstimatesUrl, EstimateTemplatesUrl, ServiceTypesUrl } from "../utils/network";

const { Option } = Select;

interface CreateEstimateFormProps {
  isVisible: boolean;
  onSuccessCallBack: (estimateId: number) => void;
  onClose: () => void;
  customer: CustomerProps | null;
}

const CreateEstimateForm: FC<CreateEstimateFormProps> = ({
  isVisible = false,
  onSuccessCallBack,
  onClose,
  customer,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<EstimateTemplateProps[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeProps[]>([]);
  const [selectedServiceType, setSelectedServiceType] = useState<number | null>(null);
  const [filteredTemplates, setFilteredTemplates] = useState<EstimateTemplateProps[]>([]);

  useEffect(() => {
    if (isVisible) {
      fetchServiceTypes();
      
      // Pre-fill customer service type if available
      if (customer?.service_type) {
        setSelectedServiceType(customer.service_type);
        form.setFieldsValue({ service_type: customer.service_type });
        fetchTemplates(customer.service_type);
      } else {
        fetchTemplates(); // Fetch all templates if no service type selected
      }
    }
  }, [isVisible, customer]);

  useEffect(() => {
    // Templates are already filtered by backend, just set them directly
    console.log('Selected service type:', selectedServiceType);
    console.log('Templates from backend:', templates);
    setFilteredTemplates(templates);
  }, [selectedServiceType, templates]);

  const fetchServiceTypes = async () => {
    getServiceTypes((data) => {
      setServiceTypes(data.filter((st: ServiceTypeProps) => st.enabled));
    }, () => {});
  };

  const fetchTemplates = async (serviceTypeId?: number) => {
    try {
      const headers = getAuthToken() as AuthTokenType;
      let url = `${EstimateTemplatesUrl}/simple`;
      if (serviceTypeId) {
        url += `?service_type=${serviceTypeId}`;
      }
      console.log('Fetching templates from:', url);
      const response = await axios.get(url, headers);
      // Backend already filters for is_active=True, so no need to filter again
      console.log('Fetched templates:', response.data);
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleFormClose = () => {
    form.resetFields();
    setSelectedServiceType(null);
    onClose?.();
  };

  const handleServiceTypeChange = (serviceTypeId: number) => {
    setSelectedServiceType(serviceTypeId);
    form.setFieldsValue({ template_id: undefined }); // Clear template selection
    fetchTemplates(serviceTypeId); // Fetch templates for this service type
  };

  const onSubmit = async (values: any) => {
    if (!customer?.id) return;
    
    setLoading(true);
    const headers = getAuthToken() as AuthTokenType;

    const submitData = {
      template_id: values.template_id,
      customer_id: customer.id,
      weight_lbs: values.weight_lbs,
      labour_hours: values.labour_hours
    };

    try {
      const response: AxiosResponse = await axios.post(
        `${EstimatesUrl}/create_from_template`, 
        submitData, 
        headers
      );
      
      notification.success({
        message: "Estimate Created",
        description: "New estimate has been created successfully.",
        title: "Success"
      });

      setLoading(false);

      if (response.data?.id) {
        form.resetFields();
        setSelectedServiceType(null);
        onSuccessCallBack?.(response.data.id);
        onClose?.();
      }
    } catch (error: any) {
      notification.error({
        message: "Creation Error",
        description: error.response?.data?.error || "An error occurred while creating the estimate.",
        title: "Creation Error"
      });
      setLoading(false);
    }
  };

  return (
    <Drawer
      title="Create Estimate"
      open={isVisible}
      onClose={handleFormClose}
      destroyOnClose
      width={500}
    >
      <Form layout="vertical" onFinish={onSubmit} form={form}>
        {/* Customer Information Card */}
        <Card 
          size="small"
          style={{ marginBottom: '16px' }}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1890ff' }}>
              <UserOutlined />
              Customer Information
            </span>
          }
        >
          <div style={{ padding: '8px 0' }}>
            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
              {customer?.full_name}
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
              {customer?.email}
            </div>
            {customer?.move_date && (
              <div style={{ fontSize: '12px', color: '#999' }}>
                Move Date: {new Date(customer.move_date).toLocaleDateString()}
              </div>
            )}
          </div>
        </Card>

        {/* Move Details Card */}
        <Card 
          size="small"
          style={{ marginBottom: '16px' }}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1890ff' }}>
              <CarOutlined />
              Move Details
            </span>
          }
        >
          <Form.Item
            label="Service Type"
            name="service_type"
            rules={[{ required: true, message: 'Please select a service type!' }]}
            style={{ marginBottom: '12px' }}
          >
            <Select placeholder="Select Service Type" onChange={handleServiceTypeChange}>
              {serviceTypes.map(st => (
                <Option key={st.id} value={st.id}>
                  {st.service_type}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Estimate Template"
            name="template_id"
            rules={[{ required: true, message: 'Please select a template!' }]}
            style={{ marginBottom: '12px' }}
          >
            <Select 
              placeholder="Select Template" 
              disabled={!selectedServiceType}
              notFoundContent={selectedServiceType ? "No templates available for this service type" : "Please select a service type first"}
            >
              {filteredTemplates.map(template => (
                <Option key={template.id} value={template.id}>
                  <div>
                    <div>{template.name}</div>
                    {template.description && (
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        {template.description}
                      </div>
                    )}
                    {template.service_type_name && (
                      <div style={{ fontSize: '11px', color: '#1890ff' }}>
                        Service: {template.service_type_name}
                      </div>
                    )}
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Divider style={{ margin: '16px 0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Form.Item
              label="Weight (lbs)"
              name="weight_lbs"
              style={{ marginBottom: '0' }}
            >
              <InputNumber 
                placeholder="5000" 
                style={{ width: '100%' }}
                min={0}
              />
            </Form.Item>

            <Form.Item
              label="Labour Hours"
              name="labour_hours"
              style={{ marginBottom: '0' }}
            >
              <InputNumber 
                placeholder="8.0" 
                style={{ width: '100%' }}
                min={0}
                step={0.5}
              />
            </Form.Item>
          </div>
        </Card>

        <Form.Item style={{ marginBottom: '0', marginTop: '24px' }}>
          <Button htmlType="submit" type="primary" block loading={loading} size="large">
            Create & Review Estimate
          </Button>
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default CreateEstimateForm;
