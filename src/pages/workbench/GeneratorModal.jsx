import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  BsX, BsFileEarmarkText, BsCartCheck, BsArrowReturnLeft, BsTag, 
  BsChevronRight, BsLightningCharge, BsArrowUpRight, BsReceipt, BsCalculator, BsBoxArrowUpRight
} from "react-icons/bs";
import SalesInvoiceModal from "../../components/Generator/SalesInvoiceModal";
import PurchaseOrderModal from "../../components/Generator/PurchaseOrderModal";
import CreditNoteModal from "../../components/Generator/CreditNoteModal";
import DiscountCouponModal from "../../components/Generator/DiscountCouponModal";
import QuotationModal from "../../components/Generator/QuotationModal";
import ProformaInvoiceModal from "../../components/Generator/ProformaInvoiceModal";
import DebitNoteModal from "../../components/Generator/DebitNoteModal";
import OPEXExpenseModal from "../../components/Generator/OPEXExpenseModal";

export default function GeneratorModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState(null);

  if (!isOpen) return null;

  const options = [
    { 
      id: "sales_invoice", 
      name: "Sales Invoice", 
      icon: BsFileEarmarkText, 
      color: "from-teal-500/20 to-emerald-500/10 text-teal-400 border-teal-500/30",
      desc: "Issue starter exchange Sales Invoice to customer when selling goods or services." 
    },
    { 
      id: "quotation", 
      name: "Quotation & Offer", 
      icon: BsTag, 
      color: "from-blue-500/20 to-cyan-500/10 text-blue-400 border-blue-500/30",
      desc: "Send/receive initial buying or selling price quotes with active negotiation tracking." 
    },
    { 
      id: "proforma", 
      name: "Proforma / Estimate", 
      icon: BsCalculator, 
      color: "from-purple-500/20 to-indigo-500/10 text-purple-400 border-purple-500/30",
      desc: "Working itemized estimate for construction contractors and milestone projects." 
    },
    { 
      id: "purchase_order", 
      name: "Purchase Order (PO)", 
      icon: BsCartCheck, 
      color: "from-indigo-500/20 to-blue-500/10 text-indigo-400 border-indigo-500/30",
      desc: "Create vendor purchase requisitions detailing required SKUs, quantities, and pricing." 
    },
    { 
      id: "credit_note", 
      name: "Credit Note", 
      icon: BsArrowReturnLeft, 
      color: "from-red-500/20 to-rose-500/10 text-red-400 border-red-500/30",
      desc: "Issue credit note for sales price reductions, returns, and monetary adjustments." 
    },
    { 
      id: "debit_note", 
      name: "Debit Note", 
      icon: BsArrowUpRight, 
      color: "from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30",
      desc: "Issue debit note for vendor price adjustments and material damage chargebacks." 
    },
    { 
      id: "opex_expense", 
      name: "OPEX Expense Logger", 
      icon: BsReceipt, 
      color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30",
      desc: "Log operational expenses (fuel 550 INR, lunch, rent, stipends) with Party Exemption!" 
    },
    { 
      id: "coupons", 
      name: "Discount Coupons", 
      icon: BsTag, 
      color: "from-yellow-500/20 to-amber-500/10 text-yellow-400 border-yellow-500/30",
      desc: "Generate promotional & referral coupon tags for trade pricing discounts." 
    },
  ];

  const handleSelectOption = (optId) => {
    onClose();
    navigate(`/dashboard/workbench/generator/${optId}`);
  };

  const handleCloseSubModal = () => {
    setActiveModal(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-dm-sans">
        <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#181818]">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <BsLightningCharge size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Stage 0: Workbench Document Generators</h2>
                <p className="text-xs text-gray-400">Generate trade documents in Full-Page Studio (Logo, Letterhead & Auto-Scheduled Billing)</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
              <BsX size={26} />
            </button>
          </div>

          {/* Generator Cards */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {options.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectOption(opt.id)}
                  className={`flex flex-col text-left p-4 rounded-xl border bg-gradient-to-br ${opt.color} hover:scale-[1.02] transition-all duration-200 group relative overflow-hidden`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-10 w-10 rounded-lg bg-[#1e1e1e] border border-white/10 flex items-center justify-center">
                      <Icon className="text-xl" />
                    </div>
                    <BsBoxArrowUpRight className="text-gray-400 group-hover:text-white transition-all text-xs" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">{opt.name}</h3>
                  <p className="text-[11px] text-gray-300 line-clamp-3 leading-snug">{opt.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Quick info banner */}
          <div className="px-6 py-4 bg-[#181818] border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
            <span>Click any generator to open full-page studio with logo/letterhead customization.</span>
            <button onClick={onClose} className="px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white font-semibold">
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
