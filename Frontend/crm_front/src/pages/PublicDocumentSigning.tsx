import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, notification, Modal, Result, Progress, Input } from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  EditOutlined
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { EstimateDocumentsUrl, EstimatesUrl } from '../utils/network';
import { PageLoader } from '../components';
import { EstimateDocumentProps, EstimateProps } from '../utils/types';
import SignaturePad from '../components/SignaturePad';

const PublicDocumentSigning: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [estimate, setEstimate] = useState<EstimateProps | null>(null);
  const [documents, setDocuments] = useState<EstimateDocumentProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingDocId, setSigningDocId] = useState<number | null>(null);
  const [signatureIndex, setSignatureIndex] = useState<number>(0);
  const [fillingTextboxDocId, setFillingTextboxDocId] = useState<number | null>(null);
  const [textboxIndex, setTextboxIndex] = useState<number>(0);
  const [textboxValue, setTextboxValue] = useState<string>('');
  const [viewingDocUrl, setViewingDocUrl] = useState<string | null>(null);
  const [viewingBlobUrl, setViewingBlobUrl] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<EstimateDocumentProps | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (token) {
      fetchEstimate();
      fetchDocuments();
    }
  }, [token]);

  // Allow clicking signature boxes and text boxes inside the HTML preview iframe (blob document)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event?.data?.type === 'SIGNATURE_CLICK' && typeof event.data.docId === 'number' && typeof event.data.signatureIndex === 'number') {
        setSigningDocId(event.data.docId);
        setSignatureIndex(event.data.signatureIndex);
      }
      if (event?.data?.type === 'TEXTBOX_CLICK' && typeof event.data.docId === 'number' && typeof event.data.textboxIndex === 'number') {
        setFillingTextboxDocId(event.data.docId);
        setTextboxIndex(event.data.textboxIndex);
        setTextboxValue('');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


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

  const handleSaveTextbox = async () => {
    if (!fillingTextboxDocId) return;

    const wasViewingDoc = viewingDoc?.id === fillingTextboxDocId;

    try {
      await axios.post(`${EstimateDocumentsUrl}/${fillingTextboxDocId}/fill_textbox`, {
        text: textboxValue,
        textbox_index: textboxIndex,
        token
      });

      notification.success({
        message: 'Text Saved',
        description: 'Your text has been saved.',
        duration: 2,
        title: 'Success'
      });

      setFillingTextboxDocId(null);
      setTextboxValue('');

      // Refresh documents to get updated text data
      const response = await axios.get(`${EstimateDocumentsUrl}/by_token?token=${token}`);
      const updatedDocs = response.data;
      setDocuments(updatedDocs);

      // If we were viewing this document, update the view in place without closing
      if (wasViewingDoc) {
        const updatedDoc = updatedDocs.find((d: EstimateDocumentProps) => d.id === fillingTextboxDocId);
        if (updatedDoc && updatedDoc.processed_content) {
          // Update the blob URL in place
          if (viewingBlobUrl) {
            URL.revokeObjectURL(viewingBlobUrl);
          }

          const fullHtml = generateDocumentHtml(updatedDoc);

          const blob = new Blob([fullHtml], { type: 'text/html' });
          const newBlobUrl = URL.createObjectURL(blob);
          setViewingBlobUrl(newBlobUrl);
          setViewingDoc(updatedDoc);
        }
      }
    } catch (error: any) {
      notification.error({
        message: 'Text Save Error',
        description: error.response?.data?.error || 'Failed to save text',
        title: 'Error'
      });
    }
  };

  const handleSaveSignature = async (signature: string) => {
    if (!signingDocId) return;

    const wasViewingDoc = viewingDoc?.id === signingDocId;

    try {
      await axios.post(`${EstimateDocumentsUrl}/${signingDocId}/sign_document`, {
        signature,
        signature_index: signatureIndex,
        token
      });

      notification.success({
        message: 'Signature Saved',
        description: 'Your signature has been saved. Continue signing remaining fields.',
        duration: 2,
        title: 'Success'
      });

      setSigningDocId(null);

      // Refresh documents to get updated signature data
      const response = await axios.get(`${EstimateDocumentsUrl}/by_token?token=${token}`);
      const updatedDocs = response.data;
      setDocuments(updatedDocs);

      // If we were viewing this document, update the view in place without closing
      if (wasViewingDoc) {
        const updatedDoc = updatedDocs.find((d: EstimateDocumentProps) => d.id === signingDocId);
        if (updatedDoc && updatedDoc.processed_content) {
          // Update the blob URL in place
          if (viewingBlobUrl) {
            URL.revokeObjectURL(viewingBlobUrl);
          }

          const fullHtml = generateDocumentHtml(updatedDoc);

          const blob = new Blob([fullHtml], { type: 'text/html' });
          const newBlobUrl = URL.createObjectURL(blob);
          setViewingBlobUrl(newBlobUrl);
          setViewingDoc(updatedDoc);
        }
      }
    } catch (error: any) {
      notification.error({
        message: 'Signature Error',
        description: error.response?.data?.error || 'Failed to save signature',
        title: 'Error'
      });
    }
  };

  const generateDocumentHtml = (doc: EstimateDocumentProps) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Document Preview</title>
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
        .signature-box-container { cursor: pointer !important; }
        .signature-box-container:hover { opacity: 0.9; transform: scale(1.01); transition: all 0.2s; }
        .signature-box-container * { pointer-events: none; }
        .textbox-container { cursor: pointer !important; }
        .textbox-container:hover { opacity: 0.9; transform: scale(1.01); transition: all 0.2s; }
        .textbox-container * { pointer-events: none; }
    </style>
    <script>
      (function() {
        function setupClickHandlers() {
          try {
            // Setup signature boxes
            var sigBoxes = document.querySelectorAll('.signature-box-container');
            for (var i = 0; i < sigBoxes.length; i++) {
              var box = sigBoxes[i];
              if (box.__signatureBound) continue;
              box.__signatureBound = true;
              
              var signatureIndex = box.getAttribute('data-signature-index');
              if (!signatureIndex) continue;
              
              (function(currentBox, currentIndex) {
                currentBox.addEventListener('click', function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  var docId = ${doc.id};
                  if (docId !== null) {
                    window.parent.postMessage({ 
                      type: 'SIGNATURE_CLICK', 
                      docId: docId, 
                      signatureIndex: parseInt(currentIndex) 
                    }, '*');
                  }
                }, true);
                currentBox.style.cursor = 'pointer';
              })(box, signatureIndex);
            }
            
            // Setup text boxes
            var textBoxes = document.querySelectorAll('.textbox-container');
            for (var j = 0; j < textBoxes.length; j++) {
              var textBox = textBoxes[j];
              if (textBox.__textboxBound) continue;
              textBox.__textboxBound = true;
              
              var textboxIndex = textBox.getAttribute('data-textbox-index');
              if (!textboxIndex) continue;
              
              (function(currentBox, currentIndex) {
                currentBox.addEventListener('click', function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  var docId = ${doc.id};
                  if (docId !== null) {
                    window.parent.postMessage({ 
                      type: 'TEXTBOX_CLICK', 
                      docId: docId, 
                      textboxIndex: parseInt(currentIndex) 
                    }, '*');
                  }
                }, true);
                currentBox.style.cursor = 'pointer';
              })(textBox, textboxIndex);
            }
          } catch (err) {
            // ignore
          }
        }
        window.addEventListener('load', setupClickHandlers);
        setTimeout(setupClickHandlers, 50);
        setTimeout(setupClickHandlers, 250);
        setTimeout(setupClickHandlers, 800);
      })();
    </script>
