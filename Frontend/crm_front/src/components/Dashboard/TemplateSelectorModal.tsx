import React, { useState, useEffect } from 'react';
import { Modal, Card, Row, Col, Typography, Tag, Button, Empty, message, Popconfirm } from 'antd';
import { LayoutOutlined, FireOutlined, RocketOutlined, BarChartOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import { DashboardsUrl } from '../../utils/network';
import { getAuthToken } from '../../utils/functions';
import { PageLoader } from '../';

const { Title, Text, Paragraph } = Typography;

interface TemplateSelectorModalProps {
    visible: boolean;
    onClose: () => void;
    onTemplateSelected: (dashboardId: string) => void;
}

const TemplateSelectorModal: React.FC<TemplateSelectorModalProps> = ({ visible, onClose, onTemplateSelected }) => {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (visible) {
            fetchTemplates();
        }
    }, [visible]);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const headers = getAuthToken();
            if (!headers) return;

            const response = await axios.get(`${DashboardsUrl}?show_templates=true`, headers);
            setTemplates(response.data);
        } catch (error) {
            console.error('Failed to fetch templates:', error);
            message.error('Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectTemplate = async (templateId: string) => {
        try {
            setCreating(true);
            const headers = getAuthToken();
            if (!headers) return;

            const response = await axios.post(`${DashboardsUrl}${templateId}/create-from-template/`, {}, headers);
            message.success('Dashboard created from template!');
            onTemplateSelected(response.data.id);
            onClose();
        } catch (error) {
            console.error('Failed to create dashboard from template:', error);
            message.error('Failed to create dashboard');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteTemplate = async (e: React.MouseEvent, templateId: string) => {
        e.stopPropagation();
        try {
            setLoading(true);
            const headers = getAuthToken();
            if (!headers) return;

            await axios.delete(`${DashboardsUrl}${templateId}/`, headers);
            message.success('Template deleted successfully');
            fetchTemplates();
        } catch (error) {
            console.error('Failed to delete template:', error);
            message.error('Failed to delete template');
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (category: string) => {
        switch (category?.toLowerCase()) {
            case 'management': return <RocketOutlined style={{ fontSize: '24px', color: '#5b6cf9' }} />;
            case 'sales': return <FireOutlined style={{ fontSize: '24px', color: '#f5222d' }} />;
            case 'ops': return <LayoutOutlined style={{ fontSize: '24px', color: '#52c41a' }} />;
            default: return <BarChartOutlined style={{ fontSize: '24px', color: '#5b6cf9' }} />;
        }
    };

    return (
        <Modal
            title="Create Dashboard from Template"
            open={visible}
            onCancel={onClose}
            footer={null}
            width={900}
            bodyStyle={{ padding: '24px', backgroundColor: '#f0f2f5' }}
        >
            {loading || creating ? (
                <PageLoader text={creating ? "Creating your dashboard..." : "Loading templates..."} />
            ) : templates.length === 0 ? (
                <Empty description="No templates found." />
            ) : (
                <Row gutter={[16, 16]}>
                    {templates.map(template => (
                        <Col span={6} key={template.id}>
                            <Card
                                hoverable
                                onClick={() => handleSelectTemplate(template.id)}
                                style={{
                                    textAlign: 'center',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    position: 'relative',
                                    borderRadius: '8px',
                                    padding: '12px 4px'
                                }}
                                bodyStyle={{ padding: '8px' }}
                            >
                                <Popconfirm
                                    title="Delete Template?"
                                    onConfirm={(e) => handleDeleteTemplate(e as any, template.id)}
                                    onCancel={(e) => e?.stopPropagation()}
                                    okText="Yes"
                                    cancelText="No"
                                >
                                    <Button
                                        type="text"
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined style={{ fontSize: '12px' }} />}
                                        style={{ position: 'absolute', top: 4, right: 4 }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </Popconfirm>

                                <div style={{ fontSize: '32px', marginBottom: '12px' }}>
                                    {getIcon(template.category)}
                                </div>

                                <Text strong style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>
                                    {template.name}
                                </Text>

                                <Tag color="#5b6cf9" style={{ fontSize: '10px', margin: 0 }}>
                                    {template.category || 'Standard'}
                                </Tag>

                                <div style={{ fontSize: '10px', color: '#8c8c8c', marginTop: '8px' }}>
                                    {template.widgets?.length || 0} Widgets
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </Modal>
    );
};

export default TemplateSelectorModal;
