
import React, { useState } from 'react';
import { Modal, Form, Input, Select, Button, message, Radio } from 'antd';
import axios from 'axios';
import { TransactionCategoriesUrl } from '../utils/network';
import { getAuthToken } from '../utils/functions';

interface AddCategoryFormProps {
    visible: boolean;
    onCancel: () => void;
    onSuccess: () => void;
}

const AddCategoryForm: React.FC<AddCategoryFormProps> = ({ visible, onCancel, onSuccess }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (values: any) => {
        setLoading(true);
        const headers = getAuthToken();

        if (!headers) {
            message.error('Authentication error');
            setLoading(false);
            return;
        }

        try {
            await axios.post(TransactionCategoriesUrl, values, headers);
            message.success('Category created successfully');
            form.resetFields();
            onSuccess();
        } catch (error: any) {
            console.error(error);
            message.error(error.response?.data?.error || 'Failed to create category');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Add Transaction Category"
            open={visible}
            onCancel={onCancel}
            footer={null}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{ category_type: 'both', is_active: true }}
            >
                <Form.Item
                    name="name"
                    label="Category Name"
                    rules={[{ required: true, message: 'Please enter category name' }]}
                >
                    <Input placeholder="e.g., Office Supplies, Fuel, Maintenance" />
                </Form.Item>

                <Form.Item
                    name="category_type"
                    label="Type"
                    rules={[{ required: true, message: 'Please select type' }]}
                >
                    <Radio.Group>
                        <Radio value="expense">Expense Only</Radio>
                        <Radio value="purchase">Purchase Only</Radio>
                        <Radio value="both">Both</Radio>
                    </Radio.Group>
                </Form.Item>

                <Form.Item
                    name="description"
                    label="Description"
                >
                    <Input.TextArea rows={3} placeholder="Optional description..." />
                </Form.Item>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <Button onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="primary" htmlType="submit" loading={loading} style={{ backgroundColor: '#5b6cf9' }}>
                        Create Category
                    </Button>
                </div>
            </Form>
        </Modal>
    );
};

export default AddCategoryForm;
