import React, { useState, useRef } from "react";
import { 
  BsImage, BsPalette, BsAward, BsPen, BsTrash, BsCheckCircleFill, 
  BsCloudUpload, BsChevronDown, BsChevronUp, BsGearFill
} from "react-icons/bs";
import { toast } from "react-hot-toast";

export const TEMPLATE_STYLES = [
  { id: "modern", name: "Modern Teal", color: "#0D9488", border: "border-teal-500", bg: "bg-teal-500/10", text: "text-teal-400" },
  { id: "classic", name: "Corporate Navy", color: "#1E3A8A", border: "border-blue-500", bg: "bg-blue-500/10", text: "text-blue-400" },
  { id: "minimal", name: "Minimal Charcoal", color: "#27272A", border: "border-zinc-500", bg: "bg-zinc-500/10", text: "text-zinc-300" },
  { id: "vibrant", name: "Vibrant Violet", color: "#7C3AED", border: "border-purple-500", bg: "bg-purple-500/10", text: "text-purple-400" }
];

export default function DocumentBrandingToolbar({
  templateStyle = "modern",
  setTemplateStyle,
  logo = null,
  setLogo,
  letterhead = null,
  setLetterhead,
  stamp = null,
  setStamp,
  signature = null,
  setSignature
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const logoInputRef = useRef(null);
  const letterheadInputRef = useRef(null);
  const stampInputRef = useRef(null);
  const sigInputRef = useRef(null);

  const handleFileUpload = (e, setter, label) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(`Please upload an image file for ${label}`);
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error(`${label} file size should be less than 3MB`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setter(event.target.result);
      toast.success(`${label} updated!`);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-[#181818] border border-white/10 rounded-xl overflow-hidden transition-all shadow-lg">
      {/* Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center space-x-3 text-xs">
          <div className="h-7 w-7 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <BsPalette size={14} />
          </div>
          <div>
            <span className="font-bold text-white block">Document Branding, Letterhead & PDF Templates</span>
            <span className="text-[11px] text-gray-400">Customize logo, header banner, stamp, digital signature & color themes</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs text-teal-400 font-medium">
          <span>{isExpanded ? "Collapse Options" : "Customize Branding & Style"}</span>
          {isExpanded ? <BsChevronUp /> : <BsChevronDown />}
        </div>
      </div>

      {/* Expanded Controls Drawer */}
      {isExpanded && (
        <div className="p-4 border-t border-white/10 space-y-5 bg-[#141414] text-xs">
          
          {/* Section 1: Template Styles */}
          <div>
            <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <BsPalette className="text-teal-400" /> 1. Select PDF Document Template Style
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {TEMPLATE_STYLES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplateStyle(t.id)}
                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                    templateStyle === t.id
                      ? `${t.bg} ${t.border} text-white shadow-md ring-1 ring-white/20`
                      : "bg-white/5 border-white/5 text-gray-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }}></span>
                    <span className="font-bold text-xs">{t.name}</span>
                  </div>
                  {templateStyle === t.id && <BsCheckCircleFill className={t.text} />}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Logo & Letterhead Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
            {/* Logo */}
            <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-300 flex items-center gap-1.5 text-xs">
                  <BsImage className="text-teal-400" /> Company Logo
                </span>
                {logo && (
                  <button
                    type="button"
                    onClick={() => setLogo(null)}
                    className="text-red-400 hover:text-red-300 text-[11px] flex items-center gap-1"
                  >
                    <BsTrash /> Remove
                  </button>
                )}
              </div>

              {logo ? (
                <div className="flex items-center space-x-3 p-2 bg-black/40 rounded-lg border border-white/10">
                  <img src={logo} alt="Company Logo" className="h-10 w-10 object-contain rounded bg-white/10 p-1" />
                  <span className="text-[11px] text-teal-400 font-semibold">Logo Uploaded ✓</span>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    ref={logoInputRef}
                    onChange={(e) => handleFileUpload(e, setLogo, "Company Logo")}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 rounded-lg text-gray-400 text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <BsCloudUpload /> Upload Logo Image (PNG/JPEG)
                  </button>
                </div>
              )}
            </div>

            {/* Letterhead Header Graphic */}
            <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-300 flex items-center gap-1.5 text-xs">
                  <BsImage className="text-teal-400" /> Letterhead Header Banner
                </span>
                {letterhead && (
                  <button
                    type="button"
                    onClick={() => setLetterhead(null)}
                    className="text-red-400 hover:text-red-300 text-[11px] flex items-center gap-1"
                  >
                    <BsTrash /> Remove
                  </button>
                )}
              </div>

              {letterhead ? (
                <div className="flex items-center space-x-3 p-2 bg-black/40 rounded-lg border border-white/10">
                  <img src={letterhead} alt="Letterhead" className="h-10 max-w-[120px] object-contain rounded bg-white/10" />
                  <span className="text-[11px] text-teal-400 font-semibold">Letterhead Banner Active ✓</span>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    ref={letterheadInputRef}
                    onChange={(e) => handleFileUpload(e, setLetterhead, "Letterhead Banner")}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => letterheadInputRef.current?.click()}
                    className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 rounded-lg text-gray-400 text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <BsCloudUpload /> Upload Header Banner (PNG/JPEG)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Official Stamp & Digital Signature */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
            {/* Stamp / Seal */}
            <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-300 flex items-center gap-1.5 text-xs">
                  <BsAward className="text-teal-400" /> Official Stamp / Seal
                </span>
                {stamp && (
                  <button
                    type="button"
                    onClick={() => setStamp(null)}
                    className="text-red-400 hover:text-red-300 text-[11px] flex items-center gap-1"
                  >
                    <BsTrash /> Remove
                  </button>
                )}
              </div>

              {stamp ? (
                <div className="flex items-center space-x-3 p-2 bg-black/40 rounded-lg border border-white/10">
                  <img src={stamp} alt="Official Stamp" className="h-10 w-10 object-contain rounded bg-white/10 p-0.5" />
                  <span className="text-[11px] text-teal-400 font-semibold">Stamp Seal Attached ✓</span>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    ref={stampInputRef}
                    onChange={(e) => handleFileUpload(e, setStamp, "Official Stamp")}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => stampInputRef.current?.click()}
                    className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 rounded-lg text-gray-400 text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <BsCloudUpload /> Upload Company Stamp PNG
                  </button>
                </div>
              )}
            </div>

            {/* Digital Signature */}
            <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-300 flex items-center gap-1.5 text-xs">
                  <BsPen className="text-teal-400" /> Digital Signature
                </span>
                {signature && (
                  <button
                    type="button"
                    onClick={() => setSignature(null)}
                    className="text-red-400 hover:text-red-300 text-[11px] flex items-center gap-1"
                  >
                    <BsTrash /> Remove
                  </button>
                )}
              </div>

              {signature ? (
                <div className="flex items-center space-x-3 p-2 bg-black/40 rounded-lg border border-white/10">
                  <img src={signature} alt="Digital Signature" className="h-10 max-w-[100px] object-contain rounded bg-white/10 p-1" />
                  <span className="text-[11px] text-teal-400 font-semibold">Signature Attached ✓</span>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    ref={sigInputRef}
                    onChange={(e) => handleFileUpload(e, setSignature, "Digital Signature")}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => sigInputRef.current?.click()}
                    className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 rounded-lg text-gray-400 text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <BsCloudUpload /> Upload Signature Image PNG
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
