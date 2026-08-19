import React, { useState, useEffect } from "react";
import { BsX, BsTag, BsPlus, BsCheck2, BsClipboard, BsCheckCircleFill, BsShieldCheck } from "react-icons/bs";
import { toast } from "react-hot-toast";
import { getStoredDiscountTags, saveDiscountTag } from "./generatorStore";

export default function DiscountCouponModal({ isOpen, onClose, isPage = false }) {
  const [tags, setTags] = useState([]);
  const [code, setCode] = useState("");
  const [type, setType] = useState("percentage"); // 'percentage' or 'flat'
  const [value, setValue] = useState(10);
  const [minOrder, setMinOrder] = useState(1000);
  const [validUntil, setValidUntil] = useState("2026-12-31");
  const [desc, setDesc] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    setTags(getStoredDiscountTags());
  }, [isOpen]);

  const handleCreateTag = (e) => {
    e.preventDefault();
    if (!code.trim()) return toast.error("Please enter a valid coupon code tag.");

    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, "");
    const newTag = {
      id: `tag_${Date.now()}`,
      code: cleanCode,
      type,
      value: Number(value) || 0,
      minOrder: Number(minOrder) || 0,
      validUntil,
      active: true,
      desc: desc || `${type === 'percentage' ? `${value}% Off` : `Flat ₹${value} Off`} discount coupon`
    };

    const updated = saveDiscountTag(newTag);
    setTags(updated);
    toast.success(`Discount tag '${cleanCode}' created successfully!`);

    // Reset form
    setCode("");
    setDesc("");
  };

  const handleCopyTag = (tag) => {
    navigator.clipboard.writeText(tag.code);
    setCopiedId(tag.id);
    toast.success(`Copied '${tag.code}' to clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen && !isPage) return null;

  const content = (
    <div className={`bg-[#121212] border border-white/10 rounded-2xl w-full overflow-hidden shadow-2xl flex flex-col ${
      isPage ? "max-w-6xl mx-auto my-6 border border-white/10" : "max-w-3xl max-h-[90vh]"
    }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#181818]">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <BsTag size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Discount & Referral Tags Generator</h2>
              <p className="text-xs text-gray-400">Create promotional discount coupons & referral tags for sales pricing</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <BsX size={26} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          
          {/* Creator Form */}
          <form onSubmit={handleCreateTag} className="p-5 rounded-xl bg-white/5 border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <BsPlus className="text-amber-400 text-lg" />
              Create New Discount / Referral Tag
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Coupon Tag Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. FESTIVE20 or REF-RAHUL"
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white uppercase font-bold tracking-wider focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Discount Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="percentage">Percentage Off (%)</option>
                  <option value="flat">Flat Amount Off (₹)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-semibold">
                  Value ({type === 'percentage' ? '%' : '₹'})
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Min Invoice Value (₹)</label>
                <input
                  type="number"
                  value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Valid Until Date</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-400 mb-1 font-semibold">Description / Notes</label>
              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="e.g. Special festive pricing for preferred partners..."
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-amber-500 hover:bg-amber-400 text-black font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <BsCheckCircleFill className="text-base" />
                <span>Save Coupon Tag</span>
              </button>
            </div>
          </form>

          {/* Active Tags List */}
          <div className="p-4 sm:p-5 rounded-xl bg-white/5 border border-white/5 space-y-4">
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/10 pb-3 gap-1">
              <span className="flex items-center gap-2">
                <BsShieldCheck className="text-amber-400" />
                Active Sales Pricing Tags ({tags.length})
              </span>
              <span className="text-[11px] text-gray-400 normal-case font-normal">
                Click copy to use in Sales Invoice modal
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="p-3.5 rounded-xl bg-[#181818] border border-white/10 hover:border-amber-500/30 transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-amber-400 text-xs tracking-wider uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {tag.code}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Valid till {tag.validUntil}
                      </span>
                    </div>
                    <p className="text-white text-xs font-medium">{tag.desc}</p>
                    <p className="text-[11px] text-gray-400">
                      Min Order: ₹{tag.minOrder.toLocaleString('en-IN')}
                    </p>
                  </div>

                  <button
                    onClick={() => handleCopyTag(tag)}
                    className="p-2 rounded-lg bg-white/5 group-hover:bg-amber-500/20 text-gray-300 group-hover:text-amber-400 transition-colors shrink-0 cursor-pointer"
                    title="Copy Tag Code"
                  >
                    {copiedId === tag.id ? <BsCheck2 size={18} className="text-amber-400" /> : <BsClipboard size={18} />}
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Sticky Mobile Footer */}
        <div className="sticky bottom-0 z-30 flex items-center justify-end px-4 py-3 sm:px-6 sm:py-4 border-t border-white/10 bg-[#181818]/95 backdrop-blur-md shadow-2xl shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors text-xs cursor-pointer text-center"
          >
            Close
          </button>
        </div>

      </div>
  );

  if (isPage) {
    return (
      <div className="flex-1 w-full bg-[#111111] overflow-y-auto p-4 sm:p-6 lg:p-8 font-dm-sans">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-dm-sans overflow-y-auto">
      {content}
    </div>
  );
}
