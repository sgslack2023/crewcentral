import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Tag, Space, Typography, Card, Divider, message, Row, Col, Alert } from 'antd';
import { FunctionOutlined, PlusOutlined, CalculatorOutlined, InfoCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import { getAuthToken } from '../../utils/functions';
import { CustomMetricsUrl } from '../../utils/network';

const { Title, Text, Paragraph } = Typography;

const BASE_METRICS = [
    { key: 'total_leads', title: 'Total Leads', description: 'Count of customers created in period' },
    { key: 'total_revenue', title: 'Total Revenue', description: 'Sum of payment receipts in period' },
    { key: 'payment_count', title: 'Payment Count', description: 'Number of transactions in period' },
    { key: 'active_jobs', title: 'Active Jobs', description: 'Current pipeline count (Stage: Booked/Opp)' },
    { key: 'pipeline_value', title: 'Pipeline Value', description: 'Sum of open estimates ($)' },
    { key: 'total_expenses', title: 'Total Expenses', description: 'Sum of operational expenses in period' },
    { key: 'total_purchases', title: 'Total Purchases', description: 'Sum of asset purchases in period' }
];

interface CustomMetricBuilderProps {
    visible: boolean;
    onClose: () => void;
    onSaved: () => void;
}

const CustomMetricBuilder: React.FC<CustomMetricBuilderProps> = ({ visible, onClose, onSaved }) => {
    const [form] = Form.useForm();
    const [formula, setFormula] = useState('');
    const [loading, setLoading] = useState(false);
    const [testResult, setTestResult] = useState<any>(null);
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        if (!visible) {
            form.resetFields();
            setFormula('');
            setTestResult(null);
        }
    }, [visible, form]);

    const insertMetric = (key: string) => {
        const placeholder = `{{${key}}}`;
        setFormula(prev => prev + placeholder);
        form.setFieldsValue({ formula: formula + placeholder });
    };

    const handleTest = async () => {
        try {
            setTesting(true);
            const headers = getAuthToken();
            if (!headers) return;

            const values = await form.validateFields();

            // We use a dummy ID 'test' and the backend handles the formula via mock or temp creation
            // For now, let's just save and the widget will test naturally, 
            // OR we can implement a temp test endpoint.
            // Since we haven't implemented a 'test' endpoint, we'll just validate formula syntax locally

            if (!values.formula.includes('{{')) {
                message.warning("Your formula doesn't use any base metrics yet!");
            }

            // Simple regex validation for basic math
            const clean = values.formula.replace(/\{\{[^}]+\}\}/g, '1');
            if (/^[0-9\s\+\-\*\/\(\)\.]+$/.test(clean)) {
                setTestResult({ success: true, message: 'Formula syntax is valid!' });
            } else {
                setTestResult({ success: false, message: 'Invalid characters in formula. Use +, -, *, /, and ()' });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setTesting(false);
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const headers = getAuthToken();
            if (!headers) return;

            const values = await form.validateFields();

            // Extract variables from formula
            const varRegex = /\{\{([^}]+)\}\}/g;
            const variables = [];
            let match;
            while ((match = varRegex.exec(values.formula)) !== null) {
                variables.push(match[1]);
            }

            const payload = {
                ...values,
                variables: Array.from(new Set(variables))
            };

            await axios.post(CustomMetricsUrl, payload, headers);
            message.success('Custom metric created successfully!');
            onSaved();
            onClose();
        } catch (error) {
            console.error('Failed to save metric:', error);
            message.error('Failed to save custom metric');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={<Space><FunctionOutlined /> Custom KPI Builder</Space>}
            open={visible}
            width={1100}
            centered
            bodyStyle={{ maxHeight: '70vh', overflowY: 'auto', overflowX: 'hidden' }}
            footer={[
                <Button key="cancel" onClick={onClose}>Cancel</Button>,
                <Button
                    key="test"
                    onClick={handleTest}
                    loading={testing}
                    style={{ background: '#000', borderColor: '#000', color: '#fff' }}
                >
                    Validate Formula
                </Button>,
                <Button
                    key="save"
                    onClick={handleSave}
                    loading={loading}
                    style={{ background: '#000', borderColor: '#000', color: '#fff' }}
                >
                    Create Metric
                </Button>
            ]}
        >
            <Row gutter={24}>
                <Col span={15}>
                    <Form form={form} layout="vertical">
                        <Form.Item
                            name="name"
                            label="Metric Name"
                            rules={[{ required: true, message: 'Please enter a name' }]}
                        >
                            <Input placeholder="e.g. Lead Value, Revenue per Job" />
                        </Form.Item>

                        <Form.Item name="description" label="Description">
                            <Input.TextArea placeholder="Describe what this KPI measures..." rows={2} />
                        </Form.Item>

                        <Form.Item
                            name="formula"
                            label={
                                <Space>
                                    Formula
                                    <Tag color="#5b6cf9" style={{ cursor: 'help' }}>
                                        <InfoCircleOutlined /> Use placeholders like {'{{total_revenue}}'}
                                    </Tag>
                                </Space>
                            }
                            rules={[{ required: true, message: 'Formula is required' }]}
                        >
                            <Input.TextArea
                                value={formula}
                                onChange={e => setFormula(e.target.value)}
                                placeholder="{{total_revenue}} / {{total_leads}}"
                                rows={3}
                                style={{ fontFamily: 'monospace', fontSize: '16px' }}
                            />
                        </Form.Item>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="unit" label="Unit (Suffix)">
                                    <Select placeholder="Select unit">
                                        <Select.Option value="$">$ (Currency)</Select.Option>
                                        <Select.Option value="%">% (Percentage)</Select.Option>
                                        <Select.Option value="pts">Points</Select.Option>
                                        <Select.Option value="">None</Select.Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>

                    {testResult && (
                        <Alert
                            type={testResult.success ? "success" : "error"}
                            message={testResult.message}
                            showIcon
                            style={{ marginTop: '16px' }}
                        />
                    )}
                </Col>

                <Col span={9}>
                    <Card title="Available Base Metrics" size="small" style={{ height: '100%', background: '#f5f7fa' }}>
                        <Paragraph type="secondary" style={{ fontSize: '12px' }}>
                            Click a metric to insert it into your formula.
                        </Paragraph>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            {BASE_METRICS.map(m => (
                                <div
                                    key={m.key}
                                    className="metric-insert-item"
                                    onClick={() => insertMetric(m.key)}
                                    style={{
                                        padding: '8px 12px',
                                        background: '#fff',
                                        border: '1px solid #e8e8e8',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text strong style={{ fontSize: '13px' }}>{m.title}</Text>
                                        <PlusOutlined style={{ fontSize: '10px', color: '#5b6cf9' }} />
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#8c8c8c' }}>{m.description}</div>
                                </div>
                            ))}
                        </Space>

                        <Divider style={{ margin: '16px 0' }} />

                        <div style={{ padding: '8px', background: '#e6f7ff', borderRadius: '4px', border: '1px solid #91d5ff' }}>
                            <Title level={5} style={{ fontSize: '12px', marginBottom: '4px' }}>Pro Tip:</Title>
                            <Text style={{ fontSize: '11px' }}>
                                You can use standard math: <b>+ - * / ( )</b>
                                <br />Example: <b>({'{{total_revenue}}'} - 1000) / 10</b>
                            </Text>
                        </div>
                    </Card>
                </Col>
            </Row>

            <style>{`
                .metric-insert-item:hover {
                    border-color: #5b6cf9 !important;
                    background: #f0f7ff !important;
                    transform: translateX(4px);
                }
            `}</style>
        </Modal>
    );
};

export default CustomMetricBuilder;
