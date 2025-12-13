import React, { FC, useEffect, useState } from "react";
import { Modal, notification, Button, List, Checkbox, Tag, Space } from "antd";
import { 
  FileTextOutlined,
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined
} from "@ant-design/icons";
import { AuthTokenType, EstimateDocumentProps, DocumentProps } from "../utils/types";
import { getAuthToken, getDocuments } from "../utils/functions";
import axios from "axios";
import { EstimateDocumentsUrl, DocumentsUrl } from "../utils/network";

interface AttachDocumentsFormProps {
  isVisible: boolean;
  onSuccessCallBack: () => void;
  onClose: () => void;
  estimateId: number | null;
  serviceTypeId: number | null;
  attachedDocuments: EstimateDocumentProps[];
}

const AttachDocumentsForm: FC<AttachDocumentsFormProps> = ({
  isVisible = false,
  onSuccessCallBack,
  onClose,
  estimateId,
  serviceTypeId,
  attachedDocuments
}) => {
  const [loading, setLoading] = useState(false);
  const [availableDocuments, setAvailableDocuments] = useState<DocumentProps[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [viewingDoc, setViewingDoc] = useState<EstimateDocumentProps | null>(null);
  const [viewingBlobUrl, setViewingBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible && serviceTypeId) {
      fetchDocuments();
    }
  }, [isVisible, serviceTypeId]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const headers = getAuthToken() as AuthTokenType;
      // Get documents mapped to this service type
      const response = await axios.get(`${DocumentsUrl}?service_type=${serviceTypeId}`, headers);
      setAvailableDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAttachDocument = async (documentId: number) => {
    if (!estimateId) return;
    
    try {
      const headers = getAuthToken() as AuthTokenType;
      await axios.post(EstimateDocumentsUrl, {
        estimate: estimateId,
        document: documentId,
        requires_signature: true
      }, headers);
      
      notification.success({
        message: "Document Attached",
        description: "Document has been attached to the estimate.",
        title: "Success"
      });
      
      onSuccessCallBack?.();
    } catch (error: any) {
      notification.error({
        message: "Attach Error",
        description: error.response?.data?.error || "Failed to attach document.",
        title: "Error"
      });
    }
  };

  const handleDetachDocument = async (estimateDocId: number) => {
    try {
      const headers = getAuthToken() as AuthTokenType;
      await axios.delete(`${EstimateDocumentsUrl}/${estimateDocId}`, headers);
      
      notification.success({
        message: "Document Removed",
        description: "Document has been removed from the estimate.",
        title: "Success"
      });
      
      onSuccessCallBack?.();
    } catch (error: any) {
      notification.error({
        message: "Remove Error",
        description: error.response?.data?.error || "Failed to remove document.",
        title: "Error"
      });
    }
  };

  const isDocumentAttached = (docId: number) => {
    return attachedDocuments.some(ad => ad.document === docId);
  };

  const getAttachedDocId = (docId: number) => {
    return attachedDocuments.find(ad => ad.document === docId)?.id;
  };

  const handleViewDocument = (doc: EstimateDocumentProps) => {
    if (!doc.processed_content) {
      notification.warning({
        message: 'View Not Available',
        description: 'Document preview is not available.',
        title: 'Warning'
      });
      return;
    }

    // Create HTML blob for viewing
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${doc.document_title}</title>
    <style>
        body { 
          font-family: Arial, sans-serif; 
          max-width: 850px; 
          margin: 40px auto; 
          padding: 20px; 
          line-height: 1.6;
          background: #fff;
        }
        h1, h2, h3, h4, h5, h6 { color: #333; margin: 20px 0 10px 0; }
        table { border-collapse: collapse; width: 100%; margin: 15px 0; }
        td, th { border: 1px solid #000; padding: 8px; text-align: left; }
        th { background-color: #f4f4f4; font-weight: bold; }
        p { margin: 10px 0; }
    </style>
</head>
<body>
    ${doc.processed_content}
</body>
</html>
    `;
    
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    setViewingBlobUrl(blobUrl);
    setViewingDoc(doc);
  };

  const handleCloseViewer = () => {
    if (viewingBlobUrl) {
      URL.revokeObjectURL(viewingBlobUrl);
    }
    setViewingBlobUrl(null);
    setViewingDoc(null);
  };

  return (
    <>
    <Modal
      title="Manage Estimate Documents"
      open={isVisible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>
      ]}
      width={600}
    >
      <div style={{ marginBottom: '16px' }}>
        <p style={{ color: '#666', fontSize: '13px' }}>
          Select documents from your library to attach to this estimate. Customers will be able to view and sign these documents.
        </p>
      </div>

      {/* Attached Documents */}
      {attachedDocuments.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
            Attached Documents ({attachedDocuments.length})
          </h4>
          <List
            size="small"
            dataSource={attachedDocuments}
            renderItem={(doc) => (
              <List.Item
                actions={[
                  <Tag key="signed" color={doc.customer_signed ? 'green' : 'orange'}>
                    {doc.customer_signed ? 'Signed' : 'Awaiting Signature'}
                  </Tag>,
                  doc.customer_signed && (
                    <Button 
                      key="view"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => handleViewDocument(doc)}
                    >
                      View
                    </Button>
                  ),
                  <Button 
                    key="remove"
                    size="small" 
                    danger 
                    icon={<DeleteOutlined />}
                    onClick={() => doc.id && handleDetachDocument(doc.id)}
                  >
                    Remove
                  </Button>
                ]}
                style={{
                  backgroundColor: '#f0f9ff',
                  padding: '12px',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  border: '1px solid #bae6fd'
                }}
              >
                <List.Item.Meta
                  avatar={<FileTextOutlined style={{ fontSize: '20px', color: '#1890ff' }} />}
                  title={doc.document_title}
                  description={
                    <span style={{ fontSize: '12px' }}>
                      {doc.customer_signed_at && `Signed on ${new Date(doc.customer_signed_at).toLocaleString()}`}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      )}

      {/* Available Documents */}
      <div>
        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
          Available Documents ({availableDocuments.length})
        </h4>
        {availableDocuments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#999' }}>
            No documents available for this service type
          </div>
        ) : (
          <List
            size="small"
            loading={loading}
            dataSource={availableDocuments}
            renderItem={(doc) => {
              const attached = isDocumentAttached(doc.id!);
              return (
                <List.Item
                  actions={[
                    attached ? (
                      <Tag key="attached" color="green">Attached</Tag>
                    ) : (
                      <Button 
                        key="attach"
                        size="small" 
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => handleAttachDocument(doc.id!)}
                      >
                        Attach
                      </Button>
                    )
                  ]}
                  style={{
                    padding: '8px',
                    marginBottom: '4px'
                  }}
                >
                  <List.Item.Meta
                    avatar={<FileTextOutlined style={{ fontSize: '16px', color: '#666' }} />}
                    title={doc.title}
                    description={
                      <span style={{ fontSize: '11px' }}>
                        {doc.document_type && <Tag style={{ fontSize: '10px' }}>{doc.document_type}</Tag>}
                      </span>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </div>
    </Modal>

    {/* Document Viewer Modal */}
    <Modal
      title={`View: ${viewingDoc?.document_title || 'Document'}`}
      open={viewingDoc !== null}
      onCancel={handleCloseViewer}
      width={900}
      footer={[
        <Button key="close" onClick={handleCloseViewer}>
          Close
        </Button>
      ]}
      style={{ top: 20 }}
    >
      {viewingBlobUrl && (
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
              height: '600px',
              border: 'none'
            }}
            title="Document Viewer"
          />
        </div>
      )}
    </Modal>
  </>
  );
};

export default AttachDocumentsForm;
