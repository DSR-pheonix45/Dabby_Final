import React, { useState, useEffect } from "react";
import { BsPerson, BsPlus, BsClockHistory, BsCheckCircle, BsCheck2All } from "react-icons/bs";
import TaskCard from "./TaskCard";
import AssignTaskModal from "./AssignTaskModal";
import { apiFetch } from "../../lib/apiClient";
import { toast } from "react-hot-toast";

export default function MemberDetail({ member, workbenchId, onClose, onRoleChangeClick }) {
  const [tasks, setTasks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  
  useEffect(() => {
    if (member) {
      loadMemberData();
    }
  }, [member]);

  const loadMemberData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch all workbench tasks
      const tRes = await apiFetch(`/api/tasks/${workbenchId}`);
      if (tRes.ok) {
        const allTasks = await tRes.json();
        // Filter tasks assigned to this member
        setTasks(allTasks.filter(t => t.assigned_to === member.user_id));
      }
      
      // 2. Fetch activity logs
      const aRes = await apiFetch(`/api/collaboration/${workbenchId}/activity`);
      if (aRes.ok) {
        const allActivity = await aRes.json();
        // Filter activity for this member
        setActivity(allActivity.filter(a => a.user_id === member.user_id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await apiFetch(`/api/tasks/${workbenchId}/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        toast.success("Task updated");
        loadMemberData();
      }
    } catch (err) {
      toast.error("Failed to update task");
    }
  };

  if (!member) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 bg-[#141414] rounded-xl border border-white/5 p-6">
        <div className="text-center">
          <BsPerson size={48} className="mx-auto mb-4 opacity-20" />
          <p>Select a member to view details</p>
        </div>
      </div>
    );
  }

  const pendingTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="flex-1 flex flex-col bg-[#141414] rounded-xl border border-white/5 overflow-hidden font-dm-sans h-full">
      
      {/* Header Profile Section */}
      <div className="p-6 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-teal-500/20 text-teal-500 flex items-center justify-center text-2xl font-bold">
              {member.users?.name?.charAt(0)?.toUpperCase() || "M"}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{member.users?.name || "Unknown User"}</h2>
              <p className="text-gray-400 text-sm">{member.users?.email || member.user_id}</p>
              
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs font-medium text-gray-300 capitalize">
                  {member.role}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs font-medium capitalize border border-green-500/20">
                  {member.status}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-2 text-gray-400 hover:text-white">
            Close
          </button>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex items-center gap-3">
          <button 
            onClick={() => onRoleChangeClick(member)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg transition-colors border border-white/10"
          >
            Change Role
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Tasks Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <BsCheck2All />
              Assigned Tasks
            </h3>
            <button 
              onClick={() => setIsAssignTaskOpen(true)}
              className="px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 text-xs font-medium rounded-lg transition-colors border border-teal-500/20 flex items-center gap-1"
            >
              <BsPlus size={16} />
              Assign Task
            </button>
          </div>
          
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <div className="text-center p-6 bg-white/5 border border-white/5 rounded-lg border-dashed">
              <p className="text-sm text-gray-500">No tasks assigned.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {pendingTasks.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-gray-500">Pending</h4>
                  {pendingTasks.map(t => (
                    <TaskCard key={t.id} task={t} onStatusChange={handleStatusChange} />
                  ))}
                </div>
              )}
              
              {completedTasks.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-gray-500">Completed</h4>
                  {completedTasks.map(t => (
                    <TaskCard key={t.id} task={t} onStatusChange={handleStatusChange} />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Activity Timeline Section */}
        <section>
          <div className="flex items-center mb-4">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <BsClockHistory />
              Recent Activity
            </h3>
          </div>
          
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading activity...</p>
          ) : activity.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No recent activity.</p>
          ) : (
            <div className="relative border-l border-white/10 ml-3 pl-5 space-y-6">
              {activity.slice(0, 10).map((act, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-[#1A1A1A] border-2 border-teal-500"></div>
                  <p className="text-sm text-white">{act.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
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
