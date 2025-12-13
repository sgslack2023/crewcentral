import React, { FC, useEffect, useState } from "react";
import { Drawer, notification, Form, Input, Select, Button } from "antd";
import { AuthTokenType, DataProps, AddUserFormModalProps, UserProps } from "../utils/types";
import { getAuthToken } from "../utils/functions";
import axios, { AxiosResponse } from "axios";
import { CreateUserUrl, UsersUrl } from "../utils/network";

const { Option } = Select;

interface AddUserFormProps extends AddUserFormModalProps {
  editingUser?: UserProps | null;
}

const AddUserForm: FC<AddUserFormProps> = ({
  isVisible = false,
  onSuccessCallBack,
  onClose,
  editingUser,
  onCloseWithoutEditing, // new prop

}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const handleFormClose = () => {
    form.resetFields();
    onClose?.();
    if (!form.isFieldsTouched()) {
      onCloseWithoutEditing?.(); // Notify the parent about closing without editing
    }
  };

  useEffect(() => {
    if (editingUser) {
      form.setFieldsValue(editingUser);
    } else {
      form.resetFields();
    }
  }, [editingUser, form]);

  const onSubmit = async (values: DataProps) => {
    setLoading(true);
    const headers = getAuthToken() as AuthTokenType;

    try {
      let response: AxiosResponse;

      if (editingUser) {
        // Editing user
        response = await axios.put(`${UsersUrl}/${editingUser.id}`, values, headers);
      } else {
        // Adding new user
        response = await axios.post(CreateUserUrl, values, headers);
      }

      setLoading(false);

      if (response) {
        form.resetFields();
        onSuccessCallBack?.();
        onClose?.(); // Close the drawer
      }
    } catch (error) {
      notification.error({
        message: "Operation Error",
        description: "An error occurred while processing your request.",
        title: "Operation Error"
      });
      setLoading(false);
    }
  };

  return (
    <Drawer
      title={editingUser ? "Edit User" : "Add User"}
      open={isVisible}
      onClose={handleFormClose}
      destroyOnClose
      width={360}
    >
      <Form layout="vertical" onFinish={onSubmit} form={form} onValuesChange={() => setHasChanges(true)}>
        <Form.Item
          label="Name"
          name="fullname"
          rules={[{ required: true, message: 'Please input the full name!' }]}
        >
          <Input placeholder="Full Name" />
        </Form.Item>
        <Form.Item
          label="Email"
          name="email"
          rules={[{ required: true, message: 'Please input the email!' }]}
        >
          <Input placeholder="Email" />
        </Form.Item>
        <Form.Item
          label="Role"
          name="role"
          rules={[{ required: true, message: 'Please select the role!' }]}
        >
          <Select placeholder="Role">
            <Option value="admin">Admin</Option>
            <Option value="employee">Employee</Option>
          </Select>
        </Form.Item>

        <Form.Item>
          <Button htmlType="submit" type="primary" block loading={loading}>
            {editingUser ? "Update" : "Submit"}
          </Button>
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default AddUserForm;