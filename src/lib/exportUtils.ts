/**
 * exportUtils.ts
 * Shared export utilities for the Boilerplate App.
 * Provides a consistent header & footer for all PDF and CSV exports.
 * Only the report-specific details (title, subtitle, record count, filename) change per report.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType, AlignmentType } from 'docx';

import { useAppInfoStore } from '@/store/useAppInfoStore';

// ─── Brand Constants ─────────────────────────────────────────────────────────

const getSystemName = () => useAppInfoStore.getState().appName || 'Boilerplate App';
const getSystemSubtitle = () => useAppInfoStore.getState().reportSubtitle || 'System Report';
const getOrgName = () => useAppInfoStore.getState().companyName || 'My Company';
const getFooterText = () => useAppInfoStore.getState().reportFooterText || 'Confidential Report.';

const getReportFont = () => useAppInfoStore.getState().reportFont || 'helvetica';
const getReportCompactMode = () => useAppInfoStore.getState().reportCompactMode || false;
const getReportLogo = () => useAppInfoStore.getState().reportLogo || useAppInfoStore.getState().appIcon;

// Helper to convert hex to RGB
function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 6) {
    return [
      parseInt(cleanHex.substring(0, 2), 16),
      parseInt(cleanHex.substring(2, 4), 16),
      parseInt(cleanHex.substring(4, 6), 16)
    ];
  }
  return [79, 70, 229]; // Default indigo-600
}

const getAccentColor = (): [number, number, number] => {
  const hex = useAppInfoStore.getState().reportAccentColor || '#4f46e5';
  return hexToRgb(hex);
};

const HEADER_BG:    [number, number, number] = [238, 242, 255]; // indigo-50
const DIVIDER:      [number, number, number] = [199, 210, 254]; // indigo-200
const TEXT_MID:     [number, number, number] = [71,  85, 105];  // slate-600
const TEXT_LIGHT:   [number, number, number] = [148, 163, 184]; // slate-400
const FOOTER_BG:    [number, number, number] = [248, 250, 252]; // slate-50

// Header height (pts) — tall enough for two text rows + breathing room
const HEADER_H = 34;
const ACCENT_BAR_W = 6;

// ─── PDF Header ───────────────────────────────────────────────────────────────

export interface PdfHeaderOptions {
  /** Report title, e.g. "App Summary Report" */
  title: string;
  /** Short description shown below the title */
  subtitle?: string;
  /** Row count string, e.g. "42 vehicles" */
  recordCount?: string;
  /** Optional filter description, e.g. "Filtered by: 2025 · completed" */
  filterDescription?: string;
  /**
   * Whether to show the factory name in the header.
   * Set to false for admin-generated reports that span all factories.
   * Defaults to true.
   */
  showFactory?: boolean;
  /**
   * Override the factory name shown in the header.
   * Defaults to the built-in constant when not provided.
   */
  factoryName?: string;
  /**
   * Override the organisation name shown in the header.
   * Defaults to the built-in constant when not provided.
   */
  orgName?: string;
  /**
   * When true, renders a compact (shorter) header — ideal for landscape PDFs
   * where vertical space is at a premium.
   */
  compact?: boolean;
  /**
   * Font name to use for rendering text in the header.
   */
  fontName?: string;
}

/**
 * Draws a premium branded header block at the top of the current jsPDF page.
 * Returns the Y coordinate immediately after the header (ready for content).
 */
