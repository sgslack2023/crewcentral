import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import DownloadIcon from '@mui/icons-material/Download';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { role } from '../utils/data';
import { getAuthToken } from '../utils/functions';
import { AuthTokenType } from '../utils/types';
import PageLoader from './PageLoader';


// Styled components for the resizable columns
const ResizableHeader = styled(Box)(({ theme }: any) => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexWrap: 'wrap',
  minHeight: '20px',
  height: '100%',
  width: '100%',
  padding: '4px 8px',
  wordWrap: 'break-word',
  textAlign: 'center',
  overflow: 'visible',
  textOverflow: 'ellipsis',
  gap: '4px',
  transition: 'background-color 0.15s ease',
  borderRadius: '4px',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
}));

const ResizeHandleRight = styled(Box)(({ theme }: any) => ({
  position: 'absolute',
  right: '-8px',
  top: 0,
  height: '100%',
  width: '16px',
  cursor: 'col-resize',
  userSelect: 'none',
  backgroundColor: 'transparent',
  zIndex: 200,
  '&:hover': {
    backgroundColor: 'transparent',
  },
}));

const ResizeHandleLeft = styled(Box)(({ theme }: any) => ({
  position: 'absolute',
  left: '-8px',
  top: 0,
  height: '100%',
  width: '16px',
  cursor: 'col-resize',
  userSelect: 'none',
  backgroundColor: 'transparent',
  zIndex: 200,
  '&:hover': {
    backgroundColor: 'transparent',
  },
}));

// Styled components for fixed columns
const StyledTableContainer = styled(TableContainer)(({ theme }: any) => ({
  maxHeight: 'calc(100vh - 230px)',
  overflowX: 'auto',
  overflowY: 'auto',
  paddingBottom: '10px',
  marginBottom: '0',
  backgroundColor: '#ffffff',
  borderRadius: '0 0 12px 12px',
  width: '100%',
  flex: 1,
  '&::-webkit-scrollbar': {
    height: '6px',
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: '#d1d5db',
    borderRadius: '3px',
    '&:hover': {
      backgroundColor: '#9ca3af',
    },
  },
}));

const StyledTable = styled(Table)<{ $fontFamily?: string; $totalWidth?: number }>(({ theme, $fontFamily = 'DM Sans', $totalWidth }: any) => ({
  borderCollapse: 'separate',
  borderSpacing: 0,
  tableLayout: 'auto',
  width: '100%',
  minWidth: $totalWidth ? `${$totalWidth}px` : 'auto',
  padding: 0,
  margin: 0,
  fontFamily: `"${$fontFamily}", sans-serif !important`,
  '& .MuiTableCell-root': {
    borderBottom: '1px solid #f0f0f0',
    borderRight: 'none',
    fontFamily: `"${$fontFamily}", sans-serif !important`,
    transition: 'background-color 0.15s ease',
    '&.selected-cell': {
      backgroundColor: '#fef3c7 !important',
      '& *:not(svg):not(svg *)': {
        background: 'transparent !important',
        color: '#1f2937 !important'
      }
    }
  },
  '& .MuiTableHead-root': {
    height: '20px',
    fontFamily: `"${$fontFamily}", sans-serif !important`,
  },
  '& .MuiTableBody-root': {
    fontFamily: `"${$fontFamily}", sans-serif !important`,
    '& .MuiTableRow-root': {
      fontFamily: `"${$fontFamily}", sans-serif !important`,
      transition: 'background-color 0.15s ease',
      '&:hover:not(.Mui-selected)': {
        backgroundColor: '#fafafa !important',
        '& .MuiTableCell-root': {
          backgroundColor: '#fafafa !important',
          fontFamily: `"${$fontFamily}", sans-serif !important`,
        }
      },
      '&.Mui-selected': {
        backgroundColor: '#fef3c7 !important',
        '& .MuiTableCell-root': {
          backgroundColor: '#fef3c7 !important',
          color: '#1f2937 !important',
          fontFamily: `"${$fontFamily}", sans-serif !important`,
        },
        '&:hover': {
          backgroundColor: '#fde68a !important',
          '& .MuiTableCell-root': {
            backgroundColor: '#fde68a !important',
            color: '#1f2937 !important',
            fontFamily: `"${$fontFamily}", sans-serif !important`,
          }
        }
      }
    }
  }
}));

const FixedHeaderCell = styled(TableCell)<{ fontSize?: string }>(
  ({ theme, fontSize }: any) => ({
    position: 'sticky',
    top: 0,
    backgroundColor: '#fafafa',
    color: '#6b7280',
    zIndex: 20,
    fontWeight: 500,
    padding: '16px 12px',
    height: 'auto',
    fontSize: fontSize || '13px',
    whiteSpace: 'normal',
    wordWrap: 'break-word',
    overflow: 'hidden',
    borderBottom: '1px solid #e5e7eb',
    borderRight: 'none',
    textAlign: 'left',
    verticalAlign: 'middle',
    boxShadow: 'none',
    '&[style*="width: 0"]': {
      padding: 0,
      border: 'none'
    }
  })
);

// Fixed header for filter row (2nd row in thead)
const FixedFilterCell = styled(TableCell)(({ theme }: any) => ({
  position: 'sticky',
  backgroundColor: '#fafafa',
  zIndex: 20,
  padding: '4px 8px',
  height: '32px',
  fontSize: '0.875rem',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  borderBottom: '1px solid #e5e7eb',
  borderRight: 'none',
  '&[style*="width: 0"]': {
    padding: 0,
    border: 'none'
  }
})
);

const FixedLeftCell = styled(TableCell)<{ index: number; fontSize?: string }>(
  ({ theme, index, fontSize }: any) => ({
    position: 'sticky',
    left: 0,
    backgroundColor: '#ffffff',
    zIndex: 30,
    padding: '0 12px',
    height: '18px',
    lineHeight: '1',
    fontSize: fontSize || '0.875rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    borderBottom: '1px solid #f0f0f0',
    borderRight: 'none',
    textAlign: 'left',
    transition: 'background-color 0.15s ease',
    color: '#1f2937',
    '&[style*="width: 0"]': {
      padding: 0,
      border: 'none'
    },
    '&.selected-cell': {
      backgroundColor: '#fef3c7 !important',
      '& *:not(svg):not(svg *)': {
        background: 'transparent !important',
        color: '#1f2937 !important'
      }
    }
  })
);

