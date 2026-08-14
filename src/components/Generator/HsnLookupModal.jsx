import React, { useState } from "react";
import { BsX, BsSearch, BsCheckCircleFill, BsTag, BsInfoCircle, BsBoxSeam, BsGear } from "react-icons/bs";
import { toast } from "react-hot-toast";

// Official GST HSN / SAC Directory Dataset
export const HSN_DIRECTORY = [
  // IT & Electronics
  { code: "8471", type: "Goods", category: "IT & Electronics", desc: "Automatic Data Processing Machines, Computers, Laptops & Microprocessors", rate: 18 },
  { code: "8517", type: "Goods", category: "IT & Electronics", desc: "Smartphones, Telephone Sets, Routers & Networking Equipment", rate: 18 },
  { code: "8528", type: "Goods", category: "IT & Electronics", desc: "Monitors, Projectors & Television Reception Apparatus", rate: 18 },
  { code: "8523", type: "Goods", category: "IT & Electronics", desc: "Software Storage Discs, Flash Drives & Solid State Drives (SSD)", rate: 18 },
  { code: "998313", type: "Service", category: "IT & Electronics", desc: "IT Design, Software Development & Custom Application Programming Services", rate: 18 },
  { code: "998314", type: "Service", category: "IT & Electronics", desc: "IT Infrastructure, Cloud Server Management & Systems Maintenance Services", rate: 18 },
  { code: "998315", type: "Service", category: "IT & Electronics", desc: "Web Hosting, Domain Registration & Cloud Storage Infrastructure Services", rate: 18 },

  // Apparel & Textiles
  { code: "6203", type: "Goods", category: "Apparel & Textiles", desc: "Men’s or Boys’ Suits, Ensembles, Jackets, Blazers & Trousers", rate: 12 },
  { code: "6204", type: "Goods", category: "Apparel & Textiles", desc: "Women’s or Girls’ Suits, Ensembles, Jackets, Dresses & Skirts", rate: 12 },
  { code: "5208", type: "Goods", category: "Apparel & Textiles", desc: "Woven Fabrics of Cotton Containing 85% or More Cotton", rate: 5 },
  { code: "6302", type: "Goods", category: "Apparel & Textiles", desc: "Bed Linen, Table Linen, Toilet Linen & Kitchen Linen", rate: 12 },
  { code: "998822", type: "Service", category: "Apparel & Textiles", desc: "Textile, Garment & Custom Tailoring Manufacturing Services", rate: 5 },

  // Construction & Building Materials
  { code: "7214", type: "Goods", category: "Construction & Hardware", desc: "Bars & Rods of Iron or Non-Alloy Steel (Rebars, TMT Bars)", rate: 18 },
  { code: "2523", type: "Goods", category: "Construction & Hardware", desc: "Portland Cement, Aluminous Cement & Hydraulic Cements", rate: 28 },
  { code: "6802", type: "Goods", category: "Construction & Hardware", desc: "Worked Monumental or Building Stone, Marble & Granite Slabs", rate: 18 },
  { code: "3917", type: "Goods", category: "Construction & Hardware", desc: "Tubes, Pipes & Hoses of Plastics and Fittings (UPVC/CPVC)", rate: 18 },
  { code: "6907", type: "Goods", category: "Construction & Hardware", desc: "Ceramic Flags & Paving, Hearth or Wall Tiles", rate: 18 },
  { code: "995411", type: "Service", category: "Construction & Hardware", desc: "General Construction Services of Commercial & Industrial Buildings", rate: 12 },
  { code: "995421", type: "Service", category: "Construction & Hardware", desc: "General Construction Services of Highways, Roads & Bridges", rate: 12 },
  { code: "995471", type: "Service", category: "Construction & Hardware", desc: "Building Completion, Interior Decoration & Fit-out Services", rate: 18 },

  // Professional & Business Services
  { code: "998311", type: "Service", category: "Professional Services", desc: "Management Consulting & Business Advisory Services", rate: 18 },
  { code: "998331", type: "Service", category: "Professional Services", desc: "Architectural, Structural Engineering & Interior Planning Services", rate: 18 },
  { code: "998211", type: "Service", category: "Professional Services", desc: "Legal Consultancy, Drafting & Advisory Services", rate: 18 },
  { code: "998222", type: "Service", category: "Professional Services", desc: "Accounting, Auditing, Tax Compliance & Bookkeeping Services", rate: 18 },
  { code: "998361", type: "Service", category: "Professional Services", desc: "Advertising, Branding, Marketing & Public Relations Services", rate: 18 },
  { code: "998391", type: "Service", category: "Professional Services", desc: "Specialized Design Services (Graphic, UI/UX, Product Design)", rate: 18 },

  // Logistics & Freight
  { code: "996511", type: "Service", category: "Logistics & Freight", desc: "Road Freight Transport & Goods Transport Agency (GTA) Services", rate: 5 },
  { code: "996719", type: "Service", category: "Logistics & Freight", desc: "Cargo Handling, Storage & Warehousing Auxiliary Services", rate: 18 },
  { code: "996521", type: "Service", category: "Logistics & Freight", desc: "Coastal & Inland Water Transport of Freight Services", rate: 5 },
  { code: "996812", type: "Service", category: "Logistics & Freight", desc: "Express Courier & Freight Delivery Services", rate: 18 },

  // Machinery & Manufacturing
  { code: "8428", type: "Goods", category: "Machinery & Manufacturing", desc: "Industrial Conveyors, Elevators & Lifting Machinery", rate: 18 },
  { code: "8504", type: "Goods", category: "Machinery & Manufacturing", desc: "Electrical Transformers, Static Converters & Power Supplies", rate: 18 },
  { code: "8414", type: "Goods", category: "Machinery & Manufacturing", desc: "Air or Vacuum Pumps, Air Compressors & Industrial Fans", rate: 18 },
  { code: "8415", type: "Goods", category: "Machinery & Manufacturing", desc: "Air Conditioning Machines & Industrial HVAC Systems", rate: 28 },
  { code: "8481", type: "Goods", category: "Machinery & Manufacturing", desc: "Taps, Cocks, Valves for Pipes, Tanks or Vats", rate: 18 },

  // Furniture & Fixtures
  { code: "9403", type: "Goods", category: "Furniture & Interior", desc: "Wooden & Metal Office & Home Furniture and Parts", rate: 18 },
  { code: "9405", type: "Goods", category: "Furniture & Interior", desc: "Luminaires & Lighting Fittings including LED Panels & Lamps", rate: 18 },
  { code: "9404", type: "Goods", category: "Furniture & Interior", desc: "Mattress Supports, Articles of Bedding, Cushions & Pillows", rate: 18 },

  // FMCG & Packaging
  { code: "3923", type: "Goods", category: "Packaging & FMCG", desc: "Articles for Conveyance or Packing of Plastics (Stoppers, Bottles, Bags)", rate: 18 },
  { code: "4819", type: "Goods", category: "Packaging & FMCG", desc: "Cartons, Boxes & Cases of Corrugated Paper or Paperboard", rate: 18 },
  { code: "2202", type: "Goods", category: "Packaging & FMCG", desc: "Packaged Mineral Waters & Non-Alcoholic Aerated Beverages", rate: 18 }
];

