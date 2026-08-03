import React from 'react';
import { BsDiagram3 } from 'react-icons/bs';
import SnippetCard from './SnippetCard';

export default function SnippetsTab({ doc }) {
  const note = doc.di_analysis_notes?.[0] || {};
  const data = note.extracted_data || {};
  const transactions = note.line_items || data.transactions || [];
  const rawDocType = note.document_type || data.document_type;
  const docTypeValue = typeof rawDocType === 'object' ? rawDocType?.value : rawDocType;
  const isBankStatement = (docTypeValue || '').toLowerCase().includes('bank statement');

  if (!isBankStatement) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
        <BsDiagram3 className="w-16 h-16 text-gray-500 mb-4" />
        <h3 className="text-lg font-bold text-gray-300">No Snippets Available</h3>
        <p className="text-sm text-gray-500 mt-2">
          Snippets are only generated for Bank Statements.
        </p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
        <BsDiagram3 className="w-16 h-16 text-gray-500 mb-4" />
        <h3 className="text-lg font-bold text-gray-300">No Transactions Found</h3>
        <p className="text-sm text-gray-500 mt-2">
          We couldn't extract any transactions from this bank statement.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6 shrink-0">
        <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <BsDiagram3 className="text-teal-400" />
          Bank Statement Snippets
        </h3>
        <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">
          {transactions.length} verified transactions extracted
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-12">
          {transactions.map((item, idx) => (
            <SnippetCard 
              key={idx} 
              transaction={item} 
              sourceDocument={{ filename: doc.file_name || 'Bank Statement' }} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}
