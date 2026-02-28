import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, notification, Space, Modal, List } from 'antd';
import {
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
import { getAuthToken, getEstimateById, getEstimates, getCurrentUser } from '../utils/functions';
import { EstimatesUrl, EstimateDocumentsUrl } from '../utils/network';
import { EstimateProps, EstimateDocumentProps } from '../utils/types';
import { fullname, role, email } from '../utils/data';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { WhiteButton, BlackButton, SearchBar } from '../components';
import FixedTable from '../components/FixedTable';

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

  const currentUser = getCurrentUser();

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
      // If it's an HTML document, download via backend PDF generator
      if (doc.document_type === 'HTML Document') {
        notification.info({
          message: 'Preparing Download',
          description: 'Generating PDF on server...',
          title: 'Info',
          duration: 3
        });

        // Import BaseUrl from network.ts
        const { BaseUrl } = await import('../utils/network');
        // Construct the URL for the detail action - NO trailing slash (router has trailing_slash=False)
        const downloadUrl = `${BaseUrl}transactiondata/estimate-documents/${doc.id}/download_pdf`;

        const response = await fetch(downloadUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;

          const contentDisposition = response.headers.get('Content-Disposition');
          let fileName = `${doc.document_title || 'document'}.pdf`;
          if (contentDisposition && contentDisposition.includes('filename=')) {
            fileName = contentDisposition.split('filename=')[1].replace(/"/g, '');
          }

          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          notification.success({
            message: 'PDF Downloaded',
            description: `${doc.document_title} has been downloaded`,
            title: 'Success'
          });
        } else {
          throw new Error(`Failed to download PDF from server: ${response.status}`);
        }
      } else {
        // For existing PDFs or other file types, download directly
        const docName = doc.document_title?.replace(/[^\w\-]+/g, '_') || 'document';
        const customerName = selectedEstimateForDocs?.customer_name?.replace(/[^\w\-]+/g, '_') || '';
        const downloadName = customerName ? `${docName}_${customerName}` : docName;

        const link = document.createElement('a');
        link.href = doc.document_url!;
        link.download = downloadName;
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
        description: 'Failed to download document from server',
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
      id: 'id',
      label: '#',
      width: 80,
      fixed: true,
      render: (value: any, record: EstimateProps) => (
        <Tag
          style={{
            backgroundColor: '#f0f2ff',
            color: '#5b6cf9',
            border: '1px solid #a5affd',
            borderRadius: '6px',
            fontWeight: 500
          }}
        >
          #{record.id}
        </Tag>
      )
    },
    {
      id: 'customer_name',
      label: 'Customer',
      width: 200,
      render: (value: any, record: EstimateProps) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left', padding: '4px 8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #f0f2ff 0%, #a5affd 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <UserOutlined style={{ color: '#5b6cf9', fontSize: '14px' }} />
          </div>
          <span style={{ fontWeight: 500, color: '#111827' }}>{record.customer_name}</span>
        </div>
      )
    },
    {
      id: 'service_type_name',
      label: 'Service Type',
      width: 140,
      render: (value: any, record: EstimateProps) => (
        <Tag
          style={{
            backgroundColor: '#f0f2ff',
            color: '#5b6cf9',
            border: '1px solid #a5affd',
            borderRadius: '6px',
            fontWeight: 500,
            padding: '4px 12px'
          }}
        >
          <CarOutlined /> {record.service_type_name}
        </Tag>
      )
    },
    {
      id: 'template_name',
      label: 'Template',
      width: 150,
      render: (value: any, record: EstimateProps) => (
        <span style={{ color: '#6b7280', fontSize: '13px' }}>{record.template_name || '-'}</span>
      )
    },
    {
      id: 'details',
      label: 'Details',
      width: 180,
      render: (value: any, record: EstimateProps) => (
        <div style={{ fontSize: '13px', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {record.weight_lbs && <div>📦 {record.weight_lbs} lbs</div>}
          {record.labour_hours && <div>⏱️ {record.labour_hours} hrs</div>}
          {!record.weight_lbs && !record.labour_hours && <span>-</span>}
        </div>
      )
    },
    {
      id: 'pickup_dates',
      label: 'Pickup',
      width: 140,
      render: (value: any, record: EstimateProps) => {
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
      id: 'delivery_dates',
      label: 'Delivery',
      width: 140,
      render: (value: any, record: EstimateProps) => {
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
      id: 'total_amount',
      label: 'Total Amount',
      width: 140,
      render: (value: any, record: EstimateProps) => {
        const amountNum = record.total_amount ? Number(record.total_amount) : 0;
        return (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            backgroundColor: '#f0f2ff',
            border: '1px solid #a5affd',
            borderRadius: '8px',
            fontWeight: 600,
            color: '#5b6cf9',
            fontSize: '14px'
          }}>
            <DollarOutlined />
            ${amountNum.toFixed(2)}
          </div>
        );
      }
    },
    {
      id: 'status',
      label: 'Status',
      width: 110,
      render: (value: any, record: EstimateProps) => {
        const status = record.status || 'draft';
        const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
          'draft': { bg: '#f5f5f5', text: '#8c8c8c', border: '#d9d9d9' },
          'sent': { bg: '#f0f2ff', text: '#5b6cf9', border: '#a5affd' },
          'approved': { bg: '#5b6cf9', text: '#ffffff', border: '#5b6cf9' },
          'rejected': { bg: '#595959', text: '#ffffff', border: '#595959' }
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
      id: 'created_at',
      label: 'Created',
      width: 100,
      render: (value: any, record: EstimateProps) => (
        <span style={{ fontSize: '13px', color: '#6b7280' }}>
          {record.created_at ? new Date(record.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          }) : 'N/A'}
        </span>
      )
    },
    {
      id: 'actions',
      label: 'Actions',
      width: 140,
      render: (value: any, record: EstimateProps) => (
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
    <div style={{ padding: '8px 16px 24px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: '#1a1a2e' }}>
              Estimates
            </h1>
            <p style={{ color: '#8e8ea8', margin: '4px 0 0 0', fontSize: '13px' }}>
              {customerIdParam
                ? `Showing ${filteredEstimates.length} estimate${filteredEstimates.length !== 1 ? 's' : ''} for this customer`
                : `View and manage customer estimates (${filteredEstimates.length} of ${estimates.length})`
              }
            </p>
          </div>
          <WhiteButton
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
          >
            Back
          </WhiteButton>
        </div>
      </div>

      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <SearchBar
          placeholder="Search by customer, template, or service type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '400px' }}
          allowClear
        />
        {customerIdParam && (
          <BlackButton
            onClick={() => navigate('/estimates')}
            icon={<ArrowLeftOutlined />}
          >
            Show All Estimates
          </BlackButton>
        )}
      </div>

      <Card
        style={{
          borderRadius: '12px',
          overflow: 'hidden',
          height: 'calc(100vh - 200px)',
          display: 'flex',
          flexDirection: 'column'
        }}
        bodyStyle={{
          padding: 0,
          height: '100%',
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <FixedTable
          columns={columns}
          data={filteredEstimates}
          tableName="estimates_table"
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
  );
};

export default Estimates;
