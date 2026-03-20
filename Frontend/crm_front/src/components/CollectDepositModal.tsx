import React from 'react';
import { Modal, Form, InputNumber, Select, Space, DatePicker, Input } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { BlackButton, WhiteButton } from './index';

const { Option } = Select;
const { TextArea } = Input;

interface CollectDepositModalProps {
    isVisible: boolean;
    onClose: () => void;
    onFinish: (values: any) => void;
    loading: boolean;
    maxAmount: number;
}

const CollectDepositModal: React.FC<CollectDepositModalProps> = ({
    isVisible,
    onClose,
    onFinish,
    loading,
    maxAmount
}) => {
    const [form] = Form.useForm();

    const displayMax = isNaN(maxAmount) ? 0 : maxAmount;

    return (
        <Modal
            title={
                <Space>
                    <DollarOutlined style={{ color: '#5b6cf9' }} />
                    <span>Collect Deposit</span>
                </Space>
            }
            open={isVisible}
            onCancel={onClose}
            footer={null}
            width={450}
            centered
        >
            <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '8px', paddingBottom: '8px' }}>
                <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f0f2ff', borderRadius: '8px', border: '1px solid #efdbff' }}>
                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>BALANCE DUE</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#5b6cf9' }}>${displayMax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={(values) => {
                        onFinish(values);
                        form.resetFields();
                    }}
                    initialValues={{
                        payment_date: dayjs(),
                        payment_method: 'credit_card'
                    }}
                >
                    <Form.Item
                        label="Deposit Amount"
                        name="amount"
                        rules={[
                            { required: true, message: 'Please enter amount' },
                            { type: 'number', min: 0.01, message: 'Amount must be at least 0.01' }
                        ]}
                    >
                        <InputNumber
                            style={{ width: '100%' }}
                            min={0}
                            step={0.01}
                            precision={2}
                            autoFocus
                            formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value!.replace(/\$\s?|(,*)/g, '') as any}
                        />
                    </Form.Item>

                    <Form.Item
                        label="Payment Method"
                        name="payment_method"
                        rules={[{ required: true, message: 'Please select method' }]}
                    >
                        <Select>
                            <Option value="credit_card">Credit Card</Option>
                            <Option value="e_transfer">E-Transfer</Option>
                            <Option value="cash">Cash</Option>
                            <Option value="certified_cheque">Certified Cheque</Option>
                            <Option value="other">Other</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label="Payment Date"
                        name="payment_date"
                        rules={[{ required: true, message: 'Please select date' }]}
                    >
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        label="Transaction ID / Reference"
                        name="transaction_id"
                        tooltip="Optional merchant reference or check number"
                    >
                        <Input style={{ width: '100%' }} placeholder="Optional reference #" />
                    </Form.Item>

                    <Form.Item
                        label="Internal Notes"
                        name="notes"
                    >
                        <TextArea
                            rows={3}
                            placeholder="Add any internal notes about this deposit..."
                            style={{ borderRadius: '8px' }}
                        />
                    </Form.Item>

                    <div style={{ textAlign: 'right', marginTop: '24px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <WhiteButton onClick={onClose} disabled={loading}>
                            Cancel
                        </WhiteButton>
                        <BlackButton
                            htmlType="submit"
                            loading={loading}
                        >
                            Record Deposit
                        </BlackButton>
                    </div>
                </Form>
            </div>
        </Modal>
    );
};

export default CollectDepositModal;
