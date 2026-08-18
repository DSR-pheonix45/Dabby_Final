import React, { useState } from "react";
import { 
  BsPerson, 
  BsPlus, 
  BsClockHistory, 
  BsCheck2All, 
  BsShieldCheck, 
  BsKey, 
  BsCashCoin,
  BsPersonCheck,
  BsArrowRightShort
} from "react-icons/bs";
import TaskCard from "./TaskCard";
import AssignTaskModal from "./AssignTaskModal";
import { useDataCache } from "../../hooks/useDataCache";
import { apiFetch } from "../../lib/apiClient";
import { toast } from "react-hot-toast";

const ROLE_PERMISSIONS_MAP = {
  owner: {
    title: "Platform Owner",
    approvalLimit: "Unlimited (₹1,00,00,000+)",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    permissions: [
      { name: "Universal Ledger & Accounting", access: "Full Create & Approve" },
      { name: "Department & OPEX Approvals", access: "Full Authority" },
      { name: "Document Vault & Extraction", access: "Upload, Review & Delete" },
      { name: "Financial Reports & Tax", access: "View & Export All" },
      { name: "Platform Members & Roles", access: "Invite, Remove & Change Roles" }
    ]
  },
  admin: {
    title: "Administrator",
    approvalLimit: "₹25,00,000 / Transaction",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    permissions: [
      { name: "Universal Ledger & Accounting", access: "Create & Approve" },
      { name: "Department & OPEX Approvals", access: "High Authority" },
      { name: "Document Vault & Extraction", access: "Upload & Review" },
      { name: "Financial Reports & Tax", access: "View & Export" },
      { name: "Platform Members & Roles", access: "Invite & Manage Roles" }
    ]
  },
  manager: {
    title: "Department Manager",
    approvalLimit: "₹5,00,000 / Transaction",
    badgeColor: "bg-teal-500/20 text-teal-300 border-teal-500/30",
    permissions: [
      { name: "Department & OPEX Spend", access: "Direct Budget Spend & Approval" },
      { name: "Employee Reimbursements", access: "Review & Approve Claims" },
      { name: "Document Vault", access: "Upload & Review Dept Receipts" },
      { name: "Tasks & Team Workflows", access: "Assign & Delegate Tasks" }
    ]
  },
  finance: {
    title: "Finance & Accounting Officer",
    approvalLimit: "₹10,00,000 / Transaction",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    permissions: [
      { name: "Universal Ledger & COA", access: "Voucher Posting & Settle" },
      { name: "Reimbursement Payouts", access: "Process Bank Payments" },
      { name: "Financial Reports & Reconciliation", access: "Export & Audit" }
    ]
  },
  member: {
    title: "Platform Member",
    approvalLimit: "₹50,000 / Self Claim",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    permissions: [
      { name: "OPEX & Expense Claims", access: "Submit Out-of-Pocket Claims" },
      { name: "Task Management", access: "View & Complete Assigned Tasks" },
      { name: "Document Vault", access: "Upload Shared Receipts" }
    ]
  },
  viewer: {
    title: "Read-Only Observer",
    approvalLimit: "None (Read Only)",
    badgeColor: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    permissions: [
      { name: "Dashboard & Workspace", access: "Read-Only View" }
    ]
  }
};

