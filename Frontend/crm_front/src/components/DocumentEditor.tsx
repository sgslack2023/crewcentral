import React, { FC, useState, useEffect, useRef } from "react";
import { Modal, notification, Input, Button } from "antd";
import { 
  FileTextOutlined,
  SaveOutlined,
  DownloadOutlined
} from "@ant-design/icons";
import suneditor from 'suneditor';
import 'suneditor/dist/css/suneditor.min.css';
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
import { AuthTokenType } from "../utils/types";
import { getAuthToken } from "../utils/functions";
import axios from "axios";
import { DocumentsUrl } from "../utils/network";

interface DocumentEditorProps {
  isVisible: boolean;
  onSuccessCallBack: () => void;
  onClose: () => void;
  editingDocument?: {
    id: number;
    title: string;
    file_url: string;
  } | null;
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
      loadDocumentContent(editingDocument.file_url);
    } else {
      setTitle('');
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
      formData.append('description', editingDocument ? 'Updated using document editor' : 'Created using document editor');
      formData.append('document_type', 'HTML Document');
      formData.append('file', file);
      formData.append('is_active', 'true');

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
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileTextOutlined />
          {editingDocument ? 'Edit Document' : 'Create New Document'}
        </div>
      }
      open={isVisible}
      onCancel={handleClose}
      width={1000}
      style={{ top: 20 }}
      bodyStyle={{ padding: '24px' }}
      destroyOnClose={false}
      footer={[
        <Button key="download" icon={<DownloadOutlined />} onClick={handleDownload}>
          Download
        </Button>,
        <Button key="cancel" onClick={handleClose}>
          Cancel
        </Button>,
        <Button 
          key="save" 
          type="primary" 
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={loading}
        >
          {editingDocument ? 'Update' : 'Save'}
        </Button>
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
            Document Title
          </label>
          <Input
            placeholder="Enter document title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            size="large"
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
            Document Content
          </label>
          <div id="suneditor-container">
            <textarea
              ref={textareaRef}
              style={{ width: '100%', minHeight: '100px' }}
            />
          </div>
        </div>

        <div style={{
          padding: '12px',
          backgroundColor: '#f0f9ff',
          borderRadius: '6px',
          border: '1px solid #bae6fd'
        }}>
          <div style={{ fontSize: '12px', color: '#0284c7' }}>
            💡 <strong>Tips:</strong> Click the <strong>Table</strong> button in toolbar to insert tables with full border controls • Right-click tables for merge/split cells • Drag column borders to resize • Use full-screen mode for distraction-free editing • All table features work natively!
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DocumentEditor;
