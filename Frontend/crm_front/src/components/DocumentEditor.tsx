import React, { FC, useState, useEffect, useRef } from "react";
import { Modal, notification, Input, Button, Dropdown, Select } from "antd";
import { BlackButton, WhiteButton } from './index';
import {
  FileTextOutlined,
  SaveOutlined,
  DownloadOutlined,
  TagsOutlined,
  UserOutlined,
  DollarOutlined,
  TableOutlined,
  EditOutlined,
  MailOutlined,
  PaperClipOutlined
} from "@ant-design/icons";
import suneditor from 'suneditor';
import 'suneditor/dist/css/suneditor.min.css';
import DocumentPicker from "./DocumentPicker";
// Import all plugins
import {
  font,
  fontSize,
  formatBlock,
  fontColor,
  hiliteColor,
  align,
  list,
  lineHeight,
  table,
  link,
  image,
  video,
  audio,
  horizontalRule
} from 'suneditor/src/plugins';
import { AuthTokenType, DocumentProps } from "../utils/types";
import { getAuthToken } from "../utils/functions";
import axios from "axios";
import { DocumentsUrl } from "../utils/network";

interface DocumentEditorProps {
  isVisible: boolean;
  onSuccessCallBack: () => void;
  onClose: () => void;
  editingDocument?: DocumentProps | null;
}

