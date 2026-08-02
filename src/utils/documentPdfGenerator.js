import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { numberToWords } from "./numberToWords";

/**
 * Generates a clean, professional PDF for Invoices, Quotations, and Proforma Invoices
 * following the exact structured GST layout (Header, Business details, Billing/Shipping details,
 * Items grid with customizable column labels, CGST/SGST, HSN tax summary, Amount in words, Bank details & Signatory).
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
    senderGstin = "7ACDFA4175F1ZJ",
    senderMobile = "9870048082",
    senderEmail = "info.archzona@gmail.com",
    logo = null,
    // Bill To
    clientName = "RATNA DEEP CHS",
    clientAddress = "Mulund",
    placeOfSupply = "Maharashtra",
    clientGstin = "",
    // Ship To
    shipToName = "RATNA DEEP CHS",
    shipToAddress = "Mulund",
    // Line Items: [{ sno, description, subDetails, hsn, qty, unit, rate, amount }]
    items = [],
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

    notes = "T-Patti for top,bottom & center support\n2\"X 2\" Pipe Ms Fabrication For Fins Support With Material And installation",
    terms = "50% Advance\n30% ongoing work\n20% after completion",
    bankDetails = {
      name: "Archzona",
      ifsc: "UTIB000125",
      accountNo: "923020053039794",
      bankName: "AXIS BANK, Dombivli"
    },
    authorisedSignatory = "Archzona"
  } = docData;

  const colSno = columnLabels?.sno || "S.NO.";
  const colItems = columnLabels?.items || "ITEMS";
  const colHsn = columnLabels?.hsn || "HSN";
  const colQty = columnLabels?.qty || "QTY.";
  const colUnit = columnLabels?.unit || "UNIT";
  const colRate = columnLabels?.rate || "RATE";
  const colAmount = columnLabels?.amount || "AMOUNT";

  let y = margin;

  // 1. TOP DOCUMENT TITLE
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(documentType.toUpperCase(), margin, y + 10);
  y += 20;

  // 2. HEADER BOX (BUSINESS DETAILS + DOC DETAILS)
  const headerBoxHeight = 85;
  const splitX = margin + (contentWidth * 0.58);
  
  // Outer rectangle for Header Box
  doc.setLineWidth(0.75);
  doc.setDrawColor(0, 0, 0);
  doc.rect(margin, y, contentWidth, headerBoxHeight);
  // Divider line
  doc.line(splitX, y, splitX, y + headerBoxHeight);

  // Left Side: Business Info
  let leftY = y + 15;
  if (logo) {
    try {
      doc.addImage(logo, "PNG", margin + 8, leftY - 5, 40, 40);
    } catch (e) {
      // ignore logo errors if invalid image
    }
  }

  const logoOffset = logo ? 52 : 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(senderName || "Business Name", margin + logoOffset, leftY);
  leftY += 13;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const addrLines = doc.splitTextToSize(senderAddress || "", (splitX - margin) - logoOffset - 10);
  addrLines.forEach(line => {
    doc.text(line, margin + logoOffset, leftY);
    leftY += 10;
  });

  doc.setFont("helvetica", "bold");
  doc.text(`GSTIN: `, margin + logoOffset, leftY);
  const gstinWidth = doc.getTextWidth(`GSTIN: `);
  doc.setFont("helvetica", "normal");
  doc.text(`${senderGstin || "N/A"}    `, margin + logoOffset + gstinWidth, leftY);

  const mobLabelX = margin + logoOffset + gstinWidth + doc.getTextWidth(`${senderGstin || "N/A"}    `);
  doc.setFont("helvetica", "bold");
  doc.text(`Mobile: `, mobLabelX, leftY);
  doc.setFont("helvetica", "normal");
  doc.text(`${senderMobile || "N/A"}`, mobLabelX + doc.getTextWidth(`Mobile: `), leftY);
  leftY += 11;

  if (senderEmail) {
    doc.setFont("helvetica", "bold");
    doc.text(`EMAIL: `, margin + logoOffset, leftY);
    doc.setFont("helvetica", "normal");
    doc.text(senderEmail, margin + logoOffset + doc.getTextWidth(`EMAIL: `), leftY);
  }

  // Right Side: Document Details
  let rightY = y + 25;
  const docTypeUpper = (documentType || "").toUpperCase();
  const isQuoteDoc = docTypeUpper.includes("QUOTE") || docTypeUpper.includes("QUOT");
  const isProformaDoc = docTypeUpper.includes("PROFORMA");

  const docNumLabel = isQuoteDoc ? "Quotation No." : (isProformaDoc ? "Proforma No." : "Invoice No.");
  const docDateLabel = isQuoteDoc ? "Quotation Date" : (isProformaDoc ? "Proforma Date" : "Invoice Date");

  const rightColWidth = (margin + contentWidth) - splitX;
  const col1X = splitX + 20;
  const col2X = splitX + (rightColWidth * 0.55);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(docNumLabel, col1X, rightY);
  doc.text(docDateLabel, col2X, rightY);
  rightY += 15;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(String(docNumber), col1X, rightY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(String(docDate), col2X, rightY);

  y += headerBoxHeight;

  // 3. BILLING & SHIPPING BOX
  const billBoxHeight = 55;
  const billSplitX = margin + (contentWidth * 0.5);

  doc.rect(margin, y, contentWidth, billBoxHeight);
  doc.line(billSplitX, y, billSplitX, y + billBoxHeight);

  // BILL TO
  let bY = y + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("BILL TO", margin + 8, bY);
  bY += 12;

  doc.setFontSize(9.5);
  doc.text(clientName || "Client Name", margin + 8, bY);
  bY += 11;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Address: ${clientAddress || ""}`, margin + 8, bY);
  bY += 10;
  if (placeOfSupply) {
    doc.text(`Place of Supply: ${placeOfSupply}`, margin + 8, bY);
  }

  // SHIP TO
  let sY = y + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("SHIP TO", billSplitX + 8, sY);
  sY += 12;

  doc.setFontSize(9.5);
  doc.text(shipToName || clientName || "Client Name", billSplitX + 8, sY);
  sY += 11;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Address: ${shipToAddress || clientAddress || ""}`, billSplitX + 8, sY);

  y += billBoxHeight;

  // 4. ITEMS TABLE GRID
  let subtotal = 0;
  let totalQty = 0;

  const { columns = null } = docData;

  const activeCols = columns && columns.length > 0 ? columns : [
    { id: "description", label: colItems, type: "text" },
    { id: "hsn", label: colHsn, type: "text" },
    { id: "qty", label: colQty, type: "number" },
    ...(showSeparateUnitCol ? [{ id: "unit", label: colUnit, type: "text" }] : []),
    { id: "rate", label: colRate, type: "number" },
    { id: "amount", label: colAmount, type: "amount" }
  ];

  const tableHead = [[colSno, ...activeCols.map(c => c.label.toUpperCase())]];

  const tableBody = items.map((it, idx) => {
    const qtyNum = Number(it.qty) || 0;
    const rateNum = Number(it.rate) || 0;
    const amtNum = qtyNum * rateNum;
    subtotal += amtNum;
    totalQty += qtyNum;
    const row = [idx + 1];

    activeCols.forEach(col => {
      if (col.id === "description") {
        const hasSubCol = activeCols.some(c => c.id === "subDetails");
        const showSubInDesc = hasSubCol && Boolean(it.subDetails && String(it.subDetails).trim());
        row.push(showSubInDesc ? `${it.description || ""}\n${it.subDetails}` : (it.description || ""));
      } else if (col.id === "subDetails") {
        row.push(it.subDetails || "-");
      } else if (col.id === "hsn") {
        row.push(it.hsn || "-");
      } else if (col.id === "qty") {
        row.push(showSeparateUnitCol || activeCols.some(c => c.id === "unit") ? qtyNum : (it.unit ? `${qtyNum} ${it.unit}` : `${qtyNum}`));
      } else if (col.id === "unit") {
        row.push(it.unit || "-");
      } else if (col.id === "rate") {
        row.push(rateNum.toLocaleString("en-IN"));
      } else if (col.id === "amount") {
        row.push(amtNum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      } else {
        row.push(it[col.id] ?? (it.customValues ? it.customValues[col.id] : "-"));
      }
    });

    return row;
  });

  // Calculate Taxes
  const taxPct = Number(taxRate) || 0;
  const halfTaxPct = taxPct / 2;
  const totalTaxAmt = (subtotal * taxPct) / 100;
  const halfTaxAmt = totalTaxAmt / 2;
  const grandTotal = subtotal + totalTaxAmt;

  if (taxPct > 0) {
    const taxColSpan = activeCols.length - 1;
    if (isIgst) {
      const igstRow = Array(activeCols.length + 1).fill("");
      igstRow[1] = `IGST @${taxPct}%`;
      igstRow[activeCols.length] = `Rs. ${totalTaxAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      tableBody.push(igstRow);
    } else {
      const cgstRow = Array(activeCols.length + 1).fill("");
      cgstRow[1] = `CGST @${halfTaxPct}%`;
      cgstRow[activeCols.length] = `Rs. ${halfTaxAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const sgstRow = Array(activeCols.length + 1).fill("");
      sgstRow[1] = `SGST @${halfTaxPct}%`;
      sgstRow[activeCols.length] = `Rs. ${halfTaxAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      tableBody.push(cgstRow, sgstRow);
    }
  }

  // Add TOTAL Row to items table
  const totalRow = Array(activeCols.length + 1).fill("");
  totalRow[1] = "TOTAL";
  const qtyIdx = activeCols.findIndex(c => c.id === "qty");
  if (qtyIdx !== -1 && totalQty > 0) {
    totalRow[qtyIdx + 1] = String(totalQty);
  }
  totalRow[activeCols.length] = `Rs. ${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  tableBody.push(totalRow);

  const columnStylesConfig = showSeparateUnitCol ? {
    0: { cellWidth: 32, halign: "center" },
    1: { cellWidth: "auto" },
    2: { cellWidth: 55, halign: "center" },
    3: { cellWidth: 48, halign: "center" },
    4: { cellWidth: 45, halign: "center" },
    5: { cellWidth: 60, halign: "right" },
    6: { cellWidth: 75, halign: "right" }
  } : {
    0: { cellWidth: 35, halign: "center" },
    1: { cellWidth: "auto" },
    2: { cellWidth: 60, halign: "center" },
    3: { cellWidth: 55, halign: "center" },
    4: { cellWidth: 65, halign: "right" },
    5: { cellWidth: 80, halign: "right" }
  };

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
    head: tableHead,
    body: tableBody,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      cellPadding: 4
    },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "left"
    },
    columnStyles: columnStylesConfig,
    didParseCell: (data) => {
      // Bold TOTAL row
      if (data.row.index === tableBody.length - 1) {
        data.cell.styles.fontStyle = "bold";
      }
    }
  });

  y = doc.lastAutoTable.finalY + 5;

  // 5. HSN/SAC TAX BREAKDOWN TABLE (Rendered only when taxRate > 0)
  if (taxPct > 0) {
    const hsnGroupMap = {};
    items.forEach(it => {
      const code = it.hsn || "N/A";
      const amt = (Number(it.qty) || 0) * (Number(it.rate) || 0);
      if (!hsnGroupMap[code]) {
        hsnGroupMap[code] = 0;
      }
      hsnGroupMap[code] += amt;
    });

    const hsnRows = [];
    let hsnTaxableTotal = 0;
    let hsnCgstTotal = 0;
    let hsnSgstTotal = 0;
    let hsnTaxTotal = 0;

    Object.entries(hsnGroupMap).forEach(([hsnCode, taxableVal]) => {
      const cgstAmt = (taxableVal * halfTaxPct) / 100;
      const sgstAmt = (taxableVal * halfTaxPct) / 100;
      const totTax = cgstAmt + sgstAmt;

      hsnTaxableTotal += taxableVal;
      hsnCgstTotal += cgstAmt;
      hsnSgstTotal += sgstAmt;
      hsnTaxTotal += totTax;

      hsnRows.push([
        hsnCode,
        taxableVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        `${halfTaxPct}%`,
        cgstAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        `${halfTaxPct}%`,
        sgstAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        `Rs. ${totTax.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);
    });

    // Total summary row for HSN table
    hsnRows.push([
      "Total",
      hsnTaxableTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      "",
      hsnCgstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      "",
      hsnSgstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      `Rs. ${hsnTaxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
      head: [
        [
          { content: "HSN/SAC", rowSpan: 2 },
          { content: "Taxable Value", rowSpan: 2 },
          { content: "CGST", colSpan: 2 },
          { content: "SGST", colSpan: 2 },
          { content: "Total Tax Amount", rowSpan: 2 }
        ],
        ["Rate", "Amount", "Rate", "Amount"]
      ],
      body: hsnRows,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 8,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
        cellPadding: 3,
        halign: "center"
      },
      headStyles: {
        fillColor: [245, 245, 245],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        halign: "center"
      },
      didParseCell: (data) => {
        if (data.row.index === hsnRows.length - 1) {
          data.cell.styles.fontStyle = "bold";
        }
      }
    });

    y = doc.lastAutoTable.finalY + 5;
  }

  // 6. TOTAL AMOUNT IN WORDS BOX
  const amountInWordsText = numberToWords(grandTotal);
  const wordsBoxHeight = 35;
  doc.rect(margin, y, contentWidth, wordsBoxHeight);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Total Amount (in words)", margin + 8, y + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(amountInWordsText, margin + 8, y + 26);

  y += wordsBoxHeight + 5;

  // 7. BOTTOM GRID: NOTES & TERMS (LEFT) vs BANK DETAILS & SIGNATURE (RIGHT)
  const bottomBoxHeight = 110;
  const bottomSplitX = margin + (contentWidth * 0.55);

  doc.rect(margin, y, contentWidth, bottomBoxHeight);
  doc.line(bottomSplitX, y, bottomSplitX, y + bottomBoxHeight);

  // Left: Notes & Terms
  let leftBottomY = y + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Notes", margin + 8, leftBottomY);
  leftBottomY += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const noteLines = doc.splitTextToSize(notes || "-", (bottomSplitX - margin) - 16);
  noteLines.forEach(l => {
    doc.text(l, margin + 8, leftBottomY);
    leftBottomY += 9;
  });

  leftBottomY += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Terms and Conditions", margin + 8, leftBottomY);
  leftBottomY += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const termLines = doc.splitTextToSize(terms || "-", (bottomSplitX - margin) - 16);
  termLines.forEach(l => {
    doc.text(l, margin + 8, leftBottomY);
    leftBottomY += 9;
  });

  // Right: Bank Details & Authorised Signatory
  let rightBottomY = y + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Bank Details", bottomSplitX + 8, rightBottomY);
  rightBottomY += 12;

  const bName = bankDetails?.name || senderName || "N/A";
  const bIfsc = bankDetails?.ifsc || "N/A";
  const bAcc = bankDetails?.accountNo || "N/A";
  const bBank = bankDetails?.bankName || "N/A";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Name:`, bottomSplitX + 8, rightBottomY);
  doc.text(bName, bottomSplitX + 65, rightBottomY);
  rightBottomY += 10;

  doc.text(`IFSC Code:`, bottomSplitX + 8, rightBottomY);
  doc.text(bIfsc, bottomSplitX + 65, rightBottomY);
  rightBottomY += 10;

  doc.text(`Account No:`, bottomSplitX + 8, rightBottomY);
  doc.text(bAcc, bottomSplitX + 65, rightBottomY);
  rightBottomY += 10;

  doc.text(`Bank:`, bottomSplitX + 8, rightBottomY);
  doc.text(bBank, bottomSplitX + 65, rightBottomY);
  rightBottomY += 22;

  // Authorised Signatory
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(`Authorised Signatory For`, bottomSplitX + 40, rightBottomY, { align: "left" });
  rightBottomY += 10;
  doc.setFont("helvetica", "normal");
  doc.text(authorisedSignatory || senderName, bottomSplitX + 40, rightBottomY, { align: "left" });

  return doc;
}
