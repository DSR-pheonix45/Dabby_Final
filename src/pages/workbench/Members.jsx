import React, { useState, useEffect } from "react";
import { useWorkbench } from "../../context/WorkbenchContext";
import { useAuth } from "../../hooks/useAuth";
import { BsPersonPlus, BsSearch } from "react-icons/bs";
import { collaborationService } from "../../services/collaborationService";
import AddMemberModal from "./AddMemberModal";
import MemberDetail from "./MemberDetail";
import RoleChangeModal from "./RoleChangeModal";

export default function Members() {
  const { activeWorkbench } = useWorkbench();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isRoleChangeOpen, setIsRoleChangeOpen] = useState(false);

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
      
      // Select the first member by default if none selected
      if (data && data.length > 0 && !selectedMember) {
        setSelectedMember(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMembers = members.filter(m => 
    m.user_id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (m.users && (m.users.name?.toLowerCase().includes(searchQuery.toLowerCase()) || m.users.email?.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const handleRoleChangeClick = (member) => {
    setSelectedMember(member);
    setIsRoleChangeOpen(true);
  };

  if (!activeWorkbench) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 font-dm-sans">
        Select a workbench to view members.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col font-dm-sans">
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Panel - Master List */}
        <div className={`w-full lg:w-[350px] flex-shrink-0 border-r border-white/10 flex flex-col bg-[#0A0A0A] ${selectedMember ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Members</h1>
                <p className="text-gray-400 text-xs mt-1">Manage team access</p>
              </div>
              <button onClick={() => setIsAddMemberOpen(true)} className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/10 shadow-[0_0_10px_rgba(255,255,255,0.05)]" title="Invite Member">
                <BsPersonPlus size={18} />
              </button>
            </div>
            
            <div className="relative">
              <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-colors"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {isLoading ? (
              <p className="text-center text-sm text-gray-500 py-4">Loading members...</p>
            ) : filteredMembers.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-4">No members found.</p>
            ) : (
              filteredMembers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMember(m)}
                  className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${
                    selectedMember?.id === m.id 
                      ? 'bg-teal-500/10 border-teal-500/30' 
                      : 'hover:bg-white/5 border-transparent'
                  } border`}
                >
                  <div className="h-10 w-10 shrink-0 rounded-full bg-teal-500/20 text-teal-500 flex items-center justify-center font-bold">
                    {m.users?.name?.charAt(0)?.toUpperCase() || "M"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {m.users?.name || m.user_id}
                      {m.user_id === user?.id && <span className="ml-2 text-xs text-gray-500">(You)</span>}
                    </p>
                    <p className="text-xs text-gray-500 truncate capitalize">{m.role}</p>
                  </div>
                  {m.status !== 'active' && (
                    <span className="shrink-0 h-2 w-2 rounded-full bg-yellow-500" title={m.status}></span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Detail View */}
        <div className={`flex-1 p-6 lg:p-8 bg-[#0E1117] flex flex-col overflow-hidden ${!selectedMember ? 'hidden lg:flex' : 'flex'}`}>
          <MemberDetail 
            member={selectedMember} 
            workbenchId={activeWorkbench.id} 
            onClose={() => setSelectedMember(null)}
            onRoleChangeClick={handleRoleChangeClick}
          />
        </div>
        
      </div>
      
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        workbenchId={activeWorkbench.id}
      />
      
      <RoleChangeModal
        isOpen={isRoleChangeOpen}
        onClose={() => setIsRoleChangeOpen(false)}
        member={selectedMember}
        workbenchId={activeWorkbench.id}
        onRoleChanged={loadMembers}
      />
      
    </div>
  );
}