</head>
<body>
    ${doc.processed_content}
</body>
</html>
    `;
  };

  const handleSubmitDocument = async (docId: number) => {
    setSubmitting(true);
    try {
      await axios.post(`${EstimateDocumentsUrl}/${docId}/submit_document`, {
        token
      });

      notification.success({
        message: 'Document Submitted',
        description: 'All signatures completed and document submitted successfully!',
        title: 'Success'
      });

      fetchDocuments(); // Refresh to show updated status
    } catch (error: any) {
      notification.error({
        message: 'Submit Error',
        description: error.response?.data?.error || 'Failed to submit document',
        title: 'Error'
      });
    } finally {
      setSubmitting(false);
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

  const handleViewDocument = async (docUrl: string, processedContent?: string, docId?: number, doc?: EstimateDocumentProps) => {
    setViewingDocUrl(docUrl);
    setViewingDoc(doc || null);

    // If we have processed content (HTML with tags replaced), use it
    if (processedContent && doc) {
      // Wrap processed content in complete HTML document with click handler script
      const fullHtml = generateDocumentHtml(doc);
      const blob = new Blob([fullHtml], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      setViewingBlobUrl(blobUrl);
    } else {
      // Otherwise fetch the original file
      const blobUrl = await fetchPdfBlob(docUrl);
      if (blobUrl) {
        setViewingBlobUrl(blobUrl);
      }
    }
  };

  const handleCloseViewer = () => {
    // Revoke blob URL to free memory
    if (viewingBlobUrl) {
      URL.revokeObjectURL(viewingBlobUrl);
    }
    setViewingDocUrl(null);
    setViewingBlobUrl(null);
    setViewingDoc(null);
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

                    {!doc.customer_signed && doc.signatures_required && doc.signatures_required > 0 && (
                      <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: '#e6f7ff',
                        borderRadius: '6px',
                        border: '1px solid #91d5ff'
                      }}>
                        <div style={{ fontSize: '13px', color: '#1890ff', fontWeight: 600 }}>
                          ✍️ Signatures: {doc.signature_count || 0} of {doc.signatures_required} completed
                        </div>
                        {doc.signature_count === doc.signatures_required && (
                          <div style={{ marginTop: '8px' }}>
                            <Button
                              type="primary"
                              size="small"
                              loading={submitting}
                              onClick={() => handleSubmitDocument(doc.id!)}
                              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                            >
                              ✓ Submit Document
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

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
                      onClick={() => doc.document_url && handleViewDocument(doc.document_url, doc.processed_content, doc.id, doc)}
                    >
                      View
                    </Button>
                    {doc.customer_signed && (
                      <Tag icon={<CheckCircleOutlined />} color="success">
                        Submitted
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
            <PageLoader text="Loading document preview..." />
          ) : (
            <>
              {viewingBlobUrl ? (
                <div>
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

                  {/* Sign Button - Appears if document has signature field and not yet signed */}
                  {/* Removed bottom sign button (signing is done by clicking the in-document signature field). */}
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
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <EditOutlined />
              Sign Document
            </div>
          }
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
                key={`signature-${signingDocId}-${signatureIndex}`}
                onSave={handleSaveSignature}
                onCancel={() => setSigningDocId(null)}
                width={500}
                height={200}
              />
            </div>
          )}
        </Modal>

        {/* Text Box Modal */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <EditOutlined />
              Fill Text Box
            </div>
          }
          open={fillingTextboxDocId !== null}
          onCancel={() => {
            setFillingTextboxDocId(null);
            setTextboxValue('');
          }}
          footer={[
            <Button
              key="cancel"
              onClick={() => {
                setFillingTextboxDocId(null);
                setTextboxValue('');
              }}
            >
              Cancel
            </Button>,
            <Button
              key="save"
              type="primary"
              onClick={handleSaveTextbox}
            >
              Save
            </Button>
          ]}
          width={500}
        >
          {fillingTextboxDocId && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                  {documents.find(d => d.id === fillingTextboxDocId)?.document_title}
                </h4>
                <p style={{ fontSize: '13px', color: '#666' }}>
                  Please enter your text below.
                </p>
              </div>

              <Input.TextArea
                value={textboxValue}
                onChange={(e) => setTextboxValue(e.target.value)}
                placeholder="Type your text here..."
                rows={4}
                style={{ width: '100%' }}
              />
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default PublicDocumentSigning;
