import React, { useState, useEffect } from 'react';
import { Modal, List, Checkbox, Input, Button, Tag, Space, Typography } from 'antd';
import { SearchOutlined, FileTextOutlined } from '@ant-design/icons';
import axios from 'axios';
import { DocumentProps } from '../utils/types';
import { getAuthToken } from '../utils/functions';
import { DocumentsUrl } from '../utils/network';

const { Text } = Typography;

interface DocumentPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (selectedIds: number[]) => void;
    selectedIds: number[];
}

const DocumentPicker: React.FC<DocumentPickerProps> = ({ visible, onClose, onSelect, selectedIds }) => {
    const [documents, setDocuments] = useState<DocumentProps[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [tempSelectedIds, setTempSelectedIds] = useState<number[]>(selectedIds);

    useEffect(() => {
        if (visible) {
            fetchDocuments();
            setTempSelectedIds(selectedIds);
        }
    }, [visible, selectedIds]);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${DocumentsUrl}?exclude_category=Email`, getAuthToken() as any);
            // Filter out documents that are probably not suitable for attachments (optional)
            // For now, show everything except the one we might be editing (though we don't have that ID here)
            setDocuments(response.data);
        } catch (error) {
            console.error('Error fetching documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleSelect = (id: number) => {
        setTempSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleOk = () => {
        onSelect(tempSelectedIds);
        onClose();
    };

    const filteredDocuments = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchText.toLowerCase()) ||
        doc.category?.toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <Modal
            title="Select Documents to Attach"
            open={visible}
            onOk={handleOk}
            onCancel={onClose}
            width={700}
            okText="Select"
        >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Input
                    placeholder="Search documents..."
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                />

                <List
                    loading={loading}
                    dataSource={filteredDocuments}
                    renderItem={item => (
                        <List.Item
                            actions={[
                                <Checkbox
                                    checked={tempSelectedIds.includes(item.id!)}
                                    onChange={() => handleToggleSelect(item.id!)}
                                />
                            ]}
                        >
                            <List.Item.Meta
                                avatar={<FileTextOutlined style={{ fontSize: '24px', color: '#1890ff' }} />}
                                title={item.title}
                                description={
                                    <Space>
                                        <Tag color="blue">{item.category}</Tag>
                                        {item.document_type && <Tag color="orange">{item.document_type}</Tag>}
                                        {tempSelectedIds.includes(item.id!) && <Text type="success">Selected</Text>}
                                    </Space>
                                }
                            />
                        </List.Item>
                    )}
                    style={{ maxHeight: '400px', overflowY: 'auto' }}
                />
            </Space>
        </Modal>
    );
};

export default DocumentPicker;