const DocumentEditor: FC<DocumentEditorProps> = ({
  isVisible = false,
  onSuccessCallBack,
  onClose,
  editingDocument = null
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<string>('Other');
  const [subject, setSubject] = useState('');
  const [purpose, setPurpose] = useState<string>('none');
  const [attachments, setAttachments] = useState<number[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const editorRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initializingRef = useRef(false);
  const pendingContentRef = useRef<string>('');

  // Initialize SunEditor when modal becomes visible
  useEffect(() => {
    if (isVisible && textareaRef.current && !editorRef.current && !initializingRef.current) {
      initializingRef.current = true;

      // Small delay to ensure modal is rendered
      setTimeout(() => {
        if (textareaRef.current && !editorRef.current) {
          editorRef.current = suneditor.create(textareaRef.current, {
            plugins: [
              font,
              fontSize,
              formatBlock,
              fontColor,
              hiliteColor,
              align,
              list,
              lineHeight,
              table,
              link,
              image,
              video,
              audio,
              horizontalRule
            ],
            width: '100%',
            height: '500px',
            buttonList: [
              ['undo', 'redo'],
              ['font', 'fontSize', 'formatBlock'],
              ['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
              ['fontColor', 'hiliteColor'],
              ['removeFormat'],
              ['outdent', 'indent'],
              ['align', 'horizontalRule', 'list', 'lineHeight'],
              ['table', 'link', 'image'],
              ['fullScreen', 'showBlocks', 'codeView'],
              ['preview', 'print']
            ],
            font: ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Calibri'],
            fontSize: [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36],
            formats: ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
          });

          // Set up change handler
          editorRef.current.onChange = (contents: string) => {
            setContent(contents);
          };

          initializingRef.current = false;

          // IMPORTANT: Apply any content that loaded before the editor was ready
          const initial = pendingContentRef.current || '';
          if (initial) {
            try {
              editorRef.current.setContents(initial);
            } catch (e) {
              // ignore
            }
          }
        }
      }, 100);
    }

    return () => {
      // Don't destroy editor - let it persist
      // This prevents iframe-related errors
    };
  }, [isVisible]);

  // Load existing document content
  useEffect(() => {
    if (editingDocument && editingDocument.file_url) {
      setTitle(editingDocument.title);
      setCategory(editingDocument.category || 'Other');
      setSubject(editingDocument.subject || '');
      setPurpose(editingDocument.document_purpose || 'none');
      setAttachments(editingDocument.attachments || []);
      loadDocumentContent(editingDocument.file_url);
    } else {
      setTitle('');
      setCategory('Other');
      setSubject('');
      setPurpose('none');
      if (editorRef.current) {
        editorRef.current.setContents('');
      }
      setContent('');
    }
  }, [editingDocument]);

  // Track latest content even if editor isn't ready yet (fixes "first open blank, second open ok")
  useEffect(() => {
    pendingContentRef.current = content || '';

    if (!editorRef.current || initializingRef.current) return;
    if (!content) return;

    try {
      const currentEditorContent = editorRef.current.getContents();
      // Only update if different to prevent cursor jumps
      if (currentEditorContent !== content) {
        editorRef.current.setContents(content);
      }
    } catch (e) {
      // ignore
    }
  }, [content]);

  const loadDocumentContent = async (url: string) => {
    setLoading(true);
    try {
      const headers = getAuthToken() as AuthTokenType;
      const response = await axios.get(url, {
        ...headers,
        responseType: 'text'
      });

      // Extract body content from HTML
      const htmlString = response.data;
      const bodyMatch = htmlString.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyMatch) {
        setContent(bodyMatch[1].trim());
      } else {
        setContent(htmlString);
      }
    } catch (error) {
      notification.error({
        message: 'Load Error',
        description: 'Failed to load document content',
        title: 'Error'
      });
      setContent('');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Don't wipe content when editing; it can cause "blank on next open" if parent reuses the same editingDocument ref.
    if (!editingDocument) {
      setTitle('');
      setContent('');
      setPurpose('none');
      if (editorRef.current) {
        try {
          editorRef.current.setContents('');
        } catch (e) {
          // Ignore if editor is not ready
        }
      }
    }
    onClose?.();
  };

  const insertTag = (tag: string) => {
    if (editorRef.current) {
      const tagHtml = `<span style="background-color: #f0f2ff; padding: 2px 6px; border-radius: 3px; color: #5b6cf9; font-weight: 600; font-family: monospace;">${tag}</span>&nbsp;`;
      editorRef.current.insertHTML(tagHtml);
    }
  };

  const insertSignatureField = () => {
    if (editorRef.current) {
      const signatureHtml = `
        <span
          class="signature-box-container"
          style="display: inline-block; border: 2px dashed #5b6cf9; background-color: #f0f9ff; border-radius: 6px; padding: 4px 8px; font-weight: 600; color: #5b6cf9; white-space: nowrap;"
        >
          {{signature}}
        </span>
        &nbsp;
      `;
      editorRef.current.insertHTML(signatureHtml);

      notification.success({
        message: 'Signature Box Added',
        description: 'Customer can click this field in the document to sign.',
        title: 'Success'
      });
    }
  };

  const insertTextBoxField = () => {
    if (editorRef.current) {
      const textBoxHtml = `
        <span
          class="textbox-container"
          style="display: inline-block; border: 2px dashed #52c41a; background-color: #f6ffed; border-radius: 6px; padding: 4px 8px; font-weight: 600; color: #52c41a; white-space: nowrap; min-width: 150px;"
        >
          {{textbox}}
        </span>
        &nbsp;
      `;
      editorRef.current.insertHTML(textBoxHtml);

      notification.success({
        message: 'Text Box Added',
        description: 'Customer can click this field to enter text.',
        title: 'Success'
      });
    }
  };

  const handleSave = async () => {
    // Get current content from editor
    const currentContent = editorRef.current ? editorRef.current.getContents() : content;

    if (!title || !currentContent) {
      notification.warning({
        message: 'Missing Information',
        description: 'Please provide both title and content',
        title: 'Warning'
      });
      return;
    }

    setLoading(true);
    const headers = getAuthToken() as AuthTokenType;

    try {
      // Create HTML file blob from rich text content
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
        h1, h2, h3 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin: 15px 0; }
        td, th { border: 1px solid #000; padding: 8px; text-align: left; }
        th { background-color: #f4f4f4; font-weight: bold; }
    </style>
</head>
<body>
    ${currentContent}
</body>
</html>
`;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const file = new File([blob], `${title}.html`, { type: 'text/html' });

      // Create form data
      const formData = new FormData();
      formData.append('title', title);
      formData.append('category', category);
      if (purpose && purpose !== 'none') formData.append('document_purpose', purpose);
      if (subject) formData.append('subject', subject);
      formData.append('description', editingDocument ? 'Updated using document editor' : 'Created using document editor');
      formData.append('document_type', 'HTML Document');
      formData.append('file', file);
      formData.append('is_active', 'true');

      // Append attachments
      if (attachments && attachments.length > 0) {
        attachments.forEach(id => formData.append('attachments', id.toString()));
      }

      if (editingDocument) {
        // Update existing document
        await axios.put(`${DocumentsUrl}/${editingDocument.id}`, formData, {
          headers: {
            ...headers.headers,
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        // Create new document
        await axios.post(DocumentsUrl, formData, {
          headers: {
            ...headers.headers,
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      notification.success({
        message: editingDocument ? "Document Updated" : "Document Created",
        description: editingDocument ? "Document has been updated successfully." : "Document has been created and saved to library.",
        title: "Success"
      });

      setTitle('');
      setContent('');
      onSuccessCallBack?.();
      onClose?.();
    } catch (error: any) {
      notification.error({
        message: "Save Error",
        description: error.response?.data?.error || "Failed to save document.",
        title: "Error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const currentContent = editorRef.current ? editorRef.current.getContents() : content;

    if (!currentContent) {
      notification.warning({
        message: 'No Content',
        description: 'Please add some content first',
        title: 'Warning'
      });
      return;
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
        h1, h2, h3 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin: 15px 0; }
        td, th { border: 1px solid #000; padding: 8px; text-align: left; }
        th { background-color: #f4f4f4; font-weight: bold; }
    </style>
</head>
<body>
    ${currentContent}
</body>
</html>
`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'document'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    notification.success({
      message: 'Downloaded',
      description: 'Document downloaded as HTML file',
      title: 'Success'
    });
  };

  return (
    <>
      <style>
        {`
          /* Make submenu popups scrollable - use universal selector to catch submenus */
          .ant-dropdown-menu-submenu-popup {
            max-height: 300px !important;
          }
          .ant-dropdown-menu-submenu-popup .ant-dropdown-menu {
            max-height: 300px !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            padding: 4px 0 !important;
          }
          /* Target the ul element that contains menu items */
          .ant-dropdown-menu-submenu-popup .ant-dropdown-menu ul.ant-dropdown-menu-root {
            max-height: 300px !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
          }
          .ant-dropdown-menu-submenu-popup .ant-dropdown-menu-item {
            white-space: nowrap !important;
            padding: 8px 12px !important;
          }
          /* Ensure scrollbar is visible */
          .ant-dropdown-menu-submenu-popup .ant-dropdown-menu::-webkit-scrollbar,
          .ant-dropdown-menu-submenu-popup .ant-dropdown-menu ul::-webkit-scrollbar {
            width: 8px;
          }
          .ant-dropdown-menu-submenu-popup .ant-dropdown-menu::-webkit-scrollbar-track,
          .ant-dropdown-menu-submenu-popup .ant-dropdown-menu ul::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
          }
          .ant-dropdown-menu-submenu-popup .ant-dropdown-menu::-webkit-scrollbar-thumb,
          .ant-dropdown-menu-submenu-popup .ant-dropdown-menu ul::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 4px;
          }
          .ant-dropdown-menu-submenu-popup .ant-dropdown-menu::-webkit-scrollbar-thumb:hover,
          .ant-dropdown-menu-submenu-popup .ant-dropdown-menu ul::-webkit-scrollbar-thumb:hover {
            background: #555;
          }
        `}
      </style>
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileTextOutlined />
            {editingDocument ? 'Edit Document' : 'Create New Document'}
          </div>
        }
        open={isVisible}
        onCancel={handleClose}
        width={1400}
        centered
        style={{ top: 10 }}
        bodyStyle={{
          padding: 0,
          height: 'calc(95vh - 110px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        destroyOnClose={false}
        footer={[
          <Dropdown
            key="insert-fields"
            placement="topLeft"
            overlayClassName="document-editor-dropdown"
            overlayStyle={{
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            menu={{
              style: { maxHeight: '80vh', overflowY: 'auto' },
              items: [
                {
                  key: 'customer',
                  label: 'Customer Fields',
                  icon: <UserOutlined />,
                  children: [
                    { key: 'job_number', label: 'Job Number', onClick: () => insertTag('{{job_number}}') },
                    { key: 'customer_name', label: 'Customer Name', onClick: () => insertTag('{{customer_name}}') },
                    { key: 'customer_email', label: 'Email', onClick: () => insertTag('{{customer_email}}') },
                    { key: 'customer_phone', label: 'Phone', onClick: () => insertTag('{{customer_phone}}') },
                    { key: 'customer_company', label: 'Company', onClick: () => insertTag('{{customer_company}}') },
                    { key: 'customer_address', label: 'Address', onClick: () => insertTag('{{customer_address}}') },
                    { key: 'customer_city', label: 'City', onClick: () => insertTag('{{customer_city}}') },
                    { key: 'customer_state', label: 'State', onClick: () => insertTag('{{customer_state}}') },
                    { key: 'origin_address', label: 'Origin Address', onClick: () => insertTag('{{origin_address}}') },
                    { key: 'destination_address', label: 'Destination Address', onClick: () => insertTag('{{destination_address}}') }
                  ]
                },
                {
                  key: 'estimate',
                  label: 'Estimate Fields',
                  icon: <DollarOutlined />,
                  children: [
                    { key: 'estimate_id', label: 'Estimate ID', onClick: () => insertTag('{{estimate_id}}') },
                    { key: 'estimate_date', label: 'Estimate Date', onClick: () => insertTag('{{estimate_date}}') },
                    { key: 'estimate_subtotal', label: 'Subtotal', onClick: () => insertTag('{{estimate_subtotal}}') },
                    { key: 'estimate_tax', label: 'Tax Amount', onClick: () => insertTag('{{estimate_tax}}') },
                    { key: 'estimate_tax_percent', label: 'Tax %', onClick: () => insertTag('{{estimate_tax_percent}}') },
                    { key: 'estimate_total', label: 'Total Amount', onClick: () => insertTag('{{estimate_total}}') },
                    { key: 'service_type', label: 'Service Type', onClick: () => insertTag('{{service_type}}') },
                    { key: 'move_date', label: 'Move Date', onClick: () => insertTag('{{move_date}}') },
                    { key: 'weight', label: 'Weight', onClick: () => insertTag('{{weight}}') },
                    { key: 'labour_hours', label: 'Labour Hours', onClick: () => insertTag('{{labour_hours}}') },
                    { key: 'pickup_time_window', label: 'Pickup Time Window', onClick: () => insertTag('{{pickup_time_window}}') },
                    { key: 'delivery_time_window', label: 'Delivery Time Window', onClick: () => insertTag('{{delivery_time_window}}') }
                  ]
                },
                {
                  key: 'table',
                  label: 'Line Items Table',
                  icon: <TableOutlined />,
                  children: [
                    {
                      key: 'line_items_table',
                      label: (
                        <span>
                          <strong>Full Line Items Table</strong>
                          <div style={{ fontSize: '11px', color: '#999' }}>Auto-generates complete table</div>
                        </span>
                      ),
                      onClick: () => insertTag('{{estimate_line_items_table}}')
                    }
                  ]
                },
                {
                  key: 'buttons',
                  label: 'Insert Button',
                  icon: <MailOutlined />,
                  children: [
                    {
                      key: 'feedback_button',
                      label: (
                        <span>
                          <strong>⭐ Closed Feedback Button</strong>
                          <div style={{ fontSize: '11px', color: '#999' }}>Inserts a button that links to the feedback page</div>
                        </span>
                      ),
                      onClick: () => insertTag('{{feedback_button}}')
                    }
                  ]
                },
                {
                  type: 'divider'
                },
                {
                  key: 'signature_box',
                  label: (
                    <span>
                      <strong>📝 Signature Box</strong>
                      <div style={{ fontSize: '11px', color: '#999' }}>Clickable field for customer signature</div>
                    </span>
                  ),
                  icon: <EditOutlined />,
                  onClick: () => insertSignatureField()
                },
                {
                  key: 'textbox',
                  label: (
                    <span>
                      <strong>✏️ Text Box</strong>
                      <div style={{ fontSize: '11px', color: '#999' }}>Clickable field for customer to type text</div>
                    </span>
                  ),
                  icon: <EditOutlined />,
                  onClick: () => insertTextBoxField()
                }
              ]
            }}
          >
            <WhiteButton icon={<TagsOutlined />} style={{ marginRight: '8px' }}>
              Insert Field
            </WhiteButton>
          </Dropdown>,
          category === 'Email' && (
            <WhiteButton
              key="attachments"
              icon={<PaperClipOutlined />}
              onClick={() => setShowPicker(true)}
              style={{ marginRight: '8px' }}
            >
              Attachments {attachments.length > 0 ? `(${attachments.length})` : ''}
            </WhiteButton>
          ),
          <WhiteButton key="download" icon={<DownloadOutlined />} onClick={handleDownload} style={{ marginRight: '8px' }}>
            Download
          </WhiteButton>,
          <WhiteButton key="cancel" onClick={handleClose} style={{ marginRight: '8px' }}>
            Cancel
          </WhiteButton>,
          <BlackButton
            key="save"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={loading}
          >
            {editingDocument ? 'Update Document' : 'Save Document'}
          </BlackButton>
        ]}
      >
        {/* Fixed Header Section */}
        < div style={{ padding: '12px 24px 8px 24px', borderBottom: '1px solid #f0f0f0', backgroundColor: '#fff', zIndex: 1 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(200px, 1.5fr) 120px 1.5fr',
            gap: '12px',
            alignItems: 'end'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px', color: '#5b6cf9' }}>
                Document Title
              </label>
              <Input
                placeholder="Enter document title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                size="middle"
                style={{ borderRadius: '6px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px', color: '#5b6cf9' }}>
                Category
              </label>
              <Select
                style={{ width: '100%' }}
                value={category}
                onChange={(value) => setCategory(value)}
                size="middle"
              >
                <Select.Option value="Email">Email</Select.Option>
                <Select.Option value="Contract">Contract</Select.Option>
                <Select.Option value="Invoice">Invoice</Select.Option>
                <Select.Option value="Payment Receipt">Payment Receipt</Select.Option>
                <Select.Option value="Work Order">Work Order</Select.Option>
                <Select.Option value="Other">Other</Select.Option>
              </Select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px', color: '#5b6cf9' }}>
                System Mapping <span style={{ fontSize: '11px', color: '#8c8c8c', fontWeight: 400 }}>(Auto-allocation)</span>
              </label>
              <Select
                style={{ width: '100%' }}
                value={purpose}
                onChange={(value) => setPurpose(value)}
                size="middle"
                placeholder="Select mapping"
              >
                <Select.Option value="none">None</Select.Option>
                <Select.Option value="new_lead_email">New Lead Email</Select.Option>
                <Select.Option value="booked_email">Booked Email</Select.Option>
                <Select.Option value="closed_email">Closed Email</Select.Option>
                <Select.Option value="invoice_email">Invoice Email</Select.Option>
                <Select.Option value="receipt_email">Receipt Email</Select.Option>
                <Select.Option value="endpoint_leads_task">Endpoint Leads task</Select.Option>
                <Select.Option value="estimate_pdf">Estimate PDF</Select.Option>
                <Select.Option value="invoice_pdf">Invoice PDF</Select.Option>
                <Select.Option value="receipt_pdf">Receipt PDF</Select.Option>
                <Select.Option value="work_order_pdf">Work Order PDF</Select.Option>
                <Select.Option value="contract_pdf">Contract PDF</Select.Option>
              </Select>
            </div>
          </div>

          {
            category === 'Email' && (
              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px', color: '#5b6cf9' }}>
                  Email Subject
                </label>
                <Input
                  prefix={<MailOutlined style={{ color: '#5b6cf9' }} />}
                  placeholder="Enter email subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  size="middle"
                  style={{ borderRadius: '6px' }}
                />
              </div>
            )
          }
        </div >

        {/* Scrollable Content Section */}
        < div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 24px 24px 24px',
          backgroundColor: '#fafafa'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px', color: '#5b6cf9' }}>
                Document Content
              </label>
              <div id="suneditor-container" style={{ border: '1px solid #d9d9d9', borderRadius: '8px', overflow: 'hidden' }}>
                <textarea
                  ref={textareaRef}
                  style={{ width: '100%', minHeight: '100px' }}
                />
              </div>
            </div>

            <div style={{
              padding: '12px',
              backgroundColor: '#f0f2ff',
              borderRadius: '8px',
              border: '1px solid #a5affd'
            }}>
              <div style={{ fontSize: '12px', color: '#5b6cf9' }}>
                💡 <strong>Tips:</strong> Click <strong>"Insert Field"</strong> to add customer/estimate data • Insert <strong>Line Items Table</strong> for automatic pricing • Add <strong>Signature Box</strong> for customer to sign • Add <strong>Text Box</strong> for customer to fill in • All fields auto-populate when document is sent to customer!
              </div>
            </div>
          </div>
        </div >
        <DocumentPicker
          visible={showPicker}
          onClose={() => setShowPicker(false)}
          onSelect={(ids) => setAttachments(ids)}
          selectedIds={attachments}
        />
      </Modal >
    </>
  );
};

export default DocumentEditor;
