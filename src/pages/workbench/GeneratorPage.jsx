import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import SalesInvoiceModal from "../../components/Generator/SalesInvoiceModal";
import PurchaseOrderModal from "../../components/Generator/PurchaseOrderModal";
import CreditNoteModal from "../../components/Generator/CreditNoteModal";
import DiscountCouponModal from "../../components/Generator/DiscountCouponModal";
import QuotationModal from "../../components/Generator/QuotationModal";
import ProformaInvoiceModal from "../../components/Generator/ProformaInvoiceModal";
import DebitNoteModal from "../../components/Generator/DebitNoteModal";
import OPEXExpenseModal from "../../components/Generator/OPEXExpenseModal";

export default function GeneratorPage() {
  const { type } = useParams();
  const navigate = useNavigate();

  const handleClose = () => {
    // Navigate back to sales flow or previous page when closing generator
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard/workbench/sales');
    }
  };

  const renderGenerator = () => {
    switch (type) {
      case "sales_invoice":
        return <SalesInvoiceModal isOpen={true} isPage={true} onClose={handleClose} />;
      case "quotation":
        return <QuotationModal isOpen={true} isPage={true} onClose={handleClose} />;
      case "proforma":
        return <ProformaInvoiceModal isOpen={true} isPage={true} onClose={handleClose} />;
      case "purchase_order":
        return <PurchaseOrderModal isOpen={true} isPage={true} onClose={handleClose} />;
      case "credit_note":
        return <CreditNoteModal isOpen={true} isPage={true} onClose={handleClose} />;
      case "debit_note":
        return <DebitNoteModal isOpen={true} isPage={true} onClose={handleClose} />;
      case "opex_expense":
        return <OPEXExpenseModal isOpen={true} isPage={true} onClose={handleClose} />;
      case "coupons":
        return <DiscountCouponModal isOpen={true} isPage={true} onClose={handleClose} />;
      default:
        return <SalesInvoiceModal isOpen={true} isPage={true} onClose={handleClose} />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#111111] overflow-hidden font-dm-sans">
      {renderGenerator()}
    </div>
  );
}