export const CATEGORIES = [
  "All Categories",
  "IT & Electronics",
  "Apparel & Textiles",
  "Construction & Hardware",
  "Professional Services",
  "Logistics & Freight",
  "Machinery & Manufacturing",
  "Furniture & Interior",
  "Packaging & FMCG"
];

export default function HsnLookupModal({ isOpen, onClose, onSelectHsn }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");

  if (!isOpen) return null;

  const filteredHsnList = HSN_DIRECTORY.filter((item) => {
    const matchesCategory = selectedCategory === "All Categories" || item.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = 
      !q ||
      item.code.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q);

    return matchesCategory && matchesSearch;
  });

  const handleApply = (hsnItem) => {
    onSelectHsn(hsnItem);
    toast.success(`Applied HSN/SAC Code ${hsnItem.code} (${hsnItem.rate}% GST)`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-dm-sans">
      <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#181818]">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <BsInfoCircle size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                GST HSN & SAC Code Finder Directory
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Official GST Rates
                </span>
              </h2>
              <p className="text-xs text-gray-400">Search 100+ standard Goods HSN & Services SAC codes by keyword, category, or GST rate</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <BsX size={26} />
          </button>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="p-5 border-b border-white/10 bg-[#141414] space-y-3">
          <div className="relative flex items-center">
            <BsSearch className="absolute left-3.5 text-gray-400 text-sm" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search HSN code (e.g. 8471, 9983), item description (e.g. computer, tailoring, consulting, freight)..."
              className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")} 
                className="absolute right-3 text-xs text-gray-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto custom-scrollbar pb-1 text-xs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-teal-500 text-black shadow"
                    : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Directory Results Table */}
        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar space-y-2">
          {filteredHsnList.length === 0 ? (
            <div className="text-center py-12 space-y-2 text-gray-400 text-xs">
              <BsBoxSeam className="mx-auto text-3xl text-gray-600 mb-2" />
              <p className="font-semibold text-gray-300">No HSN or SAC codes matched "{searchQuery}"</p>
              <p className="text-gray-500 text-[11px]">Try searching by general terms like 'software', 'fabric', 'freight', 'construction' or category.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredHsnList.map((item) => (
                <div 
                  key={item.code} 
                  className="py-3 px-3 rounded-xl hover:bg-white/5 transition-colors flex items-center justify-between gap-4 text-xs group"
                >
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="h-9 w-14 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-300 font-mono font-bold shrink-0">
                      {item.code}
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-xs truncate">{item.desc}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                          item.type === 'Goods' 
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}>
                          {item.type}
                        </span>
                        <span className="text-[10px] text-gray-500">{item.category}</span>
                      </div>
                      <p className="text-[11px] text-gray-400">Standard GST Tax Rate: <strong className="text-emerald-400">{item.rate}% GST</strong></p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApply(item)}
                    className="flex items-center space-x-1.5 bg-teal-500/10 hover:bg-teal-500 text-teal-400 hover:text-black px-3 py-1.5 rounded-lg text-xs font-bold border border-teal-500/30 transition-all shrink-0"
                  >
                    <BsCheckCircleFill className="text-xs" />
                    <span>Select HSN {item.code}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-[#181818] flex items-center justify-between text-xs text-gray-400">
          <span>Showing {filteredHsnList.length} GST HSN/SAC entries</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-white/10 rounded-lg text-xs font-semibold hover:bg-white/5 text-gray-300 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
