import React from "react";
import { numberToWords } from "../../utils/numberToWords";

export default function PrintableDocumentTemplate({ data }) {
  if (!data) return null;

  const {
    documentType = "QUOTATION",
    docNumber = "QT-10",
    docDate = "15/07/2026",
    senderName = "Archzona",
    senderAddress = "105, PRISM INDUSTRIAL ESTATE, BEHIND PENDARKAR COLLEGE, DOMBIVLI(EAST)421201",
    senderGstin = "7ACDFA4175F1ZJ",
    senderMobile = "9870048082",
    senderEmail = "info.archzona@gmail.com",
    logo = null,
    clientName = "RATNA DEEP CHS",
    clientAddress = "Mulund",
    placeOfSupply = "Maharashtra",
    shipToName = "RATNA DEEP CHS",
    shipToAddress = "Mulund",
    items = [],
    columns = null,
    taxRate = 18,
    isIgst = false,
    columnLabels = {},
    showSeparateUnitCol = false,
    notes = "",
    terms = "",
    bankDetails = {},
    authorisedSignatory = "Archzona"
  } = data;

  const colSno = columnLabels.sno || "S.NO.";
  const colItems = columnLabels.items || "ITEMS";
  const colHsn = columnLabels.hsn || "HSN";
  const colQty = columnLabels.qty || "QTY.";
  const colUnit = columnLabels.unit || "UNIT";
  const colRate = columnLabels.rate || "RATE";
  const colAmount = columnLabels.amount || "AMOUNT";

  // Build active columns array
  const activeCols = columns && columns.length > 0 ? columns : [
    { id: "description", label: colItems, type: "text" },
    { id: "hsn", label: colHsn, type: "text" },
    { id: "qty", label: colQty, type: "number" },
    ...(showSeparateUnitCol ? [{ id: "unit", label: colUnit, type: "text" }] : []),
    { id: "rate", label: colRate, type: "number" },
    { id: "amount", label: colAmount, type: "amount" }
  ];

  // Calculate Subtotal & Total Qty
  let subtotal = 0;
  let totalQty = 0;

  items.forEach(it => {
    const q = Number(it.qty) || 0;
    const r = Number(it.rate) || 0;
    subtotal += q * r;
    totalQty += q;
  });

  const taxPct = Number(taxRate) || 0;
  const halfTaxPct = taxPct / 2;
  const totalTaxAmt = (subtotal * taxPct) / 100;
  const halfTaxAmt = totalTaxAmt / 2;
  const grandTotal = subtotal + totalTaxAmt;

  const totalInWords = numberToWords(grandTotal);

  // Group by HSN
  const hsnMap = {};
  items.forEach(it => {
    const code = it.hsn || "N/A";
    const amt = (Number(it.qty) || 0) * (Number(it.rate) || 0);
    hsnMap[code] = (hsnMap[code] || 0) + amt;
  });

  const hsnEntries = Object.entries(hsnMap);

  const docNumLabel = documentType.includes("QUOTE") ? "Quotation No." : (documentType.includes("PROFORMA") ? "Proforma No." : "Invoice No.");
  const docDateLabel = documentType.includes("QUOTE") ? "Quotation Date" : (documentType.includes("PROFORMA") ? "Proforma Date" : "Invoice Date");

  return (
    <div className="w-full bg-white text-black font-sans p-6 rounded-lg shadow-lg border border-gray-300 max-w-4xl mx-auto print:p-0 print:shadow-none print:border-none">
      
      {/* 1. DOCUMENT TITLE */}
      <div className="mb-2 text-left font-bold text-lg tracking-wide uppercase">
        {documentType}
      </div>

      {/* 2. HEADER BOX (SENDER DETAILS & DOC METADATA) */}
      <div className="border border-black grid grid-cols-12 text-xs">
        {/* Left Side: Business Info */}
        <div className="col-span-7 p-3 border-r border-black flex items-start space-x-3">
          {logo && <img src={logo} alt="Logo" className="h-12 w-12 object-contain" />}
          <div>
            <h2 className="text-base font-bold uppercase leading-tight mb-1">{senderName || "BUSINESS NAME"}</h2>
            <p className="text-[11px] text-gray-800 leading-snug mb-1">{senderAddress}</p>
            <div className="text-[11px] font-semibold space-x-4">
              <span>GSTIN: <span className="font-normal">{senderGstin || "N/A"}</span></span>
              <span>Mobile: <span className="font-normal">{senderMobile || "N/A"}</span></span>
            </div>
            {senderEmail && (
              <div className="text-[11px] font-semibold mt-0.5">
                EMAIL: <span className="font-normal">{senderEmail}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Doc No. & Date */}
        <div className="col-span-5 p-3 grid grid-cols-2 gap-2 text-left items-center bg-gray-50/50">
          <div>
            <div className="font-bold text-[11px]">{docNumLabel}</div>
            <div className="text-sm font-bold text-black mt-1">{docNumber}</div>
          </div>
          <div>
            <div className="font-bold text-[11px]">{docDateLabel}</div>
            <div className="text-sm font-normal text-black mt-1">{docDate}</div>
          </div>
        </div>
      </div>

      {/* 3. BILLING & SHIPPING BOX */}
      <div className="border-x border-b border-black grid grid-cols-2 text-xs">
        <div className="p-2.5 border-r border-black">
          <div className="font-bold text-[11px] uppercase mb-1">BILL TO</div>
          <div className="font-bold text-sm text-black uppercase mb-0.5">{clientName}</div>
          <div><span className="font-semibold">Address:</span> {clientAddress}</div>
          {placeOfSupply && <div><span className="font-semibold">Place of Supply:</span> {placeOfSupply}</div>}
        </div>

        <div className="p-2.5">
          <div className="font-bold text-[11px] uppercase mb-1">SHIP TO</div>
          <div className="font-bold text-sm text-black uppercase mb-0.5">{shipToName || clientName}</div>
          <div><span className="font-semibold">Address:</span> {shipToAddress || clientAddress}</div>
        </div>
      </div>

      {/* 4. ITEMS TABLE GRID */}
      <div className="border-x border-b border-black overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-black bg-gray-100 text-black font-bold uppercase text-[11px]">
              <th className="py-2 px-2 border-r border-black text-center w-10">{colSno}</th>
              {activeCols.map((col) => (
                <th
                  key={col.id}
                  className={`py-2 px-2 border-r border-black ${
                    col.type === "number" || col.type === "amount" ? "text-right" : col.id === "hsn" || col.id === "qty" || col.id === "unit" ? "text-center" : "text-left"
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((it, idx) => {
              const q = Number(it.qty) || 0;
              const r = Number(it.rate) || 0;
              const amt = q * r;
              return (
                <tr key={idx} className="align-top">
                  <td className="py-2 px-2 border-r border-black text-center font-medium">{idx + 1}</td>
                  {activeCols.map((col) => {
                    if (col.id === "description") {
                      return (
                        <td key={col.id} className="py-2 px-3 border-r border-black">
                          <div className="font-bold text-black uppercase">{it.description}</div>
                          {it.subDetails && <div className="text-[11px] text-gray-700 mt-0.5">{it.subDetails}</div>}
                        </td>
                      );
                    }
                    if (col.id === "subDetails") {
                      return <td key={col.id} className="py-2 px-2 border-r border-black text-center">{it.subDetails || "-"}</td>;
                    }
                    if (col.id === "hsn") {
                      return <td key={col.id} className="py-2 px-2 border-r border-black text-center">{it.hsn || "-"}</td>;
                    }
                    if (col.id === "qty") {
                      return (
                        <td key={col.id} className="py-2 px-2 border-r border-black text-center font-medium">
                          {showSeparateUnitCol || activeCols.some(c => c.id === "unit") ? q : (it.unit ? `${q} ${it.unit}` : q)}
                        </td>
                      );
                    }
                    if (col.id === "unit") {
                      return <td key={col.id} className="py-2 px-2 border-r border-black text-center font-medium">{it.unit || "-"}</td>;
                    }
                    if (col.id === "rate") {
                      return <td key={col.id} className="py-2 px-3 border-r border-black text-right font-medium">{r.toLocaleString("en-IN")}</td>;
                    }
                    if (col.id === "amount") {
                      return <td key={col.id} className="py-2 px-3 border-r border-black text-right font-bold text-black">{amt.toLocaleString("en-IN")}</td>;
                    }
                    // Custom added column
                    return (
                      <td key={col.id} className="py-2 px-2 border-r border-black text-center font-medium">
                        {it[col.id] ?? (it.customValues ? it.customValues[col.id] : "-")}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Tax Rows inside items table */}
            {taxPct > 0 && (
              isIgst ? (
                <tr className="border-t border-gray-300 font-semibold text-gray-800">
                  <td className="py-1.5 px-2 border-r border-black"></td>
                  <td className="py-1.5 px-3 border-r border-black text-right italic" colSpan={activeCols.length - 1}>IGST @{taxPct}%</td>
                  <td className="py-1.5 px-3 text-right font-semibold">₹ {totalTaxAmt.toLocaleString("en-IN")}</td>
                </tr>
              ) : (
                <>
                  <tr className="border-t border-gray-300 font-semibold text-gray-800">
                    <td className="py-1.5 px-2 border-r border-black"></td>
                    <td className="py-1.5 px-3 border-r border-black text-right italic" colSpan={activeCols.length - 1}>CGST @{halfTaxPct}%</td>
                    <td className="py-1.5 px-3 text-right font-semibold">₹ {halfTaxAmt.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr className="border-t border-gray-300 font-semibold text-gray-800">
                    <td className="py-1.5 px-2 border-r border-black"></td>
                    <td className="py-1.5 px-3 border-r border-black text-right italic" colSpan={activeCols.length - 1}>SGST @{halfTaxPct}%</td>
                    <td className="py-1.5 px-3 text-right font-semibold">₹ {halfTaxAmt.toLocaleString("en-IN")}</td>
                  </tr>
                </>
              )
            )}

            {/* TOTAL Row */}
            <tr className="border-t-2 border-black bg-gray-100 font-bold text-black text-xs">
              <td className="py-2 px-2 border-r border-black text-center"></td>
              <td className="py-2 px-3 border-r border-black uppercase">TOTAL</td>
              {activeCols.slice(1, -1).map(col => (
                <td key={col.id} className="py-2 px-2 border-r border-black text-center">
                  {col.id === "qty" && totalQty > 0 ? totalQty : ""}
                </td>
              ))}
              <td className="py-2 px-3 text-right text-sm">₹ {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 5. SUMMARY HSN TABLE & AMOUNT IN WORDS & BANK DETAILS */}
      <div className="border-x border-b border-black grid grid-cols-12 text-xs">
        
        {/* Left Side: HSN Table & Amount in Words */}
        <div className="col-span-7 p-3 border-r border-black space-y-3">
          
          {/* HSN Summary */}
          {hsnEntries.length > 0 && (
            <div>
              <div className="font-bold text-[10px] uppercase mb-1">HSN/SAC SUMMARY</div>
              <table className="w-full text-[10px] text-left border border-gray-300 border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300 font-bold">
                    <th className="p-1 border-r border-gray-300">HSN/SAC</th>
                    <th className="p-1 border-r border-gray-300 text-right">Taxable Val</th>
                    {isIgst ? (
                      <th className="p-1 text-right">IGST Amt</th>
                    ) : (
                      <>
                        <th className="p-1 border-r border-gray-300 text-right">CGST Amt</th>
                        <th className="p-1 text-right">SGST Amt</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {hsnEntries.map(([code, val]) => {
                    const hsnTax = (val * taxPct) / 100;
                    const hsnHalf = hsnTax / 2;
                    return (
                      <tr key={code} className="border-b border-gray-200">
                        <td className="p-1 border-r border-gray-300 font-medium">{code}</td>
                        <td className="p-1 border-r border-gray-300 text-right">₹ {val.toLocaleString("en-IN")}</td>
                        {isIgst ? (
                          <td className="p-1 text-right">₹ {hsnTax.toLocaleString("en-IN")}</td>
                        ) : (
                          <>
                            <td className="p-1 border-r border-gray-300 text-right">₹ {hsnHalf.toLocaleString("en-IN")}</td>
                            <td className="p-1 text-right">₹ {hsnHalf.toLocaleString("en-IN")}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Amount in Words */}
          <div>
            <span className="font-bold text-[11px] uppercase">Amount Chargeable (in words):</span>
            <p className="font-semibold text-gray-900 capitalize text-[11px] mt-0.5">{totalInWords}</p>
          </div>

          {/* Bank Details */}
          <div className="pt-1 border-t border-gray-200">
            <span className="font-bold text-[11px] uppercase block mb-1">Company Bank Details</span>
            <div className="text-[11px] space-y-0.5">
              <div><span className="font-semibold">Bank Name:</span> {bankDetails.bankName || "AXIS BANK, Dombivli"}</div>
              <div><span className="font-semibold">A/c No:</span> {bankDetails.accountNo || "923020053039794"}</div>
              <div><span className="font-semibold">IFSC Code:</span> {bankDetails.ifsc || "UTIB000125"}</div>
              <div><span className="font-semibold">Beneficiary Name:</span> {bankDetails.name || senderName || "Archzona"}</div>
            </div>
          </div>
        </div>

        {/* Right Side: Notes, Terms & Authorised Signatory */}
        <div className="col-span-5 p-3 flex flex-col justify-between space-y-3">
          <div>
            {notes && (
              <div className="mb-2">
                <span className="font-bold text-[10px] uppercase block">Notes</span>
                <p className="text-[10px] text-gray-700 whitespace-pre-line leading-tight">{notes}</p>
              </div>
            )}

            {terms && (
              <div>
                <span className="font-bold text-[10px] uppercase block">Terms and Conditions</span>
                <p className="text-[10px] text-gray-700 whitespace-pre-line leading-tight">{terms}</p>
              </div>
            )}
          </div>

          <div className="text-right pt-6">
            <div className="font-bold text-[11px] uppercase">For {authorisedSignatory || senderName || "Archzona"}</div>
            <div className="h-10"></div>
            <div className="font-bold text-[11px] border-t border-black inline-block pt-1 px-4">Authorised Signatory</div>
          </div>
        </div>
      </div>

    </div>
  );
}
