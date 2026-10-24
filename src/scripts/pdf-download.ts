/**
 * Builds and saves the PDF report. jsPDF and the renderer are fetched with import() on first use,
 * so neither adds anything to the initial page load.
 */
import { reportFilename, type ReportData } from '../lib/report';

export async function downloadReportPdf(data: ReportData): Promise<string> {
  const [{ jsPDF }, { renderReportPdf }] = await Promise.all([import('jspdf'), import('../lib/pdf/render')]);
  const doc = renderReportPdf(jsPDF, data);
  const name = reportFilename(data);
  doc.save(name);
  return name;
}
