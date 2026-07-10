import React, { useState, useEffect } from "react";
import { BsX, BsShieldLock, BsCheckCircleFill, BsXCircleFill } from "react-icons/bs";
import { apiFetch } from "../../lib/apiClient";
import { toast } from "react-hot-toast";

export default function RoleChangeModal({ isOpen, onClose, member, workbenchId, onRoleChanged }) {
  const [newRole, setNewRole] = useState(member?.role || "viewer");
  const [isUpdating, setIsUpdating] = useState(false);
  const [permissions, setPermissions] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setNewRole(member?.role || "viewer");
      fetchPermissions();
    }
  }, [isOpen, member]);

  const fetchPermissions = async () => {
    try {
      const res = await apiFetch(`/api/collaboration/permissions`);
      if (res.ok) {
        const data = await res.json();
        setPermissions(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen || !member || !permissions) return null;

  const currentPerms = permissions[member.role] || {};
  const newPerms = permissions[newRole] || {};

  // Flatten permissions for comparison
  const flattenPerms = (perms) => {
    const flat = {};
    Object.keys(perms).forEach(category => {
      Object.keys(perms[category]).forEach(action => {
        flat[`${category}.${action}`] = perms[category][action];
      });
    });
    return flat;
  };

  const currentFlat = flattenPerms(currentPerms);
  const newFlat = flattenPerms(newPerms);

  // Determine what changed
  const gained = [];
  const lost = [];
  const unchanged = [];

  Object.keys(newFlat).forEach(key => {
    const [cat, act] = key.split('.');
    const label = `${cat.charAt(0).toUpperCase() + cat.slice(1)}: ${act.charAt(0).toUpperCase() + act.slice(1)}`;
    if (newFlat[key] && !currentFlat[key]) {
      gained.push(label);
    } else if (!newFlat[key] && currentFlat[key]) {
      lost.push(label);
    } else if (newFlat[key]) {
      unchanged.push(label);
    }
  });

  const handleUpdate = async () => {
    if (newRole === member.role) {
      onClose();
      return;
    }
    
    setIsUpdating(true);
    try {
      const res = await apiFetch(`/api/collaboration/${workbenchId}/members/${member.user_id}/role`, {
        method: "PUT",
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        toast.success("Role updated successfully");
        onRoleChanged();
        onClose();
      } else {
        const error = await res.json();
        toast.error(error.detail || "Failed to update role");
      }
    } catch (err) {
      toast.error("Failed to update role");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-dm-sans">
      <div className="bg-[#181818] border border-white/10 rounded-xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <BsShieldLock className="text-teal-500" />
            Change Role
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <BsX size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="w-2/5 p-3 rounded-lg bg-white/5 border border-white/10 text-center">
              <p className="text-xs text-gray-500 mb-1">Current</p>
              <p className="text-sm font-medium text-white capitalize">{member.role}</p>
            </div>
            <div className="text-gray-500">→</div>
            <div className="w-2/5">
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-white/20 rounded-lg px-3 py-3.5 text-white text-sm font-medium focus:outline-none focus:border-teal-500 transition-colors capitalize text-center appearance-none"
              >
                {Object.keys(permissions).map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {newRole !== member.role && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-300">Permission Changes</h4>
              
              {gained.length > 0 && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 space-y-2">
                  <p className="text-xs font-bold text-green-400 uppercase tracking-wider">Gaining Access</p>
                  <ul className="space-y-1">
                    {gained.map(g => (
                      <li key={g} className="text-sm text-green-100 flex items-center gap-2">
                        <BsCheckCircleFill className="text-green-500" size={12} /> {g}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {lost.length > 0 && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 space-y-2">
                  <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Losing Access</p>
                  <ul className="space-y-1">
                    {lost.map(l => (
                      <li key={l} className="text-sm text-red-100 flex items-center gap-2">
                        <BsXCircleFill className="text-red-500" size={12} /> {l}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {gained.length === 0 && lost.length === 0 && (
                <p className="text-sm text-gray-400 italic text-center p-4 bg-white/5 rounded-lg">
                  No permission differences between these roles.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/10 shrink-0 flex justify-end gap-3 bg-[#141414]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={isUpdating || newRole === member.role}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-black font-semibold text-sm rounded-md transition-colors shadow-[0_0_10px_rgba(20,184,166,0.3)] disabled:opacity-50 disabled:shadow-none"
          >
            {isUpdating ? "Saving..." : "Confirm Change"}
          </button>
        </div>

      </div>
    </div>
  );
}
