import React, { useState } from "react";
import { 
  BsX, BsFileEarmarkText, BsCartCheck, BsArrowReturnLeft, BsTag, 
  BsChevronRight, BsLightningCharge, BsShieldCheck
} from "react-icons/bs";
import SalesInvoiceModal from "../../components/Generator/SalesInvoiceModal";
import PurchaseOrderModal from "../../components/Generator/PurchaseOrderModal";
import CreditNoteModal from "../../components/Generator/CreditNoteModal";
import DiscountCouponModal from "../../components/Generator/DiscountCouponModal";

export default function GeneratorModal({ isOpen, onClose }) {
  const [activeModal, setActiveModal] = useState(null); // 'sales_invoice', 'purchase_order', 'credit_note', 'coupons'

  if (!isOpen) return null;

  const options = [
    { 
      id: "sales_invoice", 
      name: "Sales Invoice & Quotations", 
      icon: BsFileEarmarkText, 
      color: "from-teal-500/20 to-emerald-500/10 text-teal-400 border-teal-500/30",
      desc: "3-Stage generator: Quotation (Initial estimate), Proforma Invoice (Tentative costing), & Sales Invoice (Locked-in tax value). Links Party, Payment Snippets, GST records, & Inventory SKUs with Delivery Challan." 
    },
    { 
      id: "purchase_order", 
      name: "Purchase Order (PO)", 
      icon: BsCartCheck, 
      color: "from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30",
      desc: "Create simple vendor requisition lists detailing required SKUs, quantities, target pricing, delivery dates, and vendor terms." 
    },
    { 
      id: "credit_note", 
      name: "Credit Note & Settlement", 
      icon: BsArrowReturnLeft, 
      color: "from-red-500/20 to-rose-500/10 text-red-400 border-red-500/30",
      desc: "Link to ANY existing invoice to issue credit notes with settlement add-on value discounts, returns, and GST tax reversals." 
    },
    { 
      id: "coupons", 
      name: "Discount & Referral Coupons", 
      icon: BsTag, 
      color: "from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/30",
      desc: "Generate promotional & referral coupon tags for sales pricing with custom rules, percentage/flat discounts, and copy-paste codes." 
    },
  ];

  const handleSelectOption = (optId) => {
    setActiveModal(optId);
  };

  const handleCloseSubModal = () => {
    setActiveModal(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-dm-sans">
        <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#181818]">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <BsLightningCharge size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Workbench Document Generators</h2>
                <p className="text-xs text-gray-400">Select a document builder to configure and generate structured records</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
              <BsX size={26} />
            </button>
          </div>

          {/* Generator Cards */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {options.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectOption(opt.id)}
                  className={`flex flex-col text-left p-5 rounded-2xl border bg-gradient-to-br ${opt.color} hover:scale-[1.02] transition-all duration-200 group relative overflow-hidden`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-12 w-12 rounded-xl bg-[#1e1e1e] border border-white/10 flex items-center justify-center transition-colors">
                      <Icon className="text-2xl" />
                    </div>
                    <BsChevronRight className="text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">{opt.name}</h3>
                  <p className="text-xs text-gray-300 line-clamp-3 leading-relaxed">{opt.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Quick info banner */}
          <div className="px-6 py-4 bg-[#181818] border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <BsShieldCheck className="text-teal-400 text-sm" />
              All generated invoices, POs & credit notes are saved to your active workspace session.
            </span>
            <button onClick={onClose} className="text-gray-400 hover:text-white font-medium">
              Dismiss
            </button>
          </div>

        </div>
      </div>

      {/* Sub-Modals */}
      {activeModal === "sales_invoice" && (
        <SalesInvoiceModal isOpen={true} onClose={handleCloseSubModal} />
      )}
      {activeModal === "purchase_order" && (
        <PurchaseOrderModal isOpen={true} onClose={handleCloseSubModal} />
      )}
      {activeModal === "credit_note" && (
        <CreditNoteModal isOpen={true} onClose={handleCloseSubModal} />
      )}
      {activeModal === "coupons" && (
        <DiscountCouponModal isOpen={true} onClose={handleCloseSubModal} />
      )}
    </>
  );
}