const FixedHeaderLeftCell = styled(TableCell)<{ index: number; fontSize?: string }>(
  ({ theme, index, fontSize }: any) => ({
    position: 'sticky',
    top: 0,
    left: 0,
    backgroundColor: '#fafafa',
    color: '#6b7280',
    zIndex: 40,
    fontWeight: 500,
    padding: '16px 12px',
    height: 'auto',
    fontSize: fontSize || '13px',
    whiteSpace: 'normal',
    wordWrap: 'break-word',
    overflow: 'hidden',
    borderBottom: '1px solid #e5e7eb',
    borderRight: 'none',
    textAlign: 'left',
    verticalAlign: 'middle',
    boxShadow: 'none',
  })
);

// New component for fixed filter cells on the left
const FixedFilterLeftCell = styled(TableCell)<{ index: number }>(
  ({ theme, index }: any) => ({
    position: 'sticky',
    left: 0,
    backgroundColor: '#fafafa',
    zIndex: 40,
    padding: '4px 8px',
    height: '32px',
    lineHeight: '1',
    fontSize: '0.875rem',
    whiteSpace: 'nowrap',
    overflow: 'visible',
    textOverflow: 'ellipsis',
    borderBottom: '1px solid #e5e7eb',
    borderRight: 'none',
  })
);

// Custom styled TableRow with reduced padding and dynamic font size
const StyledTableRow = styled(TableRow)<{
  $frozenFontSize?: string;
  $nonFrozenFontSize?: string;
  $lineHeight?: string;
  $fontFamily?: string;
  $alternateRowColor?: string;
}>(({ theme, $frozenFontSize, $nonFrozenFontSize, $lineHeight, $fontFamily = 'DM Sans', $alternateRowColor = '#ffffff' }: any) => ({
  height: $lineHeight ? `calc(18px * ${$lineHeight})` : '18px',
  overflow: 'hidden',
  fontFamily: `"${$fontFamily}", sans-serif !important`,
  transition: 'background-color 0.15s ease',
  backgroundColor: '#ffffff',
  '& .MuiTableCell-root': {
    padding: '12px',
    height: $lineHeight ? `calc(18px * ${$lineHeight})` : '18px',
    lineHeight: $lineHeight ? `calc(18px * ${$lineHeight})` : '18px',
    fontSize: $nonFrozenFontSize || '0.875rem',
    fontFamily: `"${$fontFamily}", sans-serif !important`,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    borderBottom: '1px solid #f0f0f0',
    borderRight: 'none',
    textAlign: 'left',
    color: '#1f2937',
    '&.fixed-column': {
      fontSize: $frozenFontSize || '0.875rem',
      fontFamily: `"${$fontFamily}", sans-serif !important`,
    },
    '&[style*="width: 0"]': {
      padding: 0,
      border: 'none'
    }
  },
}));

interface Column {
  id: string;
  label: string;
  width?: number;
  fixed?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
  searchable?: boolean;
  showTotal?: number | string;
  sortable?: boolean;
  getCellStyle?: (value: any, row: any) => React.CSSProperties | undefined;
}

interface FixedTableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  selectedRow?: any | any[];
  headerFrozenFontSize?: string;
  headerNonFrozenFontSize?: string;
  rowsFrozenFontSize?: string;
  rowsNonFrozenFontSize?: string;
  lineHeight?: string;
  headerLineHeight?: string;
  fontFamily?: string;
  searchBarFontSize?: string;
  searchBarHeight?: number;
  tableName?: string;
  defaultDimensions?: { [key: string]: number };
  showExcelDownload?: boolean;
  onExcelDownload?: () => void;
  hiddenColumns?: string[];
  resetSorting?: boolean;
  alternateRowColor?: string;
  useGroupedRowColors?: boolean; // Whether to group rows by parent_order for alternating colors
  fitContent?: boolean; // When true, table container width matches content (no extra whitespace)
  getRowStyle?: (row: any) => React.CSSProperties | undefined; // Custom row styling function
  showCheckboxes?: boolean; // Show checkbox column for multi-select
  onSelectionChange?: (selectedRows: any[]) => void; // Callback when selection changes
  showDownloadButton?: boolean; // Show download button in header
  loading?: boolean;
}

