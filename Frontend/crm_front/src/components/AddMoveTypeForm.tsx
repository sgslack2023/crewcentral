import React, { FC, useEffect, useState } from "react";
import { Drawer, notification, Form, Input, InputNumber, Button, Card, Switch } from "antd";
import BlackButton from './BlackButton';
import {
  CarOutlined,
  FileTextOutlined,
  ColumnHeightOutlined,
  DashboardOutlined
} from "@ant-design/icons";
import { AuthTokenType, MoveTypeProps } from "../utils/types";
import { getAuthToken } from "../utils/functions";
import axios, { AxiosResponse } from "axios";
import { MoveTypesUrl } from "../utils/network";

interface AddMoveTypeFormProps {
  isVisible: boolean;
  onSuccessCallBack: () => void;
  onClose: () => void;
  editingMoveType?: MoveTypeProps | null;
}

const AddMoveTypeForm: FC<AddMoveTypeFormProps> = ({
  isVisible = false,
  onSuccessCallBack,
  onClose,
  editingMoveType,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleFormClose = () => {
    form.resetFields();
    onClose?.();
  };

  useEffect(() => {
    if (editingMoveType) {
      form.setFieldsValue(editingMoveType);
    } else {
      form.resetFields();
    }
  }, [editingMoveType, form]);

  const onSubmit = async (values: any) => {
    setLoading(true);
    const headers = getAuthToken() as AuthTokenType;

    try {
      let response: AxiosResponse;

      if (editingMoveType) {
        response = await axios.put(`${MoveTypesUrl}/${editingMoveType.id}`, values, headers);
        notification.success({
          message: "Move Type Updated",
          description: "Move type has been updated successfully.",
          title: "Success"
        });
      } else {
        response = await axios.post(MoveTypesUrl, values, headers);
        notification.success({
          message: "Move Type Added",
          description: "New move type has been added successfully.",
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
      title={editingMoveType ? "Edit Move Type" : "Add New Move Type"}
      open={isVisible}
      onClose={handleFormClose}
      destroyOnClose
      width={500}
    >
      <Form layout="vertical" onFinish={onSubmit} form={form} initialValues={{ is_active: true, cubic_feet: 0, weight: 0 }}>
        {/* Move Type Information Card */}
        <Card
          size="small"
          style={{ marginBottom: '16px' }}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5b6cf9' }}>
              <CarOutlined />
              Move Type Information
            </span>
          }
        >
          <Form.Item
            label="Move Type Name"
            name="name"
            rules={[{ required: true, message: 'Please input the move type name!' }]}
            style={{ marginBottom: '12px' }}
          >
            <Input prefix={<CarOutlined />} placeholder="Local Move" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            style={{ marginBottom: '12px' }}
          >
            <Input.TextArea
              placeholder="Description of the move type"
              rows={3}
            />
          </Form.Item>

          <Form.Item
            label="Cubic Feet"
            name="cubic_feet"
            rules={[{ required: true, message: 'Please input the cubic feet!' }]}
            style={{ marginBottom: '12px' }}
          >
            <InputNumber
              prefix={<ColumnHeightOutlined />}
              placeholder="0.00"
              style={{ width: '100%' }}
              min={0}
              step={0.01}
            />
          </Form.Item>

          <Form.Item
            label="Weight (lbs)"
            name="weight"
            rules={[{ required: true, message: 'Please input the weight!' }]}
            style={{ marginBottom: '12px' }}
          >
            <InputNumber
              prefix={<DashboardOutlined />}
              placeholder="0.00"
              style={{ width: '100%' }}
              min={0}
              step={0.01}
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

export default AddMoveTypeForm;

