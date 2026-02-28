import React, { FC, useEffect, useState } from "react";
import { Drawer, notification, Form, Input, Button, Card, Switch, Upload, Select, message } from "antd";
import BlackButton from './BlackButton';
import {
  FileTextOutlined,
  UploadOutlined,
  LinkOutlined
} from "@ant-design/icons";
import { AuthTokenType, DocumentProps } from "../utils/types";
import { getAuthToken } from "../utils/functions";
import axios, { AxiosResponse } from "axios";
import { DocumentsUrl } from "../utils/network";

const { TextArea } = Input;
const { Option } = Select;

interface AddDocumentFormProps {
  isVisible: boolean;
  onSuccessCallBack: () => void;
  onClose: () => void;
  editingDocument?: DocumentProps | null;
}

const AddDocumentForm: FC<AddDocumentFormProps> = ({
  isVisible = false,
  onSuccessCallBack,
  onClose,
  editingDocument,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Other');

  const handleFormClose = () => {
    form.resetFields();
    setFileList([]);
    onClose?.();
  };

  useEffect(() => {
    if (editingDocument) {
      form.setFieldsValue(editingDocument);
      setSelectedCategory(editingDocument.category || 'Other');
      setFileList([]);
    } else {
      form.resetFields();
      setSelectedCategory('Other');
      setFileList([]);
    }
  }, [editingDocument, form]);

  const onSubmit = async (values: any) => {
    setLoading(true);
    const headers = getAuthToken() as AuthTokenType;

    console.log('File list:', fileList);
    console.log('File list length:', fileList.length);
    if (fileList.length > 0) {
      console.log('First file:', fileList[0]);
      console.log('Origin file obj:', fileList[0].originFileObj);
    }

    try {
      let response: AxiosResponse;

      // Create FormData for file upload
      const formData = new FormData();
      if (values.title) formData.append('title', values.title);
      if (values.category) formData.append('category', values.category);
      if (values.document_purpose) formData.append('document_purpose', values.document_purpose);
      formData.append('is_active', values.is_active ? 'true' : 'false');

      // Add file if uploaded
      if (fileList.length > 0) {
        const file = fileList[0].originFileObj || fileList[0];
        console.log('Appending file to FormData:', file);
        formData.append('file', file);
      } else {
        console.log('No file selected - fileList is empty');
      }

      if (editingDocument) {
        response = await axios.put(`${DocumentsUrl}/${editingDocument.id}`, formData, headers);
        notification.success({
          message: "Document Updated",
          description: "Document has been updated successfully.",
          title: "Success"
        });
      } else {
        response = await axios.post(DocumentsUrl, formData, headers);
        notification.success({
          message: "Document Added",
          description: "New document has been added successfully.",
          title: "Success"
        });
      }

      setLoading(false);

      if (response) {
        form.resetFields();
        setFileList([]);
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

  const uploadProps = {
    beforeUpload: (file: any) => {
      setFileList([file]);
      return false; // Prevent automatic upload
    },
    onRemove: () => {
      setFileList([]);
    },
    fileList,
  };

  return (
    <Drawer
      title={editingDocument ? "Edit Document" : "Add New Document"}
      open={isVisible}
      onClose={handleFormClose}
      destroyOnClose
      width={600}
    >
      <Form layout="vertical" onFinish={onSubmit} form={form} initialValues={{ is_active: true }}>
        {/* Document Information Card */}
        <Card
          size="small"
          style={{ marginBottom: '16px' }}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5b6cf9' }}>
              <FileTextOutlined />
              Document Information
            </span>
          }
        >
          <Form.Item
            label="Document Title"
            name="title"
            rules={[{ required: true, message: 'Please input the document title!' }]}
            style={{ marginBottom: '12px' }}
          >
            <Input prefix={<FileTextOutlined />} placeholder="Employee Handbook" />
          </Form.Item>

          <Form.Item
            label="Category"
            name="category"
            rules={[{ required: true, message: 'Please select a category!' }]}
            style={{ marginBottom: '12px' }}
          >
            <Select
              placeholder="Select category"
              onChange={(value) => setSelectedCategory(value)}
            >
              <Option value="Email">Email</Option>
              <Option value="Contract">Contract</Option>
              <Option value="Invoice">Invoice</Option>
              <Option value="Payment Receipt">Payment Receipt</Option>
              <Option value="Work Order">Work Order</Option>
              <Option value="Other">Other</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="System Mapping"
            name="document_purpose"
            style={{ marginBottom: '12px' }}
            help="Maps this document for automatic use in estimates and emails"
          >
            <Select placeholder="Select mapping (e.g. Invoice Email, Closed Email)">
              <Option value="none">None</Option>
              <Option value="new_lead_email">New Lead Email</Option>
              <Option value="booked_email">Booked Email</Option>
              <Option value="closed_email">Closed Email</Option>
              <Option value="invoice_email">Invoice Email</Option>
              <Option value="receipt_email">Receipt Email</Option>
              <Option value="endpoint_leads_task">Endpoint Leads task</Option>
              <Option value="estimate_pdf">Estimate PDF</Option>
              <Option value="invoice_pdf">Invoice PDF</Option>
              <Option value="receipt_pdf">Receipt PDF</Option>
              <Option value="work_order_pdf">Work Order PDF</Option>
              <Option value="contract_pdf">Contract PDF</Option>
            </Select>
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

        {/* File Upload Card */}
        <Card
          size="small"
          style={{ marginBottom: '16px' }}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5b6cf9' }}>
              <UploadOutlined />
              File Upload
            </span>
          }
        >
          <Form.Item
            label="Upload File"
            style={{ marginBottom: '12px' }}
          >
            <Upload {...uploadProps} maxCount={1}>
              <Button icon={<UploadOutlined />}>Select File</Button>
            </Upload>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
              Upload PDF, DOC, or other document files
            </div>
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

export default AddDocumentForm;

