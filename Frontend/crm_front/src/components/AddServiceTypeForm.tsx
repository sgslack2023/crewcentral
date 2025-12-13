import React, { FC, useEffect, useState } from "react";
import { Drawer, notification, Form, Input, InputNumber, Button, Card, Switch } from "antd";
import { 
  TagsOutlined, 
  PercentageOutlined, 
  BgColorsOutlined
} from "@ant-design/icons";
import { AuthTokenType, ServiceTypeProps } from "../utils/types";
import { getAuthToken } from "../utils/functions";
import axios, { AxiosResponse } from "axios";
import { ServiceTypesUrl } from "../utils/network";

interface AddServiceTypeFormProps {
  isVisible: boolean;
  onSuccessCallBack: () => void;
  onClose: () => void;
  editingServiceType?: ServiceTypeProps | null;
}

const AddServiceTypeForm: FC<AddServiceTypeFormProps> = ({
  isVisible = false,
  onSuccessCallBack,
  onClose,
  editingServiceType,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleFormClose = () => {
    form.resetFields();
    onClose?.();
  };

  useEffect(() => {
    if (editingServiceType) {
      form.setFieldsValue(editingServiceType);
    } else {
      form.resetFields();
    }
  }, [editingServiceType, form]);

  const onSubmit = async (values: any) => {
    setLoading(true);
    const headers = getAuthToken() as AuthTokenType;

    try {
      let response: AxiosResponse;

      if (editingServiceType) {
        response = await axios.put(`${ServiceTypesUrl}/${editingServiceType.id}`, values, headers);
        notification.success({
          message: "Service Type Updated",
          description: "Service type has been updated successfully.",
          title: "Success"
        });
      } else {
        response = await axios.post(ServiceTypesUrl, values, headers);
        notification.success({
          message: "Service Type Added",
          description: "New service type has been added successfully.",
          title: "Success"
        });
      }

      setLoading(false);

      if (response) {
        form.resetFields();
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
      title={editingServiceType ? "Edit Service Type" : "Add New Service Type"}
      open={isVisible}
      onClose={handleFormClose}
      destroyOnClose
      width={500}
    >
      <Form 
        layout="vertical" 
        onFinish={onSubmit} 
        form={form} 
        initialValues={{ scaling_factor: 1.0, enabled: true }}
      >
        {/* Service Type Information Card */}
        <Card 
          size="small"
          style={{ marginBottom: '16px' }}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1890ff' }}>
              <TagsOutlined />
              Service Type Information
            </span>
          }
        >
          <Form.Item
            label="Service Type Name"
            name="service_type"
            rules={[{ required: true, message: 'Please input the service type name!' }]}
            style={{ marginBottom: '12px' }}
          >
            <Input prefix={<TagsOutlined />} placeholder="Residential Moving" />
          </Form.Item>

          <Form.Item
            label="Scaling Factor"
            name="scaling_factor"
            rules={[{ required: true, message: 'Please input the scaling factor!' }]}
            style={{ marginBottom: '12px' }}
          >
            <InputNumber 
              prefix={<PercentageOutlined />} 
              placeholder="1.0" 
              step={0.1}
              min={0}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            label="Color (Hex Code)"
            name="color"
            style={{ marginBottom: '12px' }}
            extra="Enter hex color code (e.g., #FF5733)"
          >
            <Input 
              prefix={<BgColorsOutlined />} 
              placeholder="#1890ff" 
              maxLength={7}
            />
          </Form.Item>

          <Form.Item
            label="Enabled"
            name="enabled"
            valuePropName="checked"
            style={{ marginBottom: '0' }}
          >
            <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
          </Form.Item>
        </Card>

        <Form.Item style={{ marginBottom: '0', marginTop: '24px' }}>
          <Button htmlType="submit" type="primary" block loading={loading} size="large">
            {editingServiceType ? "Update Service Type" : "Add Service Type"}
          </Button>
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default AddServiceTypeForm;

