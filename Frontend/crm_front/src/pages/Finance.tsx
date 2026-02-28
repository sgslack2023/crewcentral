import React, { useState, useEffect } from 'react';
import { Card, notification, Modal, Form, InputNumber, Select, DatePicker, Button, Input, Tabs, Avatar, Space } from 'antd';
import {
    FileTextOutlined,
    DollarOutlined,
    EyeOutlined,
    UserOutlined,
    CreditCardOutlined,
    PlusOutlined,
    ShoppingOutlined,
    TagOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { InvoiceProps, PaymentReceiptProps, ExpenseProps, PurchaseProps, TransactionCategoryProps } from '../utils/types';
import { getInvoices, getPayments, getAuthToken, getExpenses, getPurchases, getTransactionCategories } from '../utils/functions';
import { InvoicesUrl, PaymentsUrl } from '../utils/network';
import { VerticalTabs, InfoCard, BlackButton, WhiteButton, FixedTable } from '../components';
import AddCategoryForm from '../components/AddCategoryForm';
import AddExpenseForm from '../components/AddExpenseForm';
import AddPurchaseForm from '../components/AddPurchaseForm';

const Finance: React.FC = () => {
    const [invoices, setInvoices] = useState<InvoiceProps[]>([]);
    const [payments, setPayments] = useState<PaymentReceiptProps[]>([]);
    const [expenses, setExpenses] = useState<ExpenseProps[]>([]);
    const [purchases, setPurchases] = useState<PurchaseProps[]>([]);
    const [categories, setCategories] = useState<TransactionCategoryProps[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal States
    const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
    const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
    const [isExpenseModalVisible, setIsExpenseModalVisible] = useState(false);
    const [isPurchaseModalVisible, setIsPurchaseModalVisible] = useState(false);

    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceProps | null>(null);
    const [savingPayment, setSavingPayment] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                getInvoices(setInvoices, (v) => { }),
                getPayments(setPayments, (v) => { }),
                getExpenses(setExpenses, (v) => { }),
                getPurchases(setPurchases, (v) => { }),
                getTransactionCategories(setCategories, (v) => { })
            ]);
        } catch (error) {
            notification.error({
                message: 'Error',
                description: 'Failed to fetch finance data',
                title: 'Error'
            });
        } finally {
            setLoading(false);
        }
    };

    const getInvoiceStatusColor = (status: string) => {
        const colors: Record<string, { color: string; bgColor: string }> = {
            'paid': { color: '#059669', bgColor: '#ecfdf5' },
            'void': { color: '#6b7280', bgColor: '#f3f4f6' },
            'overdue': { color: '#dc2626', bgColor: '#fef2f2' },
            'pending': { color: '#d97706', bgColor: '#fef3c7' }
        };
        return colors[status] || { color: '#3b82f6', bgColor: '#eff6ff' };
    };

    const getPaymentMethodColor = (method: string) => {
        const colors: Record<string, { bg: string; icon: string }> = {
            'credit_card': { bg: '#eff6ff', icon: '#3b82f6' },
            'cash': { bg: '#ecfdf5', icon: '#059669' },
            'check': { bg: '#fef3c7', icon: '#d97706' },
            'bank_transfer': { bg: '#f3e8ff', icon: '#9333ea' },
        };
        return colors[method] || { bg: '#f3f4f6', icon: '#6b7280' };
    };

    const handleRecordPayment = (invoice: InvoiceProps) => {
        setSelectedInvoice(invoice);
        form.setFieldsValue({
            amount: invoice.balance_due,
            payment_date: dayjs(),
            payment_method: 'credit_card',
        });
        setIsPaymentModalVisible(true);
    };

    const handleSavePayment = async (values: any) => {
        if (!selectedInvoice) return;

        setSavingPayment(true);
        try {
            const headers = getAuthToken();
            const payload = {
                ...values,
                invoice: selectedInvoice.id,
                payment_date: values.payment_date.format('YYYY-MM-DD'),
            };

            await axios.post(PaymentsUrl, payload, headers as any);

            notification.success({
                message: 'Success',
                description: 'Payment recorded successfully',
                title: 'Success'
            });

            setIsPaymentModalVisible(false);
            fetchData();
        } catch (error) {
            notification.error({
                message: 'Error',
                description: 'Failed to record payment',
                title: 'Error'
            });
        } finally {
            setSavingPayment(false);
        }
    };

    // Columns for Invoices Table
    const invoiceColumns = [
        { id: 'invoice_number', label: 'Invoice #', width: 120, render: (val: any) => `#${val}` },
        { id: 'customer_name', label: 'Customer', width: 200 },
        { id: 'issue_date', label: 'Issue Date', width: 120 },
        { id: 'total_amount', label: 'Total', width: 120, render: (val: any) => `$${Number(val).toLocaleString()}` },
        { id: 'balance_due', label: 'Balance Due', width: 120, render: (val: any) => val > 0 ? <span style={{ color: '#dc2626' }}>${Number(val).toLocaleString()}</span> : <span style={{ color: '#059669' }}>$0.00</span> },
        {
            id: 'status', label: 'Status', width: 120, render: (val: any) => {
                const colors = getInvoiceStatusColor(val || 'pending');
                return (
                    <span style={{
                        backgroundColor: colors.bgColor,
                        color: colors.color,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        fontWeight: 500
                    }}>
                        {val}
                    </span>
                );
            }
        },
        {
            id: 'actions', label: 'Actions', width: 150, render: (_: any, row: InvoiceProps) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    {row.balance_due && row.balance_due > 0 && (
                        <Button
                            size="small"
                            type="text"
                            icon={<CreditCardOutlined />}
                            style={{ color: '#5b6cf9' }}
                            onClick={(e) => { e.stopPropagation(); handleRecordPayment(row); }}
                        >
                            Pay
                        </Button>
                    )}
                    <Button
                        size="small"
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={(e) => {
                            e.stopPropagation();
                            window.open(`${InvoicesUrl}/${row.id}/download_pdf${row.estimate_public_token ? `?token=${row.estimate_public_token}` : ''}`, '_blank');
                        }}
                    >
                        View
                    </Button>
                </div>
            )
        }
    ];

    // Columns for Payments Table
    const paymentColumns = [
        { id: 'payment_date', label: 'Date', width: 120 },
        { id: 'amount', label: 'Amount', width: 120, render: (val: any) => `$${Number(val).toLocaleString()}` },
        {
            id: 'payment_method', label: 'Method', width: 150, render: (val: any) => {
                return (val || 'unknown').replace('_', ' ').toUpperCase();
            }
        },
        { id: 'transaction_id', label: 'Reference', width: 150 },
        {
            id: 'actions', label: 'Actions', width: 100, render: (_: any, row: PaymentReceiptProps) => (
                <Button
                    size="small"
                    type="text"
                    icon={<EyeOutlined />}
                    onClick={(e) => {
                        e.stopPropagation();
                        window.open(`${PaymentsUrl}/${row.id}/download_pdf${row.estimate_public_token ? `?token=${row.estimate_public_token}` : ''}`, '_blank');
                    }}
                >
                    View
                </Button>
            )
        }
    ];

    // Columns for Expenses Table
    const expenseColumns = [
        { id: 'title', label: 'Title', width: 200 },
        { id: 'amount', label: 'Amount', width: 120, render: (val: any) => `$${Number(val).toFixed(2)}` },
        { id: 'expense_date', label: 'Date', width: 120 },
        { id: 'category_name', label: 'Category', width: 150 },
        { id: 'customer_name', label: 'Customer', width: 200 },
        { id: 'created_by_name', label: 'Recorded By', width: 150 },
    ];

    // Columns for Purchases Table
    const purchaseColumns = [
        { id: 'item_name', label: 'Item Name', width: 200 },
        { id: 'vendor', label: 'Vendor', width: 150 },
        { id: 'quantity', label: 'Quantity', width: 100 },
        { id: 'unit_price', label: 'Unit Price', width: 120, render: (val: any) => `$${Number(val).toFixed(2)}` },
        { id: 'total_amount', label: 'Total', width: 120, render: (val: any) => `$${Number(val).toFixed(2)}` },
        { id: 'purchase_date', label: 'Date', width: 120 },
        { id: 'category_name', label: 'Category', width: 150 },
        { id: 'created_by_name', label: 'Recorded By', width: 150 },
    ];

    return (
        <div style={{ padding: '12px 16px 20px 16px', height: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ marginBottom: '16px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: '#1a1a2e' }}>Finance</h1>
                    <p style={{ color: '#8e8ea8', margin: '4px 0 0 0', fontSize: '13px' }}>Manage invoices, payments, expenses, and purchases</p>
                </div>
                <Space size="middle">
                    <WhiteButton onClick={() => setIsCategoryModalVisible(true)} icon={<TagOutlined />}>
                        Add Category
                    </WhiteButton>
                    <BlackButton onClick={() => setIsExpenseModalVisible(true)} icon={<PlusOutlined />}>
                        Record Expense
                    </BlackButton>
                    <BlackButton onClick={() => setIsPurchaseModalVisible(true)} icon={<ShoppingOutlined />}>
                        Record Purchase
                    </BlackButton>
                </Space>
            </div>

            <div style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                flex: 1,
                minHeight: 0,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                display: 'flex'
            }}>
                <VerticalTabs
                    defaultActiveKey="invoices"
                    tabWidth={160}
                    items={[
                        {
                            key: 'invoices',
                            label: 'Invoices',
                            icon: <FileTextOutlined />,
                            children: (
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ flex: 1, minHeight: 0 }}>
                                        <FixedTable
                                            columns={invoiceColumns}
                                            data={invoices}
                                            loading={loading}
                                            tableName="invoices-table"
                                        />
                                    </div>
                                </div>
                            )
                        },
                        {
                            key: 'payments',
                            label: 'Payments',
                            icon: <DollarOutlined />,
                            children: (
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ flex: 1, minHeight: 0 }}>
                                        <FixedTable
                                            columns={paymentColumns}
                                            data={payments}
                                            loading={loading}
                                            tableName="payments-table"
                                        />
                                    </div>
                                </div>
                            )
                        },
                        {
                            key: 'expenses',
                            label: 'Expenses',
                            icon: <CreditCardOutlined />,
                            children: (
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ flex: 1, minHeight: 0 }}>
                                        <FixedTable
                                            columns={expenseColumns}
                                            data={expenses}
                                            loading={loading}
                                            tableName="expenses-table"
                                        />
                                    </div>
                                </div>
                            )
                        },
                        {
                            key: 'purchases',
                            label: 'Purchases',
                            icon: <ShoppingOutlined />,
                            children: (
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ flex: 1, minHeight: 0 }}>
                                        <FixedTable
                                            columns={purchaseColumns}
                                            data={purchases}
                                            loading={loading}
                                            tableName="purchases-table"
                                        />
                                    </div>
                                </div>
                            )
                        }
                    ]}
                />
            </div>

            {/* Modals */}
            <AddCategoryForm
                visible={isCategoryModalVisible}
                onCancel={() => setIsCategoryModalVisible(false)}
                onSuccess={() => {
                    setIsCategoryModalVisible(false);
                    fetchData();
                }}
            />

            <AddExpenseForm
                visible={isExpenseModalVisible}
                onCancel={() => setIsExpenseModalVisible(false)}
                onSuccess={() => {
                    setIsExpenseModalVisible(false);
                    fetchData();
                }}
            />

            <AddPurchaseForm
                visible={isPurchaseModalVisible}
                onCancel={() => setIsPurchaseModalVisible(false)}
                onSuccess={() => {
                    setIsPurchaseModalVisible(false);
                    fetchData();
                }}
            />

            {/* Record Payment Modal */}
            <Modal
                title={`Record Payment for ${selectedInvoice?.invoice_number}`}
                open={isPaymentModalVisible}
                onCancel={() => setIsPaymentModalVisible(false)}
                footer={null}
                width={400}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSavePayment}
                    initialValues={{
                        payment_method: 'credit_card',
                        payment_date: dayjs()
                    }}
                >
                    <Form.Item
                        name="amount"
                        label="Amount Paid"
                        rules={[{ required: true, message: 'Please enter amount' }]}
                    >
                        <InputNumber
                            style={{ width: '100%' }}
                            prefix="$"
                            min={0}
                        />
                    </Form.Item>

                    <Form.Item
                        name="payment_date"
                        label="Payment Date"
                        rules={[{ required: true, message: 'Please select date' }]}
                    >
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        name="payment_method"
                        label="Payment Method"
                        rules={[{ required: true, message: 'Please select method' }]}
                    >
                        <Select>
                            <Select.Option value="credit_card">Credit Card</Select.Option>
                            <Select.Option value="bank_transfer">Bank Transfer</Select.Option>
                            <Select.Option value="cash">Cash</Select.Option>
                            <Select.Option value="check">Check</Select.Option>
                            <Select.Option value="other">Other</Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="transaction_id"
                        label="Transaction ID / Reference"
                    >
                        <Input placeholder="Optional" />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                        <WhiteButton onClick={() => setIsPaymentModalVisible(false)}>
                            Cancel
                        </WhiteButton>
                        <BlackButton
                            loading={savingPayment}
                            htmlType="submit"
                        >
                            Save Payment
                        </BlackButton>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default Finance;
