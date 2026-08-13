import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../../lib/supabase';
import { useWorkbench } from '../../../../context/WorkbenchContext';
import { toast } from 'react-hot-toast';
import { BsFileEarmarkPdf, BsImage, BsFileEarmarkText, BsDownload, BsTrash } from 'react-icons/bs';

import { classifyDocumentParties } from '../../../../utils/docPartyClassifier';

export default function PreviewTab({ doc, onDelete, onScan }) {
  const navigate = useNavigate();
  const { activeWorkbench } = useWorkbench();
  const [url, setUrl] = useState(null);

  const handleSendToFlow = () => {
    if (!doc) return;

    const classified = classifyDocumentParties(doc, activeWorkbench);
    const isSales = classified.classification === 'sales_invoice';
    const targetPath = isSales ? '/dashboard/workbench/sales' : '/dashboard/workbench/purchases';

    toast.success(`Opening ${isSales ? 'Sales' : 'Purchases & Expenses'} Flow...`);
    navigate(targetPath);
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUrl() {
      if (!doc || !doc.storage_path) return;
      setLoading(true);
      try {
        // Doc_vault_Raw is private, so we MUST use createSignedUrl
        const { data, error: signedError } = await supabase.storage.from('Doc_vault_Raw').createSignedUrl(doc.storage_path, 3600);
        
        if (data?.signedUrl) {
          setUrl(data.signedUrl);
        } else {
          setError(signedError?.message || "Could not retrieve document URL");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchUrl();
  }, [doc]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse text-sm">Loading preview...</div>;
  }

  if (error || !url) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
        <BsFileEarmarkText className="text-4xl mb-4 opacity-50" />
        <p className="text-sm">Preview not available.</p>
        <p className="text-xs mt-2 opacity-50">{error}</p>
      </div>
    );
  }

  const isPdf = doc.mime_type === 'application/pdf';
  const isImage = doc.mime_type?.startsWith('image/');

  return (
    <div className="flex flex-col h-full bg-[#111111]">
      <div className="p-3 border-b border-white/5 flex justify-between items-center bg-[#0A0A0A]">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
          {isPdf ? <BsFileEarmarkPdf /> : isImage ? <BsImage /> : <BsFileEarmarkText />}
          {doc.original_filename}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSendToBusinessEngine}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-teal-400 to-emerald-400 text-black text-xs font-extrabold transition-all shadow-md hover:opacity-95"
            title="Create a Trade Transaction in Business Engine using this voucher"
          >
            🚀 Send to Business Engine
          </button>

          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors flex items-center justify-center"
            title="Download Original Document"
          >
            <BsDownload size={14} />
          </a>

          {onDelete && (
            <button
              onClick={() => onDelete(doc.id)}
              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors flex items-center justify-center"
              title="Delete Document from Doc Vault"
            >
              <BsTrash size={14} />
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        {isPdf ? (
          <iframe 
            src={`${url}#toolbar=0&view=FitH`} 
            className="w-full h-full rounded border border-white/10 bg-white"
            title={doc.original_filename}
          />
        ) : isImage ? (
          <img 
            src={url} 
            alt={doc.original_filename}
            className="max-w-full max-h-full object-contain rounded border border-white/10"
          />
        ) : (
          <div className="text-center text-gray-500">
            <BsFileEarmarkText className="text-4xl mb-2 mx-auto opacity-50" />
            <p>Cannot preview this file type.</p>
          </div>
        )}
      </div>
    </div>
  );
}
