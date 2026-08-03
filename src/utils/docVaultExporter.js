import { supabase } from "../lib/supabase";
import { diService } from "../services/diService";
import { apiFetch } from "../lib/apiClient";

/**
 * Uploads generated PDF document to Supabase Storage (Doc_vault_Raw),
 * registers it in Doc Vault (di_documents & di_analysis_notes),
 * and dispatches a trade draft to the Business Engine for payment/note linking.
 */
export const saveDocumentToDocVaultAndEngine = async ({
  activeWorkbench,
  docNumber,
  documentType, // 'sales_invoice' | 'quotation' | 'proforma' | 'purchase_order' | 'debit_note' | 'credit_note'
  pdfDoc,
  partyName,
  partyAddress = "",
  partyGstin = "",
  totalAmount = 0,
  docDate = "",
  dueDate = "",
  lineItems = [],
  notes = "",
  terms = ""
}) => {
  if (!activeWorkbench?.id) {
    throw new Error("Active workbench is required to save document to Doc Vault");
  }

  // 1. Convert jsPDF object to Blob and File
  const pdfBlob = pdfDoc.output("blob");
  const cleanParty = (partyName || "Document").replace(/[^a-zA-Z0-9_\-]/g, "_");
  const fileName = `${docNumber}_${cleanParty}.pdf`;
  const file = new File([pdfBlob], fileName, { type: "application/pdf" });

  // 2. Upload file to Supabase Storage bucket (Doc_vault_Raw) & insert into di_documents
  const uploadResult = await diService.uploadDocument(activeWorkbench.id, file);
  const documentId = uploadResult.document_id;

  if (!documentId) {
    throw new Error("Failed to save document to Doc Vault");
  }

  // 3. Create analysis notes record so document is immediately parsed & previewable in Doc Vault
  const companyName = activeWorkbench.name || "Your Company";
  const analysisData = {
    document_id: documentId,
    document_type: documentType,
    confidence: 0.98,
    parties: {
      issuer: { 
        name: companyName, 
        gstin: activeWorkbench.gstin || "", 
        address: activeWorkbench.address?.street || "" 
      },
      recipient: { 
        name: partyName || "", 
        gstin: partyGstin || "", 
        address: partyAddress || "" 
      }
    },
    money: {
      total_amount: Number(totalAmount) || 0,
      subtotal: Number(totalAmount) || 0,
      currency: activeWorkbench.currency || "INR"
    },
    taxes: {
      total_tax: 0,
      tax_lines: []
    },
    dates: {
      document_date: docDate || new Date().toISOString().split("T")[0],
      due_date: dueDate || ""
    },
    line_items: (lineItems || []).map((it, i) => ({
      sno: i + 1,
      description: it.description || it.sku || "Item",
      qty: Number(it.qty || it.quantity) || 1,
      rate: Number(it.rate || it.expectedRate || it.price) || 0,
      amount: (Number(it.qty || it.quantity) || 1) * (Number(it.rate || it.expectedRate || it.price) || 0)
    })),
    raw_text: `Document #: ${docNumber}\nType: ${documentType.toUpperCase()}\nParty: ${partyName}\nAmount: ${totalAmount}\nNotes: ${notes}\nTerms: ${terms}`
  };

  try {
    await supabase.from("di_analysis_notes").insert(analysisData);
    await supabase.from("di_document_processing_logs").insert({
      document_id: documentId,
      stage: "analysis",
      provider: "system",
      status: "success"
    });
  } catch (dbErr) {
    console.warn("Doc Vault analysis log notice:", dbErr);
  }

  // 4. Send document to Business Engine to generate trade draft & enable payment/debit/credit note linking
  try {
    await apiFetch(`/api/events/from-document/${documentId}`, { method: "POST" });
  } catch (engineErr) {
    console.warn("Business Engine trade draft notice:", engineErr);
  }

  // 5. Dispatch UI refresh events
  window.dispatchEvent(new Event("docVaultUpdated"));
  window.dispatchEvent(new Event("businessEventsUpdated"));

  return { documentId, fileName };
};
