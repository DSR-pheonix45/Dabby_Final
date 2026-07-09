import React, { useState, useEffect } from "react";
import { useWorkbench } from "../../context/WorkbenchContext";
import { useAuth } from "../../hooks/useAuth";
import { BsPersonPlus, BsSearch, BsThreeDots } from "react-icons/bs";
import { collaborationService } from "../../services/collaborationService";
import AddMemberModal from "./AddMemberModal";

export default function Members() {
  const { activeWorkbench } = useWorkbench();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  useEffect(() => {
    if (activeWorkbench) {
      loadMembers();
    }
  }, [activeWorkbench]);

  const loadMembers = async () => {
    setIsLoading(true);
    try {
      const data = await collaborationService.getMembers(activeWorkbench.id);
      setMembers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!activeWorkbench) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 font-dm-sans">
        Select a workbench to view members.
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 font-dm-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Members</h1>
            <p className="text-gray-400 text-sm mt-1">Manage team access to {activeWorkbench.name}</p>
          </div>
          <button onClick={() => setIsAddMemberOpen(true)} className="flex items-center space-x-2 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-black font-semibold text-sm rounded-md transition-colors w-full sm:w-auto justify-center shadow-[0_0_10px_rgba(20,184,166,0.3)]">
            <BsPersonPlus size={16} />
            <span>Invite Member</span>
          </button>
        </div>

        {/* Toolbar Section */}
        <div className="flex items-center space-x-3 border-b border-white/10 pb-4">
          <div className="relative w-full max-w-md">
            <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search members by user ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-md py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>
        </div>

        {/* Members List */}
        <div className="bg-[#181818] border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">User</th>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">Role</th>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-gray-400 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">Loading members...</td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No members found.</td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-teal-500/20 text-teal-500 flex items-center justify-center font-bold mr-3">
                          {member.user_id === user?.id ? "U" : "M"}
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">
                            {member.user_id === user?.id ? "You" : "User"}
                          </div>
                          <div className="text-gray-500 text-xs truncate max-w-[200px]">
                            {member.user_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-300 capitalize">{member.role}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        member.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        member.status === 'invited' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                        'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-500 hover:text-white transition-colors p-1 rounded hover:bg-white/10">
                        <BsThreeDots />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        workbenchId={activeWorkbench.id}
      />
    </div>
  );
}