const FixedTable: React.FC<FixedTableProps> = ({
  columns = [],
  data = [],
  onRowClick,
  selectedRow,
  headerFrozenFontSize = '1.2rem',
  headerNonFrozenFontSize = '1.2rem',
  rowsFrozenFontSize = '1.2rem',
  rowsNonFrozenFontSize = '1.2rem',
  lineHeight = '1.0',
  headerLineHeight = '1.0',
  fontFamily = 'DM Sans',
  searchBarFontSize = '0.72rem',
  searchBarHeight = 18,
  tableName,
  defaultDimensions,
  showExcelDownload = false,
  onExcelDownload,
  hiddenColumns = [],
  resetSorting = false,
  alternateRowColor = '#ffffff',
  useGroupedRowColors = false,
  fitContent = false,
  getRowStyle,
  showCheckboxes = false,
  onSelectionChange,
  showDownloadButton = false,
  loading = false
}) => {
  // Ensure data and columns are always arrays
  const safeColumns = Array.isArray(columns) ? columns : [];
  const safeData = Array.isArray(data) ? data : [];

  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const tableRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<{ column: string; columnIndex: number; startX: number; startWidth: number; currentWidth?: number } | any>(null);
  const [filters, setFilters] = useState<{ [key: string]: string }>({});
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const hasLoadedDimensionsRef = useRef(false);
  const isInitialLoadRef = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resizeAnimationFrameRef = useRef<number | null>(null);
  const headerRowRef = useRef<HTMLTableRowElement>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(0);
  const [checkedRows, setCheckedRows] = useState<Set<number>>(new Set());

  // Handle checkbox selection
  const handleCheckboxChange = (rowIndex: number, row: any) => {
    const newChecked = new Set(checkedRows);
    if (newChecked.has(rowIndex)) {
      newChecked.delete(rowIndex);
    } else {
      newChecked.add(rowIndex);
    }
    setCheckedRows(newChecked);

    if (onSelectionChange) {
      const selectedData = Array.from(newChecked).map(idx => safeData[idx]);
      onSelectionChange(selectedData);
    }
  };

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIndices = new Set(safeData.map((_, idx) => idx));
      setCheckedRows(allIndices);
      if (onSelectionChange) {
        onSelectionChange([...safeData]);
      }
    } else {
      setCheckedRows(new Set());
      if (onSelectionChange) {
        onSelectionChange([]);
      }
    }
  };

  // Download selected rows as CSV
  const handleDownloadSelected = () => {
    const selectedData = Array.from(checkedRows).map(idx => safeData[idx]);
    if (selectedData.length === 0) {
      alert('Please select at least one row to download');
      return;
    }

    // Get visible column headers
    const headers = visibleColumns.map(col => col.label);

    // Build CSV content
    const csvRows = [headers.join(',')];

    selectedData.forEach(row => {
      const values = visibleColumns.map(col => {
        let value = row[col.id];
        if (value === null || value === undefined) value = '';
        // Handle nested objects
        if (typeof value === 'object') value = JSON.stringify(value);
        // Escape quotes and wrap in quotes if contains comma
        value = String(value).replace(/"/g, '""');
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${tableName || 'export'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get user role for permission checks
  const userRole = localStorage.getItem(role);
  const isExpeditor = userRole === 'Expeditor';

  // Helper function to check if unloading date cell should have red background due to missing CMR
  const shouldHighlightUnloadingDate = (row: any): boolean => {
    // Check if unloading_date exists and has passed
    if (!row.unloading_date) return false;

    const unloadingDate = dayjs(row.unloading_date);
    const now = dayjs();

    // If unloading date hasn't passed yet, no highlighting needed
    if (unloadingDate.isAfter(now)) return false;

    // Check if CMR document exists
    // CMR is considered uploaded if either:
    // 1. cmr_insert_date exists, OR
    // 2. There's a transport document in suborder_photos
    const hasCMRInsertDate = row.cmr_insert_date;
    const hasTransportDoc = row.suborder_photos &&
      Array.isArray(row.suborder_photos) &&
      row.suborder_photos.some((photo: any) => photo.type === 'Transport');

    // Return true if unloading date has passed AND no CMR document exists
    return !hasCMRInsertDate && !hasTransportDoc;
  };

  // Helper function to check if Pal (swapped_pallets) cell should be red
  const shouldHighlightPalRed = (row: any): boolean => {
    // Red when swapped_pallets value is greater than 0
    const palValue = parseFloat(row.swapped_pallets);
    return !isNaN(palValue) && palValue > 0;
  };

  // Helper function to get profit cell background color
  const getProfitCellColor = (row: any): string | undefined => {
    // Check if it's a special order (subcontractor_price is filled)
    const isSpecialOrder = row.subcontractor_price !== null && row.subcontractor_price !== undefined && row.subcontractor_price !== '';

    // Yellow for special orders takes precedence
    if (isSpecialOrder) {
      return '#FFFF00'; // Yellow
    }

    // Check for penalty adjustments
    if (row.has_positive_penalty === true) {
      return '#40E0D0'; // Blue/Turquoise for positive penalty (profit increased)
    } else if (row.has_positive_penalty === false) {
      return '#CC00CC'; // Pink/Magenta for negative penalty (profit decreased)
    }

    // No special styling
    return undefined;
  };

  // Filter visible columns based on hiddenColumns prop
  const visibleColumns = useMemo<Column[]>(() =>
    safeColumns.filter((column: Column) => column && !hiddenColumns.includes(column.id)),
    [safeColumns, hiddenColumns]
  );

  // Track actual header height so the filter row sticks at the correct offset even when headers wrap
  useEffect(() => {
    const headerRow = headerRowRef.current;
    if (!headerRow) return;

    const updateHeight = () => {
      const measured = headerRow.getBoundingClientRect().height;
      if (measured && measured !== headerHeight) {
        setHeaderHeight(measured);
      }
    };

    updateHeight();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const resizeObserver = new ResizeObserver(() => updateHeight());
    resizeObserver.observe(headerRow);

    return () => resizeObserver.disconnect();
  }, [headerHeight, visibleColumns]);

  // Fallback to previous behavior if we cannot measure the header height
  const parsedHeaderLineHeight = Number(headerLineHeight) || 1;
  const filterRowTop = headerHeight ? `${headerHeight}px` : `${22 * parsedHeaderLineHeight}px`;

  // Calculate total table width based on column widths
  const totalTableWidth = useMemo(() => {
    return visibleColumns.reduce((sum, column) => {
      const width = columnWidths[column.id] !== undefined ? columnWidths[column.id] : (column.width || 150);
      return sum + width;
    }, 0);
  }, [columnWidths, visibleColumns]);

  /* ---------- SORTING STATE & HELPERS ---------- */
  const [sortConfig, setSortConfig] = useState<
    | { columnId: string; direction: 'asc' | 'desc' }
    | null
  >(null);

  const handleSort = (columnId: string) => {
    // Disable sorting for Expeditors
    if (isExpeditor) {
      return;
    }

    setSortConfig(prev => {
      if (prev?.columnId === columnId) {
        // Toggle between asc and desc only - no null/unsorted state
        return { columnId, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      // First click on a new column: start with asc
      return { columnId, direction: 'asc' };
    });
  };

  const compareValues = (a: any, b: any) => {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;

    // Convert to strings for processing
    const strA = String(a).trim();
    const strB = String(b).trim();

    // Check if both values are dates
    const dateA = new Date(strA);
    const dateB = new Date(strB);

    // More comprehensive date pattern matching
    const datePatterns = [
      /^\d{4}$/, // Year only (e.g., "2023")
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // MM/DD/YYYY or M/D/YYYY
      /^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}(:\d{2})?/, // MM/DD/YYYY HH:mm or MM/DD/YYYY HH:mm:ss
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?/, // YYYY-MM-DD HH:mm:ss
      /^\d{2}\.\d{2}\.\d{4}$/, // DD.MM.YYYY (European format)
      /^\d{2}\.\d{2}\.\d{4}\s*\|\s*\d{2}:\d{2}/, // DD.MM.YYYY | HH:mm (app specific format)
      /^\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}(:\d{2})?/ // DD.MM.YYYY HH:mm:ss
    ];

    const isValidDateA = !isNaN(dateA.getTime()) && (
      strA.includes('-') || strA.includes('/') || strA.includes('.') ||
      datePatterns.some(pattern => pattern.test(strA))
    );
    const isValidDateB = !isNaN(dateB.getTime()) && (
      strB.includes('-') || strB.includes('/') || strB.includes('.') ||
      datePatterns.some(pattern => pattern.test(strB))
    );

    if (isValidDateA && isValidDateB) {
      return dateA.getTime() - dateB.getTime();
    }

    // Check if both values are numeric
    const numA = parseFloat(strA);
    const numB = parseFloat(strB);
    const bothNumeric = !Number.isNaN(numA) && !Number.isNaN(numB);

    if (bothNumeric) {
      return numA - numB;
    }

    // Default to string comparison
    return strA.localeCompare(strB);
  };

  // Listen for admin mode changes from the dashboard
  useEffect(() => {
    const handleAdminModeChange = (event: CustomEvent) => {
      setAdminMode(event.detail);
    };

    // Check initial admin mode state
    const savedAdminMode = localStorage.getItem('adminMode') === 'true';
    setAdminMode(savedAdminMode);

    window.addEventListener('adminModeChange', handleAdminModeChange as EventListener);

    return () => {
      window.removeEventListener('adminModeChange', handleAdminModeChange as EventListener);
    };
  }, []);

  // Helper function to get nested property value
  const getNestedValue = (obj: any, path: string | string[]) => {
    if (!obj) return undefined;

    // Handle array paths like ['vehicle', 'number']
    if (Array.isArray(path)) {
      return path.reduce((acc, key) => (acc && acc[key] !== undefined) ? acc[key] : undefined, obj);
    }

    // Handle string paths like 'vehicle.number'
    const keys = path.toString().split('.');
    return keys.reduce((acc, key) => (acc && acc[key] !== undefined) ? acc[key] : undefined, obj);
  };

  // Helper function to extract text from React elements
  const extractTextFromReactElement = (element: any): string => {
    if (typeof element === 'string' || typeof element === 'number') {
      return String(element);
    }

    if (element && typeof element === 'object') {
      if (element.props) {
        // Handle React elements
        if (element.props.children) {
          if (Array.isArray(element.props.children)) {
            return element.props.children.map((child: any) => extractTextFromReactElement(child)).join('');
          } else {
            return extractTextFromReactElement(element.props.children);
          }
        }
        // Check for common text props
        if (element.props.title) return String(element.props.title);
        if (element.props.value) return String(element.props.value);
      }

      // Handle plain objects or arrays
      if (Array.isArray(element)) {
        return element.map(item => extractTextFromReactElement(item)).join(' ');
      }
    }

    return '';
  };

  // Initialize column widths with defaults or provided dimensions
  useEffect(() => {
    // Only load once per component lifecycle
    if (hasLoadedDimensionsRef.current) return;
    hasLoadedDimensionsRef.current = true;

    const initialWidths: { [key: string]: number } = {};

    // First set from defaultDimensions if provided
    if (defaultDimensions) {
      Object.keys(defaultDimensions).forEach(key => {
        initialWidths[key] = defaultDimensions[key];
      });
    }

    // Fill in any missing columns with their default width
    columns.forEach(column => {
      if (!(column.id in initialWidths)) {
        initialWidths[column.id] = column.width || 150;
      }
    });

    // If we have a tableName, we used to load saved dimensions here. 
    // Now just initialized with defaults or calculated widths.
    setColumnWidths(initialWidths);
    isInitialLoadRef.current = false;
  }, [columns, defaultDimensions]);



  // Reset sorting when resetSorting prop changes
  useEffect(() => {
    if (resetSorting) {
      setSortConfig(null);
    }
  }, [resetSorting]);

  // Cleanup resize handlers on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending animation frame
      if (resizeAnimationFrameRef.current !== null) {
        cancelAnimationFrame(resizeAnimationFrameRef.current);
      }

      // Remove event listeners if still attached
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);

      // Restore body styles
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, []);

  // Resize handler - updates React state so layout stays consistent (borders don't jump)
  const handleResizeMove = useRef((e: MouseEvent) => {
    if (!resizingRef.current) return;

    const { startX, startWidth, column } = resizingRef.current;
    // Allow width to go down to 20 pixels minimum
    const newWidth = Math.max(20, startWidth + (e.clientX - startX));

    // Cancel any pending animation frame
    if (resizeAnimationFrameRef.current !== null) {
      cancelAnimationFrame(resizeAnimationFrameRef.current);
    }

    // Use requestAnimationFrame for smooth, throttled updates
    resizeAnimationFrameRef.current = requestAnimationFrame(() => {
      setColumnWidths(prev => ({
        ...prev,
        [column]: newWidth,
      }));

      // Store the current width in ref for final state update
      resizingRef.current = {
        ...resizingRef.current,
        currentWidth: newWidth,
      };
    });
  }).current;

  // Handle mouse down on resize handle
  const handleResizeStart = (e: React.MouseEvent, columnId: string) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const currentWidth = columnWidths[columnId] !== undefined ? columnWidths[columnId] : 150;
    const startWidth = currentWidth;

    // Find column index (stored for potential future use)
    const columnIndex = visibleColumns.findIndex(col => col.id === columnId);
    if (columnIndex === -1) return;

    resizingRef.current = {
      column: columnId,
      columnIndex,
      startX,
      startWidth,
      currentWidth: startWidth,
    };

    // Add user-select-none to prevent text selection during resize
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    document.addEventListener('mousemove', handleResizeMove, { passive: true });
    document.addEventListener('mouseup', handleResizeEnd, { once: true });
  };

  // Handle mouse up to end resize
  const handleResizeEnd = useRef(() => {
    if (resizeAnimationFrameRef.current !== null) {
      cancelAnimationFrame(resizeAnimationFrameRef.current);
      resizeAnimationFrameRef.current = null;
    }

    if (resizingRef.current) {
      // Safely read values from ref once, then update state using those locals
      const { column, currentWidth, startWidth } = resizingRef.current;
      const finalWidth = currentWidth ?? startWidth;
      setColumnWidths(prev => ({
        ...prev,
        [column]: finalWidth,
      }));
    }

    // Restore cursor and selection
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    resizingRef.current = null;
    document.removeEventListener('mousemove', handleResizeMove);
  }).current;

  // Memoize filtered and sorted data
  const filteredData = useMemo(() => {
    let processed = [...data];

    // Filtering
    if (Object.keys(filters).length > 0) {
      processed = processed.filter(row => {
        return Object.entries(filters).every(([columnId, filterValue]) => {
          if (!filterValue) return true;

          // Find the column definition
          const column = visibleColumns.find(col => col.id === columnId);
          let searchValue: any;

          if (column?.render && typeof column.render === 'function') {
            // If column has a render function, get the rendered value
            try {
              // For columns with render functions, we need to call the render function
              // and extract the searchable text from the result
              const cellData = getNestedValue(row, columnId);
              const renderedResult = column.render(cellData, row);

              // Handle different render function return types
              if (typeof renderedResult === 'string') {
                searchValue = renderedResult;
              } else if (typeof renderedResult === 'number') {
                searchValue = String(renderedResult);
              } else if (renderedResult && typeof renderedResult === 'object') {
                // Handle React elements - extract text content
                searchValue = extractTextFromReactElement(renderedResult);
              } else {
                // For other types, try to convert to string
                searchValue = String(renderedResult || '');
              }

              // If we couldn't extract meaningful text, try alternative approaches
              if (!searchValue || searchValue.trim() === '') {
                // For specific known problematic columns, handle them specially
                if (columnId === 'order') {
                  // Order No column: combine order.id and counter
                  if (row.groupage_counter === 1) {
                    searchValue = String(row.order?.id || '');
                  } else {
                    searchValue = `${row.order?.id || ''}-${row.counter || ''}`;
                  }
                } else if (columnId === 'invoicer') {
                  // INV column: get invoicer first names
                  const invoicers = row.invoicer || [];
                  searchValue = invoicers.map((inv: any) => inv.first_name).join(', ');
                } else if (columnId === 'recoverer') {
                  // REC column: get recoverer first names
                  const recoverers = row.recoverer || [];
                  searchValue = recoverers.map((rec: any) => rec.first_name).join(', ');
                } else if (columnId === 'payment_terms') {
                  // Payment Term column: combine payment terms fields
                  searchValue = `${row.payment_terms_days || ''} ${row.payment_terms_document || ''} ${row.payment_terms_text || ''}`.trim();
                } else if (columnId === 'exchange_info') {
                  // Exchange Info column: get client_exchange
                  searchValue = String(row.client_exchange || '');
                } else {
                  // Fallback to the original data value
                  searchValue = String(cellData || '');
                }
              }
            } catch (error) {
              // If render function fails, fallback to original value
              console.warn(`Error processing render function for column ${columnId}:`, error);
              searchValue = String(getNestedValue(row, columnId) || '');
            }
          } else {
            // No render function, use the direct value
            searchValue = getNestedValue(row, columnId);
          }

          if (searchValue === undefined || searchValue === null) return false;

          const searchString = String(searchValue || '');
          return searchString.toLowerCase().includes(filterValue.toLowerCase());
        });
      });
    }

    // Sorting
    if (sortConfig && sortConfig.columnId && sortConfig.direction) {
      processed.sort((rowA, rowB) => {
        let valA = getNestedValue(rowA, sortConfig.columnId);
        let valB = getNestedValue(rowB, sortConfig.columnId);

        // If value is undefined or an object (not a sortable value), try to get from render function
        if ((valA === undefined || typeof valA === 'object') || (valB === undefined || typeof valB === 'object')) {
          const column = visibleColumns.find(col => col.id === sortConfig.columnId);
          if (column && column.render) {
            const renderedA = column.render(valA, rowA);
            const renderedB = column.render(valB, rowB);
            valA = extractTextFromReactElement(renderedA);
            valB = extractTextFromReactElement(renderedB);
          }
        }

        const cmp = compareValues(valA, valB);
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      });
    }

    return processed;
  }, [filters, safeData, sortConfig, visibleColumns]);

  // Handle filter change
  const handleFilterChange = (columnId: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [columnId]: value
    }));
  };

  // Count fixed columns
  const fixedColumnsCount = visibleColumns.filter(col => col.fixed).length;

  return (
    <Paper
      ref={tableRef}
      sx={{
        position: 'relative',
        pb: 0,
        mb: 0,
        overflow: 'visible',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        flexGrow: 1,
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb',
        ...(fitContent && {
          width: `${totalTableWidth}px`,
          maxWidth: '100%'
        })
      }}
    >
      {/* Download Button Header */}
      {showDownloadButton && (
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#ffffff',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
        }}>
          <Box sx={{ fontSize: '14px', color: '#6b7280' }}>
            {checkedRows.size > 0 ? `${checkedRows.size} item${checkedRows.size > 1 ? 's' : ''} selected` : `${filteredData.length} items`}
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadSelected}
            disabled={checkedRows.size === 0}
            sx={{
              backgroundColor: '#f97316',
              color: '#ffffff',
              textTransform: 'none',
              fontWeight: 500,
              borderRadius: '8px',
              padding: '6px 16px',
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: '#ea580c',
                boxShadow: 'none',
              },
              '&:disabled': {
                backgroundColor: '#fed7aa',
                color: '#ffffff',
              }
            }}
          >
            Download
          </Button>
        </Box>
      )}
      <StyledTableContainer
        style={fitContent ? {
          width: `${totalTableWidth}px`,
          maxWidth: '100%'
        } : { width: '100%' }}
      >
        <StyledTable
          stickyHeader
          size="small"
          $fontFamily={fontFamily}
          $totalWidth={totalTableWidth + (showCheckboxes ? 50 : 0)}
          style={{ width: '100%' }}
        >
          <colgroup>
            {showCheckboxes && <col style={{ width: 50, minWidth: 50 }} />}
            {visibleColumns.map((column) => (
              <col
                key={column.id}
                data-column-id={column.id}
                style={{
                  width: columnWidths[column.id] !== undefined ? columnWidths[column.id] : (column.width || 150),
                  minWidth: columnWidths[column.id] !== undefined ? columnWidths[column.id] : (column.width || 150)
                }}
              />
            ))}
          </colgroup>
          <TableHead>
            <TableRow ref={headerRowRef}>
              {showCheckboxes && (
                <FixedHeaderCell
                  fontSize={headerNonFrozenFontSize}
                  style={{ width: 50, minWidth: 50, padding: '8px', textAlign: 'center' }}
                >
                  <Checkbox
                    size="small"
                    checked={checkedRows.size === safeData.length && safeData.length > 0}
                    indeterminate={checkedRows.size > 0 && checkedRows.size < safeData.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    sx={{
                      color: '#d1d5db',
                      '&.Mui-checked': { color: '#f97316' },
                      '&.MuiCheckbox-indeterminate': { color: '#f97316' },
                    }}
                  />
                </FixedHeaderCell>
              )}
              {visibleColumns.map((column, index) => {
                const isFixed = column.fixed;
                const isLastFixedColumn = index === visibleColumns.filter(col => col.fixed).length - 1;

                if (isFixed) {
                  return (
                    <FixedHeaderLeftCell
                      key={column.id}
                      index={index}
                      fontSize={headerFrozenFontSize}
                      style={{
                        width: columnWidths[column.id],
                        minWidth: columnWidths[column.id],
                        left: visibleColumns.slice(0, index).reduce((acc, col) => {
                          const w = columnWidths[col.id] !== undefined ? columnWidths[col.id] : 150;
                          return acc + w;
                        }, 0),
                        boxShadow: isLastFixedColumn ? '2px 0px 4px rgba(0,0,0,0.1)' : 'none',
                        fontFamily: `"${fontFamily}", sans-serif`,
                        minHeight: `calc(22px * ${headerLineHeight})`,
                        lineHeight: headerLineHeight,
                      }}
                    >
                      <ResizableHeader
                        onClick={isExpeditor || column.sortable === false ? undefined : () => handleSort(column.id)}
                        style={{ cursor: isExpeditor || column.sortable === false ? 'default' : 'pointer' }}
                      >
                        {column.label}
                        {!isExpeditor && column.sortable !== false && sortConfig?.columnId === column.id &&
                          (sortConfig.direction === 'asc'
                            ? <ArrowDropUpIcon fontSize="small" />
                            : <ArrowDropDownIcon fontSize="small" />)}
                        <ResizeHandleRight
                          onMouseDown={(e: any) => handleResizeStart(e, column.id)}
                        />
                        {/* Left edge handle to resize previous column, rendered if there is a previous column */}
                        {index > 0 && (
                          <ResizeHandleLeft
                            onMouseDown={(e: any) => handleResizeStart(e, visibleColumns[index - 1].id)}
                          />
                        )}
                      </ResizableHeader>
                    </FixedHeaderLeftCell>
                  );
                }

                return (
                  <FixedHeaderCell
                    key={column.id}
                    fontSize={headerNonFrozenFontSize}
                    style={{
                      width: columnWidths[column.id],
                      minWidth: columnWidths[column.id],
                      fontFamily: `"${fontFamily}", sans-serif`,
                      minHeight: `calc(22px * ${headerLineHeight})`,
                      lineHeight: headerLineHeight,
                    }}
                  >
                    <ResizableHeader
                      onClick={isExpeditor || column.sortable === false ? undefined : () => handleSort(column.id)}
                      style={{ cursor: isExpeditor || column.sortable === false ? 'default' : 'pointer' }}
                    >
                      {column.label}
                      {!isExpeditor && column.sortable !== false && sortConfig?.columnId === column.id &&
                        (sortConfig.direction === 'asc'
                          ? <ArrowDropUpIcon fontSize="small" />
                          : <ArrowDropDownIcon fontSize="small" />)}
                      <ResizeHandleRight
                        onMouseDown={(e: any) => handleResizeStart(e, column.id)}
                      />
                      {/* Left edge handle to resize previous column, rendered if there is a previous column */}
                      {index > 0 && (
                        <ResizeHandleLeft
                          onMouseDown={(e: any) => handleResizeStart(e, visibleColumns[index - 1].id)}
                        />
                      )}
                    </ResizableHeader>
                  </FixedHeaderCell>
                );
              })}
            </TableRow>
            <TableRow>
              {showCheckboxes && (
                <FixedFilterCell
                  style={{ width: 50, minWidth: 50, padding: '8px', textAlign: 'center', top: filterRowTop }}
                />
              )}
              {visibleColumns.map((column, index) => {
                const isFixed = column.fixed;
                const isLastFixedColumn = index === visibleColumns.filter(col => col.fixed).length - 1;

                // If showTotal is defined, show total instead of search
                if (column.showTotal !== undefined) {
                  if (isFixed) {
                    return (
                      <FixedFilterLeftCell
                        key={`filter-${column.id}`}
                        index={index}
                        style={{
                          width: columnWidths[column.id],
                          minWidth: columnWidths[column.id],
                          left: visibleColumns.slice(0, index).reduce((acc, col) => {
                            const w = columnWidths[col.id] !== undefined ? columnWidths[col.id] : 150;
                            return acc + w;
                          }, 0),
                          boxShadow: isLastFixedColumn ? '2px 0px 4px rgba(0,0,0,0.1)' : 'none',
                          textAlign: 'center',
                          fontWeight: 600,
                          color: '#3b82f6',
                          fontSize: rowsNonFrozenFontSize,
                          fontFamily: `"${fontFamily}", sans-serif`,
                          top: filterRowTop,
                          lineHeight: '0.9',
                          height: `${searchBarHeight + 4}px`,
                        }}
                      >
                        {column.showTotal}
                      </FixedFilterLeftCell>
                    );
                  }
                  return (
                    <FixedFilterCell
                      key={`filter-${column.id}`}
                      style={{
                        width: columnWidths[column.id],
                        minWidth: columnWidths[column.id],
                        textAlign: 'center',
                        fontWeight: 'bold',
                        color: '#3b82f6',
                        fontSize: rowsNonFrozenFontSize,
                        fontFamily: `"${fontFamily}", sans-serif`,
                        top: filterRowTop,
                        lineHeight: '0.9',
                        height: `${searchBarHeight + 4}px`,
                      }}
                    >
                      {column.showTotal}
                    </FixedFilterCell>
                  );
                }

                // Skip rendering search input if searchable is false
                if (column.searchable === false) {
                  if (isFixed) {
                    return (
                      <FixedFilterLeftCell
                        key={`filter-${column.id}`}
                        index={index}
                        style={{
                          width: columnWidths[column.id],
                          minWidth: columnWidths[column.id],
                          left: visibleColumns.slice(0, index).reduce((acc, col) => {
                            const w = columnWidths[col.id] !== undefined ? columnWidths[col.id] : 150;
                            return acc + w;
                          }, 0),
                          boxShadow: isLastFixedColumn ? '2px 0px 4px rgba(0,0,0,0.1)' : 'none',
                          fontFamily: `"${fontFamily}", sans-serif`,
                          top: filterRowTop,
                          lineHeight: '0.9',
                          height: `${searchBarHeight + 4}px`,
                        }}
                      />
                    );
                  }
                  return (
                    <FixedFilterCell
                      key={`filter-${column.id}`}
                      style={{
                        width: columnWidths[column.id],
                        minWidth: columnWidths[column.id],
                        fontFamily: `"${fontFamily}", sans-serif`,
                        top: filterRowTop,
                        lineHeight: '0.9',
                        height: `${searchBarHeight + 4}px`,
                      }}
                    />
                  );
                }

                if (isFixed) {
                  return (
                    <FixedFilterLeftCell
                      key={`filter-${column.id}`}
                      index={index}
                      style={{
                        width: columnWidths[column.id],
                        minWidth: columnWidths[column.id],
                        left: visibleColumns.slice(0, index).reduce((acc, col) => {
                          const w = columnWidths[col.id] !== undefined ? columnWidths[col.id] : 150;
                          return acc + w;
                        }, 0),
                        boxShadow: isLastFixedColumn ? '2px 0px 4px rgba(0,0,0,0.1)' : 'none',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        color: '#3b82f6',
                        fontSize: rowsNonFrozenFontSize,
                        fontFamily: `"${fontFamily}", sans-serif`,
                        top: filterRowTop,
                        lineHeight: '0.9',
                        height: `${searchBarHeight + 4}px`,
                      }}
                    >
                      <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={filters[column.id] || ''}
                          onChange={(e) => handleFilterChange(column.id, e.target.value)}
                          placeholder="Search..."
                          style={{
                            width: '100%',
                            height: `${searchBarHeight}px`,
                            border: '1px solid #e2e8f0',
                            fontSize: searchBarFontSize,
                            padding: '4px 24px 4px 8px',
                            outline: 'none',
                            borderRadius: '6px',
                            backgroundColor: '#ffffff',
                            color: '#334155',
                            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#3b82f6';
                            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#e2e8f0';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                        {filters[column.id] && (
                          <span
                            onClick={() => handleFilterChange(column.id, '')}
                            style={{
                              position: 'absolute',
                              right: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: '#94a3b8',
                              fontWeight: 500,
                              lineHeight: 1,
                              width: '16px',
                              height: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '50%',
                              backgroundColor: '#f1f5f9',
                              transition: 'background-color 0.15s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                          >
                            ×
                          </span>
                        )}
                      </div>
                    </FixedFilterLeftCell>
                  );
                }

                return (
                  <FixedFilterCell
                    key={`filter-${column.id}`}
                    style={{
                      width: columnWidths[column.id],
                      minWidth: columnWidths[column.id],
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: '#3b82f6',
                      fontSize: rowsNonFrozenFontSize,
                      fontFamily: `"${fontFamily}", sans-serif`,
                      top: filterRowTop,
                      lineHeight: '0.9',
                      height: `${searchBarHeight + 4}px`,
                    }}
                  >
                    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={filters[column.id] || ''}
                        onChange={(e) => handleFilterChange(column.id, e.target.value)}
                        placeholder="Search..."
                        style={{
                          width: '100%',
                          height: `${searchBarHeight}px`,
                          border: '1px solid #e2e8f0',
                          fontSize: searchBarFontSize,
                          padding: '4px 24px 4px 8px',
                          outline: 'none',
                          borderRadius: '6px',
                          backgroundColor: '#ffffff',
                          color: '#334155',
                          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#3b82f6';
                          e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e2e8f0';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                      {filters[column.id] && (
                        <span
                          onClick={() => handleFilterChange(column.id, '')}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: '#94a3b8',
                            fontWeight: 500,
                            lineHeight: 1,
                            width: '16px',
                            height: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            backgroundColor: '#f1f5f9',
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                        >
                          ×
                        </span>
                      )}
                    </div>
                  </FixedFilterCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {(() => {
              // Create a mapping of parent_order to group index for alternating colors (only if useGroupedRowColors is enabled)
              const parentOrderGroups = new Map<number | null, number>();

              if (useGroupedRowColors) {
                // All rows with the same parent_order should have the same background color
                let groupIndex = 0;
                let lastParentOrder: number | null = null;

                filteredData.forEach((row: any) => {
                  const currentParentOrder = row.parent_order ?? null;

                  // If we haven't seen this parent_order before, or it's different from the last one
                  if (!parentOrderGroups.has(currentParentOrder)) {
                    // Only increment group if parent order changed (not just first occurrence)
                    if (lastParentOrder !== null && currentParentOrder !== lastParentOrder) {
                      groupIndex++;
                    }
                    parentOrderGroups.set(currentParentOrder, groupIndex);
                    lastParentOrder = currentParentOrder;
                  }
                });
              }

              return filteredData.map((row, rowIndex) => {
                const isSelected = Array.isArray(selectedRow)
                  ? selectedRow.some(selected => selected.id === row.id)
                  : selectedRow && selectedRow.id === row.id;
                const isHovered = hoveredRowIndex === rowIndex;

                // Determine which index to use for alternating colors
                let colorIndex: number;
                if (useGroupedRowColors) {
                  // Get the group index for this row's parent_order
                  colorIndex = parentOrderGroups.get((row as any).parent_order ?? null) || 0;
                } else {
                  // Use normal row index
                  colorIndex = rowIndex;
                }

                // Check if row is checked (for checkbox selection)
                const isChecked = checkedRows.has(rowIndex);

                // Determine row background color based on hover and selection state
                let rowBgColor: string;
                if (isSelected || isChecked) {
                  rowBgColor = '#fef3c7'; // Yellow/gold selection
                } else if (isHovered) {
                  rowBgColor = '#fafafa'; // Subtle hover
                } else {
                  rowBgColor = '#ffffff';
                }

                // Apply custom row style if provided
                const customRowStyle = getRowStyle ? getRowStyle(row) : undefined;
                if (customRowStyle?.backgroundColor && !isSelected && !isHovered) {
                  rowBgColor = customRowStyle.backgroundColor;
                }

                return (
                  <TableRow
                    key={rowIndex}
                    onClick={() => onRowClick && onRowClick(row)}
                    selected={isSelected}
                    hover
                    style={{
                      cursor: onRowClick ? 'pointer' : 'default',
                      backgroundColor: rowBgColor,
                      height: lineHeight ? `calc(18px * ${lineHeight})` : '18px',
                      fontFamily: `"${fontFamily}", sans-serif`,
                      ...customRowStyle
                    }}
                    onMouseEnter={() => setHoveredRowIndex(rowIndex)}
                    onMouseLeave={() => setHoveredRowIndex(null)}
                  >
                    {showCheckboxes && (
                      <TableCell
                        style={{
                          width: 50,
                          minWidth: 50,
                          padding: '8px',
                          textAlign: 'center',
                          backgroundColor: isChecked ? '#fef3c7' : rowBgColor,
                          borderBottom: '1px solid #f0f0f0',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          size="small"
                          checked={isChecked}
                          onChange={() => handleCheckboxChange(rowIndex, row)}
                          sx={{
                            color: '#d1d5db',
                            '&.Mui-checked': { color: '#f97316' },
                          }}
                        />
                      </TableCell>
                    )}
                    {visibleColumns.map((column, colIndex) => {
                      const isFixed = column.fixed;
                      const value = getNestedValue(row, column.id);
                      const content = column.render ? column.render(value, row) : value;

                      if (isFixed) {
                        // Check if this is an unloading date column and should be highlighted red
                        const shouldHighlightUnloadingRed = (column.id === 'unloading_date') && shouldHighlightUnloadingDate(row);
                        // Check if this is a Pal column and should be highlighted red
                        const highlightPalRed = (column.id === 'swapped_pallets') && shouldHighlightPalRed(row);
                        // Get profit cell color if this is a profit column
                        const profitCellColor = (column.id === 'profit') ? getProfitCellColor(row) : undefined;
                        // Get custom cell style from column definition if provided
                        const customCellStyle = column.getCellStyle ? column.getCellStyle(value, row) : undefined;
                        const customBgColor = customCellStyle?.backgroundColor;

                        // Determine background color for fixed cells
                        // Selection takes precedence over all other states
                        let bgColor = '';
                        let textColor = 'inherit';

                        if (isSelected || isChecked) {
                          bgColor = '#fef3c7';
                          textColor = '#1f2937';
                        } else if (shouldHighlightUnloadingRed || highlightPalRed) {
                          bgColor = '#ef4444';
                        } else if (profitCellColor) {
                          bgColor = profitCellColor;
                        } else if (customBgColor) {
                          bgColor = customBgColor;
                        } else if (customRowStyle?.backgroundColor) {
                          bgColor = customRowStyle.backgroundColor;
                        } else if (isHovered) {
                          bgColor = '#fafafa';
                        } else {
                          bgColor = '#ffffff';
                        }

                        // Add shadow to the last fixed column
                        const isLastFixedColumn = colIndex === visibleColumns.filter(col => col.fixed).length - 1;

                        return (
                          <FixedLeftCell
                            key={column.id}
                            index={colIndex}
                            fontSize={rowsFrozenFontSize}
                            style={{
                              width: columnWidths[column.id],
                              minWidth: columnWidths[column.id],
                              left: visibleColumns.slice(0, colIndex).reduce((acc, col) => {
                                const w = columnWidths[col.id] !== undefined ? columnWidths[col.id] : 150;
                                return acc + w;
                              }, 0),
                              backgroundColor: bgColor,
                              boxShadow: isLastFixedColumn ? '2px 0px 4px rgba(0,0,0,0.1)' : 'none',
                              color: textColor,
                              fontFamily: `"${fontFamily}", sans-serif`
                            }}
                            className={`fixed-column${isSelected ? ' selected-cell' : ''}`}
                          >
                            {content}
                          </FixedLeftCell>
                        );
                      }

                      // Check if this is an unloading date column and should be highlighted red
                      const shouldHighlightUnloadingRed = (column.id === 'unloading_date') && shouldHighlightUnloadingDate(row);
                      // Check if this is a Pal column and should be highlighted red
                      const highlightPalRed = (column.id === 'swapped_pallets') && shouldHighlightPalRed(row);
                      // Get profit cell color if this is a profit column
                      const profitCellColor = (column.id === 'profit') ? getProfitCellColor(row) : undefined;
                      // Get custom cell style from column definition if provided
                      const customCellStyle = column.getCellStyle ? column.getCellStyle(value, row) : undefined;
                      const customBgColor = customCellStyle?.backgroundColor;

                      // Determine background color
                      let cellBgColor: string | undefined = undefined;
                      if (shouldHighlightUnloadingRed || highlightPalRed) {
                        cellBgColor = '#ef4444';
                      } else if (profitCellColor) {
                        cellBgColor = profitCellColor;
                      } else if (customBgColor) {
                        cellBgColor = customBgColor;
                      } else if (customRowStyle?.backgroundColor && !isSelected) {
                        // Use custom row background color if no cell-specific color
                        cellBgColor = customRowStyle.backgroundColor;
                      }

                      return (
                        <TableCell
                          key={column.id}
                          className={isSelected ? 'selected-cell' : ''}
                          style={{
                            width: columnWidths[column.id],
                            minWidth: columnWidths[column.id],
                            padding: 0,
                            height: lineHeight ? `calc(18px * ${lineHeight})` : '18px',
                            lineHeight: lineHeight ? `calc(18px * ${lineHeight})` : '18px',
                            fontSize: rowsNonFrozenFontSize,
                            fontFamily: `"${fontFamily}", sans-serif`,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            position: 'relative',
                            textAlign: 'left',
                            backgroundColor: isChecked ? '#fef3c7' : (cellBgColor || undefined),
                            color: '#1f2937',
                            borderBottom: '1px solid #f0f0f0',
                            borderRight: 'none',
                          }}
                        >
                          {content}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              });
            })()}
          </TableBody>
        </StyledTable>
      </StyledTableContainer>
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: '12px'
        }}>
          <PageLoader text="Loading data..." />
        </div>
      )}
    </Paper>
  );
};

export default FixedTable;