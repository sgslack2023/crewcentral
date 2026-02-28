import React, { FC, useEffect, useState } from "react";
import { Drawer, notification, Form, Input, Select, Button, Card, Switch, InputNumber } from "antd";
import BlackButton from './BlackButton';
import {
  HomeOutlined,
  EnvironmentOutlined,
  SendOutlined,
  PercentageOutlined
} from "@ant-design/icons";
import { AuthTokenType, BranchProps } from "../utils/types";
import { getAuthToken } from "../utils/functions";
import axios, { AxiosResponse } from "axios";
import { BranchesUrl } from "../utils/network";

const { Option } = Select;

interface AddBranchFormProps {
  isVisible: boolean;
  onSuccessCallBack: () => void;
  onClose: () => void;
  editingBranch?: BranchProps | null;
}

const AddBranchForm: FC<AddBranchFormProps> = ({
  isVisible = false,
  onSuccessCallBack,
  onClose,
  editingBranch,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleFormClose = () => {
    form.resetFields();
    onClose?.();
  };

  useEffect(() => {
    if (editingBranch) {
      form.setFieldsValue(editingBranch);
    } else {
      form.resetFields();
    }
  }, [editingBranch, form]);

  const onSubmit = async (values: any) => {
    setLoading(true);
    const headers = getAuthToken() as AuthTokenType;

    try {
      let response: AxiosResponse;

      if (editingBranch) {
        response = await axios.put(`${BranchesUrl}/${editingBranch.id}`, values, headers);
        notification.success({
          message: "Branch Updated",
          description: "Branch has been updated successfully.",
          title: "Success"
        });
      } else {
        response = await axios.post(BranchesUrl, values, headers);
        notification.success({
          message: "Branch Added",
          description: "New branch has been added successfully.",
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
      title={editingBranch ? "Edit Branch" : "Add New Branch"}
      open={isVisible}
      onClose={handleFormClose}
      destroyOnClose
      width={500}
    >
      <Form layout="vertical" onFinish={onSubmit} form={form} initialValues={{ is_active: true, sales_tax_percentage: 0.00 }}>
        {/* Branch Information Card */}
        <Card
          size="small"
          style={{ marginBottom: '16px' }}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5b6cf9' }}>
              <HomeOutlined />
              Branch Information
            </span>
          }
        >
          <Form.Item
            label="Branch Name"
            name="name"
            rules={[{ required: true, message: 'Please input the branch name!' }]}
            style={{ marginBottom: '12px' }}
          >
            <Input prefix={<HomeOutlined />} placeholder="Main Office" />
          </Form.Item>

          <Form.Item
            label="Destination"
            name="destination"
            style={{ marginBottom: '12px' }}
          >
            <Input prefix={<EnvironmentOutlined />} placeholder="City, State" />
          </Form.Item>

          <Form.Item
            label="Dispatch Location"
            name="dispatch_location"
            rules={[{ required: true, message: 'Please input the dispatch location!' }]}
            style={{ marginBottom: '12px' }}
          >
            <Input prefix={<SendOutlined />} placeholder="Warehouse Address" />
          </Form.Item>

          <Form.Item
            label="Sales Tax Percentage"
            name="sales_tax_percentage"
            rules={[
              { required: true, message: 'Please enter the sales tax percentage!' },
              { type: 'number', min: 0, max: 100, message: 'Tax percentage must be between 0 and 100' }
            ]}
            style={{ marginBottom: '12px' }}
          >
            <InputNumber
              prefix={<PercentageOutlined />}
              placeholder="8.25"
              min={0}
              max={100}
              step={0.01}
              precision={2}
              style={{ width: '100%' }}
              addonAfter="%"
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

export default AddBranchForm;