export function addPdfHeader(doc: jsPDF, options: PdfHeaderOptions): number {
  const pw     = doc.internal.pageSize.getWidth();
  const margin = 16;
  const storeCompact = getReportCompactMode();
  const compact = options.compact === true || storeCompact;

  // Compact mode: ultra-slim header for landscape PDFs
  const H         = compact ? 24 : HEADER_H;
  const logoSize  = compact ? 14 : 20;
  const logoY     = compact ? 5 : 7;
  const titleSize = compact ? 10 : 12;
  const titleY    = compact ? 13 : 18;
  const subtitleY = compact ? 19 : 26;
  const labelY    = compact ? 7 : 10;

  // ── 1. Full-width header background ─────────────────────────────────────
  doc.setFillColor(...HEADER_BG);
  doc.rect(0, 0, pw, H, 'F');

  // ── 2. Left accent bar (full height) (Removed) ─────────────────────────
  const accentColor = getAccentColor();

  const font = options.fontName || getReportFont();

  // ── 3. Small logo box / Branding ────────────
  let textX = ACCENT_BAR_W + margin;
  const logoStr = getReportLogo();
  if (logoStr) {
    try {
      doc.addImage(logoStr, 'PNG', ACCENT_BAR_W + margin, logoY, logoSize, logoSize);
    } catch (e) {
      console.warn('Failed to add logo to PDF header', e);
    }
    textX = ACCENT_BAR_W + margin + logoSize + 8;
  }

  // ── 4. Title block (to the right of logo) ───────────────────────────────

  // System name (small label above title)
  doc.setFontSize(compact ? 5 : 7);
  doc.setFont(font, 'normal');
  doc.setTextColor(...TEXT_LIGHT);
  doc.text(getSystemName().toUpperCase(), textX, compact ? 9 : 16);

  // Main report title
  doc.setFontSize(titleSize);
  doc.setFont(font, 'bold');
  doc.setTextColor(...accentColor);
  doc.text(options.title, textX, titleY);

  // Subtitle (optional)
  if (options.subtitle) {
    doc.setFontSize(compact ? 7 : 7.5);
    doc.setFont(font, 'normal');
    doc.setTextColor(...TEXT_MID);
    // Truncate if too long to avoid overflow
    const maxW = pw - textX - margin - 80;
    const lines = doc.splitTextToSize(options.subtitle, maxW) as string[];
    doc.text(lines[0], textX, subtitleY);
  }

  // ── 5. Right-side metadata block ────────────────────────────────────────
  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const showFactory = options.showFactory !== false;
  const factoryLabel = options.factoryName ?? getSystemSubtitle();
  const orgLabel     = options.orgName     ?? getOrgName();

  let rY = labelY;
  const lineGap = compact ? 4.5 : 5.5;

  if (showFactory) {
    doc.setFontSize(compact ? 6 : 7.5);
    doc.setFont(font, 'bold');
    doc.setTextColor(...accentColor);
    doc.text(factoryLabel, pw - margin, rY, { align: 'right' });
    rY += lineGap;
    doc.setFontSize(compact ? 5 : 6);
    doc.setFont(font, 'normal');
    doc.setTextColor(...TEXT_MID);
    doc.text(orgLabel, pw - margin, rY, { align: 'right' });
    rY += compact ? 4 : 5.5;
  }

  doc.setFontSize(compact ? 5 : 6);
  doc.setFont(font, 'normal');
  doc.setTextColor(...TEXT_LIGHT);
  doc.text(`Generated: ${dateStr}  ${timeStr}`, pw - margin, rY, { align: 'right' });
  rY += compact ? 4 : 5;

  if (options.recordCount) {
    doc.text(`Records: ${options.recordCount}`, pw - margin, rY, { align: 'right' });
    rY += compact ? 4 : 5;
  }

  if (options.filterDescription) {
    doc.setFontSize(compact ? 5 : 6.5);
    doc.text(options.filterDescription, pw - margin, rY, { align: 'right' });
  }

  // ── 7. Subtle shadow line ───────────────────────────────
  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.3);
  doc.line(0, H, pw, H);

  return H + (compact ? 4 : 6); // Y start for content (with breathing room)
}

// ─── PDF Footer ───────────────────────────────────────────────────────────────

/**
 * Draws a premium branded footer on the current page.
 */
export function addPdfFooter(
  doc: jsPDF,
  pageNum: number,
  totalPages: number,
  showFactory = true,
  factoryName?: string,
  compact = false,
  fontName?: string
): void {
  const pw     = doc.internal.pageSize.getWidth();
  const ph     = doc.internal.pageSize.getHeight();
  const margin = 16;
  const storeCompact = getReportCompactMode();
  const isCompact = compact || storeCompact;
  const FOOTER_H = isCompact ? 12 : 14;
  const footerY  = ph - FOOTER_H;
  const factoryLabel = factoryName ?? getSystemSubtitle();

  // ── Background strip ────────────────────────────────────────────────────
  doc.setFillColor(...FOOTER_BG);
  doc.rect(0, footerY, pw, FOOTER_H, 'F');

  // ── Top border line ─────────────────────────────────────────────────────
  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.4);
  doc.line(0, footerY, pw, footerY);

  // ── Left accent bar (matches header) ────────────────────────────────────
  const accentColor = getAccentColor();
  doc.setFillColor(...accentColor);
  doc.rect(0, footerY, ACCENT_BAR_W, FOOTER_H, 'F');

  const textY = footerY + (isCompact ? 8 : 9.5);

  const font = fontName || getReportFont();

  // ── Left text ───────────────────────────────────────────────────────────
  doc.setFontSize(isCompact ? 5.5 : 6.5);
  doc.setFont(font, 'normal');
  doc.setTextColor(...TEXT_LIGHT);
  const customFooter = getFooterText();
  const leftText = showFactory
    ? `${getSystemName()}  ·  ${factoryLabel}  ·  ${customFooter}`
    : `${getSystemName()}  ·  ${customFooter}`;
  doc.text(leftText, ACCENT_BAR_W + margin, textY);

  // ── Right: page number with styled badge ────────────────────────────────
  const pageStr = `Page ${pageNum} of ${totalPages}`;
  doc.setFont(font, 'bold');
  const pgW = doc.getTextWidth(pageStr);

  const badgeW = pgW + 16;
  const badgeX = pw - margin - badgeW;
  const badgeY = footerY + (isCompact ? 2 : 3);
  const badgeH = isCompact ? 8 : 8;

  // Badge background
  doc.setFillColor(...HEADER_BG);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 4, 4, 'F');

  // Badge text
  doc.setTextColor(...accentColor);
  doc.text(pageStr, pw - margin - 8, textY, { align: 'right' });
}

