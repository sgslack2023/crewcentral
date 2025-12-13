import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, notification, Modal, Result, Progress } from 'antd';
import { 
  FileTextOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  EditOutlined
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { EstimateDocumentsUrl, EstimatesUrl } from '../utils/network';
import { EstimateDocumentProps, EstimateProps } from '../utils/types';
import SignaturePad from '../components/SignaturePad';

const PublicDocumentSigning: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [estimate, setEstimate] = useState<EstimateProps | null>(null);
  const [documents, setDocuments] = useState<EstimateDocumentProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingDocId, setSigningDocId] = useState<number | null>(null);
  const [viewingDocUrl, setViewingDocUrl] = useState<string | null>(null);
  const [viewingBlobUrl, setViewingBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetchEstimate();
      fetchDocuments();
    }
  }, [token]);

  const fetchEstimate = async () => {
    try {
      const response = await axios.get(`${EstimatesUrl}/public_view?token=${token}`);
      setEstimate(response.data);
    } catch (error: any) {
      console.error('Error fetching estimate:', error);
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${EstimateDocumentsUrl}/by_token?token=${token}`);
      setDocuments(response.data);
      setError(null);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load documents');
      notification.error({
        message: 'Error',
        description: error.response?.data?.error || 'Failed to load documents',
        title: 'Error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSignature = async (signature: string) => {
    if (!signingDocId) return;
    
    try {
      await axios.post(`${EstimateDocumentsUrl}/${signingDocId}/sign_document`, {
        signature,
        token
      });
      
      notification.success({
        message: 'Document Signed',
        description: 'Your signature has been saved successfully.',
        title: 'Success'
      });
      
      setSigningDocId(null);
      fetchDocuments(); // Refresh to show updated status
    } catch (error: any) {
      notification.error({
        message: 'Signature Error',
        description: error.response?.data?.error || 'Failed to save signature',
        title: 'Error'
      });
    }
  };

  const fetchPdfBlob = async (url: string) => {
    setPdfLoading(true);
    try {
      const response = await axios.get(url, { 
        responseType: 'blob' 
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      return blobUrl;
    } catch (error) {
      console.error('Error fetching PDF blob:', error);
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

  const handleViewDocument = async (docUrl: string) => {
    setViewingDocUrl(docUrl);
    
    // Fetch blob
    const blobUrl = await fetchPdfBlob(docUrl);
    if (blobUrl) {
      setViewingBlobUrl(blobUrl);
    }
  };

  const handleCloseViewer = () => {
    // Revoke blob URL to free memory
    if (viewingBlobUrl) {
      URL.revokeObjectURL(viewingBlobUrl);
    }
    setViewingDocUrl(null);
    setViewingBlobUrl(null);
  };

  if (loading && documents.length === 0) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <FileTextOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
        <div>Loading documents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '60px' }}>
        <Result
          status="error"
          title="Unable to Load Documents"
          subTitle={error}
        />
      </div>
    );
  }

  const signedCount = documents.filter(d => d.customer_signed).length;
  const totalCount = documents.length;
  const allSigned = signedCount === totalCount && totalCount > 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '24px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
          borderRadius: '12px',
          padding: '32px',
          marginBottom: '24px',
          color: '#fff'
        }}>
          <div style={{ textAlign: 'center' }}>
            <FileTextOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#fff', marginBottom: '8px' }}>
              Document Signature Request
            </h1>
            <p style={{ fontSize: '16px', opacity: 0.9, margin: 0 }}>
              {estimate?.customer_name} - Estimate #{estimate?.id}
            </p>
            <div style={{ marginTop: '16px' }}>
              <Progress 
                percent={totalCount > 0 ? Math.round((signedCount / totalCount) * 100) : 0}
                status={allSigned ? 'success' : 'active'}
                strokeColor="#fff"
                trailColor="rgba(255,255,255,0.3)"
              />
              <div style={{ marginTop: '8px', fontSize: '14px' }}>
                {signedCount} of {totalCount} documents signed
              </div>
            </div>
          </div>
        </div>

        {/* Documents List */}
        {allSigned ? (
          <Result
            status="success"
            title="All Documents Signed!"
            subTitle="Thank you for signing all the required documents. We will contact you shortly to proceed."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {documents.map((doc) => (
              <Card 
                key={doc.id}
                style={{ 
                  borderRadius: '12px',
                  border: doc.customer_signed ? '2px solid #52c41a' : '1px solid #d9d9d9'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <FileTextOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                          {doc.document_title}
                        </h3>
                        {doc.document_type && (
                          <Tag style={{ marginTop: '4px', fontSize: '11px' }}>{doc.document_type}</Tag>
                        )}
                      </div>
                    </div>
                    
                    {doc.customer_signed && (
                      <div style={{ 
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: '#f6ffed',
                        borderRadius: '6px',
                        border: '1px solid #b7eb8f'
                      }}>
                        <div style={{ fontSize: '12px', color: '#52c41a', fontWeight: 600 }}>
                          ✓ Signed on {new Date(doc.customer_signed_at!).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Button
                      icon={<EyeOutlined />}
                      onClick={() => doc.document_url && handleViewDocument(doc.document_url)}
                    >
                      View
                    </Button>
                    {!doc.customer_signed && (
                      <Button
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={() => setSigningDocId(doc.id!)}
                      >
                        Sign
                      </Button>
                    )}
                    {doc.customer_signed && (
                      <Tag icon={<CheckCircleOutlined />} color="success">
                        Signed
                      </Tag>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Document Viewer Modal */}
        <Modal
          title="View Document"
          open={viewingDocUrl !== null}
          onCancel={handleCloseViewer}
          width={800}
          footer={[
            <Button key="close" onClick={handleCloseViewer}>
              Close
            </Button>
          ]}
          style={{ top: 20 }}
        >
          {pdfLoading ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>Loading document preview...</div>
          ) : (
            <>
              {viewingBlobUrl ? (
                <div style={{ 
                  border: '1px solid #f0f0f0', 
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#fafafa'
                }}>
                  <iframe
                    src={viewingBlobUrl}
                    style={{
                      width: '100%',
                      height: '500px',
                      border: 'none'
                    }}
                    title="Document Viewer"
                  />
                </div>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
                  Preview loading failed or not available.
                </div>
              )}
            </>
          )}
        </Modal>

        {/* Signature Modal */}
        <Modal
          title="Sign Document"
          open={signingDocId !== null}
          onCancel={() => setSigningDocId(null)}
          footer={null}
          width={600}
        >
          {signingDocId && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                  {documents.find(d => d.id === signingDocId)?.document_title}
                </h4>
                <p style={{ fontSize: '13px', color: '#666' }}>
                  Please sign below to acknowledge that you have reviewed and agree to this document.
                </p>
              </div>
              
              <SignaturePad
                onSave={handleSaveSignature}
                onCancel={() => setSigningDocId(null)}
                width={500}
                height={200}
              />
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default PublicDocumentSigning;
