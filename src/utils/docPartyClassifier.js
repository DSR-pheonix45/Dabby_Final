/**
 * Utility to classify document type (Vendor Invoice vs Sales Invoice)
 * based on Letterhead Entity (Issuer/Seller) vs Invoiced To/Bill To (Buyer/Customer).
 * 
 * Core Rules:
 * 1. The Letterhead Entity (top logo, header box, issuer details) is ALWAYS the Issuer / Seller.
 * 2. Invoiced To / Bill To / Ship To / Buyer is ALWAYS the Buyer / Customer.
 * 3. If Letterhead Entity matches our active Workbench Company Name -> SALES DOCUMENT.
 * 4. If Letterhead Entity is a Vendor and Billed-To matches our company -> VENDOR DOCUMENT.
 */
export const classifyDocumentParties = (documentObj, activeWorkbench, savedParties = []) => {
  if (!documentObj || !activeWorkbench) {
    return {
      classification: "vendor_invoice",
      isSeller: false,
      isBuyer: true,
      sellerName: "Vendor",
      buyerName: "Company",
      externalParty: { name: "Vendor", gstin: "", address: "", type: "vendor" },
      isRegistered: false,
      matchedParty: null
    };
  }

  const notes = documentObj.di_analysis_notes?.[0] || documentObj.analysis_notes?.[0] || documentObj.analysis_notes || {};
  const extData = notes.extracted_data || {};
  const extractedParties = notes.parties || extData.parties || documentObj.parties || {};

  const rawTypeHint = notes.classification_type || notes.document_type || extData.document_type || documentObj.document_type || documentObj.original_filename || "";
  const docTypeHint = (typeof rawTypeHint === 'object' ? (rawTypeHint.value || "") : String(rawTypeHint)).toLowerCase();

  // 1. Seller / Issuer details (LETTERHEAD ENTITY)
  const sellerObj = extractedParties.issuer || extractedParties.seller || extractedParties.vendor || extData.vendor || {};
  const sellerName = (typeof sellerObj === 'object' ? (sellerObj.name || sellerObj.value || "") : String(sellerObj)).trim();
  const sellerGstin = (typeof sellerObj === 'object' ? (sellerObj.gstin || "") : (extData.vendor_gstin || "")).toUpperCase().trim();
  const sellerAddress = (typeof sellerObj === 'object' ? (sellerObj.address || "") : (extData.vendor_address || "")).trim();

  // 2. Buyer / Recipient details (BILLED TO / INVOICED TO / SHIP TO)
  const buyerObj = extractedParties.recipient || extractedParties.buyer || extractedParties.customer || extData.customer || {};
  const buyerName = (typeof buyerObj === 'object' ? (buyerObj.name || buyerObj.value || "") : String(buyerObj)).trim();
  const buyerGstin = (typeof buyerObj === 'object' ? (buyerObj.gstin || "") : (extData.customer_gstin || "")).toUpperCase().trim();
  const buyerAddress = (typeof buyerObj === 'object' ? (buyerObj.address || "") : (extData.customer_address || "")).trim();

  // Our company identities in Active Workbench
  const myNames = [
    activeWorkbench.name,
    activeWorkbench.legal_name,
    activeWorkbench.legalName
  ].filter(Boolean).map(n => String(n).toLowerCase().trim());

  const myGstin = String(activeWorkbench.gstin || "").toUpperCase().trim();

  // Helper matching function
  const matchesMyCompany = (nameCandidate, gstinCandidate) => {
    if (myGstin && gstinCandidate && myGstin === gstinCandidate) return true;
    if (!nameCandidate) return false;
    const cNorm = nameCandidate.toLowerCase().trim();
    return myNames.some(myN => myN && (cNorm.includes(myN) || myN.includes(cNorm)));
  };

  const isCompanyOnLetterhead = matchesMyCompany(sellerName, sellerGstin);
  const isCompanyBilledTo = matchesMyCompany(buyerName, buyerGstin);

  let classification = "vendor_invoice";
  let externalName = "";
  let externalGstin = "";
  let externalAddress = "";
  let recommendedType = "vendor";
  let isSeller = false;
  let isBuyer = true;

  // RULE A: Letterhead Entity is our company -> WE ARE SELLER -> SALES DOCUMENT
  if (isCompanyOnLetterhead) {
    classification = "sales_invoice";
    isSeller = true;
    isBuyer = false;
    externalName = buyerName || notes.party_name || "Customer";
    externalGstin = buyerGstin;
    externalAddress = buyerAddress;
    recommendedType = "customer";
  } 
  // RULE B: Letterhead Entity is another vendor & Billed-To is our company -> VENDOR DOCUMENT
  else if (isCompanyBilledTo) {
    classification = "vendor_invoice";
    isSeller = false;
    isBuyer = true;
    externalName = sellerName || notes.party_name || "Vendor";
    externalGstin = sellerGstin;
    externalAddress = sellerAddress;
    recommendedType = "vendor";
  } 
  // RULE C: Document Type string hint fallback
  else {
    const isExplicitSalesType = (
      docTypeHint.includes("sales") || 
      docTypeHint.includes("customer_billed") ||
      docTypeHint.includes("inv-") ||
      docTypeHint.startsWith("inv")
    );
    if (isExplicitSalesType) {
      classification = "sales_invoice";
      isSeller = true;
      isBuyer = false;
      externalName = buyerName || sellerName || notes.party_name || "Customer";
      externalGstin = buyerGstin || sellerGstin;
      externalAddress = buyerAddress || sellerAddress;
      recommendedType = "customer";
    } else {
      classification = "vendor_invoice";
      isSeller = false;
      isBuyer = true;
      externalName = sellerName || buyerName || notes.party_name || "Vendor";
      externalGstin = sellerGstin || buyerGstin;
      externalAddress = sellerAddress || buyerAddress;
      recommendedType = "vendor";
    }
  }

  // Clean fallback if externalName is missing
  if (!externalName || externalName.toLowerCase() === "document") {
    const fn = (documentObj.original_filename || "").replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    if (fn && fn.toLowerCase() !== "document") {
      externalName = fn;
    }
  }

  // Match against saved workbench parties
  const cleanExtName = String(externalName).toLowerCase().trim();
  const cleanExtGstin = String(externalGstin).toUpperCase().trim();

  const matchedParty = savedParties.find(p => {
    const pName = String(p.name || "").toLowerCase().trim();
    const pGstin = String(p.gstin || p.party_profiles?.[0]?.gstin || "").toUpperCase().trim();
    if (cleanExtGstin && pGstin && cleanExtGstin === pGstin) return true;
    if (cleanExtName && pName && (pName === cleanExtName || pName.includes(cleanExtName) || cleanExtName.includes(pName))) return true;
    return false;
  });

  return {
    classification,
    isSeller,
    isBuyer,
    sellerName: isCompanyOnLetterhead ? (activeWorkbench.name || sellerName) : (sellerName || "Vendor"),
    buyerName: isCompanyBilledTo ? (activeWorkbench.name || buyerName) : (buyerName || "Customer"),
    externalParty: {
      name: externalName,
      gstin: externalGstin,
      address: externalAddress,
      type: recommendedType
    },
    isRegistered: !!matchedParty,
    matchedParty
  };
};
