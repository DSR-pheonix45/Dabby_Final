import React from "react";
import { BsCheckCircle, BsCircle, BsCalendar3, BsPerson } from "react-icons/bs";

const priorityConfig = {
  critical: { color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", icon: "🔴" },
  high: { color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", icon: "🟠" },
  medium: { color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: "🔵" },
  low: { color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/20", icon: "⚪" },
};

const statusConfig = {
  open: { label: "Open", class: "text-blue-400 bg-blue-400/10" },
  in_progress: { label: "In Progress", class: "text-yellow-400 bg-yellow-400/10" },
  waiting: { label: "Waiting", class: "text-orange-400 bg-orange-400/10" },
  completed: { label: "Completed", class: "text-green-400 bg-green-400/10" },
  cancelled: { label: "Cancelled", class: "text-gray-400 bg-gray-400/10" },
};

function formatDueDate(dateString) {
  if (!dateString) return "No due date";
  const due = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (due.toDateString() === today.toDateString()) return "Today";
  if (due.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  
  // Format as short date (e.g., Oct 15)
  return due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TaskCard({ task, onStatusChange }) {
  const pConfig = priorityConfig[task.priority?.toLowerCase()] || priorityConfig.medium;
  const sConfig = statusConfig[task.status?.toLowerCase()] || statusConfig.open;
  
  const isCompleted = task.status === "completed";

  return (
    <div className={`p-4 rounded-xl border bg-[#1A1A1A] transition-all hover:bg-white/5 ${isCompleted ? 'opacity-60 border-white/5' : 'border-white/10 hover:border-white/20'}`}>
      <div className="flex items-start justify-between gap-3">
        
        {/* Checkbox & Title */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button 
            onClick={() => onStatusChange(task.id, isCompleted ? 'open' : 'completed')}
            className={`mt-0.5 shrink-0 transition-colors ${isCompleted ? 'text-green-500' : 'text-gray-500 hover:text-white'}`}
          >
            {isCompleted ? <BsCheckCircle size={18} /> : <BsCircle size={18} />}
          </button>
          
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-medium truncate ${isCompleted ? 'text-gray-500 line-through' : 'text-white'}`}>
              <span className="mr-2">{pConfig.icon}</span>
              {task.title}
            </h4>
            
            {task.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
            
            <div className="flex flex-wrap items-center gap-3 mt-3">
              {/* Assignee */}
              {task.assigned_user && (
                <div className="flex items-center text-xs text-gray-400 gap-1.5">
                  <BsPerson />
                  <span className="truncate max-w-[100px]">{task.assigned_user.name || task.assigned_user.email}</span>
                </div>
              )}
              
              {/* Due Date */}
              {task.due_date && (
                <div className={`flex items-center text-xs gap-1.5 ${new Date(task.due_date) < new Date() && !isCompleted ? 'text-red-400' : 'text-gray-400'}`}>
                  <BsCalendar3 />
                  <span>{formatDueDate(task.due_date)}</span>
                </div>
              )}
              
              {/* Status Badge */}
              <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${sConfig.class}`}>
                {sConfig.label}
              </span>
              
              {/* Source Tag (if AI/Workflow) */}
              {task.source && task.source !== 'manual' && (
                <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-purple-500/10 text-purple-400 capitalize">
                  {task.source} Generated
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
