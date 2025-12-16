import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Tag, notification, Table, Space, Modal, List } from 'antd';
import { 
  SearchOutlined, 
  EyeOutlined,
  EditOutlined,
  DownloadOutlined,
  UserOutlined,
  CarOutlined,
  DollarOutlined,
  ArrowLeftOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { getAuthToken, getEstimateById, getEstimates } from '../utils/functions';
import { EstimatesUrl, EstimateDocumentsUrl } from '../utils/network';
import { EstimateProps, EstimateDocumentProps } from '../utils/types';
import { fullname, role, email } from '../utils/data';
import Header from '../components/Header';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

const Estimates: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customerIdParam = searchParams.get('customer');
  
  const [estimates, setEstimates] = useState<EstimateProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEstimates, setFilteredEstimates] = useState<EstimateProps[]>([]);
  const [documentsModalVisible, setDocumentsModalVisible] = useState(false);
  const [selectedEstimateForDocs, setSelectedEstimateForDocs] = useState<EstimateProps | null>(null);
  const [estimateDocuments, setEstimateDocuments] = useState<EstimateDocumentProps[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  const currentUser = {
    role: localStorage.getItem(role) || 'user',
    fullname: localStorage.getItem(fullname) || 'User',
    email: localStorage.getItem(email) || ''
  };

  useEffect(() => {
    fetchEstimates();
  }, []);

  useEffect(() => {
    filterEstimates();
  }, [estimates, searchTerm, customerIdParam]);

  const fetchEstimates = async () => {
    getEstimates(setEstimates, setLoading);
  };

  const filterEstimates = () => {
    let filtered = [...estimates];

    // Filter by customer if parameter exists
    if (customerIdParam) {
      filtered = filtered.filter(est => est.customer === parseInt(customerIdParam));
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(est =>
        est.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        est.service_type_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        est.id?.toString().includes(searchTerm)
      );
    }

    setFilteredEstimates(filtered);
  };

  const fetchEstimateDocuments = async (estimateId: number) => {
    setLoadingDocuments(true);
    try {
      const headers = getAuthToken() as any;
      const response = await axios.get(`${EstimateDocumentsUrl}?estimate=${estimateId}`, headers);
      setEstimateDocuments(response.data || []);
    } catch (error: any) {
      notification.error({
        message: 'Error',
        description: 'Failed to load documents',
        title: 'Error'
      });
      setEstimateDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleViewDocuments = async (estimate: EstimateProps) => {
    setSelectedEstimateForDocs(estimate);
    setDocumentsModalVisible(true);
    if (estimate.id) {
      await fetchEstimateDocuments(estimate.id);
    }
  };

  const handleDownloadDocument = async (doc: EstimateDocumentProps) => {
    try {
      // If it's an HTML document with processed content, generate PDF from HTML
      if (doc.processed_content && doc.document_type === 'HTML Document') {
        notification.info({
          message: 'Generating PDF',
          description: 'Please wait while we generate your PDF...',
          title: 'Info',
          duration: 2
        });

        // Create a temporary container for rendering HTML
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '210mm'; // A4 width
        container.style.padding = '20mm';
        container.style.backgroundColor = '#fff';
        container.style.fontFamily = 'Arial, sans-serif';
        container.innerHTML = doc.processed_content;
        document.body.appendChild(container);

        // Wait a bit for fonts/styles to load
        await new Promise(resolve => setTimeout(resolve, 500));

        // Convert HTML to canvas
        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        // Remove temporary container
        document.body.removeChild(container);

        // Create PDF
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        // Add first page
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        // Add additional pages if content is longer than one page
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }

        // Download PDF
        const fileName = `${doc.document_title?.replace(/[^\w\-]+/g, '_') || 'document'}.pdf`;
        pdf.save(fileName);

        notification.success({
          message: 'PDF Downloaded',
          description: `${doc.document_title} has been downloaded`,
          title: 'Success'
        });
      } else {
        // For existing PDFs or other file types, download directly
        const link = document.createElement('a');
        link.href = doc.document_url!;
        link.download = doc.document_title || 'document';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        notification.success({
          message: 'Download Started',
          description: `${doc.document_title} is being downloaded`,
          title: 'Success'
        });
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      notification.error({
        message: 'Download Error',
        description: 'Failed to download document',
        title: 'Error'
      });
    }
  };

  const handleDownloadPDF = async (estimate: EstimateProps) => {
    try {
      // Fetch full estimate details (includes line items). List page often doesn't include items.
      const estimateId = estimate.id;
      const detailedEstimate = estimateId ? await getEstimateById(String(estimateId)) : null;
      const e = detailedEstimate || estimate;

      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 14;
      const rightX = pageWidth - marginX;

      const companyName = 'Baltic Van Lines';
      const fileSafeCustomer = (e.customer_name || 'Customer').replace(/[^\w\-]+/g, '_');
      const createdAt = e.created_at ? new Date(e.created_at) : null;
      const issueDateText = createdAt ? createdAt.toLocaleDateString() : new Date().toLocaleDateString();
      
      // Header band
      doc.setFillColor(24, 144, 255);
      doc.rect(0, 0, pageWidth, 26, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text(companyName, marginX, 16);
      
      doc.setFontSize(12);
      doc.text('Estimate', rightX, 16, { align: 'right' });

      // Meta
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(`Estimate #${e.id ?? ''}`, marginX, 38);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(90, 90, 90);
      doc.text(`Issue Date: ${issueDateText}`, rightX, 38, { align: 'right' });
      
      // Customer block
      const boxTop = 44;
      doc.setDrawColor(230, 230, 230);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(marginX, boxTop, pageWidth - marginX * 2, 26, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(70, 70, 70);
      doc.text('Customer', marginX + 4, boxTop + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(e.customer_name || '-', marginX + 4, boxTop + 16);

      doc.setFontSize(10);
      doc.setTextColor(90, 90, 90);
      doc.text(`Service Type: ${e.service_type_name || '-'}`, marginX + 4, boxTop + 23);
      
      // Move details (right side of customer block)
      const moveLeftX = pageWidth / 2 + 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(70, 70, 70);
      doc.text('Move Details', moveLeftX, boxTop + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(90, 90, 90);
      const weightText = e.weight_lbs ? `${e.weight_lbs} lbs` : '-';
      const hoursText = e.labour_hours ? `${Number(e.labour_hours).toFixed(1)} hrs` : '-';
      doc.text(`Weight: ${weightText}`, moveLeftX, boxTop + 16);
      doc.text(`Labour: ${hoursText}`, moveLeftX, boxTop + 23);

      // Line Items Table
      const items = Array.isArray(e.items) ? [...e.items] : [];
      items.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));

      const lineItemRows = items.map((it, idx) => {
        const qty = it.quantity ?? 1;
        const amount = it.amount ?? 0;
        const type = it.charge_type ? String(it.charge_type) : '-';
        const rateOrPct =
          type === 'percent'
            ? `${Number(it.percentage ?? 0).toFixed(2)}%`
            : `$${Number(it.rate ?? 0).toFixed(2)}`;

        const labelParts = [it.charge_name || `Item ${idx + 1}`];
        if (it.category_name) labelParts.push(`(${it.category_name})`);

        return [
          labelParts.join(' '),
          type.replace('_', ' '),
          rateOrPct,
          Number(qty).toFixed(2),
          `$${Number(amount).toFixed(2)}`
        ];
      });

      const tableStartY = 80;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text('Line Items', marginX, tableStartY - 6);

      autoTable(doc, {
        startY: tableStartY,
        margin: { left: marginX, right: marginX },
        head: [['Description', 'Type', 'Rate / %', 'Qty', 'Amount']],
        body: lineItemRows.length > 0 ? lineItemRows : [['No line items found for this estimate.', '', '', '', '']],
        styles: {
          font: 'helvetica',
          fontSize: 9,
          cellPadding: 2,
          lineColor: [230, 230, 230],
          lineWidth: 0.2,
          textColor: [40, 40, 40]
        },
        headStyles: {
          fillColor: [24, 144, 255],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250]
        },
        columnStyles: {
          0: { cellWidth: 78 },
          1: { cellWidth: 26 },
          2: { cellWidth: 26, halign: 'right' },
          3: { cellWidth: 18, halign: 'right' },
          4: { cellWidth: 28, halign: 'right' }
        },
        didDrawPage: (data) => {
          // Footer with page numbers
          const pageNumber = doc.getCurrentPageInfo().pageNumber;
          const pageCount = doc.getNumberOfPages();
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(140, 140, 140);
          doc.text(`Generated ${new Date().toLocaleString()}`, marginX, pageHeight - 8);
          doc.text(`Page ${pageNumber} of ${pageCount}`, rightX, pageHeight - 8, { align: 'right' });
        }
      });

      // Totals block (after table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lastY = (doc as any).lastAutoTable?.finalY ?? tableStartY + 10;
      const totalsTop = lastY + 8;

      const subtotal = Number(e.subtotal ?? 0);
      const taxPct = Number(e.tax_percentage ?? 0);
      const taxAmt = Number(e.tax_amount ?? 0);
      const total = Number(e.total_amount ?? 0);

      autoTable(doc, {
        startY: totalsTop,
        margin: { left: marginX, right: marginX },
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 10, cellPadding: 1.5, textColor: [30, 30, 30] },
        tableWidth: 70,
        body: [
          ['Subtotal', `$${subtotal.toFixed(2)}`],
          ...(taxPct > 0 ? [[`Tax (${taxPct.toFixed(2)}%)`, `$${taxAmt.toFixed(2)}`]] : []),
          [{ content: 'Total', styles: { fontStyle: 'bold' } }, { content: `$${total.toFixed(2)}`, styles: { fontStyle: 'bold' } }]
        ],
        columnStyles: {
          0: { halign: 'left' },
          1: { halign: 'right' }
        },
        tableLineColor: [230, 230, 230],
        tableLineWidth: 0.2
      });

      // Notes (optional)
      const notes = (e.notes || '').trim();
      if (notes) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const afterTotalsY = ((doc as any).lastAutoTable?.finalY ?? totalsTop) + 10;
        const notesTitleY = afterTotalsY;
        const notesBodyY = notesTitleY + 6;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(70, 70, 70);
        doc.text('Notes', marginX, notesTitleY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        const wrapped = doc.splitTextToSize(notes, pageWidth - marginX * 2);
        doc.text(wrapped, marginX, notesBodyY);
      }
      
      // Save PDF
      doc.save(`Estimate_${e.id ?? 'NA'}_${fileSafeCustomer}.pdf`);
      
      notification.success({
        message: 'PDF Downloaded',
        description: `Estimate #${e.id} has been downloaded as PDF`,
        title: 'Success'
      });
    } catch (error) {
      notification.error({
        message: 'Download Error',
        description: 'Failed to generate PDF',
        title: 'Error'
      });
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: number) => (
        <Tag 
          style={{
            backgroundColor: '#eff6ff',
            color: '#1e40af',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            fontWeight: 500
          }}
        >
          #{id}
        </Tag>
      )
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
      render: (name: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <UserOutlined style={{ color: '#2563eb', fontSize: '14px' }} />
          </div>
          <span style={{ fontWeight: 500, color: '#111827' }}>{name}</span>
        </div>
      )
    },
    {
      title: 'Service Type',
      dataIndex: 'service_type_name',
      key: 'service_type_name',
      width: 140,
      render: (name: string) => (
        <Tag 
          style={{
            backgroundColor: '#dcfce7',
            color: '#16a34a',
            border: '1px solid #86efac',
            borderRadius: '6px',
            fontWeight: 500,
            padding: '4px 12px'
          }}
        >
          <CarOutlined /> {name}
        </Tag>
      )
    },
    {
      title: 'Template',
      dataIndex: 'template_name',
      key: 'template_name',
      width: 150,
      render: (name: string) => (
        <span style={{ color: '#6b7280', fontSize: '13px' }}>{name || '-'}</span>
      )
    },
    {
      title: 'Details',
      key: 'details',
      width: 180,
      render: (record: EstimateProps) => (
        <div style={{ fontSize: '13px', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {record.weight_lbs && <div>📦 {record.weight_lbs} lbs</div>}
          {record.labour_hours && <div>⏱️ {record.labour_hours} hrs</div>}
          {!record.weight_lbs && !record.labour_hours && <span>-</span>}
        </div>
      )
    },
    {
      title: 'Pickup',
      key: 'pickup_dates',
      width: 140,
      render: (record: EstimateProps) => {
        if (!record.pickup_date_from && !record.pickup_date_to) return <span style={{ color: '#9ca3af' }}>-</span>;
        const fromDate = record.pickup_date_from ? new Date(record.pickup_date_from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-';
        const toDate = record.pickup_date_to ? new Date(record.pickup_date_to).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-';
        return (
          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            <div>📤 {fromDate}</div>
            {record.pickup_date_to && <div style={{ fontSize: '11px', color: '#9ca3af' }}>to {toDate}</div>}
          </div>
        );
      }
    },
    {
      title: 'Delivery',
      key: 'delivery_dates',
      width: 140,
      render: (record: EstimateProps) => {
        if (!record.delivery_date_from && !record.delivery_date_to) return <span style={{ color: '#9ca3af' }}>-</span>;
        const fromDate = record.delivery_date_from ? new Date(record.delivery_date_from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-';
        const toDate = record.delivery_date_to ? new Date(record.delivery_date_to).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-';
        return (
          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            <div>📥 {fromDate}</div>
            {record.delivery_date_to && <div style={{ fontSize: '11px', color: '#9ca3af' }}>to {toDate}</div>}
          </div>
        );
      }
    },
    {
      title: 'Total Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 140,
      render: (amount: number) => {
        const amountNum = amount ? Number(amount) : 0;
        return (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '8px',
            fontWeight: 600,
            color: '#16a34a',
            fontSize: '14px'
          }}>
            <DollarOutlined />
            ${amountNum.toFixed(2)}
          </div>
        );
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => {
        const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
          'draft': { bg: '#fef3c7', text: '#d97706', border: '#fde68a' },
          'sent': { bg: '#dbeafe', text: '#2563eb', border: '#93c5fd' },
          'approved': { bg: '#dcfce7', text: '#16a34a', border: '#86efac' },
          'rejected': { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' }
        };
        const config = statusConfig[status] || { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' };
        return (
          <Tag 
            style={{
              backgroundColor: config.bg,
              color: config.text,
              border: `1px solid ${config.border}`,
              borderRadius: '6px',
              fontWeight: 500,
              padding: '4px 12px',
              margin: 0
            }}
          >
            {status.toUpperCase()}
          </Tag>
        );
      }
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 100,
      render: (date: string) => (
        <span style={{ fontSize: '13px', color: '#6b7280' }}>
          {new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          })}
        </span>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (record: EstimateProps) => (
        <Space size={4}>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/estimate-editor/${record.id}`)}
            title="View/Edit Estimate"
            style={{
              borderRadius: '6px',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb'
            }}
          />
          <Button
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => handleViewDocuments(record)}
            title="View Documents"
            style={{
              borderRadius: '6px',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb'
            }}
          />
          <Button
            size="small"
            icon={<FilePdfOutlined />}
            onClick={() => handleDownloadPDF(record)}
            title="Download PDF"
            style={{
              borderRadius: '6px',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb'
            }}
          />
        </Space>
      )
    }
  ];


  return (
    <div>
      <Header currentUser={currentUser} />
      
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 500, margin: 0, marginBottom: '8px' }}>
                Estimates
                {customerIdParam && filteredEstimates.length > 0 && (
                  <Tag color="blue" style={{ marginLeft: '12px', fontSize: '13px' }}>
                    <UserOutlined /> {filteredEstimates[0]?.customer_name}
                  </Tag>
                )}
              </h1>
              <p style={{ color: '#666', margin: 0 }}>
                {customerIdParam 
                  ? `Showing ${filteredEstimates.length} estimate${filteredEstimates.length !== 1 ? 's' : ''} for this customer`
                  : `View and manage customer estimates (${filteredEstimates.length} of ${estimates.length})`
                }
              </p>
            </div>
            <Button 
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/customers')}
            >
              Back
            </Button>
          </div>
        </div>

        <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Input
            placeholder="Search by customer, template, or service type..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: '400px' }}
            allowClear
          />
          {customerIdParam && (
            <Button
              onClick={() => navigate('/estimates')}
              icon={<ArrowLeftOutlined />}
            >
              Show All Estimates
            </Button>
          )}
        </div>

        <Card bodyStyle={{ padding: 0 }}>
          <Table
            columns={columns}
            dataSource={filteredEstimates}
            loading={loading}
            rowKey="id"
            size="small"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} estimates`
            }}
            scroll={{ x: 1000 }}
          />
        </Card>

        {/* Documents Modal */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileTextOutlined />
              Documents for Estimate #{selectedEstimateForDocs?.id}
            </div>
          }
          open={documentsModalVisible}
          onCancel={() => {
            setDocumentsModalVisible(false);
            setSelectedEstimateForDocs(null);
            setEstimateDocuments([]);
          }}
          footer={null}
          width={750}
        >
          {loadingDocuments ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              Loading documents...
            </div>
          ) : estimateDocuments.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
              <FileTextOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
              <div>No documents attached to this estimate.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {estimateDocuments.map((doc) => (
                <Card
                  key={doc.id}
                  style={{
                    borderRadius: '8px',
                    border: doc.customer_signed ? '2px solid #86efac' : '1px solid #e5e7eb',
                    backgroundColor: doc.customer_signed ? '#f0fdf4' : '#ffffff',
                    transition: 'all 0.3s ease',
                    cursor: 'default'
                  }}
                  bodyStyle={{ padding: '16px' }}
                  hoverable={false}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Left side - Document info */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '8px',
                          background: '#dbeafe',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#2563eb',
                          fontSize: '20px',
                          flexShrink: 0
                        }}
                      >
                        <FileTextOutlined />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, fontSize: '14px', color: '#333' }}>
                            {doc.document_title}
                          </span>
                          {doc.customer_signed && (
                            <Tag icon={<CheckCircleOutlined />} color="success" style={{ margin: 0 }}>
                              Signed
                            </Tag>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {doc.document_type || 'Document'}
                          {doc.requires_signature && !doc.customer_signed && (
                            <Tag color="orange" style={{ marginLeft: '8px' }}>Signature Required</Tag>
                          )}
                        </div>
                        {doc.customer_signed_at && (
                          <div style={{ fontSize: '11px', color: '#52c41a', marginTop: '4px' }}>
                            ✓ Signed on {new Date(doc.customer_signed_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right side - Download button */}
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownloadDocument(doc)}
                      style={{
                        height: '40px',
                        borderRadius: '8px',
                        fontWeight: 500,
                        backgroundColor: '#dbeafe',
                        color: '#2563eb',
                        border: '1px solid #93c5fd',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0 20px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#bfdbfe';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#dbeafe';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                      }}
                    >
                      Download PDF
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Close button at bottom */}
          {!loadingDocuments && (
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Button
                onClick={() => {
                  setDocumentsModalVisible(false);
                  setSelectedEstimateForDocs(null);
                  setEstimateDocuments([]);
                }}
                style={{ minWidth: '120px' }}
              >
                Close
              </Button>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default Estimates;
