/**
 * Utility to classify document type (Vendor Invoice vs Sales Invoice)
 * based on whether our Workbench is the Buyer or Seller,
 * and check if the counterparty is registered in workbench parties.
 */
export const classifyDocumentParties = (documentObj, activeWorkbench, savedParties = []) => {
  if (!documentObj || !activeWorkbench) {
    return {
      classification: "unknown",
      externalParty: null,
      isRegistered: true,
      matchedParty: null
    };
  }

  // Extract analysis notes or legacy parties
  const notes = documentObj.di_analysis_notes?.[0] || documentObj.analysis_notes || {};
  const extractedParties = notes.parties || notes.extracted_data?.parties || documentObj.parties || {};
  
  const rawTypeHint = notes.document_type || notes.extracted_data?.document_type || documentObj.document_type || "";
  const docTypeHint = (typeof rawTypeHint === 'object' ? (rawTypeHint.value || "") : String(rawTypeHint)).toLowerCase();
  
  const predictedLabel = (notes.extracted_data?.predicted_label || notes.predicted_label || "").toLowerCase();
  const classificationType = (notes.classification_type || "").toLowerCase();

  // Seller / Issuer details
  const sellerObj = extractedParties.issuer || extractedParties.seller || extractedParties.vendor || {};
  const sellerName = (typeof sellerObj === 'object' ? (sellerObj.name || sellerObj.value || "") : String(sellerObj)).trim();
  const sellerGstin = (typeof sellerObj === 'object' ? (sellerObj.gstin || "") : "").toUpperCase().trim();
  const sellerAddress = (typeof sellerObj === 'object' ? (sellerObj.address || "") : "").trim();

  // Buyer / Recipient details
  const buyerObj = extractedParties.recipient || extractedParties.buyer || extractedParties.customer || {};
  const buyerName = (typeof buyerObj === 'object' ? (buyerObj.name || buyerObj.value || "") : String(buyerObj)).trim();
  const buyerGstin = (typeof buyerObj === 'object' ? (buyerObj.gstin || "") : "").toUpperCase().trim();
  const buyerAddress = (typeof buyerObj === 'object' ? (buyerObj.address || "") : "").trim();

  // Our company identities
  const myNames = [
    activeWorkbench.name,
    activeWorkbench.legal_name,
    activeWorkbench.legalName
  ].filter(Boolean).map(n => n.toLowerCase().trim());

  const myGstin = (activeWorkbench.gstin || "").toUpperCase().trim();

  // Check if our company matches Seller (Issuer)
  const isSeller = (
    (myGstin && sellerGstin && myGstin === sellerGstin) ||
    myNames.some(name => name && sellerName.toLowerCase() && (sellerName.toLowerCase().includes(name) || name.includes(sellerName.toLowerCase())))
  );

  // Check if our company matches Buyer (Recipient)
  const isBuyer = (
    (myGstin && buyerGstin && myGstin === buyerGstin) ||
    myNames.some(name => name && buyerName.toLowerCase() && (buyerName.toLowerCase().includes(name) || name.includes(buyerName.toLowerCase())))
  );

  let classification = "vendor_invoice";
  let externalName = "";
  let externalGstin = "";
  let externalAddress = "";
  let recommendedType = "vendor";

  const isSalesDoc = (
    isSeller || 
    classificationType === "sales_invoice" || 
    predictedLabel.includes("sales") || 
    predictedLabel.includes("sale") || 
    docTypeHint.includes("sales") || 
    docTypeHint.includes("customer")
  );

  const isVendorDoc = (
    isBuyer || 
    classificationType === "vendor_invoice" || 
    predictedLabel.includes("purchase") || 
    predictedLabel.includes("expense") || 
    docTypeHint.includes("vendor") || 
    docTypeHint.includes("purchase") || 
    docTypeHint.includes("expense")
  );

  if (isSalesDoc && (!isBuyer || isSeller)) {
    classification = "sales_invoice";
    externalName = buyerName || (isSeller ? "" : sellerName) || notes.party_name || "";
    externalGstin = buyerGstin || sellerGstin;
    externalAddress = buyerAddress || sellerAddress;
    recommendedType = "customer";
  } else if (isVendorDoc) {
    classification = "vendor_invoice";
    externalName = sellerName || (isBuyer ? "" : buyerName) || notes.party_name || "";
    externalGstin = sellerGstin || buyerGstin;
    externalAddress = sellerAddress || buyerAddress;
    recommendedType = "vendor";
  } else {
    // Fallback: if seller matches not us, external is seller
    classification = "vendor_invoice";
    externalName = sellerName || buyerName || notes.party_name || "";
    externalGstin = sellerGstin || buyerGstin;
    externalAddress = sellerAddress || buyerAddress;
    recommendedType = "vendor";
  }

  // Clean fallback if externalName is still missing or literally "Document"
  if (!externalName || externalName.toLowerCase() === "document") {
    const fn = (documentObj.original_filename || "").replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    if (fn && fn.toLowerCase() !== "document") {
      externalName = fn;
    }
  }

  // Check if external party exists in saved workbench parties
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
    externalParty: {
      name: externalName,
      gstin: externalGstin,
      address: externalAddress,
      recommendedType
    },
    isRegistered: !!matchedParty,
    matchedParty
  };
};
