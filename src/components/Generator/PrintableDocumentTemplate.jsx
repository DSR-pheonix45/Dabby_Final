import React from "react";
import { numberToWords } from "../../utils/numberToWords";

/**
 * High-fidelity, clean React template component supporting customizable column labels
 * (e.g. Area, Area Unit, Unit Rate, Deriving Amount) & optional separate Unit column.
 */
export default function PrintableDocumentTemplate({ data = {} }) {
  const {
    documentType = "QUOTATION", // QUOTATION | TAX INVOICE | PROFORMA INVOICE
    docNumber = "10",
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

    items = [
      {
        sno: 1,
        description: "100 MM x 50 MM UPVC louver Profile",
        subDetails: "100 – 75 – 100 – 75 – 100",
        hsn: "39162019",
        qty: 6900,
        unit: "RFT",
        rate: 115
      },
      {
        sno: 2,
        description: "MS FABRICATION WORK 115'X30'",
        subDetails: "",
        hsn: "7308",
        qty: 1,
        unit: "pcs",
        rate: 240000
      }
    ],

    taxRate = 18,
    isIgst = false,

    // Column Label Configuration
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
  } = data;

  const colSno = columnLabels?.sno || "S.NO.";
  const colItems = columnLabels?.items || "ITEMS";
  const colHsn = columnLabels?.hsn || "HSN";
  const colQty = columnLabels?.qty || "QTY.";
  const colUnit = columnLabels?.unit || "UNIT";
  const colRate = columnLabels?.rate || "RATE";
  const colAmount = columnLabels?.amount || "AMOUNT";

  // Compute Subtotal & Total Qty
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
              <th className="py-2 px-3 border-r border-black">{colItems}</th>
              <th className="py-2 px-2 border-r border-black text-center w-20">{colHsn}</th>
              <th className="py-2 px-2 border-r border-black text-center w-24">{colQty}</th>
              {showSeparateUnitCol && (
                <th className="py-2 px-2 border-r border-black text-center w-20">{colUnit}</th>
              )}
              <th className="py-2 px-3 border-r border-black text-right w-24">{colRate}</th>
              <th className="py-2 px-3 text-right w-28">{colAmount}</th>
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
                  <td className="py-2 px-3 border-r border-black">
                    <div className="font-bold text-black uppercase">{it.description}</div>
                    {it.subDetails && <div className="text-[11px] text-gray-700 mt-0.5">{it.subDetails}</div>}
                  </td>
                  <td className="py-2 px-2 border-r border-black text-center">{it.hsn || "-"}</td>
                  <td className="py-2 px-2 border-r border-black text-center font-medium">
                    {showSeparateUnitCol ? q : `${q} ${it.unit || ""}`}
                  </td>
                  {showSeparateUnitCol && (
                    <td className="py-2 px-2 border-r border-black text-center font-medium">
                      {it.unit || "-"}
                    </td>
                  )}
                  <td className="py-2 px-3 border-r border-black text-right font-medium">
                    {r.toLocaleString("en-IN")}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-black">
                    {amt.toLocaleString("en-IN")}
                  </td>
                </tr>
              );
            })}

            {/* Tax Rows inside items table */}
            {taxPct > 0 && (
              isIgst ? (
                <tr className="border-t border-gray-300 font-semibold text-gray-800">
                  <td className="py-1.5 px-2 border-r border-black"></td>
                  <td className="py-1.5 px-3 border-r border-black text-right italic" colSpan={showSeparateUnitCol ? 5 : 4}>IGST @{taxPct}%</td>
                  <td className="py-1.5 px-3 text-right font-semibold">₹ {totalTaxAmt.toLocaleString("en-IN")}</td>
                </tr>
              ) : (
                <>
                  <tr className="border-t border-gray-300 font-semibold text-gray-800">
                    <td className="py-1.5 px-2 border-r border-black"></td>
                    <td className="py-1.5 px-3 border-r border-black text-right italic" colSpan={showSeparateUnitCol ? 5 : 4}>CGST @{halfTaxPct}%</td>
                    <td className="py-1.5 px-3 text-right font-semibold">₹ {halfTaxAmt.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr className="border-t border-gray-200 font-semibold text-gray-800">
                    <td className="py-1.5 px-2 border-r border-black"></td>
                    <td className="py-1.5 px-3 border-r border-black text-right italic" colSpan={showSeparateUnitCol ? 5 : 4}>SGST @{halfTaxPct}%</td>
                    <td className="py-1.5 px-3 text-right font-semibold">₹ {halfTaxAmt.toLocaleString("en-IN")}</td>
                  </tr>
                </>
              )
            )}

            {/* TOTAL Row */}
            <tr className="border-t border-black bg-gray-100 font-bold text-black uppercase text-[11px]">
              <td className="py-2 px-2 border-r border-black"></td>
              <td className="py-2 px-3 border-r border-black">TOTAL</td>
              <td className="py-2 px-2 border-r border-black"></td>
              <td className="py-2 px-2 border-r border-black text-center">{totalQty > 0 ? totalQty : ""}</td>
              {showSeparateUnitCol && <td className="py-2 px-2 border-r border-black"></td>}
              <td className="py-2 px-3 border-r border-black"></td>
              <td className="py-2 px-3 text-right text-sm font-extrabold">₹{grandTotal.toLocaleString("en-IN")}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 5. HSN/SAC TAX BREAKDOWN TABLE */}
      <div className="border-x border-b border-black overflow-x-auto text-[11px]">
        <table className="w-full border-collapse text-center">
          <thead>
            <tr className="border-b border-black bg-gray-100 font-bold uppercase text-[10px]">
              <th className="py-1.5 px-2 border-r border-black row-span-2">HSN/SAC</th>
              <th className="py-1.5 px-2 border-r border-black row-span-2">Taxable Value</th>
              <th className="py-1.5 px-2 border-r border-black" colSpan={2}>CGST</th>
              <th className="py-1.5 px-2 border-r border-black" colSpan={2}>SGST</th>
              <th className="py-1.5 px-2">Total Tax Amount</th>
            </tr>
            <tr className="border-b border-black bg-gray-50 font-bold text-[10px]">
              <th className="py-1 px-1 border-r border-black">Rate</th>
              <th className="py-1 px-1 border-r border-black">Amount</th>
              <th className="py-1 px-1 border-r border-black">Rate</th>
              <th className="py-1 px-1 border-r border-black">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {hsnEntries.map(([hsnCode, taxableVal], i) => {
              const cgstVal = (taxableVal * halfTaxPct) / 100;
              const sgstVal = (taxableVal * halfTaxPct) / 100;
              const totTax = cgstVal + sgstVal;
              return (
                <tr key={i}>
                  <td className="py-1.5 px-2 border-r border-black font-semibold">{hsnCode}</td>
                  <td className="py-1.5 px-2 border-r border-black">{taxableVal.toLocaleString("en-IN")}</td>
                  <td className="py-1.5 px-1 border-r border-black">{halfTaxPct}%</td>
                  <td className="py-1.5 px-2 border-r border-black">{cgstVal.toLocaleString("en-IN")}</td>
                  <td className="py-1.5 px-1 border-r border-black">{halfTaxPct}%</td>
                  <td className="py-1.5 px-2 border-r border-black">{sgstVal.toLocaleString("en-IN")}</td>
                  <td className="py-1.5 px-2 font-bold text-black">₹ {totTax.toLocaleString("en-IN")}</td>
                </tr>
              );
            })}
            <tr className="border-t border-black bg-gray-100 font-bold text-black text-[11px]">
              <td className="py-1.5 px-2 border-r border-black">Total</td>
              <td className="py-1.5 px-2 border-r border-black">{subtotal.toLocaleString("en-IN")}</td>
              <td className="py-1.5 px-1 border-r border-black"></td>
              <td className="py-1.5 px-2 border-r border-black">{halfTaxAmt.toLocaleString("en-IN")}</td>
              <td className="py-1.5 px-1 border-r border-black"></td>
              <td className="py-1.5 px-2 border-r border-black">{halfTaxAmt.toLocaleString("en-IN")}</td>
              <td className="py-1.5 px-2 text-right font-extrabold">₹ {totalTaxAmt.toLocaleString("en-IN")}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 6. TOTAL AMOUNT IN WORDS */}
      <div className="border-x border-b border-black p-2.5 bg-white text-xs">
        <div className="font-bold text-[11px] text-gray-800">Total Amount (in words)</div>
        <div className="font-medium text-sm text-black mt-0.5">{numberToWords(grandTotal)}</div>
      </div>

      {/* 7. BOTTOM GRID: NOTES & TERMS (LEFT) vs BANK DETAILS & SIGNATURE (RIGHT) */}
      <div className="border-x border-b border-black grid grid-cols-12 text-xs">
        {/* Left Side: Notes & Terms */}
        <div className="col-span-7 p-3 border-r border-black flex flex-col justify-between">
          <div>
            <div className="font-bold text-[11px] text-black mb-1">Notes</div>
            <div className="text-[11px] text-gray-800 whitespace-pre-line leading-snug mb-3">
              {notes || "-"}
            </div>

            <div className="font-bold text-[11px] text-black mb-1">Terms and Conditions</div>
            <div className="text-[11px] text-gray-800 whitespace-pre-line leading-snug">
              {terms || "-"}
            </div>
          </div>
        </div>

        {/* Right Side: Bank Details & Signature */}
        <div className="col-span-5 p-3 flex flex-col justify-between bg-gray-50/30">
          <div>
            <div className="font-bold text-[11px] text-black mb-1.5">Bank Details</div>
            <div className="space-y-1 text-[11px]">
              <div className="grid grid-cols-3">
                <span className="font-semibold text-gray-700">Name:</span>
                <span className="col-span-2 font-medium text-black">{bankDetails?.name || senderName}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="font-semibold text-gray-700">IFSC Code:</span>
                <span className="col-span-2 font-mono font-medium text-black">{bankDetails?.ifsc || "UTIB000125"}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="font-semibold text-gray-700">Account No:</span>
                <span className="col-span-2 font-mono font-medium text-black">{bankDetails?.accountNo || "923020053039794"}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="font-semibold text-gray-700">Bank:</span>
                <span className="col-span-2 font-medium text-black">{bankDetails?.bankName || "AXIS BANK, Dombivli"}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center pt-4">
            <div className="font-bold text-[11px] text-black">Authorised Signatory For</div>
            <div className="font-bold text-xs text-black uppercase mt-1">{authorisedSignatory || senderName}</div>
            <div className="h-10 border-b border-gray-300 border-dashed w-3/4 mx-auto my-2"></div>
            <div className="text-[10px] text-gray-500 italic">Authorized Signature / Stamp</div>
          </div>
        </div>
      </div>

    </div>
  );
}
