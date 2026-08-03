import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { BsFileEarmarkPdf, BsImage, BsFileEarmarkText, BsDownload, BsTrash, BsLightningChargeFill } from 'react-icons/bs';

export default function PreviewTab({ doc, onDelete, onScan }) {
  const [url, setUrl] = useState(null);
  const [scanning, setScanning] = useState(false);

  const handleScan = async () => {
    if (!onScan || !doc) return;
    setScanning(true);
    try {
      await onScan(doc.id);
    } finally {
      setScanning(false);
    }
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
          {onScan && (
            <button
              onClick={handleScan}
              disabled={scanning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal-500 hover:bg-teal-400 text-black text-xs font-bold transition-all shadow-md disabled:opacity-50"
              title="Scan document with Gemini Vision OCR"
            >
              <BsLightningChargeFill className={scanning ? 'animate-spin' : ''} />
              {scanning ? 'Scanning...' : 'Scan & Extract (AI OCR)'}
            </button>
          )}
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 transition-colors"
          >
            <BsDownload /> Download Original
          </a>
          {onDelete && (
            <button
              onClick={() => onDelete(doc.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-400 border border-red-500/30 transition-colors"
              title="Delete document from Doc Vault"
            >
              <BsTrash /> Delete Document
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
