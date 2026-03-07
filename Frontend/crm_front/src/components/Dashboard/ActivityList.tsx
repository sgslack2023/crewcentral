import { List, Typography, Tag, Empty, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

interface ActivityListProps {
    title: string;
    data: any[];
    loading?: boolean;
    config?: any;
    headerClassName?: string;
    isEditMode?: boolean;
    onRemove?: () => void;
    onConfigure?: () => void;
}

const ActivityList: React.FC<ActivityListProps> = ({
    title, data = [], loading, config
}) => {
    const navigate = useNavigate();

    const handleDrillDown = (item: any) => {
        if (item.estimate_id) {
            navigate(`/estimate-editor/${item.estimate_id}`);
        } else if (item.invoice_id) {
            // If we had an invoice view, we'd go there. For now, go to finance or estimate
            navigate(`/finance`);
        } else if (item.title?.includes('Payment')) {
            navigate(`/finance`);
        } else if (item.id) {
            // Default to customer timeline
            navigate(`/customer-timeline/${item.id}`);
        }
    };

    const isGrouped = config?.groupBy && config.groupBy !== 'none';

    if (isGrouped) {
        return (
            <div style={{ height: '100%', overflow: 'auto' }}>
                {data.length > 0 ? (
                    <List
                        dataSource={data}
                        size="small"
                        renderItem={(item: any) => (
                            <List.Item
                                style={{
                                    padding: '12px 16px',
                                    borderLeft: item.is_current ? `4px solid ${config.accentColor || '#1890ff'}` : 'none',
                                    background: item.is_current ? '#f0faff' : 'transparent'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <Text strong style={{ fontSize: '14px' }}>{item.group}</Text>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <Text strong style={{ fontSize: '18px', color: config.accentColor || '#1890ff' }}>
                                            {config.aggregate === 'sum' ? `$${(item.value || 0).toLocaleString()}` : item.value}
                                        </Text>
                                        <div style={{ fontSize: '10px', color: '#8c8c8c', textTransform: 'uppercase' }}>
                                            {config.aggregate === 'sum' ? 'Total' : 'Count'}
                                        </div>
                                    </div>
                                </div>
                            </List.Item>
                        )}
                    />
                ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No summary data" />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div style={{ height: '100%', overflow: 'auto' }}>
            {data.length > 0 ? (
                <List
                    itemLayout="horizontal"
                    dataSource={data}
                    size="small"
                    renderItem={(item: any) => (
                        <List.Item
                            style={{ padding: '8px 4px', cursor: 'pointer', transition: 'background 0.3s' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            onClick={() => handleDrillDown(item)}
                            extra={
                                <Button
                                    type="link"
                                    icon={<EyeOutlined />}
                                    onClick={(e) => { e.stopPropagation(); handleDrillDown(item); }}
                                />
                            }
                        >
                            <List.Item.Meta
                                title={<Text strong style={{ fontSize: '13px' }}>{item.customer || item.title}</Text>}
                                description={
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                            {item.date ? dayjs(item.date).format('MMM DD, YYYY') : 'Date TBD'}
                                        </Text>
                                        {item.amount && item.amount > 0 ? (
                                            <Tag color="processing" style={{ fontSize: '11px' }}>${item.amount}</Tag>
                                        ) : (
                                            <Tag style={{ fontSize: '11px' }}>Lead</Tag>
                                        )}
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                />
            ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No content found" />
                </div>
            )}
        </div>
    );
};

export default ActivityList;
