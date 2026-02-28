import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, notification, Modal, Select, Form } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  LinkOutlined,
  BranchesOutlined,
  TagsOutlined,
  InfoCircleOutlined,
  MoreOutlined,
  ArrowLeftOutlined,
  EyeOutlined,
  FormOutlined,
  MailOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthToken, getCurrentUser } from '../utils/functions';
import { DocumentsUrl, DocumentMappingsUrl, BranchesUrl, ServiceTypesUrl } from '../utils/network';
import { DocumentProps, BranchProps, ServiceTypeProps } from '../utils/types';
import { fullname, role, email } from '../utils/data';
import Header from '../components/Header';
import AddDocumentForm from '../components/AddDocumentForm';
import DocumentEditor from '../components/DocumentEditor';
import { BlackButton, WhiteButton, SearchBar, PageLoader, SettingsCard } from '../components';

const { Option } = Select;

interface DocumentsProps {
  hideHeader?: boolean;
}

const Documents: React.FC<DocumentsProps> = ({ hideHeader = false }) => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentProps[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentProps[]>([]);
  const [branches, setBranches] = useState<BranchProps[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DocumentProps | null>(null);
  const [mappingModal, setMappingModal] = useState<{
    visible: boolean;
    document: DocumentProps | null;
  }>({ visible: false, document: null });
  const [viewerModal, setViewerModal] = useState<{
    visible: boolean;
    document: DocumentProps | null;
    blobUrl?: string; // Add blobUrl to state
  }>({ visible: false, document: null });
  const [pdfLoading, setPdfLoading] = useState(false); // Loading state for PDF
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [editingHtmlDocument, setEditingHtmlDocument] = useState<DocumentProps | null>(null);

  // Function to fetch document as blob
  const fetchDocumentBlob = async (url: string, mimeType?: string) => {
    setPdfLoading(true);
    try {
      const headers = getAuthToken() as any;
      const response = await axios.get(url, {
        ...headers,
        responseType: 'blob'
      });

      // Use the response content type or provided mimeType
      const contentType = mimeType || response.headers['content-type'] || 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      const blobUrl = URL.createObjectURL(blob);
      return blobUrl;
    } catch (error) {
      console.error('Error fetching document blob:', error);
      notification.error({
        message: 'Error',
        description: 'Failed to load document for preview',
        title: 'Error'
      });
      return null;
    } finally {
      setPdfLoading(false);
    }
  };

  const handleViewDocument = async (doc: DocumentProps) => {
    if (doc.file_url) {
      // Open modal immediately with loading state
      setViewerModal({ visible: true, document: doc });

      // Determine mime type based on file extension or document type
      let mimeType = 'application/pdf';
      if (doc.file_url.endsWith('.html') || doc.document_type === 'HTML Document') {
        mimeType = 'text/html';
      } else if (doc.file_url.endsWith('.txt')) {
        mimeType = 'text/plain';
      }

      // Fetch blob
      const url = await fetchDocumentBlob(doc.file_url, mimeType);
      if (url) {
        setViewerModal(prev => ({ ...prev, blobUrl: url }));
      }
    } else {
      setViewerModal({ visible: true, document: doc });
    }
  };

  const handleCloseViewer = () => {
    // Revoke blob URL to free memory
    if (viewerModal.blobUrl) {
      URL.revokeObjectURL(viewerModal.blobUrl);
    }
    setViewerModal({ visible: false, document: null, blobUrl: undefined });
  };

  const [mappingForm] = Form.useForm();
  const [mappingLoading, setMappingLoading] = useState(false);

  const currentUser = getCurrentUser();

  useEffect(() => {
    fetchDocuments();
    fetchBranches();
    fetchServiceTypes();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [searchTerm, documents]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const headers = getAuthToken() as any;
      const response = await axios.get(DocumentsUrl, headers);
      setDocuments(response.data);
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'Failed to fetch documents',
        title: 'Error'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const headers = getAuthToken() as any;
      const response = await axios.get(BranchesUrl, headers);
      setBranches(response.data);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchServiceTypes = async () => {
    try {
      const headers = getAuthToken() as any;
      const response = await axios.get(ServiceTypesUrl, headers);
      setServiceTypes(response.data);
    } catch (error) {
      console.error('Error fetching service types:', error);
    }
  };

  const filterDocuments = () => {
    let filtered = [...documents];

    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.document_type && doc.document_type.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.category && doc.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.subject && doc.subject.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredDocuments(filtered);
  };

  const handleDeleteDocument = async (id: number) => {
    Modal.confirm({
      title: 'Delete Document',
      content: 'Are you sure you want to delete this document?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          const headers = getAuthToken() as any;
          await axios.delete(`${DocumentsUrl}/${id}`, headers);
          notification.success({
            message: 'Document Deleted',
            description: 'Document has been deleted successfully',
            title: 'Success'
          });
          fetchDocuments();
        } catch (error) {
          notification.error({
            message: 'Delete Error',
            description: 'Failed to delete document',
            title: 'Error'
          });
        }
      }
    });
  };

  const handleOpenMapping = (document: DocumentProps) => {
    setMappingModal({ visible: true, document });
    mappingForm.resetFields();
  };

  const handleSubmitMapping = async (values: any) => {
    if (!mappingModal.document) return;

    setMappingLoading(true);
    try {
      const headers = getAuthToken() as any;
      await axios.post(DocumentMappingsUrl, {
        document: mappingModal.document.id,
        service_type: values.service_type || null,
        branch: values.branch || null
      }, headers);

      notification.success({
        message: 'Mapping Created',
        description: 'Document mapping has been created successfully',
        title: 'Success'
      });

      setMappingModal({ visible: false, document: null });
      mappingForm.resetFields();
      fetchDocuments();
    } catch (error) {
      notification.error({
        message: 'Mapping Error',
        description: 'Failed to create document mapping',
        title: 'Error'
      });
    } finally {
      setMappingLoading(false);
    }
  };

  return (
    <>
      <div style={{ padding: hideHeader ? '0' : '8px 16px 0 16px' }}>
        {!hideHeader && (
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0, color: '#1a1a2e' }}>Document Library</h1>
                <p style={{ color: '#8e8ea8', margin: '1px 0 0 0', fontSize: '12px' }}>
                  Manage documents and their mappings ({filteredDocuments.length} of {documents.length})
                </p>
              </div>
              <WhiteButton
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/settings')}
                size="small"
              >
                Back
              </WhiteButton>
            </div>
          </div>
        )}

        <div style={{ marginBottom: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <SearchBar
            placeholder="Search by title, type, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, minWidth: '250px' }}
            allowClear
          />
          <BlackButton
            icon={<FormOutlined />}
            onClick={() => setIsEditorVisible(true)}
          >
            Create Document
          </BlackButton>
          <BlackButton
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingDocument(null);
              setIsAddFormVisible(true);
            }}
          >
            Upload Document
          </BlackButton>
        </div>

        {loading ? (
          <PageLoader text="Loading documents..." />
        ) : filteredDocuments.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <h3 style={{ marginBottom: '16px' }}>No documents found</h3>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                {searchTerm ? 'No documents match your current filters.' : 'Get started by adding your first document.'}
              </p>
              <BlackButton
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingDocument(null);
                  setIsAddFormVisible(true);
                }}
              >
                New Document
              </BlackButton>
            </div>
          </Card>
        ) : (
          <div style={{
            flex: 1,
            overflow: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '12px',
            alignContent: 'flex-start'
          }}>
            {filteredDocuments.map((doc) => {
              const fields = [
                ...(doc.category === 'Email' && doc.subject ? [{
                  label: 'Subject',
                  value: doc.subject,
                  icon: <InfoCircleOutlined />
                }] : []),
                ...(doc.service_types && doc.service_types.length > 0 ? [{
                  label: 'Service Types',
                  value: doc.service_types.join(', '),
                  icon: <TagsOutlined />
                }] : []),
                ...(doc.branches && doc.branches.length > 0 ? [{
                  label: 'Branches',
                  value: doc.branches.join(', '),
                  icon: <BranchesOutlined />
                }] : [])
              ];

              return (
                <SettingsCard
                  key={doc.id}
                  title={doc.title}
                  statusTag={{ label: doc.is_active ? 'ACTIVE' : 'INACTIVE', color: doc.is_active ? 'green' : 'red' }}
                  tags={[
                    ...(doc.category ? [{ label: doc.category.toUpperCase(), color: 'blue' }] : []),
                    ...(doc.document_type ? [{ label: doc.document_type, color: 'blue' }] : []),
                    ...(doc.document_purpose && doc.document_purpose !== 'none' ? [{ label: `MAP: ${doc.document_purpose.replace(/_/g, ' ').toUpperCase()}`, color: 'purple' }] : [])
                  ]}
                  description={doc.description ? (doc.description.length > 100 ? `${doc.description.substring(0, 100)}...` : doc.description) : undefined}
                  fields={fields}
                  fieldColumns={1}
                  footerLeft={doc.created_by_name || 'System'}
                  footerRight={new Date(doc.created_at!).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                  footerActions={(
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Button type="dashed" size="small" icon={<EyeOutlined />} onClick={() => handleViewDocument(doc)}>
                        View
                      </Button>
                      {doc.document_type === 'HTML Document' && (
                        <Button
                          type="dashed"
                          size="small"
                          icon={<FormOutlined />}
                          onClick={() => {
                            setEditingHtmlDocument(doc);
                            setIsEditorVisible(true);
                          }}
                          style={{ color: '#5b6cf9', borderColor: '#a5affd' }}
                        >
                          Edit
                        </Button>
                      )}
                      <Button type="dashed" size="small" icon={<LinkOutlined />} onClick={() => handleOpenMapping(doc)}>
                        Map
                      </Button>
                    </div>
                  )}
                  actions={[
                    {
                      icon: <EditOutlined />,
                      tooltip: 'Edit',
                      onClick: () => {
                        setEditingDocument(doc);
                        setIsAddFormVisible(true);
                      }
                    },
                    {
                      icon: <DeleteOutlined />,
                      tooltip: 'Delete',
                      danger: true,
                      onClick: () => doc.id && handleDeleteDocument(doc.id)
                    }
                  ]}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Document Mapping Modal */}
      <Modal
        title={`Map Document: ${mappingModal.document?.title}`}
        open={mappingModal.visible}
        onCancel={() => {
          setMappingModal({ visible: false, document: null });
          mappingForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={mappingForm}
          layout="vertical"
          onFinish={handleSubmitMapping}
        >
          <Form.Item
            label="Service Type"
            name="service_type"
            rules={[{ required: true, message: 'Please select a service type!' }]}
          >
            <Select placeholder="Select Service Type" allowClear>
              {serviceTypes.filter(st => st.enabled).map(st => (
                <Option key={st.id} value={st.id}>
                  {st.service_type}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Branch"
            name="branch"
            rules={[{ required: true, message: 'Please select a branch!' }]}
          >
            <Select placeholder="Select Branch" allowClear>
              {branches.filter(b => b.is_active).map(b => (
                <Option key={b.id} value={b.id}>
                  {b.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <BlackButton
              htmlType="submit"
              block
              loading={mappingLoading}
            >
              Create Mapping
            </BlackButton>
          </Form.Item>
        </Form>
      </Modal>

      {/* Add/Edit Document Form */}
      <AddDocumentForm
        isVisible={isAddFormVisible}
        onClose={() => {
          setIsAddFormVisible(false);
          setEditingDocument(null);
        }}
        onSuccessCallBack={() => {
          setIsAddFormVisible(false);
          setEditingDocument(null);
          fetchDocuments();
        }}
        editingDocument={editingDocument}
      />

      {/* Document Viewer Modal */}
      <Modal
        title={viewerModal.document?.title || 'Document Viewer'}
        open={viewerModal.visible}
        onCancel={handleCloseViewer}
        width={800}
        style={{ top: 20 }}
        footer={[
          <WhiteButton key="close" onClick={handleCloseViewer}>
            Close
          </WhiteButton>
        ]}
      >
        {viewerModal.document && (
          <div>
            {/* Document Details */}
            <Card size="small" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {viewerModal.document.document_type && (
                  <div>
                    <span style={{ fontWeight: 600, color: '#666' }}>Type: </span>
                    <Tag color="blue">{viewerModal.document.document_type}</Tag>
                  </div>
                )}
                {viewerModal.document.description && (
                  <div>
                    <span style={{ fontWeight: 600, color: '#666' }}>Description: </span>
                    <span>{viewerModal.document.description}</span>
                  </div>
                )}
                {viewerModal.document.service_types && viewerModal.document.service_types.length > 0 && (
                  <div>
                    <span style={{ fontWeight: 600, color: '#666' }}>Service Types: </span>
                    {viewerModal.document.service_types.map(st => (
                      <Tag key={st} color="orange">{st}</Tag>
                    ))}
                  </div>
                )}
                {viewerModal.document.branches && viewerModal.document.branches.length > 0 && (
                  <div>
                    <span style={{ fontWeight: 600, color: '#666' }}>Branches: </span>
                    {viewerModal.document.branches.map(b => (
                      <Tag key={b} color="green">{b}</Tag>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Document Content */}
            {viewerModal.document.file_url ? (
              <div style={{ marginTop: '16px' }}>
                {pdfLoading ? (
                  <div style={{ padding: '48px', textAlign: 'center' }}>Loading document preview...</div>
                ) : (
                  <>
                    <div style={{
                      border: '1px solid #f0f0f0',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: '#fafafa'
                    }}>
                      {viewerModal.blobUrl ? (
                        <iframe
                          src={viewerModal.blobUrl}
                          style={{
                            width: '100%',
                            height: '400px',
                            border: 'none'
                          }}
                          title="Document Viewer"
                        />
                      ) : (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
                          Preview loading failed or not available.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div style={{
                border: '1px solid #f0f0f0',
                borderRadius: '8px',
                padding: '48px',
                textAlign: 'center',
                color: '#999',
                marginTop: '16px'
              }}>
                <FileTextOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                <p>No file available for this document</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Document Editor */}
      <DocumentEditor
        isVisible={isEditorVisible}
        editingDocument={editingHtmlDocument}
        onClose={() => {
          setIsEditorVisible(false);
          setEditingHtmlDocument(null);
        }}
        onSuccessCallBack={() => {
          setIsEditorVisible(false);
          setEditingHtmlDocument(null);
          fetchDocuments();
        }}
      />
    </>
  );
};

export default Documents;
