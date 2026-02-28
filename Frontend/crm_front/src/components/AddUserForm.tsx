import React, { FC, useEffect, useState } from "react";
import { Drawer, notification, Form, Input, Select, Card, Switch, Typography, Space } from "antd";
import { BlackButton, WhiteButton } from './';
import {
  UserOutlined,
  MailOutlined,
  UnlockOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined
} from "@ant-design/icons";
import { AuthTokenType, DataProps, AddUserFormModalProps, UserProps } from "../utils/types";
import { getAuthToken } from "../utils/functions";
import axios, { AxiosResponse } from "axios";
import { CreateUserUrl, UsersUrl } from "../utils/network";

const { Option } = Select;
const { Text } = Typography;

interface AddUserFormProps extends AddUserFormModalProps {
  editingUser?: UserProps | null;
}

const AddUserForm: FC<AddUserFormProps> = ({
  isVisible = false,
  onSuccessCallBack,
  onClose,
  editingUser,
  onCloseWithoutEditing,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleFormClose = () => {
    form.resetFields();
    onClose?.();
    if (!form.isFieldsTouched()) {
      onCloseWithoutEditing?.();
    }
  };

  useEffect(() => {
    if (editingUser) {
      form.setFieldsValue({
        fullname: editingUser.fullname,
        email: editingUser.email,
        role: editingUser.role,
        is_active: editingUser.is_active
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ is_active: true });
    }
  }, [editingUser, form]);

  const onSubmit = async (values: any) => {
    setLoading(true);
    const headers = getAuthToken() as AuthTokenType;

    try {
      let response: AxiosResponse;

      if (editingUser) {
        response = await axios.put(`${UsersUrl}/${editingUser.id}`, values, headers);
        notification.success({
          message: "User Updated",
          description: "User account has been updated successfully.",
          title: "Success"
        });
      } else {
        response = await axios.post(CreateUserUrl, values, headers);
        notification.success({
          message: "User Added",
          description: "New user account has been created successfully.",
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
      title={editingUser ? "Edit User Account" : "Add New User Account"}
      open={isVisible}
      onClose={handleFormClose}
      destroyOnClose
      width={450}
    >
      <Form layout="vertical" onFinish={onSubmit} form={form}>
        <Card
          size="small"
          style={{ marginBottom: '16px' }}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5b6cf9' }}>
              <UserOutlined />
              Account Details
            </span>
          }
        >
          <Form.Item
            label="Full Name"
            name="fullname"
            rules={[{ required: true, message: 'Please input the full name!' }]}
            style={{ marginBottom: '16px' }}
          >
            <Input prefix={<UserOutlined />} placeholder="John Doe" />
          </Form.Item>

          <Form.Item
            label="Email Address"
            name="email"
            rules={[
              { required: true, message: 'Please input the email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
            style={{ marginBottom: '16px' }}
          >
            <Input prefix={<MailOutlined />} placeholder="john@example.com" />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              label="Temporary Password"
              name="password"
              rules={[{ required: true, message: 'Please set a temporary password!' }]}
              style={{ marginBottom: '16px' }}
              help="The user should change this upon their first login."
            >
              <Input.Password prefix={<UnlockOutlined />} placeholder="••••••••" />
            </Form.Item>
          )}

          <Form.Item
            label="System Role"
            name="role"
            rules={[{ required: true, message: 'Please select a role!' }]}
            style={{ marginBottom: '16px' }}
          >
            <Select placeholder="Select role">
              <Option value="Admin">Admin</Option>
              <Option value="User">Standard User</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Account Status"
            name="is_active"
            valuePropName="checked"
            style={{ marginBottom: '0' }}
          >
            <Space>
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Toggle to enable or disable access
              </Text>
            </Space>
          </Form.Item>
        </Card>

        <Form.Item style={{ marginBottom: '0', marginTop: '24px' }}>
          <BlackButton htmlType="submit" block loading={loading} style={{ height: '45px', fontSize: '16px' }}>
            Save
          </BlackButton>
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default AddUserForm;