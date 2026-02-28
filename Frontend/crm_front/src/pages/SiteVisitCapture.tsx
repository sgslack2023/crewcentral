import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card,
    Button,
    notification,
    Input,
    Upload,
    List,
    Typography,
    Divider,
    Space,
    Form,
    Tag
} from 'antd';
import {
    CameraOutlined,
    PlusOutlined,
    CheckCircleOutlined,
    PlayCircleOutlined,
    EnvironmentOutlined,
    UserOutlined,
    InfoCircleOutlined,
    DeleteOutlined
} from '@ant-design/icons';
import { PropagateLoader } from 'react-spinners';
import axios from 'axios';
import { SiteVisitsUrl, SiteVisitObservationsUrl, SiteVisitPhotosUrl } from '../utils/network';
import { SiteVisitProps, SiteVisitObservationProps, SiteVisitPhotoProps } from '../utils/types';
import { getAuthToken } from '../utils/functions';
import { BlackButton, WhiteButton, PageLoader } from '../components';

const { Title, Text } = Typography;
const { TextArea } = Input;

const SiteVisitCapture: React.FC = () => {
    const { visitId } = useParams<{ visitId: string }>();
    const navigate = useNavigate();
    const [visit, setVisit] = useState<SiteVisitProps | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [obsForm] = Form.useForm();

    useEffect(() => {
        fetchVisitDetails();
    }, [visitId]);

    const fetchVisitDetails = async () => {
        setLoading(true);
        try {
            const headers = getAuthToken() as any;
            const response = await axios.get(`${SiteVisitsUrl}/${visitId}/`, headers);
            setVisit(response.data);
        } catch (error) {
            notification.error({
                message: 'Error',
                description: 'Failed to fetch visit details',
                title: 'Error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action: 'start_visit' | 'complete_visit') => {
        try {
            const headers = getAuthToken() as any;
            await axios.post(`${SiteVisitsUrl}/${visitId}/${action}/`, {}, headers);
            notification.success({
                message: 'Success',
                description: `Visit status updated`,
                title: 'Success'
            });
            fetchVisitDetails();
        } catch (error) {
            notification.error({
                message: 'Error',
                description: 'Failed to update status',
                title: 'Error'
            });
        }
    };

    const onAddObservation = async (values: any) => {
        try {
            const headers = getAuthToken() as any;
            await axios.post(SiteVisitObservationsUrl + "/", {
                visit: visitId,
                key: values.key,
                value: values.value
            }, headers);
            obsForm.resetFields();
            fetchVisitDetails();
            notification.success({ message: 'Observation added', title: 'Success' });
        } catch (error) {
            notification.error({ message: 'Failed to add observation', title: 'Error' });
        }
    };

    const handleDeleteObservation = async (id: number) => {
        try {
            const headers = getAuthToken() as any;
            await axios.delete(`${SiteVisitObservationsUrl}/${id}/`, headers);
            fetchVisitDetails();
        } catch (error) {
            notification.error({ message: 'Failed to delete', title: 'Error' });
        }
    };

    const handleUpload = async (options: any) => {
        const { file, onSuccess, onError } = options;
        setUploading(true);
        try {
            const headers = getAuthToken() as any;
            const formData = new FormData();
            formData.append('visit', visitId!);
            formData.append('image', file);
            formData.append('caption', file.name);

            await axios.post(SiteVisitPhotosUrl + "/", formData, {
                ...headers,
                headers: {
                    ...headers.headers,
                    'Content-Type': 'multipart/form-data',
                },
            });
            onSuccess("Ok");
            fetchVisitDetails();
            notification.success({ message: 'Photo uploaded', title: 'Success' });
        } catch (error) {
            onError(error);
            notification.error({ message: 'Upload failed', title: 'Error' });
        } finally {
            setUploading(false);
        }
    };

    const handleDeletePhoto = async (id: number) => {
        try {
            const headers = getAuthToken() as any;
            await axios.delete(`${SiteVisitPhotosUrl}/${id}/`, headers);
            fetchVisitDetails();
        } catch (error) {
            notification.error({ message: 'Failed to delete photo', title: 'Error' });
        }
    };

    if (loading) return <PageLoader fullPage text="Loading visit details..." />;
    if (!visit) return <div style={{ padding: '20px' }}>Visit not found</div>;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa' }}>
            <div style={{ padding: '16px 24px', maxWidth: '600px', margin: '0 auto', width: '100%', flexShrink: 0 }}>
                <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <WhiteButton onClick={() => navigate(-1)} style={{ marginBottom: '8px' }}>← Back</WhiteButton>
                        <Title level={4} style={{ margin: 0 }}>Site Visit Audit</Title>
                        <Text type="secondary">{visit.customer_name}</Text>
                    </div>
                    <Tag color={visit.status === 'COMPLETED' ? '#5b6cf9' : visit.status === 'IN_PROGRESS' ? 'orange' : 'blue'}>
                        {visit.status}
                    </Tag>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px 24px' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>

                    {/* Visit Controls */}
                    <Card style={{ marginBottom: '16px', borderRadius: '12px' }} size="small">
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <EnvironmentOutlined style={{ color: '#5b6cf9' }} />
                                <Text strong>Location Data Capture</Text>
                            </div>
                            {visit.status === 'SCHEDULED' && (
                                <BlackButton block icon={<PlayCircleOutlined />} onClick={() => handleAction('start_visit')}>
                                    Start Audit Now
                                </BlackButton>
                            )}
                            {visit.status === 'IN_PROGRESS' && (
                                <BlackButton block icon={<CheckCircleOutlined />} onClick={() => handleAction('complete_visit')}>
                                    Complete Audit
                                </BlackButton>
                            )}
                            {visit.status === 'COMPLETED' && (
                                <div style={{ textAlign: 'center', padding: '10px', backgroundColor: '#f0f2ff', color: '#5b6cf9', borderRadius: '8px', border: '1px solid #c7d2ff' }}>
                                    <CheckCircleOutlined /> Audit Completed
                                </div>
                            )}
                        </Space>
                    </Card>

                    {/* Photos Section */}
                    <Card
                        title={<span style={{ fontSize: '14px' }}><CameraOutlined /> Site Photos</span>}
                        style={{ marginBottom: '16px', borderRadius: '12px' }}
                        size="small"
                    >
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                            {visit.photos?.map(photo => (
                                <div key={photo.id} style={{ position: 'relative', aspectRatio: '1/1' }}>
                                    <img
                                        src={photo.image_url}
                                        alt="Site"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}
                                    />
                                    <Button
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined style={{ fontSize: '10px' }} />}
                                        onClick={() => handleDeletePhoto(photo.id!)}
                                        style={{ position: 'absolute', top: '4px', right: '4px', height: '20px', width: '20px', padding: 0 }}
                                    />
                                </div>
                            ))}
                            <Upload
                                customRequest={handleUpload}
                                showUploadList={false}
                                disabled={visit.status === 'COMPLETED' || uploading}
                            >
                                <div style={{
                                    width: '100%',
                                    aspectRatio: '1/1',
                                    border: '1px dashed #d9d9d9',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    backgroundColor: '#fafafa',
                                    cursor: 'pointer'
                                }}>
                                    {uploading ? (
                                        <PropagateLoader color="#5b6cf9" size={6} loading={uploading} />
                                    ) : (
                                        <>
                                            <PlusOutlined />
                                            <span style={{ fontSize: '10px' }}>Add Photo</span>
                                        </>
                                    )}
                                </div>
                            </Upload>
                        </div>
                    </Card>

                    {/* Observations Section */}
                    <Card
                        title={<span style={{ fontSize: '14px' }}><InfoCircleOutlined /> Key Observations</span>}
                        style={{ marginBottom: '16px', borderRadius: '12px' }}
                        size="small"
                    >
                        <List
                            size="small"
                            dataSource={visit.observations}
                            renderItem={obs => (
                                <List.Item actions={[<Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteObservation(obs.id!)} />]}>
                                    <List.Item.Meta
                                        title={<Text strong style={{ fontSize: '12px' }}>{obs.key}</Text>}
                                        description={<Text style={{ fontSize: '12px' }}>{obs.value}</Text>}
                                    />
                                </List.Item>
                            )}
                        />

                        {visit.status !== 'COMPLETED' && (
                            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                                <Form form={obsForm} layout="vertical" onFinish={onAddObservation}>
                                    <Form.Item name="key" label="Audit Point (e.g. Access)" rules={[{ required: true }]} style={{ marginBottom: '8px' }}>
                                        <Input placeholder="Item name" size="small" />
                                    </Form.Item>
                                    <Form.Item name="value" label="Details" rules={[{ required: true }]} style={{ marginBottom: '12px' }}>
                                        <TextArea placeholder="Describe finding" size="small" rows={2} />
                                    </Form.Item>
                                    <WhiteButton block htmlType="submit" size="small">Add Observation</WhiteButton>
                                </Form>
                            </div>
                        )}
                    </Card>

                    {/* Notes Section */}
                    <Card
                        title={<span style={{ fontSize: '14px' }}><UserOutlined /> Initial Admin Notes</span>}
                        style={{ borderRadius: '12px' }}
                        size="small"
                    >
                        <Text style={{ fontSize: '13px' }}>{visit.notes || 'No admin notes provided.'}</Text>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default SiteVisitCapture;
