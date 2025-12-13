import React, { FC, useEffect, useState } from "react";
import { Modal, notification, Form, InputNumber, Button, Select } from "antd";
import { 
  DollarOutlined, 
  PercentageOutlined
} from "@ant-design/icons";
import { AuthTokenType, ChargeDefinitionProps } from "../utils/types";
import { getAuthToken } from "../utils/functions";
import axios, { AxiosResponse } from "axios";
import { EstimateLineItemsUrl, ChargeDefinitionsUrl, EstimatesUrl } from "../utils/network";

const { Option } = Select;

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

  return (
    <Modal
      title="Add Charge to Estimate"
      open={isVisible}
      onCancel={handleFormClose}
      footer={null}
      destroyOnClose
      width={500}
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
                  <div>{cd.name}</div>
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
    </Modal>
  );
};

export default AddEstimateLineItemForm;
