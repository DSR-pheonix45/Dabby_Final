import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { numberToWords } from "./numberToWords";

/**
 * Generates a clean, professional PDF for Invoices, Quotations, and Proforma Invoices
 * following structured GST layout with support for Logo, Custom Letterhead, Official Stamp, Digital Signature,
 * and 4 Modern Template Styles (Modern Teal, Corporate Navy, Minimal Charcoal, Vibrant Violet).
 */
export function generateStandardDocumentPDF(docData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth(); // 595.28 pt
  const pageHeight = doc.internal.pageSize.getHeight(); // 841.89 pt
  const margin = 28;
  const contentWidth = pageWidth - (margin * 2); // 539.28 pt

  const {
    documentType = "QUOTATION", // "QUOTATION" | "TAX INVOICE" | "PROFORMA INVOICE"
    docNumber = "10",
    docDate = "15/07/2026",
    dueDate = "",
    // Sender Business Details
    senderName = "Archzona",
    senderAddress = "105, PRISM INDUSTRIAL ESTATE, BEHIND PENDARKAR COLLEGE, DOMBIVLI(EAST)421201",
    senderGstin = "",
    senderMobile = "",
    senderEmail = "",
    logo = null,          // base64 / data URL
    letterhead = null,    // base64 / data URL top letterhead banner
    signature = null,     // base64 / data URL digital signature image
    stamp = null,         // base64 / data URL official stamp/seal image
    templateStyle = "modern", // "modern" | "classic" | "minimal" | "vibrant" | "standard"
    // Bill To
    clientName = "Client",
    clientAddress = "",
    placeOfSupply = "",
    clientGstin = "",
    // Ship To
    shipToName = "",
    shipToAddress = "",
    // Line Items
    items = [],
    discountAmount = 0,
    discountLabel = "Discount",
    taxRate = 18,
    isIgst = false,
    
    // Column Configuration
    columnLabels = {
      sno: "S.NO.",
      items: "ITEMS",
      hsn: "HSN",
      qty: "QTY.",
      unit: "UNIT",
      rate: "RATE",
      amount: "AMOUNT"
    },
    showSeparateUnitCol = false,

    notes = "",
    terms = "",
    bankDetails = {
      name: "",
      ifsc: "",
      accountNo: "",
      bankName: ""
    },
    authorisedSignatory = ""
  } = docData;

  // Template Color Themes
  const THEMES = {
    standard: { primary: [30, 41, 59], accent: [241, 245, 249], text: [15, 23, 42], line: [203, 213, 225], headText: [255, 255, 255] },
    modern: { primary: [13, 148, 136], accent: [240, 253, 250], text: [15, 23, 42], line: [153, 246, 228], headText: [255, 255, 255] }, // Teal
    classic: { primary: [30, 58, 138], accent: [239, 246, 255], text: [30, 41, 59], line: [191, 219, 254], headText: [255, 255, 255] }, // Navy Blue
    minimal: { primary: [39, 39, 42], accent: [244, 244, 245], text: [24, 24, 27], line: [228, 228, 231], headText: [255, 255, 255] }, // Charcoal
    vibrant: { primary: [124, 58, 237], accent: [245, 243, 255], text: [30, 27, 75], line: [221, 214, 254], headText: [255, 255, 255] }, // Violet
  };
  const theme = THEMES[templateStyle] || THEMES.modern;

  const colSno = columnLabels?.sno || "S.NO.";
  const colItems = columnLabels?.items || "ITEMS";
  const colHsn = columnLabels?.hsn || "HSN";
  const colQty = columnLabels?.qty || "QTY.";
  const colUnit = columnLabels?.unit || "UNIT";
  const colRate = columnLabels?.rate || "RATE";
  const colAmount = columnLabels?.amount || "AMOUNT";

  let y = margin;

  // 0. OPTIONAL CUSTOM LETTERHEAD BANNER
  if (letterhead) {
    try {
      doc.addImage(letterhead, "PNG", margin, y, contentWidth, 55);
      y += 62;
    } catch (e) {
      console.warn("Letterhead render warning:", e);
    }
  }

  // 1. TOP DOCUMENT TITLE & BRAND ACCENT BAR
  doc.setFillColor(...theme.primary);
  doc.rect(margin, y, contentWidth, 24, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...theme.headText);
  doc.text(documentType.toUpperCase(), margin + 10, y + 16);

  doc.setFontSize(9);
  doc.text(`NO: ${docNumber}`, margin + contentWidth - 10, y + 16, { align: "right" });
  
  y += 28;

  // 2. HEADER BOX (BUSINESS DETAILS + DOC DETAILS)
  const headerBoxHeight = 85;
  const splitX = margin + (contentWidth * 0.58);
  
  doc.setLineWidth(0.75);
  doc.setDrawColor(...theme.line);
  doc.rect(margin, y, contentWidth, headerBoxHeight);
  doc.line(splitX, y, splitX, y + headerBoxHeight);

  // Left Side: Business Info & Logo
  let leftY = y + 15;
  if (logo) {
    try {
      doc.addImage(logo, "PNG", margin + 8, leftY - 5, 42, 42);
    } catch (e) {}
  }

  const logoOffset = logo ? 54 : 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...theme.text);
  doc.text(senderName || "Business Name", margin + logoOffset, leftY);
  leftY += 13;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const addrLines = doc.splitTextToSize(senderAddress || "", (splitX - margin) - logoOffset - 10);
  addrLines.forEach(line => {
    doc.text(line, margin + logoOffset, leftY);
    leftY += 10;
  });

  doc.setFont("helvetica", "bold");
  doc.text(`GSTIN: `, margin + logoOffset, leftY);
  const gstinWidth = doc.getTextWidth(`GSTIN: `);
  doc.setFont("helvetica", "normal");
  doc.text(`${senderGstin || "N/A"}`, margin + logoOffset + gstinWidth, leftY);

  if (senderMobile) {
    const mobLabelX = margin + logoOffset + gstinWidth + doc.getTextWidth(`${senderGstin || "N/A"}   `);
    doc.setFont("helvetica", "bold");
    doc.text(`Mobile: `, mobLabelX, leftY);
    doc.setFont("helvetica", "normal");
    doc.text(`${senderMobile}`, mobLabelX + doc.getTextWidth(`Mobile: `), leftY);
  }
  leftY += 11;

  if (senderEmail) {
    doc.setFont("helvetica", "bold");
    doc.text(`EMAIL: `, margin + logoOffset, leftY);
    doc.setFont("helvetica", "normal");
    doc.text(senderEmail, margin + logoOffset + doc.getTextWidth(`EMAIL: `), leftY);
  }

  // Right Side: Document Details
  let rightY = y + 18;
  const docTypeUpper = (documentType || "").toUpperCase();
  const isQuoteDoc = docTypeUpper.includes("QUOTE") || docTypeUpper.includes("QUOT");
  const isProformaDoc = docTypeUpper.includes("PROFORMA");

  const docNumLabel = isQuoteDoc ? "Quotation No." : (isProformaDoc ? "Proforma No." : "Invoice No.");
  const docDateLabel = isQuoteDoc ? "Quotation Date" : (isProformaDoc ? "Proforma Date" : "Invoice Date");

  const rightColWidth = (margin + contentWidth) - splitX;
  const col1X = splitX + 12;
  const col2X = splitX + (rightColWidth * 0.52);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...theme.text);
  doc.text(docNumLabel, col1X, rightY);
  doc.text(docDateLabel, col2X, rightY);

  rightY += 10;
  doc.setFont("helvetica", "normal");
  doc.text(docNumber || "-", col1X, rightY);
  doc.text(docDate || "-", col2X, rightY);

  rightY += 18;
  doc.setFont("helvetica", "bold");
  doc.text("State", col1X, rightY);
  doc.text(dueDate ? "Due Date" : "Place of Supply", col2X, rightY);

  rightY += 10;
  doc.setFont("helvetica", "normal");
  doc.text(placeOfSupply || "Maharashtra", col1X, rightY);
  doc.text(dueDate || placeOfSupply || "Maharashtra", col2X, rightY);

  y += headerBoxHeight + 5;

  // 3. BILL TO & SHIP TO GRID
  const billShipBoxHeight = 65;
  const billShipSplitX = margin + (contentWidth * 0.5);

  doc.rect(margin, y, contentWidth, billShipBoxHeight);
  doc.line(billShipSplitX, y, billShipSplitX, y + billShipBoxHeight);

  // Left: Bill To
  let billY = y + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...theme.primary);
  doc.text("Details of Receiver | Billed to:", margin + 8, billY);
  billY += 11;

  doc.setTextColor(...theme.text);
  doc.setFont("helvetica", "bold");
  doc.text(clientName || "Client", margin + 8, billY);
  billY += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const clientAddrLines = doc.splitTextToSize(clientAddress || "-", (billShipSplitX - margin) - 16);
  clientAddrLines.slice(0, 2).forEach(l => {
    doc.text(l, margin + 8, billY);
    billY += 9;
  });

  if (clientGstin) {
    doc.setFont("helvetica", "bold");
    doc.text(`GSTIN: ${clientGstin}`, margin + 8, billY);
  }

  // Right: Ship To
  let shipY = y + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...theme.primary);
  doc.text("Details of Consignee | Shipped to:", billShipSplitX + 8, shipY);
  shipY += 11;

  doc.setTextColor(...theme.text);
  doc.setFont("helvetica", "bold");
  doc.text(shipToName || clientName || "Client", billShipSplitX + 8, shipY);
  shipY += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const shipAddrLines = doc.splitTextToSize(shipToAddress || clientAddress || "-", ((margin + contentWidth) - billShipSplitX) - 16);
  shipAddrLines.slice(0, 2).forEach(l => {
    doc.text(l, billShipSplitX + 8, shipY);
    shipY += 9;
  });

  y += billShipBoxHeight + 5;

  // 4. ITEMS TABLE
  const tableHead = [
    [
      colSno,
      colItems,
      colHsn,
      colQty,
      ...(showSeparateUnitCol ? [colUnit] : []),
      colRate,
      colAmount
    ]
  ];

  const tableBody = items.map((it, idx) => {
    const itemDesc = it.subDetails
      ? `${it.description || 'Item'}\n${it.subDetails}`
      : (it.description || 'Item');

    const qtyDisplay = showSeparateUnitCol
      ? `${it.qty}`
      : `${it.qty} ${it.unit || ''}`.trim();

    const rateVal = Number(it.rate) || 0;
    const amountVal = Number(it.amount) || ((Number(it.qty) || 0) * rateVal);

    return [
      `${it.sno || idx + 1}`,
      itemDesc,
      it.hsn || "-",
      qtyDisplay,
      ...(showSeparateUnitCol ? [it.unit || "pcs"] : []),
      `Rs. ${rateVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `Rs. ${amountVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ];
  });

  // Calculate Subtotal, Discount & Tax
  const subtotal = items.reduce((acc, it) => {
    const r = Number(it.rate) || 0;
    const q = Number(it.qty) || 0;
    return acc + (Number(it.amount) || (q * r));
  }, 0);

  const effectiveDiscount = Number(discountAmount) || 0;
  const taxableSubtotal = Math.max(0, subtotal - effectiveDiscount);

  const effectiveTaxRate = Number(taxRate) || 0;
  const totalTaxAmount = (taxableSubtotal * effectiveTaxRate) / 100;
  const cgstAmount = isIgst ? 0 : totalTaxAmount / 2;
  const sgstAmount = isIgst ? 0 : totalTaxAmount / 2;
  const igstAmount = isIgst ? totalTaxAmount : 0;
  const grandTotal = taxableSubtotal + totalTaxAmount;

  // Append Subtotal & Discount Rows if discount exists
  if (effectiveDiscount > 0) {
    tableBody.push([
      "",
      "SUBTOTAL",
      "",
      "",
      ...(showSeparateUnitCol ? [""] : []),
      "",
      `Rs. ${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);
    tableBody.push([
      "",
      `LESS: DISCOUNT (${discountLabel || 'Tag Applied'})`,
      "",
      "",
      ...(showSeparateUnitCol ? [""] : []),
      "",
      `- Rs. ${effectiveDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);
  }

  // Append Total Tax Rows to Body
  if (effectiveTaxRate > 0) {
    if (isIgst) {
      tableBody.push([
        "",
        `Integrated Tax (IGST @ ${effectiveTaxRate}%)`,
        "",
        "",
        ...(showSeparateUnitCol ? [""] : []),
        "",
        `Rs. ${igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);
    } else {
      tableBody.push([
        "",
        `Central Tax (CGST @ ${effectiveTaxRate / 2}%)`,
        "",
        "",
        ...(showSeparateUnitCol ? [""] : []),
        "",
        `Rs. ${cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);
      tableBody.push([
        "",
        `State Tax (SGST @ ${effectiveTaxRate / 2}%)`,
        "",
        "",
        ...(showSeparateUnitCol ? [""] : []),
        "",
        `Rs. ${sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);
    }
  }

  // Grand Total Row
  tableBody.push([
    "",
    "GRAND TOTAL",
    "",
    "",
    ...(showSeparateUnitCol ? [""] : []),
    "",
    `Rs. ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  ]);

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: tableBody,
    theme: "grid",
    margin: { left: margin, right: margin },
    styles: {
      font: "helvetica",
      fontSize: 8,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      cellPadding: 4,
      valign: "middle"
    },
    headStyles: {
      fillColor: theme.primary,
      textColor: theme.headText,
      fontStyle: "bold",
      halign: "center"
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 32 },
      1: { halign: "left" },
      2: { halign: "center", cellWidth: 45 },
      3: { halign: "center", cellWidth: 50 },
      ...(showSeparateUnitCol ? { 4: { halign: "center", cellWidth: 40 } } : {}),
      [showSeparateUnitCol ? 5 : 4]: { halign: "right", cellWidth: 70 },
      [showSeparateUnitCol ? 6 : 5]: { halign: "right", cellWidth: 85 }
    },
    didParseCell: (data) => {
      const totalRowsStart = tableBody.length - (effectiveTaxRate > 0 ? (isIgst ? 2 : 3) : 1);
      if (data.row.index >= totalRowsStart) {
        data.cell.styles.fontStyle = "bold";
        if (data.row.index === tableBody.length - 1) {
          data.cell.styles.fillColor = theme.accent;
          data.cell.styles.textColor = theme.primary;
        }
      }
    }
  });

  y = doc.lastAutoTable.finalY + 5;

  // 5. TOTAL AMOUNT IN WORDS BOX
  const amountInWordsText = numberToWords(grandTotal);
  const wordsBoxHeight = 32;
  doc.rect(margin, y, contentWidth, wordsBoxHeight);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...theme.primary);
  doc.text("Total Amount (in words):", margin + 8, y + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...theme.text);
  doc.text(amountInWordsText, margin + 8, y + 24);

  y += wordsBoxHeight + 5;

  // 6. BOTTOM GRID: NOTES & TERMS (LEFT) vs BANK DETAILS, STAMP & SIGNATURE (RIGHT)
  const bottomBoxHeight = 115;
  const bottomSplitX = margin + (contentWidth * 0.54);

  doc.rect(margin, y, contentWidth, bottomBoxHeight);
  doc.line(bottomSplitX, y, bottomSplitX, y + bottomBoxHeight);

  // Left: Notes & Terms
  let leftBottomY = y + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...theme.primary);
  doc.text("Notes:", margin + 8, leftBottomY);
  leftBottomY += 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...theme.text);
  const noteLines = doc.splitTextToSize(notes || "-", (bottomSplitX - margin) - 16);
  noteLines.slice(0, 3).forEach(l => {
    doc.text(l, margin + 8, leftBottomY);
    leftBottomY += 9;
  });

  leftBottomY += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...theme.primary);
  doc.text("Terms and Conditions:", margin + 8, leftBottomY);
  leftBottomY += 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...theme.text);
  const termLines = doc.splitTextToSize(terms || "-", (bottomSplitX - margin) - 16);
  termLines.slice(0, 3).forEach(l => {
    doc.text(l, margin + 8, leftBottomY);
    leftBottomY += 9;
  });

  // Right: Bank Details & Signatory
  let rightBottomY = y + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...theme.primary);
  doc.text("Bank Details:", bottomSplitX + 8, rightBottomY);
  rightBottomY += 11;

  const bName = bankDetails?.name || senderName || "N/A";
  const bIfsc = bankDetails?.ifsc || "N/A";
  const bAcc = bankDetails?.accountNo || "N/A";
  const bBank = bankDetails?.bankName || "N/A";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...theme.text);
  doc.text(`Bank: ${bBank}`, bottomSplitX + 8, rightBottomY);
  rightBottomY += 9;
  doc.text(`Account No: ${bAcc}`, bottomSplitX + 8, rightBottomY);
  rightBottomY += 9;
  doc.text(`IFSC: ${bIfsc}`, bottomSplitX + 8, rightBottomY);
  rightBottomY += 12;

  // OFFICIAL STAMP & DIGITAL SIGNATURE AREA
  const sigBoxY = y + bottomBoxHeight - 42;

  if (stamp) {
    try {
      doc.addImage(stamp, "PNG", bottomSplitX + 15, sigBoxY - 20, 38, 38);
    } catch (e) {}
  }

  if (signature) {
    try {
      doc.addImage(signature, "PNG", bottomSplitX + 70, sigBoxY - 18, 65, 26);
    } catch (e) {}
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...theme.primary);
  doc.text(`For ${authorisedSignatory || senderName}`, bottomSplitX + 70, sigBoxY + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("Authorised Signatory / Official Stamp", bottomSplitX + 70, sigBoxY + 24);

  return doc;
}
