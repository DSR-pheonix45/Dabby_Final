import React, { useState } from 'react';
import { BsX, BsBank, BsReceipt, BsCash, BsUpload, BsLink45Deg } from 'react-icons/bs';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../../../utils/currency';
import { useWorkbench } from '../../../../context/WorkbenchContext';

export default function AddSettlementModal({ isOpen, onClose, data }) {
  const { activeWorkbench } = useWorkbench();
  const [activeTab, setActiveTab] = useState('bank');
  const [loading, setLoading] = useState(false);

  // Manual Entry Form State
  const [manualAmount, setManualAmount] = useState(data?.settlement?.difference || 0);
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualNotes, setManualNotes] = useState('');

  if (!isOpen || !data) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Simulate API call to save settlement
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Settlement entry added successfully');
      window.dispatchEvent(new CustomEvent('ledger:updated'));
      onClose();
    } catch (error) {
      toast.error('Failed to add settlement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-[#0E1117] border border-[#1F242C] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-cyan-500 bg-clip-text text-transparent">
              Add Settlement
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Link payment to invoice for {data.party}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <BsX className="w-6 h-6" />
          </button>
        </div>

        {/* Invoice Summary */}
        <div className="bg-[#181818] p-4 border-b border-white/5 flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Pending Amount</p>
            <p className="text-lg font-bold text-amber-400">
              {formatCurrency(data.settlement?.difference || data.amount, activeWorkbench?.country)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-0.5">Invoice Total</p>
            <p className="text-sm font-semibold text-gray-300">
              {formatCurrency(data.amount, activeWorkbench?.country)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-4 mt-2 space-x-1">
          <button
            onClick={() => setActiveTab('bank')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center ${
              activeTab === 'bank' 
                ? 'border-teal-500 text-teal-400' 
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <BsBank className="mr-2" /> Bank Statement
          </button>
          <button
            onClick={() => setActiveTab('receipt')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center ${
              activeTab === 'receipt' 
                ? 'border-teal-500 text-teal-400' 
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <BsReceipt className="mr-2" /> Upload Receipt
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center ${
              activeTab === 'manual' 
                ? 'border-teal-500 text-teal-400' 
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <BsCash className="mr-2" /> Manual Cash
          </button>
        </div>

        {/* Form Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {activeTab === 'bank' && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 bg-teal-500/10 rounded-full flex items-center justify-center mb-4">
                <BsLink45Deg className="text-teal-400 text-2xl" />
              </div>
              <h3 className="text-white font-bold mb-2">Link Bank Statement Entry</h3>
              <p className="text-sm text-gray-400 mb-6 max-w-sm">
                Scan your existing bank statement snippets and link a specific transaction entry to this invoice.
              </p>
              <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-white transition-colors">
                Select from Snippets
              </button>
            </div>
          )}

          {activeTab === 'receipt' && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-full border-2 border-dashed border-white/10 rounded-xl p-8 hover:border-teal-500/50 hover:bg-teal-500/5 transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-white/5 group-hover:bg-teal-500/10 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors">
                  <BsUpload className="text-gray-400 group-hover:text-teal-400 text-xl transition-colors" />
                </div>
                <h3 className="text-white font-medium mb-1">Upload Payment Receipt</h3>
                <p className="text-xs text-gray-500">
                  Drag & drop your UPI or Bank Transfer receipt here, or click to browse.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'manual' && (
            <form id="settlement-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Amount Settled <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-2 text-gray-500">{activeWorkbench?.currency === 'INR' ? '₹' : '$'}</span>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-8 pr-4 py-2 text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Date of Settlement <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  required
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors [color-scheme:dark]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Notes / Narration</label>
                <textarea
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="e.g. Received via cash"
                  rows={3}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors resize-none"
                />
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            Cancel
          </button>
          
          {activeTab === 'manual' && (
            <button
              type="submit"
              form="settlement-form"
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 rounded-lg transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? 'Processing...' : 'Confirm Settlement'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
