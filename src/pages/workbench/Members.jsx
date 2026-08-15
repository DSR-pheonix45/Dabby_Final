import React, { useState, useEffect } from "react";
import { useWorkbench } from "../../context/WorkbenchContext";
import { useAuth } from "../../hooks/useAuth";
import { useDataCache } from "../../hooks/useDataCache";
import { 
  BsPersonPlus, BsSearch, BsBuilding, BsPeople, BsLink45Deg, 
  BsPlusLg, BsCashCoin, BsBuildingCheck, BsCheck2, BsBriefcase 
} from "react-icons/bs";
import { collaborationService } from "../../services/collaborationService";
import AddMemberModal from "./AddMemberModal";
import MemberDetail from "./MemberDetail";
import RoleChangeModal from "./RoleChangeModal";
import { toast } from "react-hot-toast";

export default function Members() {
  const { activeWorkbench } = useWorkbench();
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState("members"); // members | departments | employees
  const [searchQuery, setSearchQuery] = useState("");

  // Platform Members
  const { data: membersData, isLoading: isLoadingMembers, refetch: loadMembers } = useDataCache(
    activeWorkbench ? `members_${activeWorkbench.id}` : null,
    () => collaborationService.getMembers(activeWorkbench.id)
  );
  const members = membersData || [];

  // Departments
  const [departments, setDepartments] = useState([]);
  const [isLoadingDepts, setIsLoadingDepts] = useState(false);

  // Employees
  const [employees, setEmployees] = useState([]);
  const [isLoadingEmps, setIsLoadingEmps] = useState(false);

  // Modals & Selected items
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isRoleChangeOpen, setIsRoleChangeOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Department Modal State
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptBudget, setNewDeptBudget] = useState("");

  // Employee Modal State
  const [isAddEmpOpen, setIsAddEmpOpen] = useState(false);
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [newEmpDept, setNewEmpDept] = useState("Site Operations");
  const [newEmpDesignation, setNewEmpDesignation] = useState("Staff");
  const [newEmpAllowance, setNewEmpAllowance] = useState("");

  useEffect(() => {
    if (activeWorkbench) {
      fetchDeptsAndEmployees();
    }
  }, [activeWorkbench]);

  useEffect(() => {
    if (members.length > 0 && !selectedMember) {
      setSelectedMember(members[0]);
    }
  }, [members, selectedMember]);

  const fetchDeptsAndEmployees = async () => {
    if (!activeWorkbench) return;
    setIsLoadingDepts(true);
    setIsLoadingEmps(true);
    try {
      const depts = await collaborationService.getDepartments(activeWorkbench.id);
      setDepartments(depts || []);
      const emps = await collaborationService.getEmployees(activeWorkbench.id);
      setEmployees(emps || []);
    } catch (err) {
      console.warn("Notice loading depts/employees:", err);
    } finally {
      setIsLoadingDepts(false);
      setIsLoadingEmps(false);
    }
  };

  const handleCopyPublicLink = () => {
    const link = `${window.location.origin}/expense-claim/${activeWorkbench?.id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success("Employee Expense Claim Portal link copied!");
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    try {
      await collaborationService.createDepartment(activeWorkbench.id, {
        name: newDeptName.trim(),
        monthly_budget: Number(newDeptBudget) || 0
      });
      toast.success(`Department "${newDeptName}" created!`);
      setNewDeptName("");
      setNewDeptBudget("");
      setIsAddDeptOpen(false);
      fetchDeptsAndEmployees();
    } catch (err) {
      toast.error("Failed to create department");
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!newEmpName.trim()) return;
    try {
      await collaborationService.createEmployee(activeWorkbench.id, {
        name: newEmpName.trim(),
        email: newEmpEmail.trim(),
        department_name: newEmpDept,
        designation: newEmpDesignation,
        monthly_allowance: Number(newEmpAllowance) || 0
      });
      toast.success(`Employee "${newEmpName}" added!`);
      setNewEmpName("");
      setNewEmpEmail("");
      setNewEmpAllowance("");
      setIsAddEmpOpen(false);
      fetchDeptsAndEmployees();
    } catch (err) {
      toast.error("Failed to add employee");
    }
  };

  const filteredMembers = members.filter(m => 
    m.user_id?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (m.users && (m.users.name?.toLowerCase().includes(searchQuery.toLowerCase()) || m.users.email?.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const filteredDepartments = departments.filter(d => 
    d.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEmployees = employees.filter(e => 
    e.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.department_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!activeWorkbench) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 font-dm-sans">
        Select a workbench to view members & directory.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col font-dm-sans bg-[#111111] overflow-hidden">
      
      {/* Top Bar Header */}
      <div className="px-6 lg:px-10 py-5 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#181818]/50">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Team & Organization Directory
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage platform members, departments, and non-login company employees
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleCopyPublicLink}
            className="flex items-center space-x-2 px-3.5 py-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-xl text-xs font-bold transition-all shadow-sm"
            title="Copy Public Link for Employees to submit Expense Claims"
          >
            {copiedLink ? <BsCheck2 className="text-emerald-400 text-sm" /> : <BsLink45Deg className="text-sm" />}
            <span>{copiedLink ? "Link Copied!" : "🔗 Public Expense Portal Link"}</span>
          </button>

          {activeSubTab === "members" && (
            <button
              onClick={() => setIsAddMemberOpen(true)}
              className="flex items-center space-x-2 px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-black rounded-xl text-xs font-extrabold transition-all"
            >
              <BsPersonPlus size={14} />
              <span>Invite Platform Member</span>
            </button>
          )}

          {activeSubTab === "departments" && (
            <button
              onClick={() => setIsAddDeptOpen(true)}
              className="flex items-center space-x-2 px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-black rounded-xl text-xs font-extrabold transition-all"
            >
              <BsPlusLg size={13} />
              <span>Add Department</span>
            </button>
          )}

          {activeSubTab === "employees" && (
            <button
              onClick={() => setIsAddEmpOpen(true)}
              className="flex items-center space-x-2 px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-black rounded-xl text-xs font-extrabold transition-all"
            >
              <BsPlusLg size={13} />
              <span>Add Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="px-6 lg:px-10 border-b border-white/10 bg-[#181818]/30 flex items-center justify-between">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveSubTab("members")}
            className={`py-3.5 text-xs font-bold border-b-2 uppercase tracking-wider flex items-center gap-2 transition-colors ${
              activeSubTab === "members"
                ? "border-teal-500 text-teal-400"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <BsPeople size={14} />
            <span>Platform Members ({members.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab("departments")}
            className={`py-3.5 text-xs font-bold border-b-2 uppercase tracking-wider flex items-center gap-2 transition-colors ${
              activeSubTab === "departments"
                ? "border-teal-500 text-teal-400"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <BsBuilding size={14} />
            <span>Departments ({departments.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab("employees")}
            className={`py-3.5 text-xs font-bold border-b-2 uppercase tracking-wider flex items-center gap-2 transition-colors ${
              activeSubTab === "employees"
                ? "border-teal-500 text-teal-400"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <BsBriefcase size={14} />
            <span>Employee Directory ({employees.length})</span>
          </button>
        </nav>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-auto p-6 lg:p-10">
        <div className="w-full space-y-6">

          {/* Search Bar */}
          <div className="relative max-w-md">
            <BsSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder={`Search ${activeSubTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          {/* TAB 1: Platform Members */}
          {activeSubTab === "members" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map((m) => (
                <div
                  key={m.id}
                  className="bg-[#181818] border border-white/10 hover:border-teal-500/30 rounded-2xl p-5 flex items-start justify-between transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 shrink-0 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-base">
                      {m.users?.name?.charAt(0)?.toUpperCase() || "M"}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        {m.users?.name || m.user_id}
                        {m.user_id === user?.id && <span className="text-[10px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded-full font-normal">(You)</span>}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">{m.users?.email || "No email"}</p>
                      <div className="mt-2">
                        <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-teal-500/10 text-teal-300 border border-teal-500/20 rounded-full">
                          Role: {m.role}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredMembers.length === 0 && (
                <div className="col-span-full py-10 text-center text-xs text-gray-500">
                  No platform members found.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Departments & Budget Caps */}
          {activeSubTab === "departments" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDepartments.map((d) => (
                <div
                  key={d.id}
                  className="bg-[#181818] border border-white/10 hover:border-teal-500/30 rounded-2xl p-5 space-y-3 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                        <BsBuilding />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{d.name}</h3>
                        <p className="text-[11px] text-gray-400">Department Code: {d.code || (d.name ? d.name.slice(0, 3).toUpperCase() : "DEP")}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-gray-400">Monthly Budget Cap:</span>
                    <span className="font-extrabold text-teal-400">₹{(d.monthly_budget || 0).toLocaleString()}</span>
                  </div>
                </div>
              ))}

              {filteredDepartments.length === 0 && (
                <div className="col-span-full py-10 text-center text-xs text-gray-500">
                  No departments created yet. Click <strong>"+ Add Department"</strong> to organize your company budgets.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Employee Directory */}
          {activeSubTab === "employees" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.map((emp) => {
                const allowance = Number(emp.monthly_allowance || 15000);
                const spent = Number(emp.spent_allowance || 0);
                const remaining = Math.max(0, allowance - spent);
                const usedPct = Math.min(100, Math.round((spent / (allowance || 1)) * 100));

                return (
                  <div
                    key={emp.id}
                    className="bg-[#181818] border border-white/10 hover:border-teal-500/30 rounded-2xl p-5 space-y-3 transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-base">
                        {emp.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-white truncate">{emp.name}</h3>
                        <p className="text-xs text-gray-400 truncate">{emp.designation || "Staff"} • {emp.department_name}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-400">Allowance Used ({usedPct}%)</span>
                        <span className="font-bold text-white">₹{spent.toLocaleString()} / ₹{allowance.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            usedPct > 90 ? 'bg-red-500' : usedPct > 70 ? 'bg-amber-500' : 'bg-teal-400'
                          }`}
                          style={{ width: `${usedPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                      <span className="text-gray-400">Remaining Allowance:</span>
                      <span className="font-extrabold text-emerald-400">₹{remaining.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}

              {filteredEmployees.length === 0 && (
                <div className="col-span-full py-10 text-center text-xs text-gray-500">
                  No non-login employees added yet. Click <strong>"+ Add Employee"</strong> or send them the <strong>Public Expense Link</strong> to log claims.
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Add Department Modal */}
      {isAddDeptOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Add New Department</h2>
            <form onSubmit={handleCreateDepartment} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="e.g. Site Operations, Sales, Marketing"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-teal-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Monthly OPEX Budget Cap (₹)</label>
                <input
                  type="number"
                  value={newDeptBudget}
                  onChange={(e) => setNewDeptBudget(e.target.value)}
                  placeholder="100000"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddDeptOpen(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-black font-bold rounded-xl"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {isAddEmpOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Add Non-Login Employee</h2>
            <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Employee Name *</label>
                <input
                  type="text"
                  required
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-teal-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  value={newEmpEmail}
                  onChange={(e) => setNewEmpEmail(e.target.value)}
                  placeholder="rahul.s@company.com"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Department</label>
                <select
                  value={newEmpDept}
                  onChange={(e) => setNewEmpDept(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                >
                  {departments.length > 0 ? (
                    departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="Site Operations">Site Operations</option>
                      <option value="Sales & Business Development">Sales & Business Development</option>
                      <option value="Engineering & IT">Engineering & IT</option>
                      <option value="Administration & HR">Administration & HR</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Designation</label>
                <input
                  type="text"
                  value={newEmpDesignation}
                  onChange={(e) => setNewEmpDesignation(e.target.value)}
                  placeholder="e.g. Site Engineer, Sales Rep"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Monthly Budget Allowance (₹)</label>
                <input
                  type="number"
                  value={newEmpAllowance}
                  onChange={(e) => setNewEmpAllowance(e.target.value)}
                  placeholder="15000"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddEmpOpen(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-black font-bold rounded-xl"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        workbenchId={activeWorkbench.id}
      />
      
      {/* Role Change Modal */}
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
