import React, { useState } from 'react';
import {
  Modal,
  Upload,
  Button,
  Table,
  Tag,
  Space,
  Typography,
  Card,
  Statistic,
  Row,
  Col,
  notification,
  Tooltip,
  Badge,
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  FileExcelOutlined,
  ArrowLeftOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { getAuthToken } from '../utils/functions';
import { BlackButton, WhiteButton } from './index';

const { Text, Title } = Typography;
const { Dragger } = Upload;

interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface PreviewRow {
  row_num: number;
  data: Record<string, string>;
  status: 'valid' | 'warning' | 'error';
  action: 'create' | 'update';
  issues: ValidationIssue[];
}

interface PreviewData {
  total: number;
  valid: number;
  warnings: number;
  errors: number;
  new_records: number;
  updates: number;
  rows: PreviewRow[];
}

interface BulkUploadModalProps {
  isVisible: boolean;
  entityType: string;
  entityLabel: string;
  apiUrl: string;
  onClose: () => void;
  onSuccess: () => void;
}

type UploadStep = 'select' | 'preview' | 'importing';

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isVisible,
  entityType,
  entityLabel,
  apiUrl,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<UploadStep>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  const resetModal = () => {
    setStep('select');
    setSelectedFile(null);
    setPreviewData(null);
    setLoading(false);
    setImportLoading(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleDownloadTemplate = async () => {
    try {
      const headers = getAuthToken();
      const response = await axios.get(`${apiUrl}/download_template`, {
        ...headers,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${entityType}_export.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      notification.error({
        message: 'Download Failed',
        description: 'Failed to download template file',
        title: 'Error'
      });
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    return false; // Prevent auto upload
  };

  const handleValidate = async () => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const headers = getAuthToken() as any;
      const response = await axios.post(`${apiUrl}/validate_upload`, formData, {
        ...headers,
        headers: {
          ...headers?.headers,
          'Content-Type': 'multipart/form-data',
        },
      });

      setPreviewData(response.data);
      setStep('preview');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Validation failed';
      notification.error({
        message: 'Validation Failed',
        description: errorMessage,
        title: 'Error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImportLoading(true);
    setStep('importing');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const headers = getAuthToken() as any;
      const response = await axios.post(`${apiUrl}/bulk_upload`, formData, {
        ...headers,
        headers: {
          ...headers?.headers,
          'Content-Type': 'multipart/form-data',
        },
      });

      const { created, updated } = response.data;
      notification.success({
        message: 'Import Successful',
        description: `${created} ${entityLabel.toLowerCase()}(s) created, ${updated} updated.`,
        title: 'Success'
      });

      handleClose();
      onSuccess();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Import failed';
      notification.error({
        message: 'Import Failed',
        description: errorMessage,
        title: 'Error'
      });
      setStep('preview');
    } finally {
      setImportLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return null;
    }
  };

  const getRowClassName = (record: PreviewRow) => {
    switch (record.status) {
      case 'valid':
        return record.action === 'create' ? 'row-valid-new' : 'row-valid-update';
      case 'warning':
        return 'row-warning';
      case 'error':
        return 'row-error';
      default:
        return '';
    }
  };

  const generateColumns = () => {
    if (!previewData || previewData.rows.length === 0) return [];

    const firstRow = previewData.rows[0];
    const dataKeys = Object.keys(firstRow.data);

    const columns: any[] = [
      {
        title: 'Row',
        dataIndex: 'row_num',
        key: 'row_num',
        width: 60,
        fixed: 'left',
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        fixed: 'left',
        render: (status: string, record: PreviewRow) => (
          <Space>
            {getStatusIcon(status)}
            <Badge
              count={record.action === 'create' ? 'NEW' : 'UPDATE'}
              style={{
                backgroundColor: record.action === 'create' ? '#52c41a' : '#1890ff',
                fontSize: '10px',
              }}
            />
          </Space>
        ),
      },
    ];

    // Add data columns (limit to first 6 for readability)
    const displayKeys = dataKeys.slice(0, 6);
    displayKeys.forEach((key) => {
      columns.push({
        title: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        dataIndex: ['data', key],
        key: key,
        ellipsis: true,
        width: 150,
      });
    });

    // Add issues column
    columns.push({
      title: 'Issues',
      key: 'issues',
      width: 250,
      render: (_: any, record: PreviewRow) => (
        <Space direction="vertical" size={0}>
          {record.issues.map((issue, idx) => (
            <Tooltip key={idx} title={`${issue.field}: ${issue.message}`}>
              <Tag color={issue.severity === 'error' ? 'red' : 'orange'}>
                {issue.field}: {issue.message.substring(0, 30)}
                {issue.message.length > 30 ? '...' : ''}
              </Tag>
            </Tooltip>
          ))}
        </Space>
      ),
    });

    return columns;
  };

  const renderSelectStep = () => (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px', textAlign: 'right' }}>
        <Button
          type="link"
          icon={<DownloadOutlined />}
          onClick={handleDownloadTemplate}
        >
          Download Template with Current Data
        </Button>
      </div>

      <Dragger
        accept=".xlsx,.xls"
        beforeUpload={handleFileSelect}
        showUploadList={false}
        style={{ padding: '40px' }}
      >
        <p className="ant-upload-drag-icon">
          <FileExcelOutlined style={{ fontSize: 48, color: '#52c41a' }} />
        </p>
        <p className="ant-upload-text">
          Click or drag Excel file to this area to upload
        </p>
        <p className="ant-upload-hint">
          Supports .xlsx and .xls files. Download the template first to see the
          required format.
        </p>
      </Dragger>

      {selectedFile && (
        <Card size="small" style={{ marginTop: '20px' }}>
          <Space>
            <FileExcelOutlined style={{ color: '#52c41a', fontSize: 20 }} />
            <Text strong>{selectedFile.name}</Text>
            <Text type="secondary">
              ({(selectedFile.size / 1024).toFixed(1)} KB)
            </Text>
          </Space>
        </Card>
      )}
    </div>
  );

  const renderPreviewStep = () => (
    <div>
      {previewData && (
        <>
          <Card size="small" style={{ marginBottom: '16px' }}>
            <Row gutter={16}>
              <Col span={4}>
                <Statistic
                  title="Total Rows"
                  value={previewData.total}
                  valueStyle={{ fontSize: '18px' }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="Valid"
                  value={previewData.valid}
                  valueStyle={{ color: '#52c41a', fontSize: '18px' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="Warnings"
                  value={previewData.warnings}
                  valueStyle={{ color: '#faad14', fontSize: '18px' }}
                  prefix={<WarningOutlined />}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="Errors"
                  value={previewData.errors}
                  valueStyle={{ color: '#ff4d4f', fontSize: '18px' }}
                  prefix={<CloseCircleOutlined />}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="New Records"
                  value={previewData.new_records}
                  valueStyle={{ color: '#52c41a', fontSize: '18px' }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="Updates"
                  value={previewData.updates}
                  valueStyle={{ color: '#1890ff', fontSize: '18px' }}
                />
              </Col>
            </Row>
          </Card>

          <Table
            dataSource={previewData.rows}
            columns={generateColumns()}
            rowKey="row_num"
            rowClassName={getRowClassName}
            size="small"
            scroll={{ x: 1000, y: 400 }}
            pagination={{
              pageSize: 50,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} rows`,
            }}
          />
        </>
      )}
    </div>
  );

  const renderImportingStep = () => (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <CloudUploadOutlined style={{ fontSize: 64, color: '#1890ff' }} spin />
      <Title level={4} style={{ marginTop: '20px' }}>
        Importing Data...
      </Title>
      <Text type="secondary">Please wait while we import your data.</Text>
    </div>
  );

  const getFooterButtons = () => {
    switch (step) {
      case 'select':
        return [
          <WhiteButton key="cancel" onClick={handleClose}>
            Cancel
          </WhiteButton>,
          <BlackButton
            key="validate"
            icon={<UploadOutlined />}
            onClick={handleValidate}
            loading={loading}
            disabled={!selectedFile}
          >
            Validate & Preview
          </BlackButton>,
        ];
      case 'preview':
        return [
          <WhiteButton key="cancel" onClick={handleClose}>
            Cancel
          </WhiteButton>,
          <WhiteButton
            key="back"
            icon={<ArrowLeftOutlined />}
            onClick={() => setStep('select')}
          >
            Back
          </WhiteButton>,
          <BlackButton
            key="import"
            icon={<CloudUploadOutlined />}
            onClick={handleImport}
            disabled={previewData?.errors !== 0}
            loading={importLoading}
          >
            Submit Import ({previewData?.valid || 0} records)
          </BlackButton>,
        ];
      case 'importing':
        return [];
      default:
        return [];
    }
  };

  return (
    <Modal
      title={
        <Space>
          <UploadOutlined />
          <span>Bulk Upload {entityLabel}</span>
        </Space>
      }
      open={isVisible}
      onCancel={handleClose}
      width={step === 'preview' ? 1200 : 600}
      footer={getFooterButtons()}
      destroyOnClose
    >
      <style>
        {`
          .row-valid-new {
            background-color: #f6ffed;
          }
          .row-valid-update {
            background-color: #e6f7ff;
          }
          .row-warning {
            background-color: #fffbe6;
          }
          .row-error {
            background-color: #fff2f0;
          }
        `}
      </style>

      {step === 'select' && renderSelectStep()}
      {step === 'preview' && renderPreviewStep()}
      {step === 'importing' && renderImportingStep()}
    </Modal>
  );
};

export default BulkUploadModal;
