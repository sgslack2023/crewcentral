import React, { FC, useEffect, useState } from "react";
import { Drawer, notification, Form, Input, InputNumber, Button, Card, Switch, Select, List, Space, Tag, Modal } from "antd";
import BlackButton from './BlackButton';
import {
  DollarOutlined,
  FileTextOutlined,
  TagsOutlined,
  PercentageOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined
} from "@ant-design/icons";
import { AuthTokenType, ChargeDefinitionProps, ChargeCategoryProps, ServiceTypeProps } from "../utils/types";
import { getAuthToken, getServiceTypes } from "../utils/functions";
import axios, { AxiosResponse } from "axios";
import { ChargeDefinitionsUrl, ChargeCategoriesUrl, ServiceTypesUrl } from "../utils/network";

const { Option } = Select;
const { TextArea } = Input;

interface AddChargeDefinitionFormProps {
  isVisible: boolean;
  onSuccessCallBack: () => void;
  onClose: () => void;
  editingDefinition?: ChargeDefinitionProps | null;
}

const CHARGE_TYPE_OPTIONS = [
  { value: 'per_lb', label: 'Per Pound' },
  { value: 'percent', label: 'Percentage' },
  { value: 'flat', label: 'Flat Fee' },
  { value: 'hourly', label: 'Hourly' },
];

// Remove hardcoded options - we'll use MoveType data

