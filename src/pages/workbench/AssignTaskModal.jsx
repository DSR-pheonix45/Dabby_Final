import React, { useState } from "react";
import { BsX, BsExclamationTriangle } from "react-icons/bs";
import { toast } from "react-hot-toast";
import { apiFetch } from "../../lib/apiClient";

export default function AssignTaskModal({ isOpen, onClose, member, workbenchId, onTaskCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !member) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Task title is required");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        assigned_to: member.user_id,
        priority,
        status: "open",
        source: "manual"
      };

      if (dueDate) {
        payload.due_date = dueDate;
      }

      const res = await apiFetch(`/api/tasks/${workbenchId}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to create task");
      }

      toast.success("Task assigned successfully!");
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDueDate("");
      onTaskCreated();
      onClose();
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-dm-sans">
      <div className="bg-[#141414] border border-white/10 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Assign Task</h2>
            <p className="text-gray-400 text-sm mt-1">Assign a new task to {member.users?.name || member.user_id}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <BsX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400">
              <BsExclamationTriangle className="mt-0.5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form id="assign-task-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                Task Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Review Q3 Financials"
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide task details..."
                rows={3}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all appearance-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 flex gap-3 justify-end bg-black/20">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="assign-task-form"
            disabled={isLoading || !title.trim()}
            className="px-5 py-2.5 text-sm font-medium bg-teal-500 hover:bg-teal-400 text-black rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(20,184,166,0.3)]"
          >
            {isLoading ? "Assigning..." : "Assign Task"}
          </button>
        </div>
      </div>
    </div>
  );
}
