import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BRAND = "Kenya Capital Holdings";
const BRAND_COLOR: [number, number, number] = [10, 25, 49]; // navy
const GOLD: [number, number, number] = [212, 175, 55];

export function exportTablePDF(
  title: string,
  headers: string[],
  rows: string[][],
  filename: string,
) {
  const doc = new jsPDF({ orientation: rows[0]?.length > 6 ? "landscape" : "portrait" });

  // Header bar
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(BRAND, 14, 12);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(title, 14, 20);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString("en-KE")}`, doc.internal.pageSize.getWidth() - 14, 20, { align: "right" });

  autoTable(doc, {
    startY: 34,
    head: [headers],
    body: rows,
    headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    styles: { fontSize: 8, cellPadding: 3 },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `${BRAND} — Confidential — Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" },
    );
  }

  doc.save(filename);
}

export function generateShareCertificate(data: {
  investorId: string;
  fullName: string;
  shares: number;
  pricePerShare: number;
  certificateNo: string;
  issueDate: string;
}) {
  const doc = new jsPDF({ orientation: "landscape" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Border
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(3);
  doc.rect(8, 8, w - 16, h - 16);
  doc.setLineWidth(1);
  doc.rect(12, 12, w - 24, h - 24);

  // Header
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(12, 12, w - 24, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(BRAND, w / 2, 28, { align: "center" });
  doc.setFontSize(10);
  doc.text("SHARE CERTIFICATE", w / 2, 38, { align: "center" });

  // Certificate number
  doc.setTextColor(...GOLD);
  doc.setFontSize(9);
  doc.text(`Certificate No: ${data.certificateNo}`, w - 20, 52, { align: "right" });

  // Body
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("This is to certify that", w / 2, 68, { align: "center" });

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND_COLOR);
  doc.text(data.fullName, w / 2, 82, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Investor ID: ${data.investorId}`, w / 2, 92, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text("is the registered holder of", w / 2, 108, { align: "center" });

  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND_COLOR);
  doc.text(`${data.shares.toLocaleString()} Shares`, w / 2, 124, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(
    `at KSh ${data.pricePerShare.toLocaleString()} per share, totalling KSh ${(data.shares * data.pricePerShare).toLocaleString()}`,
    w / 2, 136,
    { align: "center" },
  );

  doc.text("in the capital of Kenya Capital Holdings Ltd.", w / 2, 148, { align: "center" });

  // Issue date
  doc.setFontSize(10);
  doc.text(`Issue Date: ${data.issueDate}`, w / 2, 164, { align: "center" });

  // Signature lines
  const sigY = 180;
  doc.setDrawColor(100, 100, 100);
  doc.line(40, sigY, 120, sigY);
  doc.line(w - 120, sigY, w - 40, sigY);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Company Secretary", 80, sigY + 6, { align: "center" });
  doc.text("Director", w - 80, sigY + 6, { align: "center" });

  doc.save(`Share_Certificate_${data.investorId}.pdf`);
}
