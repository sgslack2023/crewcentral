
import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, message, DatePicker, Upload, InputNumber } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { BlackButton, WhiteButton } from './index';
import axios from 'axios';
import dayjs from 'dayjs';
import { PurchasesUrl } from '../utils/network';
import { getAuthToken, getTransactionCategories } from '../utils/functions';
import { TransactionCategoryProps } from '../utils/types';

interface AddPurchaseFormProps {
    visible: boolean;
    onCancel: () => void;
    onSuccess: () => void;
}

const AddPurchaseForm: React.FC<AddPurchaseFormProps> = ({ visible, onCancel, onSuccess }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<TransactionCategoryProps[]>([]);
    const [total, setTotal] = useState<number>(0);

    useEffect(() => {
        if (visible) {
            fetchData();
        }
    }, [visible]);

    const fetchData = async () => {
        getTransactionCategories((data) => {
            const purchaseCategories = data.filter(c => c.category_type === 'purchase' || c.category_type === 'both');
            setCategories(purchaseCategories);
        }, () => { });
    };

    const handleValuesChange = (changedValues: any, allValues: any) => {
        if (changedValues.quantity || changedValues.unit_price) {
            const quantity = allValues.quantity || 0;
            const unitPrice = allValues.unit_price || 0;
            setTotal(quantity * unitPrice);
        }
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
        formData.append('item_name', values.item_name);
        formData.append('quantity', values.quantity);
        formData.append('unit_price', values.unit_price);
        formData.append('purchase_date', values.purchase_date.format('YYYY-MM-DD'));

        if (values.vendor) formData.append('vendor', values.vendor);
        if (values.category) formData.append('category', values.category);
        if (values.description) formData.append('description', values.description);

        if (values.attachment_file && values.attachment_file.file) {
            formData.append('attachment_file', values.attachment_file.file.originFileObj);
        }

        try {
            await axios.post(PurchasesUrl, formData, {
                headers: {
                    ...headers.headers,
                    'Content-Type': 'multipart/form-data',
                }
            });
            message.success('Purchase recorded successfully');
            form.resetFields();
            setTotal(0);
            onSuccess();
        } catch (error: any) {
            console.error(error);
            message.error(error.response?.data?.error || 'Failed to record purchase');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Record New Purchase"
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={500}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                onValuesChange={handleValuesChange}
                initialValues={{ purchase_date: dayjs(), quantity: 1 }}
                size="small"
            >
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Form.Item
                        name="item_name"
                        label="Item Name"
                        rules={[{ required: true, message: 'Required' }]}
                        style={{ flex: 2, marginBottom: '8px' }}
                    >
                        <Input placeholder="Item Name" />
                    </Form.Item>

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
                        name="purchase_date"
                        label="Date"
                        rules={[{ required: true, message: 'Required' }]}
                        style={{ flex: 1, marginBottom: '8px' }}
                    >
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <Form.Item
                        name="quantity"
                        label="Qty"
                        rules={[{ required: true, message: 'Required' }]}
                        style={{ width: '70px', marginBottom: '8px' }}
                    >
                        <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        name="unit_price"
                        label="Unit Price"
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
                        name="vendor"
                        label="Vendor (Opt)"
                        style={{ flex: 1, marginBottom: '8px' }}
                    >
                        <Input placeholder="Vendor" />
                    </Form.Item>

                    <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '24px', minWidth: '80px', textAlign: 'right' }}>
                        <span style={{ fontSize: '10px', color: '#999' }}>Total:</span>
                        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                            ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
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
                        name="attachment_file"
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
                        Record Purchase
                    </BlackButton>
                </div>
            </Form>
        </Modal>
    );
};

export default AddPurchaseForm;
