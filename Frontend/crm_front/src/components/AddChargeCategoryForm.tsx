import React, { FC, useEffect, useState } from "react";
import { Drawer, notification, Form, Input, Button, Card, Switch, List, Space, Tag, Modal } from "antd";
import { 
  TagsOutlined, 
  FileTextOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined
} from "@ant-design/icons";
import { AuthTokenType, ChargeCategoryProps } from "../utils/types";
import { getAuthToken, getChargeCategories } from "../utils/functions";
import axios, { AxiosResponse } from "axios";
import { ChargeCategoriesUrl } from "../utils/network";

const { TextArea } = Input;

interface AddChargeCategoryFormProps {
  isVisible: boolean;
  onSuccessCallBack: () => void;
  onClose: () => void;
  editingCategory?: ChargeCategoryProps | null;
}

const AddChargeCategoryForm: FC<AddChargeCategoryFormProps> = ({
  isVisible = false,
  onSuccessCallBack,
  onClose,
  editingCategory,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ChargeCategoryProps[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ChargeCategoryProps | null>(null);

  useEffect(() => {
    if (isVisible) {
      fetchCategories();
    }
  }, [isVisible]);

  const fetchCategories = async () => {
    getChargeCategories(setCategories, () => {});
  };

  const handleFormClose = () => {
    form.resetFields();
    setSelectedCategory(null);
    onClose?.();
  };

  const handleEditCategory = (category: ChargeCategoryProps) => {
    setSelectedCategory(category);
    form.setFieldsValue(category);
  };

  const handleDeleteCategory = async (id: number) => {
    Modal.confirm({
      title: 'Delete Charge Category',
      content: 'Are you sure you want to delete this charge category?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          const headers = getAuthToken() as AuthTokenType;
          await axios.delete(`${ChargeCategoriesUrl}/${id}`, headers);
          notification.success({
            message: "Category Deleted",
            description: "Charge category has been deleted successfully.",
            title: "Success"
          });
          fetchCategories();
          if (selectedCategory?.id === id) {
            form.resetFields();
            setSelectedCategory(null);
          }
        } catch (error: any) {
          notification.error({
            message: "Delete Error",
            description: error.response?.data?.error || "Failed to delete category.",
            title: "Delete Error"
          });
        }
      }
    });
  };

  const handleNewCategory = () => {
    setSelectedCategory(null);
    form.resetFields();
  };

  useEffect(() => {
    if (editingCategory) {
      form.setFieldsValue(editingCategory);
    } else {
      form.resetFields();
    }
  }, [editingCategory, form]);

  const onSubmit = async (values: any) => {
    setLoading(true);
    const headers = getAuthToken() as AuthTokenType;

    try {
      let response: AxiosResponse;

      if (selectedCategory) {
        response = await axios.put(`${ChargeCategoriesUrl}/${selectedCategory.id}`, values, headers);
        notification.success({
          message: "Charge Category Updated",
          description: "Charge category has been updated successfully.",
          title: "Success"
        });
      } else {
        response = await axios.post(ChargeCategoriesUrl, values, headers);
        notification.success({
          message: "Charge Category Added",
          description: "New charge category has been added successfully.",
          title: "Success"
        });
      }

      setLoading(false);

      if (response) {
        form.resetFields();
        setSelectedCategory(null);
        fetchCategories();
        onSuccessCallBack?.();
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
      title="Manage Charge Categories"
      open={isVisible}
      onClose={handleFormClose}
      destroyOnClose
      width={600}
    >
      {/* Existing Categories List */}
      <Card 
        size="small" 
        title="Existing Categories"
        style={{ marginBottom: '16px' }}
        extra={
          <Button 
            type="primary" 
            size="small" 
            icon={<PlusOutlined />}
            onClick={handleNewCategory}
          >
            New
          </Button>
        }
      >
        <List
          dataSource={categories}
          loading={loading}
          locale={{ emptyText: 'No categories yet' }}
          renderItem={(category) => (
            <List.Item
              actions={[
                <Button 
                  key="edit"
                  size="small" 
                  icon={<EditOutlined />}
                  onClick={() => handleEditCategory(category)}
                >
                  Edit
                </Button>,
                <Button 
                  key="delete"
                  size="small" 
                  danger 
                  icon={<DeleteOutlined />}
                  onClick={() => category.id && handleDeleteCategory(category.id)}
                >
                  Delete
                </Button>
              ]}
              style={{
                backgroundColor: selectedCategory?.id === category.id ? '#e6f7ff' : 'transparent',
                padding: '12px',
                borderRadius: '6px'
              }}
            >
              <List.Item.Meta
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {category.name}
                    <Tag color={category.is_active ? 'green' : 'red'} style={{ margin: 0 }}>
                      {category.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </Tag>
                  </div>
                }
                description={category.description}
              />
            </List.Item>
          )}
        />
      </Card>

      {/* Add/Edit Form */}
      <Card 
        size="small"
        title={selectedCategory ? `Edit: ${selectedCategory.name}` : "Add New Category"}
      >
        <Form layout="vertical" onFinish={onSubmit} form={form} initialValues={{ is_active: true }}>
        <div>
          <Form.Item
            label="Category Name"
            name="name"
            rules={[{ required: true, message: 'Please input the category name!' }]}
            style={{ marginBottom: '12px' }}
          >
            <Input prefix={<TagsOutlined />} placeholder="Transportation" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            style={{ marginBottom: '12px' }}
          >
            <TextArea 
              placeholder="Description of the charge category" 
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
        </div>

        <Form.Item style={{ marginBottom: '0', marginTop: '16px' }}>
          <Space style={{ width: '100%' }}>
            <Button htmlType="submit" type="primary" loading={loading}>
              {selectedCategory ? "Update Category" : "Add Category"}
            </Button>
            {selectedCategory && (
              <Button onClick={handleNewCategory}>
                Cancel Edit
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>
      </Card>
    </Drawer>
  );
};

export default AddChargeCategoryForm;