export default function MemberDetail({ member, workbenchId, onClose, onRoleChangeClick }) {
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  const [activeTaskTab, setActiveTaskTab] = useState("assigned_to"); // assigned_to | assigned_by

  const fetchTasks = async () => {
    const tRes = await apiFetch(`/api/tasks/${workbenchId}`);
    if (tRes.ok) return await tRes.json();
    return [];
  };

  const fetchActivity = async () => {
    const aRes = await apiFetch(`/api/collaboration/${workbenchId}/activity`);
    if (aRes.ok) return await aRes.json();
    return [];
  };

  const { data: allTasks, isLoading: isTasksLoading, refetch: refetchTasks } = useDataCache(
    member ? `tasks_${workbenchId}` : null,
    fetchTasks
  );

  const { data: allActivity, isLoading: isActivityLoading, refetch: refetchActivity } = useDataCache(
    member ? `activity_${workbenchId}` : null,
    fetchActivity
  );

  const isLoading = isTasksLoading || isActivityLoading;

  const memberId = member?.user_id || member?.id;
  const tasksAssignedTo = (allTasks || []).filter(t => t.assigned_to === memberId);
  const tasksAssignedBy = (allTasks || []).filter(t => t.created_by === memberId && t.assigned_to !== memberId);

  const activity = (allActivity || []).filter(a => a.user_id === memberId);

  const loadMemberData = () => {
    refetchTasks();
    refetchActivity();
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await apiFetch(`/api/tasks/${workbenchId}/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        toast.success(`Task status updated to ${newStatus}`);
        loadMemberData();
      }
    } catch (err) {
      toast.error("Failed to update task status");
    }
  };

  if (!member) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 bg-[#141414] rounded-xl border border-white/5 p-6">
        <div className="text-center">
          <BsPerson size={48} className="mx-auto mb-4 opacity-20" />
          <p>Select a platform member to view details</p>
        </div>
      </div>
    );
  }

  const roleInfo = ROLE_PERMISSIONS_MAP[member.role?.toLowerCase()] || ROLE_PERMISSIONS_MAP.member;

  return (
    <div className="flex-1 flex flex-col bg-[#141414] rounded-xl border border-white/5 overflow-hidden font-dm-sans h-full">
      
      {/* Header Profile Section */}
      <div className="p-6 border-b border-white/10 bg-gradient-to-b from-[#1E1E1E] to-[#141414]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center text-2xl font-extrabold shadow-inner">
              {member.users?.name?.charAt(0)?.toUpperCase() || member.name?.charAt(0)?.toUpperCase() || "M"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{member.users?.name || member.name || "Workbench Member"}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase border ${roleInfo.badgeColor}`}>
                  {member.role || "member"}
                </span>
              </div>
              <p className="text-gray-400 text-xs mt-0.5">{member.users?.email || member.email || member.user_id}</p>
              
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active Member
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400 flex items-center gap-1">
                  <BsShieldCheck className="text-teal-400" />
                  {roleInfo.title}
                </span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => onRoleChangeClick(member)}
            className="px-4 py-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            Change Role
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-7 custom-scrollbar">
        
        {/* Section 1: Role Access & Financial Approvals */}
        <section className="bg-[#181818] border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider">
              <BsKey className="text-teal-400 text-base" />
              <span>Role Permissions & Financial Authority</span>
            </div>
            <span className="text-[11px] text-teal-400 font-semibold bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
              <BsCashCoin />
              <span>Limit: {roleInfo.approvalLimit}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {roleInfo.permissions.map((perm, idx) => (
              <div key={idx} className="bg-black/30 p-3 rounded-xl border border-white/5 flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-white text-[11px]">{perm.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{perm.access}</p>
                </div>
                <span className="w-2 h-2 rounded-full bg-teal-400 mt-1 shrink-0"></span>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Tasks (Assigned TO Member vs Assigned BY Member) */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <BsCheck2All className="text-teal-400 text-base" />
                <span>Task Workflows</span>
              </h3>
            </div>

            {/* Sub-tab Filter */}
            <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setActiveTaskTab("assigned_to")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeTaskTab === "assigned_to"
                    ? "bg-teal-500 text-black shadow-md"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <BsPersonCheck />
                <span>Assigned to Member ({tasksAssignedTo.length})</span>
              </button>

              <button
                onClick={() => setActiveTaskTab("assigned_by")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeTaskTab === "assigned_by"
                    ? "bg-purple-500 text-white shadow-md"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <BsArrowRightShort className="text-base" />
                <span>Delegated to Others ({tasksAssignedBy.length})</span>
              </button>
            </div>

            <button 
              onClick={() => setIsAssignTaskOpen(true)}
              className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-black text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow-md shadow-teal-500/20"
            >
              <BsPlus size={16} />
              <span>Assign Task</span>
            </button>
          </div>

          {isLoading ? (
            <p className="text-xs text-gray-500 py-6 text-center">Loading task workflows...</p>
          ) : activeTaskTab === "assigned_to" ? (
            tasksAssignedTo.length === 0 ? (
              <div className="text-center p-8 bg-[#181818]/50 border border-white/5 rounded-2xl space-y-1">
                <BsCheck2All size={28} className="mx-auto text-gray-600 mb-2" />
                <p className="text-xs font-bold text-gray-300">No tasks currently assigned to this member.</p>
                <p className="text-[11px] text-gray-500">Tasks assigned to {member.users?.name || member.name} will appear here with full status controls.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasksAssignedTo.map(t => (
                  <TaskCard key={t.id} task={t} onStatusChange={handleStatusChange} />
                ))}
              </div>
            )
          ) : (
            tasksAssignedBy.length === 0 ? (
              <div className="text-center p-8 bg-[#181818]/50 border border-white/5 rounded-2xl space-y-1">
                <BsArrowRightShort size={32} className="mx-auto text-gray-600 mb-1" />
                <p className="text-xs font-bold text-gray-300">No tasks delegated by this member to others.</p>
                <p className="text-[11px] text-gray-500">Tasks created by {member.users?.name || member.name} and assigned to team members will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasksAssignedBy.map(t => (
                  <TaskCard key={t.id} task={t} onStatusChange={handleStatusChange} />
                ))}
              </div>
            )
          )}
        </section>

        {/* Section 3: Member Audit & Activity Timeline */}
        <section className="bg-[#181818] border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center mb-1">
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <BsClockHistory className="text-teal-400 text-base" />
              <span>Audit & Activity Log</span>
            </h3>
          </div>
          
          {isLoading ? (
            <p className="text-xs text-gray-500">Loading activity timeline...</p>
          ) : activity.length === 0 ? (
            <p className="text-xs text-gray-500 italic py-2">No logged activity recorded for this member yet.</p>
          ) : (
            <div className="relative border-l border-white/10 ml-3 pl-5 space-y-4">
              {activity.slice(0, 10).map((act, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#141414] border-2 border-teal-400"></div>
                  <p className="text-xs text-white font-medium">{act.description}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {new Date(act.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      <AssignTaskModal
        isOpen={isAssignTaskOpen}
        onClose={() => setIsAssignTaskOpen(false)}
        member={member}
        workbenchId={workbenchId}
        onTaskCreated={loadMemberData}
      />
    </div>
  );
}
