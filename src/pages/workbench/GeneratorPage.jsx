import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { 
  BsArrowLeft, BsFileEarmarkText, BsTag, BsCalculator, BsCartCheck, 
  BsArrowReturnLeft, BsArrowUpRight, BsReceipt, BsLightningCharge 
} from "react-icons/bs";
import SalesInvoiceModal from "../../components/Generator/SalesInvoiceModal";
import PurchaseOrderModal from "../../components/Generator/PurchaseOrderModal";
import CreditNoteModal from "../../components/Generator/CreditNoteModal";
import DiscountCouponModal from "../../components/Generator/DiscountCouponModal";
import QuotationModal from "../../components/Generator/QuotationModal";
import ProformaInvoiceModal from "../../components/Generator/ProformaInvoiceModal";
import DebitNoteModal from "../../components/Generator/DebitNoteModal";
import OPEXExpenseModal from "../../components/Generator/OPEXExpenseModal";

export default function GeneratorPage() {
  const { type: urlType } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeType, setActiveType] = useState(urlType || "sales_invoice");

  useEffect(() => {
    if (urlType) {
      setActiveType(urlType);
    }
  }, [urlType]);

  const generatorTabs = [
    { id: "sales_invoice", label: "Sales & Tax Invoice", icon: BsFileEarmarkText, color: "text-teal-400" },
    { id: "quotation", label: "Quotation & Offer", icon: BsTag, color: "text-blue-400" },
    { id: "proforma", label: "Proforma / Estimate", icon: BsCalculator, color: "text-purple-400" },
    { id: "purchase_order", label: "Purchase Order (PO)", icon: BsCartCheck, color: "text-indigo-400" },
    { id: "credit_note", label: "Credit Note", icon: BsArrowReturnLeft, color: "text-red-400" },
    { id: "debit_note", label: "Debit Note", icon: BsArrowUpRight, color: "text-amber-400" },
    { id: "opex_expense", label: "OPEX Expense", icon: BsReceipt, color: "text-emerald-400" },
    { id: "coupons", label: "Discount Coupons", icon: BsTag, color: "text-yellow-400" },
  ];

  const handleSelectTab = (typeId) => {
    setActiveType(typeId);
    navigate(`/dashboard/workbench/generator/${typeId}`, { replace: true });
  };

  const handleBackToDocVault = () => {
    navigate("/dashboard/workbench/doc-vault");
  };

  return (
    <div className="min-h-screen bg-[#111111] text-white font-dm-sans flex flex-col">
      {/* Top Header Bar */}
      <div className="border-b border-white/10 bg-[#161616] px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleBackToDocVault}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold transition-all"
          >
            <BsArrowLeft size={16} />
            <span>Back to Doc Vault</span>
          </button>
          <div className="h-5 w-[1px] bg-white/10 hidden sm:block" />
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <BsLightningCharge size={18} />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                Document & Billing Generators
              </h1>
              <p className="text-[11px] text-gray-400">
                Full-page generator studio with logo/letterhead customization and auto-scheduled billing
              </p>
            </div>
          </div>
        </div>

        {/* Generator Type Selector Pills */}
        <div 
          className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {generatorTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                  isActive
                    ? "bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-sm"
                    : "bg-white/5 text-gray-400 border-transparent hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className={tab.color} size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Generator Content Container */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        {activeType === "sales_invoice" && (
          <SalesInvoiceModal isPage={true} onClose={handleBackToDocVault} />
        )}
        {activeType === "quotation" && (
          <SalesInvoiceModal isPage={true} initialStage="QUOTATION" onClose={handleBackToDocVault} />
        )}
        {activeType === "proforma" && (
          <SalesInvoiceModal isPage={true} initialStage="PROFORMA" onClose={handleBackToDocVault} />
        )}
        {activeType === "purchase_order" && (
          <PurchaseOrderModal isOpen={true} isPage={true} onClose={handleBackToDocVault} />
        )}
        {activeType === "credit_note" && (
          <CreditNoteModal isOpen={true} isPage={true} onClose={handleBackToDocVault} />
        )}
        {activeType === "debit_note" && (
          <DebitNoteModal isOpen={true} isPage={true} onClose={handleBackToDocVault} />
        )}
        {activeType === "opex_expense" && (
          <OPEXExpenseModal isOpen={true} isPage={true} onClose={handleBackToDocVault} />
        )}
        {activeType === "coupons" && (
          <DiscountCouponModal isOpen={true} isPage={true} onClose={handleBackToDocVault} />
        )}
      </div>
    </div>
  );
}
