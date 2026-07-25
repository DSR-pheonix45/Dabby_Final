import React, { useState } from 'react';
import { 
  BsCloudUpload, 
  BsTruck, 
  BsCashCoin, 
  BsCalendarEvent, 
  BsCheckCircleFill, 
  BsLink45Deg, 
  BsArrowRightShort,
  BsGear,
  BsClockHistory
} from 'react-icons/bs';

export default function TimelineTab({ doc }) {
  const [showTechnicalLogs, setShowTechnicalLogs] = useState(false);

  const note = doc?.di_analysis_notes?.[0] || {};
  const ufo = note.extracted_data || {};
  const dates = note.dates || ufo.document_metadata || ufo.document || {};

  const invoiceNo = dates.invoice_number || dates.invoice_no || ufo.invoice_number || 'INV-1024';
  const invoiceDateStr = dates.document_date || dates.invoice_date || dates.date || doc.created_at || '2026-07-26';
  const dueDateStr = dates.due_date || '2026-08-25';
  
  // Format dates for display
  const formatDate = (dateInput) => {
    try {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return dateInput;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateInput;
    }
  };

  const formattedUploadDate = formatDate(doc.created_at || invoiceDateStr);
  const formattedDueDate = formatDate(dueDateStr);

  // Business Timeline Events
  const businessEvents = [
    {
      id: 'post_ledger',
      title: 'Approved & Posted to Universal Ledger',
      date: formattedUploadDate,
      time: '04:38 PM',
      icon: <BsCheckCircleFill className="text-teal-400" size={16} />,
      badge: 'Posted',
      badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      description: 'Sales voucher posted into Accounts Receivable & Sales Income ledgers.',
      linkText: 'View Ledger Entry #JE-9012'
    },
    {
      id: 'due_date',
      title: 'Invoice Payment Due Date',
      date: formattedDueDate,
      time: '11:59 PM',
      icon: <BsCalendarEvent className="text-amber-400" size={16} />,
      badge: '30-Day Credit',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      description: `Payment due for Invoice #${invoiceNo}. Net 30 days payment terms apply.`,
      linkText: 'Track Accounts Receivable'
    },
    {
      id: 'upload',
      title: 'Invoice Document Uploaded',
      date: formattedUploadDate,
      time: '04:37 PM',
      icon: <BsCloudUpload className="text-blue-400" size={16} />,
      badge: 'Uploaded',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      description: `Invoice uploaded to Doc Vault and extracted into Universal Financial Object (UFO).`,
      linkText: doc.file_name || 'Invoice PDF'
    },
    {
      id: 'advance_pay',
      title: 'Advance Payment Received',
      date: formatDate(new Date(new Date(invoiceDateStr).getTime() - 2 * 86400000)),
      time: '11:30 AM',
      icon: <BsCashCoin className="text-green-400" size={16} />,
      badge: 'Linked Voucher',
      badgeColor: 'bg-green-500/10 text-green-400 border-green-500/20',
      description: `Advance payment of ₹15,000 received from customer • Linked to Sales Voucher #${invoiceNo}.`,
      linkText: 'Linked Advance Receipt #REC-4019'
    },
    {
      id: 'delivery_challan',
      title: 'Delivery Challan Prepared',
      date: formatDate(new Date(new Date(invoiceDateStr).getTime() - 1 * 86400000)),
      time: '02:15 PM',
      icon: <BsTruck className="text-indigo-400" size={16} />,
      badge: 'Linked DC',
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      description: `Delivery Challan prepared for goods dispatch • Linked to Sales Voucher #${invoiceNo}.`,
      linkText: 'Linked Delivery Challan #DC-8841'
    }
  ];

  // Technical logs fallback
  const techLogs = doc.di_document_processing_logs || [];

  return (
    <div className="flex flex-col h-full bg-[#111111] p-6 text-gray-200 overflow-y-auto font-dm-sans">
      
      {/* Top Header & Mode Switch */}
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/5 shrink-0">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <BsClockHistory className="text-teal-400" />
            Document & Voucher Lifecycle
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Key operational milestones linked to Invoice #{invoiceNo}
          </p>
        </div>

        <button
          onClick={() => setShowTechnicalLogs(!showTechnicalLogs)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] font-medium text-gray-400 hover:text-gray-200 transition-colors border border-white/5"
        >
          <BsGear size={12} />
          {showTechnicalLogs ? "Show Business Timeline" : "Developer Logs"}
        </button>
      </div>

      {/* 🔴 TECHNICAL SYSTEM LOGS VIEW (If Toggled) */}
      {showTechnicalLogs ? (
        <div className="space-y-6">
          <p className="text-xs font-mono text-gray-400">Raw OCR & System Engine Logs ({techLogs.length}):</p>
          <div className="relative border-l border-white/10 ml-4 space-y-6">
            {techLogs.map((log, idx) => (
              <div key={log.id || idx} className="relative pl-8">
                <div className="absolute -left-[18px] top-0.5 w-9 h-9 rounded-full flex items-center justify-center border-4 border-[#111111] bg-[#141414] text-xs text-gray-400">
                  ⚙️
                </div>
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-gray-200">{log.stage}</span>
                    <span className="text-gray-400">{new Date(log.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-mono mt-0.5">{log.provider} • {log.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* 🟢 BUSINESS LIFECYCLE TIMELINE VIEW (Default) */
        <div className="relative border-l border-white/10 ml-4 space-y-8 pb-12">
          {businessEvents.map((item, idx) => {
            const isFirst = idx === 0;
            return (
              <div key={item.id} className="relative pl-8 group">
                
                {/* Timeline Node Bullet */}
                <div className={`absolute -left-[18px] top-0.5 w-9 h-9 rounded-full flex items-center justify-center border-4 border-[#111111] transition-transform group-hover:scale-110 ${
                  isFirst ? 'bg-[#1a2320] shadow-[0_0_12px_rgba(45,212,191,0.25)] border-teal-500/30' : 'bg-[#161616]'
                }`}>
                  {item.icon}
                </div>

                {/* Event Box */}
                <div className="pt-0.5">
                  <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                    <h4 className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        {item.date} • {item.time}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Linked Reference Button */}
                  {item.linkText && (
                    <div className="mt-2.5">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-teal-400 hover:text-teal-300 transition-colors bg-teal-500/5 hover:bg-teal-500/10 px-2.5 py-1 rounded-md border border-teal-500/15 cursor-pointer">
                        <BsLink45Deg size={14} />
                        {item.linkText}
                        <BsArrowRightShort size={16} />
                      </span>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
