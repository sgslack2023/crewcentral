import React, { FC, useEffect, useState } from "react";
import { Drawer, notification, Form, Input, Button, Card, Switch, Select } from "antd";
import BlackButton from './BlackButton';
import {
  FileTextOutlined,
  CarOutlined
} from "@ant-design/icons";
import { AuthTokenType, EstimateTemplateProps, ServiceTypeProps } from "../utils/types";
import { getAuthToken, getServiceTypes } from "../utils/functions";
import axios, { AxiosResponse } from "axios";
import { EstimateTemplatesUrl, ServiceTypesUrl } from "../utils/network";

const { Option } = Select;
const { TextArea } = Input;

interface AddEstimateTemplateFormProps {
  isVisible: boolean;
  onSuccessCallBack: () => void;
  onClose: () => void;
  editingTemplate?: EstimateTemplateProps | null;
}

const AddEstimateTemplateForm: FC<AddEstimateTemplateFormProps> = ({
  isVisible = false,
  onSuccessCallBack,
  onClose,
  editingTemplate,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeProps[]>([]);

  useEffect(() => {
    if (isVisible) {
      fetchServiceTypes();
    }
  }, [isVisible]);

  const fetchServiceTypes = async () => {
    getServiceTypes((data) => {
      setServiceTypes(data.filter((st: ServiceTypeProps) => st.enabled));
    }, () => { });
  };

  const handleFormClose = () => {
    form.resetFields();
    onClose?.();
  };

  useEffect(() => {
    if (editingTemplate) {
      form.setFieldsValue(editingTemplate);
    } else {
      form.resetFields();
    }
  }, [editingTemplate, form]);

  const onSubmit = async (values: any) => {
    setLoading(true);
    const headers = getAuthToken() as AuthTokenType;

    try {
      let response: AxiosResponse;

      if (editingTemplate) {
        response = await axios.put(`${EstimateTemplatesUrl}/${editingTemplate.id}`, values, headers);
        notification.success({
          message: "Template Updated",
          description: "Estimate template has been updated successfully.",
          title: "Success"
        });
      } else {
        response = await axios.post(EstimateTemplatesUrl, values, headers);
        notification.success({
          message: "Template Added",
          description: "New estimate template has been added successfully.",
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
      title={editingTemplate ? "Edit Estimate Template" : "Add New Estimate Template"}
      open={isVisible}
      onClose={handleFormClose}
      destroyOnClose
      width={500}
    >
      <Form layout="vertical" onFinish={onSubmit} form={form} initialValues={{ is_active: true }}>
        {/* Template Information Card */}
        <Card
          size="small"
          style={{ marginBottom: '16px' }}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5b6cf9' }}>
              <FileTextOutlined />
              Template Information
            </span>
          }
        >
          <Form.Item
            label="Template Name"
            name="name"
            rules={[{ required: true, message: 'Please input the template name!' }]}
            style={{ marginBottom: '12px' }}
          >
            <Input prefix={<FileTextOutlined />} placeholder="Local Move Template" />
          </Form.Item>

          <Form.Item
            label="Service Type"
            name="service_type"
            rules={[{ required: true, message: 'Please select a service type!' }]}
            style={{ marginBottom: '12px' }}
          >
            <Select placeholder="Select Service Type">
              {serviceTypes.map(st => (
                <Option key={st.id} value={st.id}>
                  {st.service_type}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            style={{ marginBottom: '12px' }}
          >
            <TextArea
              placeholder="Description of the template"
              rows={3}
            />
          </Form.Item>

          <Form.Item
            label="Active Status"
            name="is_active"
            valuePropName="checked"
            style={{ marginBottom: '0' }}
          >
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
        </Card>

        <Form.Item style={{ marginBottom: '0', marginTop: '24px' }}>
          <BlackButton htmlType="submit" block loading={loading} style={{ height: '40px', fontSize: '16px' }}>
            Save
          </BlackButton>
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default AddEstimateTemplateForm;
