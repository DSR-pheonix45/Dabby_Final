import React from 'react';
import { BsCloudUpload, BsGearWideConnected, BsRobot, BsPerson, BsCheckCircle, BsRocket, BsExclamationTriangle } from 'react-icons/bs';

const getLogIcon = (stage, status) => {
  if (status === 'failed') return <BsExclamationTriangle className="text-red-500" />;
  
  switch (stage) {
    case 'upload': return <BsCloudUpload className="text-gray-400" />;
    case 'ocr': return <BsGearWideConnected className="text-blue-400" />;
    case 'analysis': return <BsRobot className="text-purple-400" />;
    case 'user_edit': return <BsPerson className="text-amber-400" />;
    case 'post': return <BsRocket className="text-teal-400" />;
    default: return <BsCheckCircle className="text-gray-400" />;
  }
};

const getLogTitle = (stage) => {
  switch (stage) {
    case 'upload': return 'Document Uploaded';
    case 'ocr': return 'OCR Processing';
    case 'analysis': return 'AI Financial Analysis';
    case 'user_edit': return 'Reviewed & Edited by User';
    case 'post': return 'Approved & Posted to Ledger';
    default: return stage.replace('_', ' ');
  }
};

export default function TimelineTab({ doc }) {
  const logs = doc.di_document_processing_logs || [];
  
  // Sort logs by created_at descending (newest first)
  const sortedLogs = [...logs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (sortedLogs.length === 0) {
    return <div className="p-8 text-center text-gray-500 text-sm">No activity logs found.</div>;
  }

  return (
    <div className="flex flex-col h-full bg-[#111111] p-8 overflow-y-auto">
      <div className="relative border-l border-white/10 ml-4 space-y-8">
        {sortedLogs.map((log, idx) => {
          const isLatest = idx === 0;
          return (
            <div key={log.id} className="relative pl-8">
              {/* Icon / Bullet */}
              <div className={`absolute -left-[18px] top-0.5 w-9 h-9 rounded-full flex items-center justify-center border-4 border-[#111111] ${isLatest ? 'bg-[#181818] shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'bg-[#141414]'}`}>
                {getLogIcon(log.stage, log.status)}
              </div>
              
              {/* Content */}
              <div className="pt-1.5">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`text-sm font-bold ${isLatest ? 'text-gray-200' : 'text-gray-400'} capitalize`}>
                    {getLogTitle(log.stage)}
                  </h4>
                  <span className="text-xs text-gray-500">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <span className="uppercase tracking-wider font-semibold">{log.provider}</span>
                  <span>•</span>
                  <span className={`${log.status === 'success' ? 'text-green-500/70' : log.status === 'failed' ? 'text-red-500/70' : 'text-amber-500/70'} uppercase tracking-wider font-semibold`}>
                    {log.status}
                  </span>
                </div>
                
                {log.error_message && (
                  <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded p-3 text-xs text-red-400">
                    {log.error_message}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
