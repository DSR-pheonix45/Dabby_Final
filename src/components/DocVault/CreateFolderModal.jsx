import React, { useState } from 'react';
import { BsFolderPlus, BsX } from 'react-icons/bs';

const COLOR_OPTIONS = [
  { name: 'Teal', hex: '#14b8a6' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Emerald', hex: '#10b981' },
];

export default function CreateFolderModal({ isOpen, onClose, onCreate, initialName = '', initialColor = '#14b8a6', title = "Create New Folder" }) {
  const [folderName, setFolderName] = useState(initialName);
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    setSubmitting(true);
    try {
      await onCreate(folderName.trim(), selectedColor);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#18181A] border border-white/10 rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
        >
          <BsX size={20} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <BsFolderPlus size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
            <p className="text-xs text-gray-400">Organize your financial documents into structured folders</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Folder Name
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g. Sales Invoices 2026, Vendor Bills, Receipts"
              className="w-full px-4 py-3 bg-[#0D0D0D] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-teal-500/50 transition-colors"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Accent Color
            </label>
            <div className="flex items-center gap-3">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setSelectedColor(c.hex)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border-2 ${
                    selectedColor === c.hex ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !folderName.trim()}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-bold text-xs transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Folder"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
