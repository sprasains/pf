import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import dayjs from 'dayjs';

export type ExportFormat = 'json' | 'csv' | 'xlsx' | 'pdf';
export type ExportType = 'workflow' | 'analytics' | 'billing';

export interface ExportOptions {
  format: ExportFormat;
  type: ExportType;
  dateRange?: [Date, Date];
  includeMetadata?: boolean;
  templateId?: string;
}

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  type: ExportType;
  fields: string[];
  format: ExportFormat;
}

const EXPORT_TEMPLATES: ExportTemplate[] = [
  {
    id: 'monthly-execution-report',
    name: 'Monthly Execution Report',
    description: 'Comprehensive report of workflow executions for the month',
    type: 'analytics',
    fields: ['workflowName', 'status', 'executionTime', 'user', 'date'],
    format: 'xlsx',
  },
  {
    id: 'workflow-audit-log',
    name: 'Workflow Audit Log',
    description: 'Detailed audit trail of workflow changes and executions',
    type: 'workflow',
    fields: ['workflowId', 'action', 'user', 'timestamp', 'details'],
    format: 'pdf',
  },
  {
    id: 'billing-summary',
    name: 'Billing Summary by Org',
    description: 'Organization-wide billing and usage summary',
    type: 'billing',
    fields: ['organization', 'plan', 'amount', 'period', 'usage'],
    format: 'csv',
  },
];

export const exportToCSV = (data: any[], filename: string) => {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `${filename}.csv`);
};

export const exportToJSON = (data: any, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  saveAs(blob, `${filename}.json`);
};

export const exportToExcel = async (data: any[], filename: string) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');

  // Add headers
  const headers = Object.keys(data[0]);
  worksheet.addRow(headers);

  // Add data
  data.forEach(item => {
    worksheet.addRow(Object.values(item));
  });

  // Style headers
  worksheet.getRow(1).font = { bold: true };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
};

export const exportToPDF = (data: any[], filename: string) => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text('Export Report', 14, 15);
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Generated: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`, 14, 25);

  // Add table
  (doc as any).autoTable({
    head: [Object.keys(data[0])],
    body: data.map(item => Object.values(item)),
    startY: 30,
  });

  doc.save(`${filename}.pdf`);
};

export const getExportTemplates = (type?: ExportType): ExportTemplate[] => {
  if (type) {
    return EXPORT_TEMPLATES.filter(template => template.type === type);
  }
  return EXPORT_TEMPLATES;
};

export const getTemplateById = (templateId: string): ExportTemplate | undefined => {
  return EXPORT_TEMPLATES.find(template => template.id === templateId);
};

export const scheduleExport = async (options: ExportOptions): Promise<{ jobId: string }> => {
  const response = await fetch('/api/export/schedule', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    throw new Error('Failed to schedule export');
  }

  return response.json();
};

export const checkExportStatus = async (jobId: string): Promise<{ status: string; fileUrl?: string }> => {
  const response = await fetch(`/api/export/status/${jobId}`);
  
  if (!response.ok) {
    throw new Error('Failed to check export status');
  }

  return response.json();
};

export const exportWorkflow = async (workflowId: string, includeMetadata: boolean = false) => {
  try {
    const response = await fetch(`/api/workflows/${workflowId}/export`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export workflow');
    }

    const data = await response.json();
    
    if (includeMetadata) {
      // Create a zip file with workflow and metadata
      const zip = new JSZip();
      zip.file('workflow.json', JSON.stringify(data.workflow, null, 2));
      if (data.metadata) {
        zip.file('metadata.json', JSON.stringify(data.metadata, null, 2));
      }
      if (data.thumbnail) {
        zip.file('thumbnail.png', data.thumbnail, { base64: true });
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `workflow-${workflowId}-${format(new Date(), 'yyyy-MM-dd')}.zip`);
    } else {
      // Export just the workflow as JSON
      exportToJSON(data.workflow, {
        filename: `workflow-${workflowId}-${format(new Date(), 'yyyy-MM-dd')}.json`,
      });
    }
  } catch (error) {
    console.error('Error exporting workflow:', error);
    throw error;
  }
};

export const exportAnalytics = async (options: ExportOptions) => {
  try {
    const params = new URLSearchParams();
    if (options.dateRange) {
      params.append('from', format(options.dateRange.from, 'yyyy-MM-dd'));
      params.append('to', format(options.dateRange.to, 'yyyy-MM-dd'));
    }

    const response = await fetch(`/api/analytics/export?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export analytics');
    }

    const data = await response.json();
    
    if (options.format === 'csv') {
      exportToCSV(data, {
        filename: `analytics-${format(options.dateRange?.from || new Date(), 'yyyy-MM-dd')}.csv`,
      });
    } else {
      exportToJSON(data, {
        filename: `analytics-${format(options.dateRange?.from || new Date(), 'yyyy-MM-dd')}.json`,
      });
    }
  } catch (error) {
    console.error('Error exporting analytics:', error);
    throw error;
  }
};

export const exportBillingHistory = async (options: ExportOptions) => {
  try {
    const params = new URLSearchParams();
    if (options.dateRange) {
      params.append('from', format(options.dateRange.from, 'yyyy-MM-dd'));
      params.append('to', format(options.dateRange.to, 'yyyy-MM-dd'));
    }

    const response = await fetch(`/api/billing/history?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export billing history');
    }

    const data = await response.json();
    
    if (options.format === 'csv') {
      exportToCSV(data, {
        filename: `billing-history-${format(options.dateRange?.from || new Date(), 'yyyy-MM-dd')}.csv`,
      });
    } else {
      exportToJSON(data, {
        filename: `billing-history-${format(options.dateRange?.from || new Date(), 'yyyy-MM-dd')}.json`,
      });
    }
  } catch (error) {
    console.error('Error exporting billing history:', error);
    throw error;
  }
}; 