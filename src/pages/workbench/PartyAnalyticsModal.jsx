import React, { useState } from 'react';
import { 
  BsXLg, BsBuilding, BsShieldCheck, BsPerson, 
  BsBriefcase, BsPlus, BsCheck2, BsTrash, BsInfoCircle
} from 'react-icons/bs';
import { useWorkbench } from '../../context/WorkbenchContext';
import { collaborationService } from '../../services/collaborationService';
import { toast } from 'react-hot-toast';

export default function PartyAnalyticsModal({ isOpen, onClose, party, onRefresh }) {
  const { activeWorkbench } = useWorkbench();
  const [newRoleInput, setNewRoleInput] = useState("VENDOR");
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  if (!isOpen || !party) return null;

  const isOwner = party.is_self || party.party_type === 'internal';
  const entityType = (party.entity_type || "CORPORATION").toUpperCase();
  const currentRoles = party.roles || [];
  const vessels = party.financial_accounts || [];
  const status = (party.status || "ACTIVE").toUpperCase();

  const handleAddRole = async () => {
    if (currentRoles.includes(newRoleInput)) {
      toast.error(`Party already has role ${newRoleInput}`);
      return;
    }

    setIsAddingRole(true);
    try {
      await collaborationService.addPartyRole(activeWorkbench.id, party.id, newRoleInput);
      toast.success(`Role ${newRoleInput} added successfully`);
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to add role");
    } finally {
      setIsAddingRole(false);
    }
  };

  const handleRemoveRole = async (roleToRemove) => {
    if (currentRoles.length === 1) {
      toast.error("Party must maintain at least one relationship role.");
      return;
    }

    try {
      await collaborationService.removePartyRole(activeWorkbench.id, party.id, roleToRemove);
      toast.success(`Role ${roleToRemove} removed`);
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to remove role");
    }
  };

  const handleStatusToggle = async (newStatus) => {
    setIsUpdatingStatus(true);
    try {
      await collaborationService.updateParty(activeWorkbench.id, party.id, { status: newStatus });
      toast.success(`Party status set to ${newStatus}`);
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const AVAILABLE_ROLES = ["CUSTOMER", "VENDOR", "PARTNER", "INVESTOR", "BANK", "OTHER"];

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none font-dm-sans">
        <div className="w-full max-w-3xl bg-[#0F0F11] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] pointer-events-auto transform transition-all">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#141416] rounded-t-2xl shrink-0">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center
                ${isOwner ? 'border-yellow-500/30 text-yellow-500 bg-yellow-500/10' : 'border-teal-500/30 text-teal-400 bg-teal-500/10'}
              `}>
                {isOwner ? (
                  <BsShieldCheck size={24} />
                ) : entityType === 'INDIVIDUAL' ? (
                  <BsPerson size={24} />
                ) : (
                  <BsBuilding size={24} />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {party.legal_name || party.name}
                  </h2>
                  {isOwner && (
                    <span className="text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                      SELF / OWNER ENTITY
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                    Party Profile & Relationship Identity
                  </span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <BsXLg size={15} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            
            {/* Identity Overview Card */}
            <div className="bg-[#18181A] border border-white/5 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                  Identity Master Data
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Status:</span>
                  <select
                    value={status}
                    disabled={isUpdatingStatus}
                    onChange={(e) => handleStatusToggle(e.target.value)}
                    className="bg-[#141416] border border-white/10 text-white text-xs rounded px-2.5 py-1 focus:outline-none focus:border-teal-500 font-bold"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="text-gray-500 font-semibold text-[10px] uppercase">Legal Name</div>
                  <div className="text-white font-bold mt-0.5">{party.legal_name || party.name}</div>
                </div>
                <div>
                  <div className="text-gray-500 font-semibold text-[10px] uppercase">Display Name</div>
                  <div className="text-white font-bold mt-0.5">{party.display_name || "—"}</div>
                </div>
                <div>
                  <div className="text-gray-500 font-semibold text-[10px] uppercase">Entity Type</div>
                  <div className="text-white font-bold mt-0.5">{entityType}</div>
                </div>
                <div>
                  <div className="text-gray-500 font-semibold text-[10px] uppercase">GSTIN</div>
                  <div className="text-white font-mono font-bold mt-0.5">{party.gstin || "—"}</div>
                </div>
                <div>
                  <div className="text-gray-500 font-semibold text-[10px] uppercase">PAN</div>
                  <div className="text-white font-mono font-bold mt-0.5">{party.pan || "—"}</div>
                </div>
                <div>
                  <div className="text-gray-500 font-semibold text-[10px] uppercase">Phone</div>
                  <div className="text-white font-bold mt-0.5">{party.phone || "—"}</div>
                </div>
                <div>
                  <div className="text-gray-500 font-semibold text-[10px] uppercase">Email</div>
                  <div className="text-white font-bold mt-0.5">{party.email || "—"}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-gray-500 font-semibold text-[10px] uppercase">Address</div>
                  <div className="text-white font-bold mt-0.5">{party.address || "—"}</div>
                </div>
              </div>
            </div>

            {/* Relationship Roles Section */}
            <div className="bg-[#18181A] border border-white/5 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                Relationship Roles
              </h3>

              <div className="flex flex-wrap items-center gap-2">
                {currentRoles.map(role => (
                  <div 
                    key={role}
                    className="flex items-center space-x-2 px-3 py-1 bg-teal-500/10 border border-teal-500/30 text-teal-400 rounded-lg text-xs font-bold uppercase"
                  >
                    <span>{role}</span>
                    <button
                      onClick={() => handleRemoveRole(role)}
                      className="text-teal-400 hover:text-rose-400 transition-colors ml-1"
                      title="Remove Role"
                    >
                      <BsTrash size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Role Control */}
              <div className="pt-2 border-t border-white/5 flex items-center space-x-2">
                <select
                  value={newRoleInput}
                  onChange={(e) => setNewRoleInput(e.target.value)}
                  className="bg-[#141416] border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-teal-500 font-semibold"
                >
                  {AVAILABLE_ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAddRole}
                  disabled={isAddingRole}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-black font-bold text-xs rounded-lg transition-colors disabled:opacity-50"
                >
                  <BsPlus size={16} />
                  <span>Add Role</span>
                </button>
              </div>
            </div>

            {/* Settlement Vessels Section */}
            <div className="bg-[#18181A] border border-white/5 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                Settlement Vessels / Financial Accounts ({vessels.length})
              </h3>

              {vessels.length === 0 ? (
                <div className="text-xs text-gray-500 italic py-2">
                  No settlement vessels attached. Financial accounts specify payment channels for this party.
                </div>
              ) : (
                <div className="space-y-2">
                  {vessels.map(v => (
                    <div key={v.id} className="bg-[#141416] border border-white/5 rounded-xl p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <BsBriefcase size={16} className="text-teal-400" />
                        <div>
                          <div className="font-bold text-white">{v.display_name}</div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            {v.bank_name || v.upi_id || v.account_number || "Settlement Channel"}
                          </div>
                        </div>
                      </div>
                      <span className="text-[9px] font-extrabold text-gray-400 bg-white/5 px-2.5 py-1 rounded border border-white/5 uppercase">
                        {(v.account_type || "").replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Financial Activity Banner */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center space-x-3 text-xs text-gray-400">
              <BsInfoCircle size={18} className="text-teal-400 shrink-0" />
              <div>
                <div className="font-bold text-gray-300">Financial Activity Status</div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  No financial activity recorded yet. Accounting metrics (AR/AP, DSO/DPO, Vouchers) will appear after Business Event & Voucher Engine integration.
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </>
  );
}
