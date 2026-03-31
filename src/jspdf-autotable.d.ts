// Type declarations for jspdf-autotable
declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';

  interface AutoTableOptions {
    head?: any[][];
    body?: any[][];
    foot?: any[][];
    startY?: number;
    theme?: 'striped' | 'grid' | 'plain';
    headStyles?: any;
    bodyStyles?: any;
    footStyles?: any;
    styles?: any;
    columnStyles?: any;
    margin?: { top?: number; right?: number; bottom?: number; left?: number };
    didDrawPage?: (data: any) => void;
    didDrawCell?: (data: any) => void;
  }

  export default function autoTable(doc: jsPDF, options: AutoTableOptions): void;
}
