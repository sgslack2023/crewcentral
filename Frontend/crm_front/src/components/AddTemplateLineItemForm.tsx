import React, { FC, useEffect, useState } from "react";
import { Drawer, notification, Form, InputNumber, Button, Card, Switch, Select } from "antd";
import { 
  DollarOutlined, 
  PercentageOutlined,
  OrderedListOutlined
} from "@ant-design/icons";
import { AuthTokenType, TemplateLineItemProps, ChargeDefinitionProps } from "../utils/types";
import { getAuthToken } from "../utils/functions";
import axios, { AxiosResponse } from "axios";
import { TemplateLineItemsUrl, ChargeDefinitionsUrl } from "../utils/network";

const { Option } = Select;

interface AddTemplateLineItemFormProps {
  isVisible: boolean;
  onSuccessCallBack: () => void;
  onClose: () => void;
  templateId: number | null;
  editingLineItem?: TemplateLineItemProps | null;
}

const AddTemplateLineItemForm: FC<AddTemplateLineItemFormProps> = ({
  isVisible = false,
  onSuccessCallBack,
  onClose,
  templateId,
  editingLineItem,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [chargeDefinitions, setChargeDefinitions] = useState<ChargeDefinitionProps[]>([]);
  const [selectedCharge, setSelectedCharge] = useState<ChargeDefinitionProps | null>(null);

  useEffect(() => {
    if (isVisible) {
      fetchChargeDefinitions();
    }
  }, [isVisible]);

  const fetchChargeDefinitions = async () => {
    try {
      const headers = getAuthToken() as AuthTokenType;
      const response = await axios.get(ChargeDefinitionsUrl, headers);
      setChargeDefinitions(response.data.filter((cd: ChargeDefinitionProps) => cd.is_active));
    } catch (error) {
      console.error('Error fetching charge definitions:', error);
    }
  };

  const handleFormClose = () => {
    form.resetFields();
    setSelectedCharge(null);
    onClose?.();
  };

  useEffect(() => {
    if (editingLineItem) {
      form.setFieldsValue(editingLineItem);
      // Find the selected charge to show its details
      const charge = chargeDefinitions.find(cd => cd.id === editingLineItem.charge);
      setSelectedCharge(charge || null);
    } else {
      form.resetFields();
      setSelectedCharge(null);
    }
  }, [editingLineItem, form, chargeDefinitions]);

  const handleChargeChange = (chargeId: number) => {
    const charge = chargeDefinitions.find(cd => cd.id === chargeId);
    setSelectedCharge(charge || null);
    
    if (charge) {
      // Set default values from charge definition
      form.setFieldsValue({
        rate: charge.default_rate,
        percentage: charge.default_percentage
      });
    }
  };

  const onSubmit = async (values: any) => {
    if (!templateId) return;
    
    setLoading(true);
    const headers = getAuthToken() as AuthTokenType;

    const submitData = {
      ...values,
      template: templateId
    };

    try {
      let response: AxiosResponse;

      if (editingLineItem) {
        response = await axios.put(`${TemplateLineItemsUrl}/${editingLineItem.id}`, submitData, headers);
        notification.success({
          message: "Line Item Updated",
          description: "Template line item has been updated successfully.",
          title: "Success"
        });
      } else {
        response = await axios.post(TemplateLineItemsUrl, submitData, headers);
        notification.success({
          message: "Line Item Added",
          description: "New line item has been added to template.",
          title: "Success"
        });
      }

      setLoading(false);

      if (response) {
        form.resetFields();
        setSelectedCharge(null);
        onSuccessCallBack?.();
        onClose?.();
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

  return (
    <Drawer
      title={editingLineItem ? "Edit Template Line Item" : "Add Template Line Item"}
      open={isVisible}
      onClose={handleFormClose}
      destroyOnClose
      width={500}
    >
      <Form layout="vertical" onFinish={onSubmit} form={form} initialValues={{ is_editable: true, display_order: 0 }}>
        {/* Charge Selection Card */}
        <Card 
          size="small"
          style={{ marginBottom: '16px' }}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1890ff' }}>
              <DollarOutlined />
              Charge Selection
            </span>
          }
        >
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
                  {cd.name} ({cd.category_name}) - {cd.charge_type}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {selectedCharge && (
            <div style={{
              padding: '12px',
              backgroundColor: '#f6ffed',
              borderRadius: '6px',
              border: '1px solid #b7eb8f',
              marginBottom: '12px'
            }}>
              <div style={{ fontSize: '12px', color: '#389e0d', marginBottom: '4px' }}>
                <strong>Charge Details:</strong>
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>
                Type: {selectedCharge.charge_type} | 
                Category: {selectedCharge.category_name}
                {selectedCharge.applies_to_names && selectedCharge.applies_to_names.length > 0 && (
                  <> | Applies to: {selectedCharge.applies_to_names.join(', ')}</>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Pricing Override Card */}
        <Card 
          size="small"
          style={{ marginBottom: '16px' }}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1890ff' }}>
              <PercentageOutlined />
              Pricing Override (Optional)
            </span>
          }
        >
          {selectedCharge?.charge_type === 'percent' ? (
            <Form.Item
              label="Percentage Override"
              name="percentage"
              style={{ marginBottom: '0' }}
              help={`Default: ${selectedCharge.default_percentage || 0}%`}
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
              label="Rate Override"
              name="rate"
              style={{ marginBottom: '0' }}
              help={`Default: $${selectedCharge?.default_rate || 0}`}
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
        </Card>

        {/* Settings Card */}
        <Card 
          size="small"
          style={{ marginBottom: '16px' }}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1890ff' }}>
              <OrderedListOutlined />
              Settings
            </span>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Form.Item
              label="Display Order"
              name="display_order"
              style={{ marginBottom: '12px' }}
            >
              <InputNumber 
                placeholder="0" 
                style={{ width: '100%' }}
                min={0}
              />
            </Form.Item>

            <Form.Item
              label="User Editable"
              name="is_editable"
              valuePropName="checked"
              style={{ marginBottom: '0' }}
            >
              <Switch checkedChildren="Yes" unCheckedChildren="No" />
            </Form.Item>
          </div>
        </Card>

        <Form.Item style={{ marginBottom: '0', marginTop: '24px' }}>
          <Button htmlType="submit" type="primary" block loading={loading} size="large">
            {editingLineItem ? "Update Line Item" : "Add Line Item"}
          </Button>
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default AddTemplateLineItemForm;
