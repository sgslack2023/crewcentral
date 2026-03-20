import React, { useState, useEffect } from 'react';
import { Modal, Form, InputNumber, DatePicker, Input, Table, Button, Space, notification, Spin, Tabs, Tag } from 'antd';
import { FileTextOutlined, PlusOutlined, DeleteOutlined, EyeOutlined, DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';
import { BlackButton, WhiteButton } from './index';
import { getAuthToken } from '../utils/functions';
import { WorkOrdersUrl } from '../utils/network';
import { InvoiceLineItemProps } from '../utils/types';

const { TextArea } = Input;

interface DepositInfo {
    id: number;
    amount: number;
    payment_date: string | null;
    payment_method: string;
    payment_method_display: string;
    payment_type: string;
    transaction_id: string;
    notes: string;
}

interface GenerateInvoiceModalProps {
    isVisible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    workOrderId: number;
    estimateId: number;
}

interface LineItemRow extends InvoiceLineItemProps {
    key: string;
}

const GenerateInvoiceModal: React.FC<GenerateInvoiceModalProps> = ({
    isVisible,
    onClose,
    onSuccess,
    workOrderId,
    estimateId
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(false);
    const [lineItems, setLineItems] = useState<LineItemRow[]>([]);
    const [taxPercentage, setTaxPercentage] = useState(0);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
    const [customerInfo, setCustomerInfo] = useState<{ id: number; name: string; email: string } | null>(null);
    const [deposits, setDeposits] = useState<DepositInfo[]>([]);
    const [totalDeposits, setTotalDeposits] = useState(0);
    const [activeTab, setActiveTab] = useState('line_items');

    const calculateSubtotal = () => {
        return lineItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    };

    const calculateTax = () => {
        return calculateSubtotal() * (taxPercentage / 100);
    };

    const calculateTotal = () => {
        return calculateSubtotal() + calculateTax();
    };

    useEffect(() => {
        if (isVisible && workOrderId) {
            fetchInvoicePreview();
        }
    }, [isVisible, workOrderId]);

    const fetchInvoicePreview = async () => {
        setFetchingData(true);
        try {
            const headers = getAuthToken() as any;
            const response = await axios.post(
                `${WorkOrdersUrl}/${workOrderId}/preview_invoice`,
                {},
                headers
            );
            const data = response.data;
            
            // Set line items
            const items: LineItemRow[] = data.line_items.map((item: any, index: number) => ({
                key: `item-${index}`,
                description: item.description,
                quantity: item.quantity,
                rate: item.rate,
                amount: item.amount,
            }));
            setLineItems(items);
            
            // Set customer info
            setCustomerInfo(data.customer);
            
            // Set deposits
            setDeposits(data.deposits || []);
            setTotalDeposits(data.total_deposits || 0);
            
            // Set tax percentage
            setTaxPercentage(data.tax_percentage || 0);
            
            // Set form values
            form.setFieldsValue({
                issue_date: dayjs(data.issue_date),
                due_date: dayjs(data.due_date),
                notes: data.notes || '',
                tax_percentage: data.tax_percentage || 0,
            });
        } catch (error: any) {
            notification.error({
                message: 'Error',
                description: error.response?.data?.error || 'Failed to load invoice data',
                title: 'Error'
            });
            onClose();
        } finally {
            setFetchingData(false);
        }
    };

    const handleLineItemChange = (key: string, field: string, value: any) => {
        setLineItems(prev => prev.map(item => {
            if (item.key === key) {
                const updated = { ...item, [field]: value };
                updated.amount = updated.quantity * updated.rate;
                return updated;
            }
            return item;
        }));
    };

    const handleAddLineItem = () => {
        const newItem: LineItemRow = {
            key: `item-${Date.now()}`,
            description: '',
            quantity: 1,
            rate: 0,
            amount: 0,
        };
        setLineItems([...lineItems, newItem]);
    };

    const handleRemoveLineItem = (key: string) => {
        if (lineItems.length > 1) {
            setLineItems(prev => prev.filter(item => item.key !== key));
        }
    };

    const handlePreview = async () => {
        if (lineItems.length === 0) {
            notification.error({
                message: 'Error',
                description: 'Please add at least one line item',
                title: 'Error'
            });
            return;
        }

        setPreviewLoading(true);
        try {
            const headers = getAuthToken() as any;
            const formValues = form.getFieldsValue();
            
            const payload = {
                line_items: lineItems.map(item => ({
                    description: item.description,
                    quantity: item.quantity,
                    rate: item.rate,
                })),
                issue_date: formValues.issue_date?.format('YYYY-MM-DD'),
                due_date: formValues.due_date?.format('YYYY-MM-DD'),
                notes: formValues.notes || '',
                tax_percentage: taxPercentage,
            };

            const response = await axios.post(
                `${WorkOrdersUrl}/${workOrderId}/preview_invoice_pdf`,
                payload,
                {
                    ...headers,
                    responseType: 'blob'
                }
            );

            // Clean up previous URL if exists
            if (previewPdfUrl) {
                window.URL.revokeObjectURL(previewPdfUrl);
            }

            // Create blob URL and show in modal
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            setPreviewPdfUrl(url);
            setShowPreviewModal(true);
        } catch (error: any) {
            notification.error({
                message: 'Error',
                description: error.response?.data?.error || 'Failed to generate preview',
                title: 'Error'
            });
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleClosePreview = () => {
        setShowPreviewModal(false);
        if (previewPdfUrl) {
            window.URL.revokeObjectURL(previewPdfUrl);
            setPreviewPdfUrl(null);
        }
    };

    const handleGenerate = async () => {
        try {
            await form.validateFields();
        } catch {
            return;
        }
        
        if (lineItems.length === 0) {
            notification.error({
                message: 'Error',
                description: 'Please add at least one line item',
                title: 'Error'
            });
            return;
        }

        setLoading(true);
        try {
            const headers = getAuthToken() as any;
            const formValues = form.getFieldsValue();
            
            const payload = {
                line_items: lineItems.map(item => ({
                    description: item.description,
                    quantity: item.quantity,
                    rate: item.rate,
                })),
                issue_date: formValues.issue_date?.format('YYYY-MM-DD'),
                due_date: formValues.due_date?.format('YYYY-MM-DD'),
                notes: formValues.notes || '',
                tax_percentage: taxPercentage,
            };

            await axios.post(
                `${WorkOrdersUrl}/${workOrderId}/generate_invoice`,
                payload,
                headers
            );

            notification.success({
                message: 'Success',
                description: 'Invoice generated successfully. PDF will be ready shortly.',
                title: 'Success'
            });
            
            onSuccess();
            onClose();
        } catch (error: any) {
            notification.error({
                message: 'Error',
                description: error.response?.data?.error || 'Failed to generate invoice',
                title: 'Error'
            });
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            render: (text: string, record: LineItemRow) => (
                <Input
                    value={text}
                    onChange={(e) => handleLineItemChange(record.key, 'description', e.target.value)}
                    placeholder="Line item description"
                    style={{ width: '100%' }}
                />
            ),
        },
        {
            title: 'Qty',
            dataIndex: 'quantity',
            key: 'quantity',
            width: 80,
            render: (value: number, record: LineItemRow) => (
                <InputNumber
                    value={value}
                    onChange={(val) => handleLineItemChange(record.key, 'quantity', val || 0)}
                    min={0}
                    step={0.01}
                    precision={2}
                    style={{ width: '100%' }}
                />
            ),
        },
        {
            title: 'Rate',
            dataIndex: 'rate',
            key: 'rate',
            width: 120,
            render: (value: number, record: LineItemRow) => (
                <InputNumber
                    value={value}
                    onChange={(val) => handleLineItemChange(record.key, 'rate', val || 0)}
                    min={0}
                    step={0.01}
                    precision={2}
                    formatter={val => `$ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={val => val!.replace(/\$\s?|(,*)/g, '') as any}
                    style={{ width: '100%' }}
                />
            ),
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            width: 100,
            render: (_: any, record: LineItemRow) => (
                <span style={{ fontWeight: 500 }}>
                    ${(record.quantity * record.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            ),
        },
        {
            title: '',
            key: 'actions',
            width: 40,
            render: (_: any, record: LineItemRow) => (
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveLineItem(record.key)}
                    disabled={lineItems.length <= 1}
                />
            ),
        },
    ];

    return (
        <>
        <Modal
            title={
                <Space>
                    <FileTextOutlined style={{ color: '#5b6cf9' }} />
                    <span>Generate Invoice</span>
                </Space>
            }
            open={isVisible}
            onCancel={onClose}
            footer={null}
            width={800}
            centered
            destroyOnClose
        >
            {fetchingData ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Spin size="large" />
                    <div style={{ marginTop: '16px', color: '#8c8c8c' }}>Loading invoice data...</div>
                </div>
            ) : (
                <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '8px' }}>
                    {/* Customer Info */}
                    {customerInfo && (
                        <div style={{ 
                            marginBottom: '16px', 
                            padding: '12px 16px', 
                            backgroundColor: '#f6f8fa', 
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '11px', color: '#8c8c8c', textTransform: 'uppercase', marginBottom: '4px' }}>Customer</div>
                                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{customerInfo.name}</div>
                                    <div style={{ color: '#666', fontSize: '13px' }}>{customerInfo.email}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '11px', color: '#8c8c8c', textTransform: 'uppercase', marginBottom: '4px' }}>Job ID</div>
                                    <div style={{ fontWeight: 600, fontSize: '15px', color: '#5b6cf9' }}>#{estimateId}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <Form form={form} layout="vertical">
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                            <Form.Item
                                label="Issue Date"
                                name="issue_date"
                                rules={[{ required: true, message: 'Required' }]}
                                style={{ flex: 1 }}
                            >
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                            <Form.Item
                                label="Due Date"
                                name="due_date"
                                rules={[{ required: true, message: 'Required' }]}
                                style={{ flex: 1 }}
                            >
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </div>

                        <Tabs
                            activeKey={activeTab}
                            onChange={setActiveTab}
                            items={[
                                {
                                    key: 'line_items',
                                    label: (
                                        <span>
                                            <FileTextOutlined /> Line Items ({lineItems.length})
                                        </span>
                                    ),
                                    children: (
                                        <>
                                            <div style={{ marginBottom: '16px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                                                    <Button
                                                        type="dashed"
                                                        icon={<PlusOutlined />}
                                                        onClick={handleAddLineItem}
                                                        size="small"
                                                    >
                                                        Add Item
                                                    </Button>
                                                </div>
                                                <Table
                                                    dataSource={lineItems}
                                                    columns={columns}
                                                    pagination={false}
                                                    size="small"
                                                    bordered
                                                />
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                                                <div style={{ width: '300px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                                                        <span>Subtotal:</span>
                                                        <span style={{ fontWeight: 500 }}>${calculateSubtotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                                                        <span>Tax:</span>
                                                        <Space>
                                                            <InputNumber
                                                                value={taxPercentage}
                                                                onChange={(val) => setTaxPercentage(val || 0)}
                                                                min={0}
                                                                max={100}
                                                                step={0.01}
                                                                precision={2}
                                                                style={{ width: '80px' }}
                                                                addonAfter="%"
                                                            />
                                                            <span style={{ fontWeight: 500, minWidth: '80px', textAlign: 'right' }}>
                                                                ${calculateTax().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </span>
                                                        </Space>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                                                        <span style={{ fontWeight: 600 }}>Invoice Total:</span>
                                                        <span style={{ fontWeight: 600 }}>
                                                            ${calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                    {totalDeposits > 0 && (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0', color: '#52c41a' }}>
                                                            <span>Deposits Paid:</span>
                                                            <span style={{ fontWeight: 500 }}>
                                                                -${totalDeposits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', background: totalDeposits > 0 ? '#fff7e6' : '#f6ffed', margin: '8px -8px -8px', padding: '12px 8px', borderRadius: '4px' }}>
                                                        <span style={{ fontWeight: 600, fontSize: '16px' }}>Balance Due:</span>
                                                        <span style={{ fontWeight: 700, fontSize: '16px', color: totalDeposits > 0 ? '#fa8c16' : '#52c41a' }}>
                                                            ${(calculateTotal() - totalDeposits).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ),
                                },
                                {
                                    key: 'deposits',
                                    label: (
                                        <span>
                                            <DollarOutlined /> Deposits ({deposits.length})
                                        </span>
                                    ),
                                    children: (
                                        <div>
                                            {deposits.length === 0 ? (
                                                <div style={{ 
                                                    textAlign: 'center', 
                                                    padding: '40px', 
                                                    color: '#8c8c8c',
                                                    background: '#fafafa',
                                                    borderRadius: '8px'
                                                }}>
                                                    <DollarOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />
                                                    <div>No deposits collected yet</div>
                                                </div>
                                            ) : (
                                                <>
                                                    <Table
                                                        dataSource={deposits.map((d, i) => ({ ...d, key: d.id || i }))}
                                                        columns={[
                                                            {
                                                                title: 'Date',
                                                                dataIndex: 'payment_date',
                                                                key: 'payment_date',
                                                                width: 120,
                                                                render: (date: string) => date ? dayjs(date).format('MMM D, YYYY') : '-',
                                                            },
                                                            {
                                                                title: 'Type',
                                                                dataIndex: 'payment_type',
                                                                key: 'payment_type',
                                                                width: 100,
                                                                render: (type: string) => (
                                                                    <Tag color={type === 'deposit' ? 'blue' : 'green'}>
                                                                        {type === 'deposit' ? 'Deposit' : 'Payment'}
                                                                    </Tag>
                                                                ),
                                                            },
                                                            {
                                                                title: 'Method',
                                                                dataIndex: 'payment_method_display',
                                                                key: 'payment_method_display',
                                                                width: 130,
                                                            },
                                                            {
                                                                title: 'Transaction ID',
                                                                dataIndex: 'transaction_id',
                                                                key: 'transaction_id',
                                                                render: (id: string) => id || '-',
                                                            },
                                                            {
                                                                title: 'Amount',
                                                                dataIndex: 'amount',
                                                                key: 'amount',
                                                                width: 120,
                                                                align: 'right' as const,
                                                                render: (amount: number) => (
                                                                    <span style={{ fontWeight: 600, color: '#52c41a' }}>
                                                                        ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </span>
                                                                ),
                                                            },
                                                        ]}
                                                        pagination={false}
                                                        size="small"
                                                        bordered
                                                    />
                                                    <div style={{ 
                                                        display: 'flex', 
                                                        justifyContent: 'flex-end', 
                                                        marginTop: '16px',
                                                        padding: '12px 16px',
                                                        background: '#f6ffed',
                                                        borderRadius: '8px'
                                                    }}>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontSize: '13px', color: '#8c8c8c' }}>Total Deposits</div>
                                                            <div style={{ fontSize: '20px', fontWeight: 700, color: '#52c41a' }}>
                                                                ${totalDeposits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ),
                                },
                            ]}
                        />

                        <Form.Item label="Notes" name="notes">
                            <TextArea
                                rows={3}
                                placeholder="Add any notes for this invoice..."
                                style={{ borderRadius: '8px' }}
                            />
                        </Form.Item>
                    </Form>

                    <div style={{ textAlign: 'right', marginTop: '24px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <WhiteButton onClick={onClose} disabled={loading}>
                            Cancel
                        </WhiteButton>
                        <WhiteButton
                            onClick={handlePreview}
                            loading={previewLoading}
                            icon={<EyeOutlined />}
                        >
                            Preview
                        </WhiteButton>
                        <BlackButton
                            onClick={handleGenerate}
                            loading={loading}
                        >
                            Generate Invoice
                        </BlackButton>
                    </div>
                </div>
            )}
        </Modal>

        {/* PDF Preview Modal */}
        <Modal
            title={
                <Space>
                    <FileTextOutlined style={{ color: '#5b6cf9' }} />
                    <span>Invoice Preview</span>
                </Space>
            }
            open={showPreviewModal}
            onCancel={handleClosePreview}
            footer={
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <BlackButton onClick={handleClosePreview}>
                        Close
                    </BlackButton>
                </div>
            }
            width={900}
            centered
            bodyStyle={{ padding: 0, height: '75vh' }}
        >
            {previewPdfUrl && (
                <iframe
                    src={previewPdfUrl}
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                    }}
                    title="Invoice Preview"
                />
            )}
        </Modal>
        </>
    );
};

export default GenerateInvoiceModal;
