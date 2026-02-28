import React, { FC, useEffect, useState } from "react";
import { Modal, notification, Button, List, Checkbox, Tag, Space } from "antd";
import {
  FileTextOutlined,
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined
} from "@ant-design/icons";
import { AuthTokenType, EstimateDocumentProps, DocumentProps } from "../utils/types";
import { WhiteButton, BlackButton } from "../components";
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
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileTextOutlined style={{ color: '#5b6cf9' }} />
            <span>Manage Estimate Documents</span>
          </div>
        }
        open={isVisible}
        onCancel={onClose}
        footer={[
          <WhiteButton key="close" onClick={onClose}>
            Close
          </WhiteButton>
        ]}
        width={600}
        className="premium-modal"
      >
        <div style={{ marginBottom: '20px', backgroundColor: '#f9f9f9', padding: '12px', borderRadius: '8px', border: '1px dashed #d9d9d9' }}>
          <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>
            Select documents from your library to attach to this estimate. Customers will be able to view and electronically sign these documents via their public link.
          </p>
        </div>

        {/* Attached Documents */}
        {attachedDocuments.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 700,
              marginBottom: '12px',
              color: '#5b6cf9',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Attached Documents ({attachedDocuments.length})
            </div>
            <List
              size="small"
              dataSource={attachedDocuments}
              renderItem={(doc) => (
                <List.Item
                  actions={[
                    <Tag key="signed" color={doc.customer_signed ? 'green' : 'orange'} style={{ borderRadius: '4px' }}>
                      {doc.customer_signed ? 'SIGNED' : 'AWAITING SIGNATURE'}
                    </Tag>,
                    doc.customer_signed && (
                      <Button
                        key="view"
                        size="small"
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewDocument(doc)}
                      >
                        View
                      </Button>
                    ),
                    <Button
                      key="remove"
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => doc.id && handleDetachDocument(doc.id)}
                    >
                      Remove
                    </Button>
                  ]}
                  style={{
                    backgroundColor: doc.customer_signed ? '#f6ffed' : '#ffffff',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    border: '1px solid',
                    borderColor: doc.customer_signed ? '#b7eb8f' : '#f0f0f0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <div style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: doc.customer_signed ? '#f6ffed' : '#f0f0f0',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <FileTextOutlined style={{ fontSize: '16px', color: doc.customer_signed ? '#52c41a' : '#8c8c8c' }} />
                      </div>
                    }
                    title={<span style={{ fontWeight: 500 }}>{doc.document_title}</span>}
                    description={
                      doc.customer_signed_at ? (
                        <span style={{ fontSize: '11px', color: '#52c41a' }}>
                          Signed {new Date(doc.customer_signed_at).toLocaleDateString()}
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#ff4d4f' }}>Signature Required</span>
                      )
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        )}

        {/* Available Documents */}
        <div>
          <div style={{
            fontSize: '12px',
            fontWeight: 700,
            marginBottom: '12px',
            color: '#595959',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Available Library Documents ({availableDocuments.length})
          </div>

          {availableDocuments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#fafafa', borderRadius: '8px', color: '#999' }}>
              No documents found for this service type.
            </div>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
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
                          <Tag key="attached" color="blue" style={{ borderRadius: '12px' }}>ATTACHED</Tag>
                        ) : (
                          <BlackButton
                            key="attach"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => handleAttachDocument(doc.id!)}
                            style={{ height: '28px', fontSize: '12px' }}
                          >
                            Attach
                          </BlackButton>
                        )
                      ]}
                      style={{
                        padding: '10px 12px',
                        marginBottom: '8px',
                        backgroundColor: '#ffffff',
                        borderRadius: '8px',
                        border: '1px solid #f0f0f0',
                        transition: 'all 0.2s',
                      }}
                      className="document-list-item"
                    >
                      <List.Item.Meta
                        avatar={
                          <div style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: '#f0f2ff',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <FileTextOutlined style={{ fontSize: '16px', color: '#5b6cf9' }} />
                          </div>
                        }
                        title={<span style={{ fontWeight: 500, fontSize: '13px' }}>{doc.title}</span>}
                        description={
                          <span style={{ fontSize: '11px', color: '#8c8c8c' }}>
                            {doc.document_type || 'General Document'}
                          </span>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Document Viewer Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <EyeOutlined />
            <span>{viewingDoc?.document_title || 'Document Viewer'}</span>
          </div>
        }
        open={viewingDoc !== null}
        onCancel={handleCloseViewer}
        width={900}
        footer={[
          <WhiteButton key="close" onClick={handleCloseViewer}>
            Close
          </WhiteButton>
        ]}
        style={{ top: 20 }}
      >
        {viewingBlobUrl && (
          <div style={{
            border: '1px solid #f0f0f0',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#fafafa',
            height: '70vh'
          }}>
            <iframe
              src={viewingBlobUrl}
              style={{
                width: '100%',
                height: '100%',
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
