import React, { FC, useEffect, useState } from "react";
import { Drawer, notification, Form, Input, Button, Card, Switch, Upload, message } from "antd";
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

  const handleFormClose = () => {
    form.resetFields();
    setFileList([]);
    onClose?.();
  };

  useEffect(() => {
    if (editingDocument) {
      form.setFieldsValue(editingDocument);
      setFileList([]);
    } else {
      form.resetFields();
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
      formData.append('title', values.title);
      if (values.description) formData.append('description', values.description);
      if (values.document_type) formData.append('document_type', values.document_type);
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
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1890ff' }}>
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
            label="Document Type"
            name="document_type"
            style={{ marginBottom: '12px' }}
          >
            <Input placeholder="Policy, Form, Guide, etc." />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            style={{ marginBottom: '12px' }}
          >
            <TextArea rows={3} placeholder="Brief description of the document..." />
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
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1890ff' }}>
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
          <Button htmlType="submit" type="primary" block loading={loading} size="large">
            {editingDocument ? "Update Document" : "Add Document"}
          </Button>
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default AddDocumentForm;

