/**
 * Draws a ReportData into a jsPDF document. The jsPDF class is passed in so this module stays
 * free of a static import: the browser loads jsPDF with import() only when "Download PDF" is used.
 */
import type { jsPDF as JsPDF } from 'jspdf';
import { formatReportDate, pdfSafe, reportSections, type ReportData } from '../report';

// Same values as the design tokens (--color-accent, --color-text, --color-neutral-700/300).
const ACCENT: [number, number, number] = [31, 75, 192];
const INK: [number, number, number] = [27, 31, 36];
const MUTED: [number, number, number] = [79, 87, 97];
const LINE: [number, number, number] = [210, 215, 222];

export function renderReportPdf(PDF: typeof JsPDF, d: ReportData): JsPDF {
  const doc = new PDF({ unit: 'pt', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 54;
  const right = W - M;
  let y = M;

  doc.setProperties({ title: pdfSafe(`${d.tool} - ${d.brand}`), creator: d.brand, subject: pdfSafe(d.tool) });

  const ensure = (h: number) => {
    if (y + h > H - M - 40) {
      doc.addPage();
      y = M;
    }
  };
  const text = (s: string, x: number, size: number, opts: { bold?: boolean; color?: [number, number, number]; font?: string; align?: 'left' | 'right' } = {}) => {
    doc.setFont(opts.font ?? 'helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...(opts.color ?? INK));
    doc.text(pdfSafe(s), x, y, { align: opts.align ?? 'left' });
  };

  // Header: brand mark, name and site.
  doc.setFillColor(...INK);
  doc.rect(M, y - 12, 16, 16, 'F');
  doc.setFillColor(255, 255, 255);
  doc.triangle(M + 3, y + 1, M + 13, y + 1, M + 13, y - 8, 'F');
  text(d.brand, M + 24, 12, { bold: true });
  text(d.siteUrl.replace(/^https?:\/\//, ''), right, 10, { color: MUTED, align: 'right' });
  y += 12;
  doc.setDrawColor(...INK);
  doc.setLineWidth(2);
  doc.line(M, y, right, y);
  y += 34;

  // Title block
  text(d.tool, M, 22, { bold: true });
  y += 18;
  text(`Generated ${formatReportDate(d.date)}`, M, 10, { color: MUTED });
  y += 26;

  const labelW = 210;
  for (const sec of reportSections(d)) {
    // Keep a heading together with at least its first row.
    ensure(64);
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(3);
    doc.line(M, y, M + 28, y);
    y += 16;
    text(sec.heading.toUpperCase(), M, 9, { bold: true, color: ACCENT });
    y += 14;

    if (sec.rows) {
      for (const [label, value] of sec.rows) {
        const vLines = doc.setFont('helvetica', 'bold').setFontSize(11).splitTextToSize(pdfSafe(value), right - M - labelW) as string[];
        const h = Math.max(1, vLines.length) * 13;
        ensure(h + 8);
        text(label, M, 10, { color: MUTED });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...INK);
        doc.text(vLines, M + labelW, y);
        y += h - 4;
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.5);
        doc.line(M, y, right, y);
        y += 13;
      }
    }
    if (sec.lines) {
      for (const line of sec.lines) {
        const font = sec.mono ? 'courier' : 'helvetica';
        doc.setFont(font, 'normal').setFontSize(sec.mono ? 10 : 10.5);
        const wrapped = doc.splitTextToSize(pdfSafe(line), right - M) as string[];
        ensure(wrapped.length * 13);
        doc.setTextColor(...(sec.heading === 'Share link' ? ACCENT : INK));
        doc.text(wrapped, M, y);
        if (sec.heading === 'Share link') doc.link(M, y - 10, right - M, wrapped.length * 13, { url: line });
        y += wrapped.length * 13 + 2;
      }
    }
    y += 10;
  }

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.5);
    doc.line(M, H - M - 18, right, H - M - 18);
    doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...MUTED);
    doc.text(
      pdfSafe('Estimates for planning only. Confirm quantities with your supplier and local building code.'),
      M,
      H - M - 4,
    );
    doc.text(`${pdfSafe(d.siteUrl.replace(/^https?:\/\//, ''))} · ${i}/${pages}`, right, H - M - 4, { align: 'right' });
  }
  return doc;
}