/**
 * Draws footers on every page of the document after autoTable is rendered.
 * Pass `factoryName` to override the built-in hardcoded factory constant.
 */
export function addPdfFootersToAllPages(doc: jsPDF, showFactory = true, factoryName?: string, compact = false, fontName = 'helvetica'): void {
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPdfFooter(doc, i, totalPages, showFactory, factoryName, compact, fontName);
  }
}

// ─── CSV Utilities ────────────────────────────────────────────────────────────

export interface CsvHeaderOptions {
  /** Report title */
  title: string;
  /** Short description shown below the title */
  subtitle?: string;
  /** Optional filter description */
  filterDescription?: string;
  /** Number of data records */
  recordCount?: number;
  /** Override the factory name line in the CSV metadata block */
  factoryName?: string;
  /** Override the organisation name line in the CSV metadata block */
  orgName?: string;
}

/**
 * Builds a CSV string with a standardized header block prepended.
 */
export function buildCsvWithHeader(
  headers: string[],
  rows: (string | number | null | undefined)[][],
  options: CsvHeaderOptions
): string {
  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const factoryLabel = options.factoryName ?? getSystemSubtitle();
  const orgLabel     = options.orgName     ?? getOrgName();

  const metaLines = [
    `"${getSystemName()}"`,
    `"${orgLabel}"`,
    `"${factoryLabel}"`,
    `"Report: ${options.title}"`,

    ...(options.subtitle ? [`"${options.subtitle}"`] : []),
    `"Generated: ${dateStr}  ${timeStr}"`,
    ...(options.filterDescription ? [`"Filter: ${options.filterDescription}"`] : []),
    ...(options.recordCount != null ? [`"Total Records: ${options.recordCount}"`] : []),
    '', // blank separator row
  ];

  const quoteCell = (c: string | number | null | undefined) =>
    `"${String(c ?? '').replace(/"/g, '""')}"`;

  const dataLines = [headers, ...rows].map(r => r.map(quoteCell).join(','));

  return [...metaLines, ...dataLines].join('\n');
}

/**
 * Triggers a browser download of a CSV string.
 */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Convenience: generate a dated filename ───────────────────────────────────

export function dateSuffix(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Re-export autoTable so consumers only import from one place ──────────────

export { autoTable };

// ─── Excel Utilities ───────────────────────────────────────────────────────────

export function downloadExcel(
  headers: string[],
  rows: (string | number | null | undefined)[][],
  options: CsvHeaderOptions,
  filename: string
): void {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const factoryLabel = options.factoryName ?? getSystemSubtitle();
  const orgLabel = options.orgName ?? getOrgName();

  const metaLines = [
    [getSystemName()],
    [orgLabel],
    [factoryLabel],
    [`Report: ${options.title}`],
    ...(options.subtitle ? [[options.subtitle]] : []),
    [`Generated: ${dateStr}  ${timeStr}`],
    ...(options.filterDescription ? [[`Filter: ${options.filterDescription}`]] : []),
    ...(options.recordCount != null ? [[`Total Records: ${options.recordCount}`]] : []),
    [], // blank separator row
  ];

  const ws = XLSX.utils.aoa_to_sheet([...metaLines, headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

// ─── Word Utilities ────────────────────────────────────────────────────────────

export async function downloadWord(
  headers: string[],
  rows: (string | number | null | undefined)[][],
  options: CsvHeaderOptions,
  filename: string
): Promise<void> {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const factoryLabel = options.factoryName ?? getSystemSubtitle();
  const orgLabel = options.orgName ?? getOrgName();

  const tableRows = [
    // Header Row
    new TableRow({
      tableHeader: true,
      children: headers.map(
        (header) =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })] })],
            shading: { fill: "f3f4f6" }, // light gray background for headers
          })
      ),
    }),
    // Data Rows
    ...rows.map(
      (row) =>
        new TableRow({
          children: row.map(
            (cell) =>
              new TableCell({
                children: [new Paragraph(String(cell ?? ''))],
              })
          ),
        })
    ),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: getSystemName(),
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: orgLabel,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: factoryLabel,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `Report: ${options.title}`,
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
          }),
          ...(options.subtitle
            ? [
                new Paragraph({
                  text: options.subtitle,
                  alignment: AlignmentType.CENTER,
                }),
              ]
            : []),
          new Paragraph({
            text: `Generated: ${dateStr}  ${timeStr}`,
            alignment: AlignmentType.CENTER,
          }),
          ...(options.filterDescription
            ? [
                new Paragraph({
                  text: `Filter: ${options.filterDescription}`,
                  alignment: AlignmentType.CENTER,
                }),
              ]
            : []),
          ...(options.recordCount != null
            ? [
                new Paragraph({
                  text: `Total Records: ${options.recordCount}`,
                  alignment: AlignmentType.CENTER,
                }),
              ]
            : []),
          new Paragraph({ text: "" }), // Spacing before table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".docx") ? filename : `${filename}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
