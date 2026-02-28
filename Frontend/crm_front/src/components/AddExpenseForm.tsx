
import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, message, DatePicker, Upload, InputNumber } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { BlackButton, WhiteButton } from './index';
import axios from 'axios';
import dayjs from 'dayjs';
import { ExpensesUrl } from '../utils/network';
import { getAuthToken, getTransactionCategories, getCustomers } from '../utils/functions';
import { TransactionCategoryProps, CustomerProps } from '../utils/types';

interface AddExpenseFormProps {
    visible: boolean;
    onCancel: () => void;
    onSuccess: () => void;
}

const AddExpenseForm: React.FC<AddExpenseFormProps> = ({ visible, onCancel, onSuccess }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<TransactionCategoryProps[]>([]);
    const [customers, setCustomers] = useState<CustomerProps[]>([]);
    // const [workOrders, setWorkOrders] = useState<WorkOrderProps[]>([]); // To be implemented if needed

    useEffect(() => {
        if (visible) {
            fetchData();
        }
    }, [visible]);

    const fetchData = async () => {
        getTransactionCategories((data) => {
            const expenseCategories = data.filter(c => c.category_type === 'expense' || c.category_type === 'both');
            setCategories(expenseCategories);
        }, () => { });

        getCustomers((data) => {
            setCustomers(data);
        }, () => { });
    };

    const handleSubmit = async (values: any) => {
        setLoading(true);
        const headers = getAuthToken();

        if (!headers) {
            message.error('Authentication error');
            setLoading(false);
            return;
        }

        const formData = new FormData();
        formData.append('title', values.title);
        formData.append('amount', values.amount);
        formData.append('expense_date', values.expense_date.format('YYYY-MM-DD'));

        if (values.category) formData.append('category', values.category);
        if (values.description) formData.append('description', values.description);
        if (values.customer) formData.append('customer', values.customer);

        if (values.receipt_file && values.receipt_file.file) {
            formData.append('receipt_file', values.receipt_file.file.originFileObj);
        }

        try {
            await axios.post(ExpensesUrl, formData, {
                headers: {
                    ...headers.headers,
                    'Content-Type': 'multipart/form-data',
                }
            });
            message.success('Expense recorded successfully');
            form.resetFields();
            onSuccess();
        } catch (error: any) {
            console.error(error);
            message.error(error.response?.data?.error || 'Failed to record expense');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Record New Expense"
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={500}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{ expense_date: dayjs() }}
                size="small"
            >
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Form.Item
                        name="title"
                        label="Expense Title"
                        rules={[{ required: true, message: 'Required' }]}
                        style={{ flex: 2, marginBottom: '8px' }}
                    >
                        <Input placeholder="Title" />
                    </Form.Item>

                    <Form.Item
                        name="amount"
                        label="Amount"
                        rules={[{ required: true, message: 'Required' }]}
                        style={{ width: '100px', marginBottom: '8px' }}
                    >
                        <InputNumber
                            style={{ width: '100%' }}
                            formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value!.replace(/\$\s?|(,*)/g, '')}
                            precision={2}
                        />
                    </Form.Item>

                    <Form.Item
                        name="expense_date"
                        label="Date"
                        rules={[{ required: true, message: 'Required' }]}
                        style={{ width: '110px', marginBottom: '8px' }}
                    >
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <Form.Item
                        name="category"
                        label="Category"
                        rules={[{ required: true, message: 'Required' }]}
                        style={{ flex: 1, marginBottom: '8px' }}
                    >
                        <Select placeholder="Category">
                            {categories.map(cat => (
                                <Select.Option key={cat.id} value={cat.id}>{cat.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="customer"
                        label="Customer (Opt)"
                        style={{ flex: 1, marginBottom: '8px' }}
                    >
                        <Select
                            placeholder="Customer"
                            showSearch
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            <Select.Option value={null}>None</Select.Option>
                            {customers.map(cust => (
                                <Select.Option key={cust.id} value={cust.id}>{cust.full_name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <Form.Item
                        name="description"
                        label="Description"
                        style={{ flex: 1, marginBottom: '8px' }}
                    >
                        <Input placeholder="Notes..." />
                    </Form.Item>

                    <Form.Item
                        name="receipt_file"
                        label=" "
                        valuePropName="file"
                        style={{ marginBottom: '8px' }}
                    >
                        <Upload maxCount={1} beforeUpload={() => false}>
                            <Button icon={<UploadOutlined />}>Upload</Button>
                        </Upload>
                    </Form.Item>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                    <WhiteButton onClick={onCancel} size="small">
                        Cancel
                    </WhiteButton>
                    <BlackButton htmlType="submit" loading={loading} size="small">
                        Record Expense
                    </BlackButton>
                </div>
            </Form>
        </Modal>
    );
};

export default AddExpenseForm;
