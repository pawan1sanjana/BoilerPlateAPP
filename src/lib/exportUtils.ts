/**
 * exportUtils.ts
 * Shared export utilities for the Boilerplate App.
 * Provides a consistent header & footer for all PDF and CSV exports.
 * Only the report-specific details (title, subtitle, record count, filename) change per report.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Brand Constants ─────────────────────────────────────────────────────────

const SYSTEM_NAME    = 'Boilerplate App';
const SYSTEM_SUBTITLE = 'Rekadahena Tea Factory';
const ORG_NAME       = 'Rekadahena Plantations (Pvt) Ltd';

// Palette — indigo-based brand
const ACCENT:       [number, number, number] = [79,  70, 229]; // indigo-600
const ACCENT_DARK:  [number, number, number] = [55,  48, 163]; // indigo-800
const HEADER_BG:    [number, number, number] = [238, 242, 255]; // indigo-50
const DIVIDER:      [number, number, number] = [199, 210, 254]; // indigo-200
const TEXT_DARK:    [number, number, number] = [30,  41,  59];  // slate-800
const TEXT_MID:     [number, number, number] = [71,  85, 105];  // slate-600
const TEXT_LIGHT:   [number, number, number] = [148, 163, 184]; // slate-400
const WHITE:        [number, number, number] = [255, 255, 255];
const FOOTER_BG:    [number, number, number] = [248, 250, 252]; // slate-50

// Header height (pts) — tall enough for two text rows + breathing room
const HEADER_H = 52;
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
  const compact = options.compact === true;

  // Compact mode: ultra-slim header for landscape PDFs
  const H         = compact ? 24 : HEADER_H;
  const logoSize  = compact ? 14 : 36;
  const logoY     = compact ? 5 : 8;
  const titleSize = compact ? 10 : 14;
  const titleY    = compact ? 13 : 28;
  const subtitleY = compact ? 19 : 38;
  const labelY    = compact ? 7 : 16;

  // ── 1. Full-width header background ─────────────────────────────────────
  doc.setFillColor(...HEADER_BG);
  doc.rect(0, 0, pw, H, 'F');

  // ── 2. Left accent bar (full height) ────────────────────────────────────
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, ACCENT_BAR_W, H, 'F');

  const font = options.fontName || 'helvetica';

  // ── 3. Small logo box — a rounded square with initials "FMS" ────────────
  const logoX = ACCENT_BAR_W + margin;
  doc.setFillColor(...ACCENT_DARK);
  doc.roundedRect(logoX, logoY, logoSize, logoSize, 3, 3, 'F');
  doc.setFontSize(compact ? 6 : 9);
  doc.setFont(font, 'bold');
  doc.setTextColor(...WHITE);
  doc.text('FMS', logoX + logoSize / 2, logoY + logoSize / 2 + (compact ? 2 : 3.5), { align: 'center' });

  // ── 4. Title block (to the right of logo) ───────────────────────────────
  const textX = logoX + logoSize + 8;

  // System name (small label above title)
  doc.setFontSize(compact ? 5 : 7);
  doc.setFont(font, 'normal');
  doc.setTextColor(...TEXT_LIGHT);
  doc.text(SYSTEM_NAME.toUpperCase(), textX, compact ? 9 : 16);

  // Main report title
  doc.setFontSize(titleSize);
  doc.setFont(font, 'bold');
  doc.setTextColor(...TEXT_DARK);
  doc.text(options.title, textX, titleY);

  // Subtitle (optional)
  if (options.subtitle) {
    doc.setFontSize(compact ? 7 : 8);
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
  const factoryLabel = options.factoryName ?? SYSTEM_SUBTITLE;
  const orgLabel     = options.orgName     ?? ORG_NAME;

  let rY = labelY;
  const lineGap = compact ? 4.5 : 9;

  if (showFactory) {
    doc.setFontSize(compact ? 6 : 8);
    doc.setFont(font, 'bold');
    doc.setTextColor(...ACCENT);
    doc.text(factoryLabel, pw - margin, rY, { align: 'right' });
    rY += lineGap;
    doc.setFontSize(compact ? 5 : 7);
    doc.setFont(font, 'normal');
    doc.setTextColor(...TEXT_MID);
    doc.text(orgLabel, pw - margin, rY, { align: 'right' });
    rY += compact ? 4 : 8;
  }

  doc.setFontSize(compact ? 5 : 7);
  doc.setFont(font, 'normal');
  doc.setTextColor(...TEXT_LIGHT);
  doc.text(`Generated: ${dateStr}  ${timeStr}`, pw - margin, rY, { align: 'right' });
  rY += compact ? 4 : 7;

  if (options.recordCount) {
    doc.text(`Records: ${options.recordCount}`, pw - margin, rY, { align: 'right' });
    rY += compact ? 4 : 6;
  }

  if (options.filterDescription) {
    doc.setFontSize(compact ? 5 : 6.5);
    doc.text(options.filterDescription, pw - margin, rY, { align: 'right' });
  }

  // ── 6. Bottom accent stripe (thin) ──────────────────────────────────────
  doc.setFillColor(...ACCENT);
  doc.rect(0, H, pw, 2, 'F');

  // ── 7. Subtle shadow line below the stripe ───────────────────────────────
  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.3);
  doc.line(0, H + 2, pw, H + 2);

  return H + (compact ? 4 : 10); // Y start for content (with breathing room)
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
  fontName = 'helvetica'
): void {
  const pw     = doc.internal.pageSize.getWidth();
  const ph     = doc.internal.pageSize.getHeight();
  const margin = 16;
  const FOOTER_H = compact ? 12 : 18;
  const footerY  = ph - FOOTER_H;
  const factoryLabel = factoryName ?? SYSTEM_SUBTITLE;

  // ── Background strip ────────────────────────────────────────────────────
  doc.setFillColor(...FOOTER_BG);
  doc.rect(0, footerY, pw, FOOTER_H, 'F');

  // ── Top border line ─────────────────────────────────────────────────────
  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.4);
  doc.line(0, footerY, pw, footerY);

  // ── Left accent bar (matches header) ────────────────────────────────────
  doc.setFillColor(...ACCENT);
  doc.rect(0, footerY, ACCENT_BAR_W, FOOTER_H, 'F');

  const textY = footerY + (compact ? 8 : 11);

  // ── Left text ───────────────────────────────────────────────────────────
  doc.setFontSize(compact ? 5.5 : 6.5);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(...TEXT_LIGHT);
  const leftText = showFactory
    ? `${SYSTEM_NAME}  ·  ${factoryLabel}  ·  Confidential`
    : `${SYSTEM_NAME}  ·  Confidential`;
  doc.text(leftText, ACCENT_BAR_W + margin, textY);

  // ── Right: page number with styled badge ────────────────────────────────
  const pageLabel = `Page ${pageNum} / ${totalPages}`;
  doc.setFontSize(compact ? 5.5 : 6.5);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(...ACCENT);
  doc.text(pageLabel, pw - margin, textY, { align: 'right' });
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

  const factoryLabel = options.factoryName ?? SYSTEM_SUBTITLE;
  const orgLabel     = options.orgName     ?? ORG_NAME;

  const metaLines = [
    `"${SYSTEM_NAME}"`,
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