const AddChargeDefinitionForm: FC<AddChargeDefinitionFormProps> = ({
  isVisible = false,
  onSuccessCallBack,
  onClose,
  editingDefinition,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ChargeCategoryProps[]>([]);
  const [chargeDefinitions, setChargeDefinitions] = useState<ChargeDefinitionProps[]>([]);
  const [allChargeDefinitions, setAllChargeDefinitions] = useState<ChargeDefinitionProps[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeProps[]>([]);
  const [selectedChargeType, setSelectedChargeType] = useState<string>('');
  const [selectedDefinition, setSelectedDefinition] = useState<ChargeDefinitionProps | null>(null);

  useEffect(() => {
    if (isVisible) {
      fetchCategories();
      fetchChargeDefinitions();
      fetchAllChargeDefinitions();
      fetchServiceTypes();
    }
  }, [isVisible]);

  const fetchCategories = async () => {
    try {
      const headers = getAuthToken() as AuthTokenType;
      const response = await axios.get(`${ChargeCategoriesUrl}/simple`, headers);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchChargeDefinitions = async () => {
    try {
      const headers = getAuthToken() as AuthTokenType;
      const response = await axios.get(`${ChargeDefinitionsUrl}/simple`, headers);
      setChargeDefinitions(response.data);
    } catch (error) {
      console.error('Error fetching charge definitions:', error);
    }
  };

  const fetchServiceTypes = async () => {
    getServiceTypes((data) => {
      setServiceTypes(data.filter((st: ServiceTypeProps) => st.enabled));
    }, () => { });
  };

  const fetchAllChargeDefinitions = async () => {
    try {
      const headers = getAuthToken() as AuthTokenType;
      const response = await axios.get(ChargeDefinitionsUrl, headers);
      setAllChargeDefinitions(response.data);
    } catch (error) {
      console.error('Error fetching all charge definitions:', error);
    }
  };

  const handleFormClose = () => {
    form.resetFields();
    setSelectedChargeType('');
    setSelectedDefinition(null);
    onClose?.();
  };

  const handleEditDefinition = (definition: ChargeDefinitionProps) => {
    setSelectedDefinition(definition);
    form.setFieldsValue(definition);
    setSelectedChargeType(definition.charge_type);
  };

  const handleDeleteDefinition = async (id: number) => {
    Modal.confirm({
      title: 'Delete Charge Definition',
      content: 'Are you sure you want to delete this charge definition?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          const headers = getAuthToken() as AuthTokenType;
          await axios.delete(`${ChargeDefinitionsUrl}/${id}`, headers);
          notification.success({
            message: "Definition Deleted",
            description: "Charge definition has been deleted successfully.",
            title: "Success"
          });
          fetchAllChargeDefinitions();
          fetchChargeDefinitions();
          if (selectedDefinition?.id === id) {
            form.resetFields();
            setSelectedDefinition(null);
            setSelectedChargeType('');
          }
        } catch (error: any) {
          notification.error({
            message: "Delete Error",
            description: error.response?.data?.error || "Failed to delete definition.",
            title: "Delete Error"
          });
        }
      }
    });
  };

  const handleNewDefinition = () => {
    setSelectedDefinition(null);
    form.resetFields();
    setSelectedChargeType('');
  };

  useEffect(() => {
    if (editingDefinition) {
      setSelectedDefinition(editingDefinition);
      form.setFieldsValue(editingDefinition);
      setSelectedChargeType(editingDefinition.charge_type);
    } else if (!selectedDefinition) {
      form.resetFields();
      setSelectedChargeType('');
    }
  }, [editingDefinition, form]);

  const onSubmit = async (values: any) => {
    setLoading(true);
    const headers = getAuthToken() as AuthTokenType;

    try {
      let response: AxiosResponse;

      if (selectedDefinition) {
        response = await axios.put(`${ChargeDefinitionsUrl}/${selectedDefinition.id}`, values, headers);
        notification.success({
          message: "Charge Definition Updated",
          description: "Charge definition has been updated successfully.",
          title: "Success"
        });
      } else {
        response = await axios.post(ChargeDefinitionsUrl, values, headers);
        notification.success({
          message: "Charge Definition Added",
          description: "New charge definition has been added successfully.",
          title: "Success"
        });
      }

      setLoading(false);

      if (response) {
        form.resetFields();
        setSelectedChargeType('');
        setSelectedDefinition(null);
        fetchAllChargeDefinitions();
        fetchChargeDefinitions();
        onSuccessCallBack?.();
      }
    } catch (error: any) {
      notification.error({
        message: "Operation Error",
        description: error.response?.data?.error || "An error occurred while processing your request.",
        title: "Operation Error"
      });
      setLoading(false);
    }
  };

  const handleChargeTypeChange = (value: string) => {
    setSelectedChargeType(value);
    // Clear related fields when charge type changes
    if (value !== 'percent') {
      form.setFieldsValue({
        default_percentage: undefined,
        percent_applied_on: undefined
      });
    } else {
      form.setFieldsValue({ default_rate: undefined });
    }
  };

  return (
    <Drawer
      title="Manage Charge Definitions"
      open={isVisible}
      onClose={handleFormClose}
      destroyOnClose
      width={700}
    >
      {/* Existing Definitions List */}
      <Card
        size="small"
        title="Existing Charge Definitions"
        style={{ marginBottom: '16px', maxHeight: '300px', overflow: 'auto' }}
        extra={
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleNewDefinition}
          >
            New
          </Button>
        }
      >
        <List
          dataSource={allChargeDefinitions}
          locale={{ emptyText: 'No charge definitions yet' }}
          renderItem={(definition) => (
            <List.Item
              actions={[
                <Button
                  key="edit"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEditDefinition(definition)}
                >
                  Edit
                </Button>,
                <Button
                  key="delete"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => definition.id && handleDeleteDefinition(definition.id)}
                >
                  Delete
                </Button>
              ]}
              style={{
                backgroundColor: selectedDefinition?.id === definition.id ? '#f0f2ff' : 'transparent',
                padding: '12px',
                borderRadius: '6px'
              }}
            >
              <List.Item.Meta
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {definition.name}
                    <Tag color="blue">{definition.charge_type}</Tag>
                    <Tag color="orange">{definition.category_name}</Tag>
                    <Tag color={definition.is_active ? 'green' : 'red'}>
                      {definition.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </Tag>
                    {definition.is_estimate_only && (
                      <Tag color="orange">ESTIMATE ONLY</Tag>
                    )}
                  </div>
                }
                description={
                  <div style={{ fontSize: '12px' }}>
                    {definition.charge_type === 'percent' && definition.default_percentage ? (
                      <span>Default: {definition.default_percentage}%</span>
                    ) : definition.default_rate ? (
                      <span>Default Rate: ${definition.default_rate}</span>
                    ) : null}
                    {definition.applies_to_names && definition.applies_to_names.length > 0 && (
                      <span> | Applies to: {definition.applies_to_names.join(', ')}</span>
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      {/* Add/Edit Form */}
      <Card
        size="small"
        title={selectedDefinition ? `Edit: ${selectedDefinition.name}` : "Add New Charge Definition"}
      >
        <Form layout="vertical" onFinish={onSubmit} form={form} initialValues={{ is_active: true, applies_to: [], is_estimate_only: false }}>
          <div>
            <Form.Item
              label="Charge Name"
              name="name"
              rules={[{ required: true, message: 'Please input the charge name!' }]}
              style={{ marginBottom: '12px' }}
            >
              <Input prefix={<DollarOutlined />} placeholder="Transportation Fee" />
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
                <Select placeholder="Select Type" onChange={handleChargeTypeChange}>
                  {CHARGE_TYPE_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </div>

            <Form.Item
              label="Description"
              name="description"
              style={{ marginBottom: '0' }}
            >
              <TextArea
                placeholder="Description of the charge"
                rows={2}
              />
            </Form.Item>

            <h4 style={{ marginTop: '16px', marginBottom: '12px', color: '#5b6cf9' }}>
              <PercentageOutlined /> Pricing Information
            </h4>
            {selectedChargeType === 'percent' ? (
              <>
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

                <Form.Item
                  label="Applied On (Base Charge)"
                  name="percent_applied_on"
                  style={{ marginBottom: '0' }}
                >
                  <Select placeholder="Select base charge (optional)" allowClear>
                    {chargeDefinitions.filter(cd => cd.charge_type !== 'percent').map(cd => (
                      <Option key={cd.id} value={cd.id}>
                        {cd.name} ({cd.category_name})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </>
            ) : (
              <Form.Item
                label="Default Rate"
                name="default_rate"
                rules={[{ required: selectedChargeType !== '', message: 'Please input the rate!' }]}
                style={{ marginBottom: '0' }}
              >
                <InputNumber
                  placeholder="0.00"
                  style={{ width: '100%' }}
                  min={0}
                  step={0.01}
                  addonBefore="$"
                />
              </Form.Item>
            )}

            <h4 style={{ marginTop: '16px', marginBottom: '12px', color: '#5b6cf9' }}>
              <TagsOutlined /> Settings
            </h4>
            <Form.Item
              label="Applies To Service Types"
              name="applies_to"
              style={{ marginBottom: '12px' }}
              help="Leave empty to apply to all service types"
            >
              <Select
                mode="multiple"
                placeholder="Select Service Types (optional)"
                allowClear
              >
                {serviceTypes.map(st => (
                  <Option key={st.id} value={st.id}>
                    {st.service_type}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Form.Item
                label="Required Charge"
                name="is_required"
                valuePropName="checked"
                style={{ marginBottom: '0' }}
              >
                <Switch checkedChildren="Required" unCheckedChildren="Optional" />
              </Form.Item>

              <Form.Item
                label="Active Status"
                name="is_active"
                valuePropName="checked"
                style={{ marginBottom: '0' }}
              >
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            </div>

            <Form.Item
              label="Estimate Only"
              name="is_estimate_only"
              valuePropName="checked"
              style={{ marginBottom: '0', marginTop: '12px' }}
              help="If checked, this charge will only appear for estimates and won't show in the Configure section"
            >
              <Switch checkedChildren="Yes - Estimate Only" unCheckedChildren="No - Show Everywhere" />
            </Form.Item>
          </div>

          <Form.Item style={{ marginBottom: '0', marginTop: '16px' }}>
            <Space style={{ width: '100%' }}>
              <BlackButton htmlType="submit" loading={loading} style={{ height: '40px', fontSize: '16px' }}>
                Save
              </BlackButton>
              {selectedDefinition && (
                <Button onClick={handleNewDefinition}>
                  Cancel Edit
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </Drawer>
  );
};

export default AddChargeDefinitionForm;
