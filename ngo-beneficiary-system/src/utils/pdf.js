import jsPDF from "jspdf";

// Helper: load image URL or data URL and return dataURL string
async function loadImageDataUrl(src) {
  try {
    if (!src) return null;
    if (typeof src !== "string") return null;
    if (src.startsWith("data:")) return src;

    const res = await fetch(src, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Helper: draw a placeholder box for missing images
function drawPlaceholderImage(doc, x, y, size = 22) {
  doc.setDrawColor(180, 180, 180);
  doc.setFillColor(240, 240, 240);
  doc.rect(x, y - size + 2, size, size, "FD");
  doc.setFontSize(7);
  doc.text("No", x + size / 2, y - 8, { align: "center" });
  doc.text("Photo", x + size / 2, y - 3, { align: "center" });
}

const printHeaders = ["Photo", "Name", "Phone", "Category", "Date Called"];

export async function createCalledBeneficiariesReport(ngoName, beneficiaries) {
  const doc = new jsPDF({ orientation: "landscape" });
  const now = new Date();
  const dateLabel = now.toLocaleString();

  doc.setFontSize(20);
  doc.text(ngoName, 16, 24);
  doc.setFontSize(12);
  doc.text(`Report: Called Beneficiaries`, 16, 34);
  doc.text(`Date generated: ${dateLabel}`, 16, 42);

  doc.setDrawColor(220, 220, 220);
  doc.line(16, 46, 280, 46);

  const rowTop = 58;
  const imageSize = 28;
  const imagePadding = 5;
  const rowHeight = imageSize + imagePadding * 2 + 10;
  const imageColWidth = imageSize + imagePadding * 2;
  const columnWidths = [imageColWidth, 60, 48, 48, 48];
  const startX = 16;
  const pageHeight = doc.internal.pageSize.height;
  let y = rowTop;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  let x = startX;
  printHeaders.forEach((header, index) => {
    doc.text(header, x + 2, y);
    x += columnWidths[index];
  });

  doc.setFont("helvetica", "normal");
  y += 18;

  if (!beneficiaries || beneficiaries.length === 0) {
    doc.text(
      "No called beneficiaries available for this report.",
      startX,
      y + 6,
    );
    return doc;
  }

  for (const item of beneficiaries) {
    if (y + rowHeight > pageHeight - 18) {
      doc.addPage();
      // redraw headers on the new page
      x = startX;
      doc.setFont("helvetica", "bold");
      printHeaders.forEach((header, index) => {
        doc.text(header, x + 2, rowTop);
        x += columnWidths[index];
      });
      doc.setFont("helvetica", "normal");
      y = rowTop + 18;
    }

    x = startX;
    const textY = y + imageSize / 2 + 4;

    // draw image if available, or fallback placeholder
    const imgData = await loadImageDataUrl(item.passport);
    if (imgData) {
      const fmt = imgData.startsWith("data:image/png") ? "PNG" : "JPEG";
      try {
        doc.addImage(imgData, fmt, x + imagePadding, y, imageSize, imageSize);
      } catch {
        drawPlaceholderImage(doc, x + imagePadding, y + imageSize, imageSize);
      }
    } else {
      drawPlaceholderImage(doc, x + imagePadding, y + imageSize, imageSize);
    }
    x += columnWidths[0];

    const rowValues = [
      item.fullName,
      item.phone,
      item.category,
      item.calledAt ? new Date(item.calledAt).toLocaleString() : "",
    ];

    // write values starting after the image column
    rowValues.forEach((value, index) => {
      const text = String(value || "—");
      doc.text(text, x + 2, textY);
      x += columnWidths[index + 1];
    });
    y += rowHeight;
  }

  return doc;
}

export async function generateCalledBeneficiariesPdf(ngoName, beneficiaries) {
  const doc = await createCalledBeneficiariesReport(ngoName, beneficiaries);
  doc.save("called-beneficiaries-report.pdf");
}

export async function printCalledBeneficiariesPdf(ngoName, beneficiaries) {
  const doc = await createCalledBeneficiariesReport(ngoName, beneficiaries);
  doc.autoPrint();
  window.open(doc.output("bloburl"));
}

const pastHeaders = [
  "Photo",
  "Name",
  "Phone",
  "Category",
  "Empowerment Type",
  "Date Added",
];

export async function createPastBeneficiariesReport(
  ngoName,
  beneficiaries,
  includeImages = false,
) {
  const doc = new jsPDF({ orientation: "landscape" });
  const now = new Date();
  const dateLabel = now.toLocaleString();

  doc.setFontSize(20);
  doc.text(ngoName, 16, 24);
  doc.setFontSize(12);
  doc.text(`Report: Past Beneficiaries`, 16, 34);
  doc.text(`Date generated: ${dateLabel}`, 16, 42);

  doc.setDrawColor(220, 220, 220);
  doc.line(16, 46, 280, 46);

  const rowTop = 58;
  const imageSize = 28;
  const imagePadding = 5;
  const rowHeight = imageSize + imagePadding * 2 + 18;
  const imageColWidth = imageSize + imagePadding * 2;
  const columnWidths = [imageColWidth, 50, 50, 50, 50, 50];
  const startX = 16;
  const pageHeight = doc.internal.pageSize.height;
  let y = rowTop;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  let x = startX;
  pastHeaders.forEach((header, index) => {
    doc.text(header, x + 2, y);
    x += columnWidths[index];
  });

  doc.setFont("helvetica", "normal");
  y += 18;

  if (!beneficiaries || beneficiaries.length === 0) {
    doc.text("No past beneficiaries available for this report.", startX, y + 6);
    return doc;
  }

  for (const item of beneficiaries) {
    if (y + rowHeight > pageHeight - 18) {
      doc.addPage();
      // redraw headers on the new page
      x = startX;
      doc.setFont("helvetica", "bold");
      pastHeaders.forEach((header, index) => {
        doc.text(header, x + 2, rowTop);
        x += columnWidths[index];
      });
      doc.setFont("helvetica", "normal");
      y = rowTop + 18;
    }

    x = startX;
    const textY = y + imageSize / 2 + 4;

    if (includeImages) {
      const imgData = await loadImageDataUrl(item.passport);
      if (imgData) {
        const fmt = imgData.startsWith("data:image/png") ? "PNG" : "JPEG";
        try {
          doc.addImage(imgData, fmt, x + imagePadding, y, imageSize, imageSize);
        } catch {
          drawPlaceholderImage(doc, x + imagePadding, y + imageSize, imageSize);
        }
      } else {
        drawPlaceholderImage(doc, x + imagePadding, y + imageSize, imageSize);
      }
    } else {
      doc.setDrawColor(220, 220, 220);
      doc.rect(x + imagePadding, y, imageSize, imageSize);
    }
    x += columnWidths[0];

    const rowValues = [
      item.fullName,
      item.phone,
      item.category,
      item.empowermentType || "—",
      item.dateAdded ? new Date(item.dateAdded).toLocaleDateString() : "",
    ];

    rowValues.forEach((value, index) => {
      const text = String(value || "—");
      doc.text(text, x + 2, textY);
      x += columnWidths[index + 1];
    });
    y += rowHeight;
  }

  return doc;
}

export async function generatePastBeneficiariesPdf(ngoName, beneficiaries) {
  const doc = await createPastBeneficiariesReport(ngoName, beneficiaries, true);
  doc.save("past-beneficiaries-report.pdf");
}
