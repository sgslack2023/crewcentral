import React, { useState, useEffect } from 'react';
import { Card, notification, Modal, Form, InputNumber, Select, DatePicker, Button, Input, Tabs, Avatar, Space, Popconfirm, Tooltip } from 'antd';
import {
    FileTextOutlined,
    DollarOutlined,
    EyeOutlined,
    UserOutlined,
    CreditCardOutlined,
    PlusOutlined,
    ShoppingOutlined,
    TagOutlined,
    SendOutlined,
    DeleteOutlined,
    SearchOutlined,
    EditOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { InvoiceProps, PaymentReceiptProps, ExpenseProps, PurchaseProps, TransactionCategoryProps, EstimateProps, WorkOrderProps } from '../utils/types';
import { getInvoices, getPayments, getAuthToken, getExpenses, getPurchases, getTransactionCategories } from '../utils/functions';
import { InvoicesUrl, PaymentsUrl, EstimatesUrl, WorkOrdersUrl, ExpensesUrl, PurchasesUrl } from '../utils/network';
import { VerticalTabs, InfoCard, BlackButton, WhiteButton, FixedTable } from '../components';
import AddCategoryForm from '../components/AddCategoryForm';
import AddExpenseForm from '../components/AddExpenseForm';
import AddPurchaseForm from '../components/AddPurchaseForm';
import GenerateInvoiceModal from '../components/GenerateInvoiceModal';

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
    const [editingPayment, setEditingPayment] = useState<PaymentReceiptProps | null>(null);
    const [editingExpense, setEditingExpense] = useState<ExpenseProps | null>(null);
    const [editingPurchase, setEditingPurchase] = useState<PurchaseProps | null>(null);
    const [savingPayment, setSavingPayment] = useState(false);
    const [sendingInvoice, setSendingInvoice] = useState<number | null>(null);
    const [sendingReceipt, setSendingReceipt] = useState<number | null>(null);
    const [deletingInvoice, setDeletingInvoice] = useState<number | null>(null);
    const [form] = Form.useForm();

    // Invoice Order modal states
    const [isInvoiceOrderModalVisible, setIsInvoiceOrderModalVisible] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
    const [jobOptions, setJobOptions] = useState<{ value: number; label: string; customer: string; status: string }[]>([]);
    const [loadingJobs, setLoadingJobs] = useState(false);
    const [showGenerateInvoiceModal, setShowGenerateInvoiceModal] = useState(false);
    const [invoiceModalWorkOrderId, setInvoiceModalWorkOrderId] = useState<number | null>(null);
    const [invoiceModalEstimateId, setInvoiceModalEstimateId] = useState<number | null>(null);


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
        setEditingPayment(null);
        form.setFieldsValue({
            amount: invoice.balance_due,
            payment_date: dayjs(),
            payment_method: 'credit_card',
        });
        setIsPaymentModalVisible(true);
    };

    const handleEditPayment = (payment: PaymentReceiptProps) => {
        setEditingPayment(payment);
        setSelectedInvoice(null);
        form.setFieldsValue({
            amount: payment.amount,
            payment_date: dayjs(payment.payment_date),
            payment_method: payment.payment_method,
            payment_type: payment.payment_type,
            transaction_id: payment.transaction_id,
            notes: payment.notes,
        });
        setIsPaymentModalVisible(true);
    };

    const handleDeletePayment = async (paymentId: number) => {
        try {
            const headers = getAuthToken();
            await axios.delete(`${PaymentsUrl}/${paymentId}`, headers as any);
            notification.success({
                message: 'Success',
                description: 'Payment deleted and balance recalculated',
                title: 'Success'
            });
            fetchData();
        } catch (error) {
            notification.error({
                message: 'Error',
                description: 'Failed to delete payment',
                title: 'Error'
            });
        }
    };

    const handleSavePayment = async (values: any) => {
        setSavingPayment(true);
        try {
            const headers = getAuthToken();
            const payload = {
                ...values,
                payment_date: values.payment_date.format('YYYY-MM-DD'),
            };

            if (editingPayment) {
                // Edit existing payment
                await axios.patch(`${PaymentsUrl}/${editingPayment.id}`, payload, headers as any);
                notification.success({
                    message: 'Success',
                    description: 'Payment updated and balance recalculated',
                    title: 'Success'
                });
            } else {
                // Create new payment
                if (!selectedInvoice) return;
                payload.invoice = selectedInvoice.id;
                await axios.post(PaymentsUrl, payload, headers as any);
                notification.success({
                    message: 'Success',
                    description: 'Payment recorded successfully',
                    title: 'Success'
                });
            }

            setIsPaymentModalVisible(false);
            setEditingPayment(null);
            fetchData();
        } catch (error) {
            notification.error({
                message: 'Error',
                description: editingPayment ? 'Failed to update payment' : 'Failed to record payment',
                title: 'Error'
            });
        } finally {
            setSavingPayment(false);
        }
    };

    const handleSendInvoice = async (invoiceId: number) => {
        setSendingInvoice(invoiceId);
        try {
            const headers = getAuthToken();
            await axios.post(`${InvoicesUrl}/${invoiceId}/send_to_customer`, {}, headers as any);
            notification.success({
                message: 'Success',
                description: 'Invoice sent successfully',
                title: 'Success',
                duration: 3
            });
        } catch (error) {
            notification.error({
                message: 'Error',
                description: 'Failed to send invoice',
                title: 'Error'
            });
        } finally {
            setSendingInvoice(null);
        }
    };

    const handleSendReceipt = async (receiptId: number) => {
        setSendingReceipt(receiptId);
        try {
            const headers = getAuthToken();
            await axios.post(`${PaymentsUrl}/${receiptId}/send_to_customer`, {}, headers as any);
            notification.success({
                message: 'Success',
                description: 'Payment receipt sent successfully',
                title: 'Success',
                duration: 3
            });
        } catch (error) {
            notification.error({
                message: 'Error',
                description: 'Failed to send payment receipt',
                title: 'Error'
            });
        } finally {
            setSendingReceipt(null);
        }
    };

    const handleDeleteInvoice = async (invoiceId: number) => {
        setDeletingInvoice(invoiceId);
        try {
            const headers = getAuthToken();
            await axios.post(`${InvoicesUrl}/${invoiceId}/delete_and_reset`, {}, headers as any);
            notification.success({
                message: 'Success',
                description: 'Invoice deleted and estimate status reset',
                title: 'Success'
            });
            fetchData();
        } catch (error: any) {
            notification.error({
                message: 'Error',
                description: error.response?.data?.error || 'Failed to delete invoice',
                title: 'Error'
            });
        } finally {
            setDeletingInvoice(null);
        }
    };

    const handleEditExpense = (expense: ExpenseProps) => {
        setEditingExpense(expense);
        setIsExpenseModalVisible(true);
    };

    const handleDeleteExpense = async (expenseId: number) => {
        try {
            const headers = getAuthToken();
            await axios.delete(`${ExpensesUrl}/${expenseId}`, headers as any);
            notification.success({
                message: 'Success',
                description: 'Expense deleted successfully',
                title: 'Success'
            });
            fetchData();
        } catch (error) {
            notification.error({
                message: 'Error',
                description: 'Failed to delete expense',
                title: 'Error'
            });
        }
    };

    const handleEditPurchase = (purchase: PurchaseProps) => {
        setEditingPurchase(purchase);
        setIsPurchaseModalVisible(true);
    };

    const handleDeletePurchase = async (purchaseId: number) => {
        try {
            const headers = getAuthToken();
            await axios.delete(`${PurchasesUrl}/${purchaseId}`, headers as any);
            notification.success({
                message: 'Success',
                description: 'Purchase deleted successfully',
                title: 'Success'
            });
            fetchData();
        } catch (error) {
            notification.error({
                message: 'Error',
                description: 'Failed to delete purchase',
                title: 'Error'
            });
        }
    };

    const fetchAvailableJobs = async () => {
        setLoadingJobs(true);
        try {
            const headers = getAuthToken();
            // Fetch estimates that have work orders and are not yet invoiced
            const response = await axios.get(`${EstimatesUrl}?status=work_order&status=approved`, headers as any);
            const estimates: EstimateProps[] = response.data.results || response.data;
            
            const options = estimates
                .filter(est => est.status !== 'invoiced')
                .map(est => ({
                    value: est.id!,
                    label: `Job #${est.id} - ${est.customer_name}`,
                    customer: est.customer_name || 'Unknown',
                    status: est.status || 'unknown'
                }));
            
            setJobOptions(options);
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
        } finally {
            setLoadingJobs(false);
        }
    };

    const handleSelectJob = async (jobId: number) => {
        setSelectedJobId(jobId);
        
        try {
            const headers = getAuthToken();
            
            // Find work order for this estimate
            const workOrderResponse = await axios.get(`${WorkOrdersUrl}?estimate=${jobId}`, headers as any);
            const workOrders: WorkOrderProps[] = workOrderResponse.data.results || workOrderResponse.data;
            
            if (!workOrders || workOrders.length === 0) {
                notification.warning({
                    message: 'No Work Order',
                    description: `Job #${jobId} does not have a work order yet.`,
                    title: 'Warning'
                });
                return;
            }

            // Find a work order that doesn't already have an invoice
            // Prefer completed work orders, then any without invoice
            const completedStatuses = ['completed', 'accepted'];
            
            // First try to find a completed work order without an invoice
            let workOrder = workOrders.find(wo => 
                completedStatuses.includes(wo.status || '') && !wo.invoice
            );
            
            // If not found, try any work order without an invoice
            if (!workOrder) {
                workOrder = workOrders.find(wo => !wo.invoice);
            }
            
            // If all work orders have invoices, show error
            if (!workOrder) {
                notification.warning({
                    message: 'Already Invoiced',
                    description: `All work orders for Job #${jobId} already have invoices.`,
                    title: 'Warning'
                });
                return;
            }
            
            setInvoiceModalWorkOrderId(workOrder.id!);
            setInvoiceModalEstimateId(jobId);
            setIsInvoiceOrderModalVisible(false);
            setShowGenerateInvoiceModal(true);
            setSelectedJobId(null);
        } catch (error: any) {
            notification.error({
                message: 'Error',
                description: error.response?.data?.error || 'Failed to fetch work order',
                title: 'Error'
            });
        }
    };

    const handleInvoiceModalSuccess = () => {
        setShowGenerateInvoiceModal(false);
        setInvoiceModalWorkOrderId(null);
        setInvoiceModalEstimateId(null);
        fetchData();
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
            id: 'actions', label: 'Actions', width: 200, render: (_: any, row: InvoiceProps) => (
                <div style={{ display: 'flex', gap: '4px' }}>
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
                    <Button
                        size="small"
                        type="text"
                        icon={<SendOutlined />}
                        loading={sendingInvoice === row.id}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (row.id) handleSendInvoice(row.id);
                        }}
                    >
                        Send
                    </Button>
                    {row.status !== 'paid' && (
                        <Popconfirm
                            title="Delete Invoice"
                            description="Are you sure? This will reset the estimate status."
                            onConfirm={(e) => {
                                e?.stopPropagation();
                                if (row.id) handleDeleteInvoice(row.id);
                            }}
                            onCancel={(e) => e?.stopPropagation()}
                            okText="Delete"
                            cancelText="Cancel"
                            okButtonProps={{ danger: true }}
                        >
                            <Button
                                size="small"
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                loading={deletingInvoice === row.id}
                                onClick={(e) => e.stopPropagation()}
                            >
                                Delete
                            </Button>
                        </Popconfirm>
                    )}
                </div>
            )
        }
    ];

    // Columns for Payments Table
    const paymentColumns = [
        { id: 'payment_date', label: 'Date', width: 100 },
        { id: 'customer_name', label: 'Customer', width: 180 },
        { id: 'amount', label: 'Amount', width: 100, render: (val: any) => `$${Number(val).toLocaleString()}` },
        {
            id: 'payment_type', label: 'Type', width: 100, render: (val: any) => (
                <span style={{
                    backgroundColor: val === 'deposit' ? '#f0f2ff' : '#ecfdf5',
                    color: val === 'deposit' ? '#5b6cf9' : '#059669',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase'
                }}>
                    {val || 'payment'}
                </span>
            )
        },
        {
            id: 'payment_method', label: 'Method', width: 130, render: (val: any) => {
                return (val || 'unknown').replace('_', ' ').toUpperCase();
            }
        },
        {
            id: 'linked_to', label: 'Inv', width: 120, render: (_: any, row: any) => {
                if (row.invoice_number) return row.invoice_number;
                if (row.invoice) return `INV-${row.invoice}`;
                if (row.estimate_id) return `EST-${row.estimate_id}`;
                if (row.estimate) return `EST-${row.estimate}`;
                return '—';
            }
        },
        { id: 'transaction_id', label: 'Reference', width: 120 },

        {
            id: 'actions', label: 'Actions', width: 200, render: (_: any, row: PaymentReceiptProps) => (
                <div style={{ display: 'flex', gap: '4px' }}>
                    <Tooltip title="View Receipt">
                        <Button
                            size="small"
                            type="text"
                            icon={<EyeOutlined />}
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(`${PaymentsUrl}/${row.id}/download_pdf${row.estimate_public_token ? `?token=${row.estimate_public_token}` : ''}`, '_blank');
                            }}
                        />
                    </Tooltip>
                    <Tooltip title="Send Receipt">
                        <Button
                            size="small"
                            type="text"
                            icon={<SendOutlined />}
                            loading={sendingReceipt === row.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (row.id) handleSendReceipt(row.id);
                            }}
                        />
                    </Tooltip>
                    <Tooltip title="Edit Payment">
                        <Button
                            size="small"
                            type="text"
                            icon={<EditOutlined />}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleEditPayment(row);
                            }}
                            style={{ color: '#fa8c16' }}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Delete Payment"
                        description="Are you sure? This will recalculate the balance."
                        onConfirm={(e) => {
                            e?.stopPropagation();
                            if (row.id) handleDeletePayment(row.id);
                        }}
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="Delete Payment">
                            <Button
                                size="small"
                                type="text"
                                icon={<DeleteOutlined />}
                                danger
                                onClick={(e) => e.stopPropagation()}
                            />
                        </Tooltip>
                    </Popconfirm>
                </div>
            )

        }
    ];

    // Columns for Expenses Table
    const expenseColumns = [
        { id: 'title', label: 'Title', width: 200 },
        { id: 'amount', label: 'Amount', width: 120, render: (val: any) => `$${Number(val).toFixed(2)}` },
        { id: 'expense_date', label: 'Date', width: 120 },
        { id: 'category_name', label: 'Category', width: 150 },
        { id: 'customer_name', label: 'Customer', width: 180 },
        { id: 'created_by_name', label: 'Recorded By', width: 130 },
        {
            id: 'actions', label: 'Actions', width: 100, render: (_: any, row: ExpenseProps) => (
                <div style={{ display: 'flex', gap: '4px' }}>
                    <Tooltip title="Edit Expense">
                        <Button
                            size="small"
                            type="text"
                            icon={<EditOutlined />}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleEditExpense(row);
                            }}
                            style={{ color: '#fa8c16' }}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Delete Expense"
                        description="Are you sure you want to delete this expense?"
                        onConfirm={(e) => {
                            e?.stopPropagation();
                            if (row.id) handleDeleteExpense(row.id);
                        }}
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="Delete Expense">
                            <Button
                                size="small"
                                type="text"
                                icon={<DeleteOutlined />}
                                danger
                                onClick={(e) => e.stopPropagation()}
                            />
                        </Tooltip>
                    </Popconfirm>
                </div>
            )
        }
    ];

    // Columns for Purchases Table
    const purchaseColumns = [
        { id: 'item_name', label: 'Item Name', width: 180 },
        { id: 'vendor', label: 'Vendor', width: 130 },
        { id: 'quantity', label: 'Qty', width: 70 },
        { id: 'unit_price', label: 'Unit Price', width: 100, render: (val: any) => `$${Number(val).toFixed(2)}` },
        { id: 'total_amount', label: 'Total', width: 100, render: (val: any) => `$${Number(val).toFixed(2)}` },
        { id: 'purchase_date', label: 'Date', width: 110 },
        { id: 'category_name', label: 'Category', width: 130 },
        { id: 'created_by_name', label: 'Recorded By', width: 120 },
        {
            id: 'actions', label: 'Actions', width: 100, render: (_: any, row: PurchaseProps) => (
                <div style={{ display: 'flex', gap: '4px' }}>
                    <Tooltip title="Edit Purchase">
                        <Button
                            size="small"
                            type="text"
                            icon={<EditOutlined />}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleEditPurchase(row);
                            }}
                            style={{ color: '#fa8c16' }}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Delete Purchase"
                        description="Are you sure you want to delete this purchase?"
                        onConfirm={(e) => {
                            e?.stopPropagation();
                            if (row.id) handleDeletePurchase(row.id);
                        }}
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="Delete Purchase">
                            <Button
                                size="small"
                                type="text"
                                icon={<DeleteOutlined />}
                                danger
                                onClick={(e) => e.stopPropagation()}
                            />
                        </Tooltip>
                    </Popconfirm>
                </div>
            )
        }
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
                    <WhiteButton onClick={() => setIsInvoiceOrderModalVisible(true)} icon={<FileTextOutlined />}>
                        Invoice Order
                    </WhiteButton>
                    <BlackButton onClick={() => { setEditingExpense(null); setIsExpenseModalVisible(true); }} icon={<PlusOutlined />}>
                        Record Expense
                    </BlackButton>
                    <BlackButton onClick={() => { setEditingPurchase(null); setIsPurchaseModalVisible(true); }} icon={<ShoppingOutlined />}>
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
                onCancel={() => {
                    setIsExpenseModalVisible(false);
                    setEditingExpense(null);
                }}
                onSuccess={() => {
                    setIsExpenseModalVisible(false);
                    setEditingExpense(null);
                    fetchData();
                }}
                editingExpense={editingExpense}
            />

            <AddPurchaseForm
                visible={isPurchaseModalVisible}
                onCancel={() => {
                    setIsPurchaseModalVisible(false);
                    setEditingPurchase(null);
                }}
                onSuccess={() => {
                    setIsPurchaseModalVisible(false);
                    setEditingPurchase(null);
                    fetchData();
                }}
                editingPurchase={editingPurchase}
            />

            {/* Record Payment Modal */}
            <Modal
                title={editingPayment ? 'Edit Payment' : `Record Payment for ${selectedInvoice?.invoice_number}`}
                open={isPaymentModalVisible}
                onCancel={() => {
                    setIsPaymentModalVisible(false);
                    setEditingPayment(null);
                }}
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
                            <Select.Option value="e_transfer">E-Transfer</Select.Option>
                            <Select.Option value="cash">Cash</Select.Option>
                            <Select.Option value="certified_cheque">Certified Cheque</Select.Option>
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

            {/* Invoice Order Modal - Select Job */}
            <Modal
                title={
                    <Space>
                        <FileTextOutlined style={{ color: '#5b6cf9' }} />
                        <span>Invoice Order</span>
                    </Space>
                }
                open={isInvoiceOrderModalVisible}
                onCancel={() => {
                    setIsInvoiceOrderModalVisible(false);
                    setSelectedJobId(null);
                }}
                footer={null}
                width={500}
                centered
                afterOpenChange={(open) => {
                    if (open) fetchAvailableJobs();
                }}
            >
                <div style={{ padding: '20px 0' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                            Select Job
                        </label>
                        <Select
                            showSearch
                            placeholder="Search by Job ID or Customer Name"
                            value={selectedJobId}
                            onChange={(value) => handleSelectJob(value)}
                            loading={loadingJobs}
                            style={{ width: '100%' }}
                            size="large"
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            options={jobOptions.map(opt => ({
                                value: opt.value,
                                label: opt.label,
                            }))}
                            optionRender={(option) => {
                                const job = jobOptions.find(j => j.value === option.value);
                                return (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>Job #{option.value} - {job?.customer}</span>
                                        <span style={{ 
                                            fontSize: '11px', 
                                            padding: '2px 6px', 
                                            borderRadius: '4px',
                                            backgroundColor: job?.status === 'work_order' ? '#e6f7ff' : '#f6ffed',
                                            color: job?.status === 'work_order' ? '#1890ff' : '#52c41a'
                                        }}>
                                            {job?.status?.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </div>
                                );
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <WhiteButton onClick={() => {
                            setIsInvoiceOrderModalVisible(false);
                            setSelectedJobId(null);
                        }}>
                            Cancel
                        </WhiteButton>
                    </div>
                </div>
            </Modal>

            {/* Generate Invoice Modal */}
            {invoiceModalWorkOrderId && invoiceModalEstimateId && (
                <GenerateInvoiceModal
                    isVisible={showGenerateInvoiceModal}
                    onClose={() => {
                        setShowGenerateInvoiceModal(false);
                        setInvoiceModalWorkOrderId(null);
                        setInvoiceModalEstimateId(null);
                    }}
                    onSuccess={handleInvoiceModalSuccess}
                    workOrderId={invoiceModalWorkOrderId}
                    estimateId={invoiceModalEstimateId}
                />
            )}
        </div>
    );
};

export default Finance;
