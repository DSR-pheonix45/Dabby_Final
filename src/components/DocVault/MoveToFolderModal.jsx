import React, { useState } from 'react';
import { BsFolder, BsFolderSymlink, BsX, BsCheck, BsHouse } from 'react-icons/bs';

export default function MoveToFolderModal({ isOpen, onClose, documentObj, folders = [], onMove }) {
  const [selectedFolderId, setSelectedFolderId] = useState(documentObj?.folder_id || null);
  const [moving, setMoving] = useState(false);

  if (!isOpen || !documentObj) return null;

  const handleConfirm = async () => {
    setMoving(true);
    try {
      await onMove(documentObj.id, selectedFolderId);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setMoving(false);
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

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <BsFolderSymlink size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Move Document</h3>
            <p className="text-xs text-gray-400 truncate max-w-[280px]">
              {documentObj.original_filename}
            </p>
          </div>
        </div>

        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Select Destination Folder
        </div>

        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 mb-6 border border-white/5 rounded-xl p-2 bg-[#0D0D0D]">
          {/* Root option */}
          <button
            type="button"
            onClick={() => setSelectedFolderId(null)}
            className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
              selectedFolderId === null 
                ? 'bg-teal-500/10 border border-teal-500/30 text-teal-300' 
                : 'hover:bg-white/5 text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BsHouse className="text-teal-400 text-sm" />
              <span className="text-xs font-medium">Root / Uncategorized</span>
            </div>
            {selectedFolderId === null && <BsCheck className="text-teal-400 text-lg" />}
          </button>

          {folders.map((f) => {
            const isSelected = selectedFolderId === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFolderId(f.id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                  isSelected 
                    ? 'bg-teal-500/10 border border-teal-500/30 text-teal-300' 
                    : 'hover:bg-white/5 text-gray-300'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate pr-2">
                  <BsFolder className="text-sm shrink-0" style={{ color: f.color || '#14b8a6' }} />
                  <span className="text-xs font-medium truncate">{f.name}</span>
                </div>
                {isSelected && <BsCheck className="text-teal-400 text-lg shrink-0" />}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-colors"
            disabled={moving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={moving}
            className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-bold text-xs transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {moving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Moving...
              </>
            ) : (
              "Move Document"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
