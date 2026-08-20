import React, { useState, useEffect } from "react";
import { useWorkbench } from "../../context/WorkbenchContext";
import { useAuth } from "../../hooks/useAuth";
import { useDataCache } from "../../hooks/useDataCache";
import { 
  BsPersonPlus, BsSearch, BsBuilding, BsPeople, BsLink45Deg, 
  BsPlusLg, BsCashCoin, BsBuildingCheck, BsCheck2, BsBriefcase,
  BsPencilSquare, BsPersonBadge, BsDiagram3, BsXCircle,
  BsBank, BsShieldCheck
} from "react-icons/bs";
import { collaborationService } from "../../services/collaborationService";
import { budgetService } from "../../services/budgetService";
import AddMemberModal from "./AddMemberModal";
import MemberDetail from "./MemberDetail";
import RoleChangeModal from "./RoleChangeModal";
import EmployeeClaimsModal from "./EmployeeClaimsModal";
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

  // Departments & Budgets
  const [departments, setDepartments] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [isLoadingDepts, setIsLoadingDepts] = useState(false);

  // Employees
  const [employees, setEmployees] = useState([]);
  const [isLoadingEmps, setIsLoadingEmps] = useState(false);

  // Modals & Selected items
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedEmpForClaims, setSelectedEmpForClaims] = useState(null);
  const [isRoleChangeOpen, setIsRoleChangeOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmpId, setCopiedEmpId] = useState(null);

  // Department Modal State
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptFormName, setDeptFormName] = useState("");
  const [deptFormCode, setDeptFormCode] = useState("");
  const [deptFormDescription, setDeptFormDescription] = useState("");
  const [deptFormHeadId, setDeptFormHeadId] = useState("");
  const [deptFormHeadName, setDeptFormHeadName] = useState("");
  const [deptFormParentId, setDeptFormParentId] = useState("");
  const [deptFormParentName, setDeptFormParentName] = useState("");
  const [deptFormStatus, setDeptFormStatus] = useState("active");
  const [deptFormMonthlyBudget, setDeptFormMonthlyBudget] = useState("");
  const [deptFormAnnualBudget, setDeptFormAnnualBudget] = useState("");
  const [selectedEmpIdsForDept, setSelectedEmpIdsForDept] = useState([]);

  // Link Employees Modal State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkTargetDept, setLinkTargetDept] = useState(null);
  const [linkEmpIds, setLinkEmpIds] = useState([]);

  // Employee Modal State
  const [isAddEmpOpen, setIsAddEmpOpen] = useState(false);
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [newEmpDept, setNewEmpDept] = useState("");
  const [newEmpDesignation, setNewEmpDesignation] = useState("Staff");
  const [newEmpSalary, setNewEmpSalary] = useState("");
  const [newEmpAllowance, setNewEmpAllowance] = useState("");

  useEffect(() => {
    if (activeWorkbench) {
      fetchDeptsAndEmployees();
    }
  }, [activeWorkbench]);

  useEffect(() => {
    const handleBudgetUpdate = () => {
      if (activeWorkbench) fetchDeptsAndEmployees();
    };
    window.addEventListener("budget:updated", handleBudgetUpdate);
    return () => window.removeEventListener("budget:updated", handleBudgetUpdate);
  }, [activeWorkbench]);

  const fetchDeptsAndEmployees = async () => {
    if (!activeWorkbench) return;
    setIsLoadingDepts(true);
    setIsLoadingEmps(true);
    try {
      const depts = await collaborationService.getDepartments(activeWorkbench.id);
      setDepartments(depts || []);
      const emps = await collaborationService.getEmployees(activeWorkbench.id);
      setEmployees(emps || []);
      const bgts = await budgetService.getBudgets(activeWorkbench.id);
      setBudgets(bgts || []);
    } catch (err) {
      console.warn("Notice loading depts/employees/budgets:", err);
    } finally {
      setIsLoadingDepts(false);
      setIsLoadingEmps(false);
    }
  };

  const handleCopyPublicLink = () => {
    const link = `${window.location.origin}/expense-claim/${activeWorkbench?.id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success("General Expense Claim Portal link copied!");
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleCopyPersonalLink = (emp) => {
    const link = `${window.location.origin}/expense-claim/${activeWorkbench?.id}?empId=${emp.id}`;
    navigator.clipboard.writeText(link);
    setCopiedEmpId(emp.id);
    toast.success(`Personal OPEX Logger link copied for ${emp.name}!`);
    setTimeout(() => setCopiedEmpId(null), 2500);
  };

  const handleOpenAddDept = () => {
    setEditingDept(null);
    setDeptFormName("");
    setDeptFormCode("");
    setDeptFormDescription("");
    setDeptFormHeadId("");
    setDeptFormHeadName("");
    setDeptFormParentId("");
    setDeptFormParentName("");
    setDeptFormStatus("active");
    setDeptFormMonthlyBudget("");
    setDeptFormAnnualBudget("");
    setSelectedEmpIdsForDept([]);
    setIsAddDeptOpen(true);
  };

  const handleOpenEditDept = (dept) => {
    setEditingDept(dept);
    setDeptFormName(dept.name || "");
    setDeptFormCode(dept.code || "");
    setDeptFormDescription(dept.description || "");
    setDeptFormHeadId(dept.head_id || "");
    setDeptFormHeadName(dept.head_name || "");
    setDeptFormParentId(dept.parent_department_id || "");
    setDeptFormParentName(dept.parent_department_name || "");
    setDeptFormStatus(dept.status || "active");
    setDeptFormMonthlyBudget(dept.monthly_budget ? String(dept.monthly_budget) : "");
    setDeptFormAnnualBudget(dept.annual_budget ? String(dept.annual_budget) : "");

    const linked = employees.filter(e => e.department_id === dept.id || e.department_name === dept.name).map(e => e.id);
    setSelectedEmpIdsForDept(linked);
    setIsAddDeptOpen(true);
  };

  const handleSaveDepartment = async (e) => {
    e.preventDefault();
    if (!deptFormName.trim()) return;

    let headName = deptFormHeadName;
    if (deptFormHeadId) {
      const emp = employees.find(e => e.id === deptFormHeadId);
      if (emp) headName = emp.name;
      else {
        const mem = members.find(m => m.user_id === deptFormHeadId);
        if (mem && mem.users) headName = mem.users.name || mem.users.email;
      }
    }

    let parentName = deptFormParentName;
    if (deptFormParentId) {
      const pDept = departments.find(d => d.id === deptFormParentId);
      if (pDept) parentName = pDept.name;
    }

    const mb = Number(deptFormMonthlyBudget) || 0;
    const ab = Number(deptFormAnnualBudget) || (mb * 12);

    const payload = {
      name: deptFormName.trim(),
      code: deptFormCode.trim() || undefined,
      description: deptFormDescription.trim(),
      head_id: deptFormHeadId || undefined,
      head_name: headName || "",
      parent_department_id: deptFormParentId || undefined,
      parent_department_name: parentName || "",
      status: deptFormStatus || "active",
      monthly_budget: mb,
      annual_budget: ab,
      employee_ids: selectedEmpIdsForDept
    };

    try {
      if (editingDept) {
        await collaborationService.updateDepartment(activeWorkbench.id, editingDept.id, payload);
        toast.success(`Department "${deptFormName}" updated!`);
      } else {
        await collaborationService.createDepartment(activeWorkbench.id, payload);
        toast.success(`Department "${deptFormName}" created!`);
      }
      setIsAddDeptOpen(false);
      fetchDeptsAndEmployees();
    } catch (err) {
      toast.error(editingDept ? "Failed to update department" : "Failed to create department");
    }
  };

  const handleOpenLinkModal = (dept) => {
    setLinkTargetDept(dept);
    // Find currently linked employees for this department
    const linked = employees.filter(e => e.department_id === dept.id || e.department_name === dept.name).map(e => e.id);
    setLinkEmpIds(linked);
    setIsLinkModalOpen(true);
  };

  const handleSaveDeptEmployeeLinks = async (e) => {
    e.preventDefault();
    if (!linkTargetDept) return;
    try {
      await collaborationService.linkEmployeesToDepartment(
        activeWorkbench.id,
        linkTargetDept.id,
        linkTargetDept.name,
        linkEmpIds
      );
      toast.success(`Linked ${linkEmpIds.length} employee(s) to ${linkTargetDept.name}!`);
      setIsLinkModalOpen(false);
      setLinkTargetDept(null);
      fetchDeptsAndEmployees();
    } catch (err) {
      toast.error("Failed to link employees to department");
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!newEmpName.trim()) return;
    const targetDept = departments.find(d => d.name === newEmpDept || d.id === newEmpDept);
    try {
      await collaborationService.createEmployee(activeWorkbench.id, {
        name: newEmpName.trim(),
        email: newEmpEmail.trim(),
        department_id: targetDept?.id || null,
        department_name: targetDept?.name || newEmpDept,
        designation: newEmpDesignation,
        salary: Number(newEmpSalary) || 0,
        monthly_allowance: Number(newEmpAllowance) || 0
      });
      toast.success(`Employee "${newEmpName}" added and stored in DB!`);
      setNewEmpName("");
      setNewEmpEmail("");
      setNewEmpSalary("");
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
              onClick={handleOpenAddDept}
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
                  onClick={() => setSelectedMember(m)}
                  className="bg-[#181818] border border-white/10 hover:border-teal-500/50 hover:bg-[#1F1F1F] rounded-2xl p-5 flex items-start justify-between transition-all cursor-pointer shadow-md hover:shadow-teal-500/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 shrink-0 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-base shadow-inner">
                      {m.users?.name?.charAt(0)?.toUpperCase() || "M"}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        {m.users?.name || m.user_id}
                        {m.user_id === user?.id && <span className="text-[10px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded-full font-normal">(You)</span>}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">{m.users?.email || "No email"}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-teal-500/10 text-teal-300 border border-teal-500/20 rounded-full">
                          Role: {m.role}
                        </span>
                        <span className="text-[10px] text-gray-500 font-semibold group-hover:text-teal-400">View Details & Tasks &rarr;</span>
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
              {filteredDepartments.map((d) => {
                const linkedEmps = employees.filter(e => e.department_id === d.id || e.department_name === d.name);
                const isActive = (d.status || 'active').toLowerCase() === 'active';

                return (
                  <div
                    key={d.id}
                    className="bg-[#181818] border border-white/10 hover:border-teal-500/30 rounded-2xl p-5 space-y-4 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                            <BsBuilding />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-white">{d.name}</h3>
                              <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md border uppercase ${
                                isActive 
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                  : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
                              }`}>
                                {d.status || 'Active'}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400">Code: {d.code || (d.name ? d.name.slice(0, 3).toUpperCase() : "DEP")}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenEditDept(d)}
                          className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors flex items-center gap-1 text-xs"
                          title="Edit Department"
                        >
                          <BsPencilSquare className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Description */}
                      {d.description && (
                        <p className="text-xs text-gray-300 bg-black/20 p-2.5 rounded-xl border border-white/5 leading-relaxed">
                          {d.description}
                        </p>
                      )}

                      {/* Head & Parent Hierarchy */}
                      <div className="grid grid-cols-1 gap-1.5 text-xs text-gray-300 pt-1">
                        <div className="flex items-center justify-between bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                          <span className="text-gray-400 text-[11px] flex items-center gap-1.5">
                            <BsPersonBadge className="text-purple-400" /> Dept Head:
                          </span>
                          <span className="font-semibold text-white">
                            {d.head_name || <span className="text-gray-500 italic">Unassigned (Assign later)</span>}
                          </span>
                        </div>

                        {d.parent_department_name && (
                          <div className="flex items-center justify-between bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                            <span className="text-gray-400 text-[11px] flex items-center gap-1.5">
                              <BsDiagram3 className="text-blue-400" /> Parent Dept:
                            </span>
                            <span className="font-semibold text-blue-300">{d.parent_department_name}</span>
                          </div>
                        )}
                      </div>

                      {/* Linked Employees Section */}
                      <div className="bg-black/30 rounded-xl p-3 border border-white/5 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400 font-medium flex items-center gap-1.5">
                            <BsPeople className="text-teal-400" /> Linked Staff ({linkedEmps.length})
                          </span>
                          <button
                            onClick={() => handleOpenLinkModal(d)}
                            className="text-[11px] text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
                          >
                            <BsPlusLg className="w-2.5 h-2.5" /> Link Staff
                          </button>
                        </div>

                        {linkedEmps.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {linkedEmps.map(emp => (
                              <span
                                key={emp.id}
                                className="px-2 py-0.5 text-[11px] bg-teal-500/10 border border-teal-500/20 text-teal-300 rounded-md truncate max-w-[140px]"
                                title={emp.name}
                              >
                                {emp.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-500 italic">No employees linked yet.</p>
                        )}
                      </div>
                    </div>

                    {/* Live Cash-Allocated Budget Section */}
                    {(() => {
                      const matchingBudget = budgets.find(b => 
                        b.department?.toLowerCase() === d.name?.toLowerCase() ||
                        b.name?.toLowerCase().includes(d.name?.toLowerCase())
                      );

                      if (matchingBudget) {
                        const alloc = Number(matchingBudget.allocated_amount || 0);
                        const uti = Number(matchingBudget.utilized_amount || 0);
                        const pct = alloc > 0 ? Math.min(100, Math.round((uti / alloc) * 100)) : 0;
                        const rem = Math.max(0, alloc - uti);

                        return (
                          <div className="pt-3 border-t border-teal-500/20 space-y-2 text-xs bg-black/30 p-3 rounded-xl border border-white/5">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-300 font-bold flex items-center gap-1.5">
                                <BsShieldCheck className="text-teal-400" /> Cash Asset Budget:
                              </span>
                              <span className="font-extrabold text-teal-400">
                                ₹{alloc.toLocaleString()}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1 text-[11px] text-gray-400">
                              <BsBank className="text-teal-400 text-xs shrink-0" />
                              <span className="truncate font-mono">{matchingBudget.source_cash_account}</span>
                            </div>

                            <div className="space-y-1 pt-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-gray-400">Utilized Spend</span>
                                <span className="font-bold text-white">₹{uti.toLocaleString()} / ₹{alloc.toLocaleString()}</span>
                              </div>
                              <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden border border-white/5">
                                <div 
                                  className={`h-full transition-all duration-500 ${
                                    pct > 90 ? 'bg-rose-500' : pct > 75 ? 'bg-amber-500' : 'bg-teal-400'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-gray-400 pt-0.5">
                                <span>Remaining: <strong className="text-emerald-400">₹{rem.toLocaleString()}</strong></span>
                                <span className="font-bold text-teal-400">{pct}% Used</span>
                              </div>
                            </div>

                            {matchingBudget.categories_plan && matchingBudget.categories_plan.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1 border-t border-white/5">
                                {matchingBudget.categories_plan.map((cp, idx) => (
                                  <span key={idx} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-300 truncate max-w-full">
                                    {cp.category}: ₹{Number(cp.allocated || 0).toLocaleString()}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div className="pt-3 border-t border-white/5 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Monthly Budget Cap:</span>
                            <span className="font-extrabold text-teal-400">₹{(d.monthly_budget || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-gray-500">Annual Budget:</span>
                            <span className="font-semibold text-gray-300">₹{(d.annual_budget || ((d.monthly_budget || 0) * 12)).toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}

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
                const salary = Number(emp.salary || 0);

                return (
                  <div
                    key={emp.id}
                    onClick={() => setSelectedEmpForClaims(emp)}
                    className="bg-[#181818] border border-white/10 hover:border-teal-500/50 hover:shadow-xl hover:shadow-teal-500/5 rounded-2xl p-5 space-y-3.5 transition-all flex flex-col justify-between cursor-pointer group hover:scale-[1.01]"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between space-x-3">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-11 h-11 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center font-bold text-base group-hover:bg-teal-500 group-hover:text-black transition-all">
                            {emp.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold text-white truncate group-hover:text-teal-300 transition-colors">{emp.name}</h3>
                            <p className="text-xs text-gray-400 truncate">{emp.designation || "Staff"} • <span className="text-purple-400 font-medium">{emp.department_name}</span></p>
                          </div>
                        </div>
                        <span className="text-[10px] text-teal-400 bg-teal-500/10 group-hover:bg-teal-500/20 px-2.5 py-1 rounded-full font-extrabold border border-teal-500/20 whitespace-nowrap">
                          View Claims →
                        </span>
                      </div>

                      {/* Salary & Context Info */}
                      <div className="grid grid-cols-2 gap-2 bg-black/30 p-2.5 rounded-xl border border-white/5 text-xs">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-semibold">Base Salary</p>
                          <p className="font-bold text-emerald-400 mt-0.5">
                            {salary > 0 ? `₹${salary.toLocaleString()}/mo` : "Not set"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-semibold">Expense Limit</p>
                          <p className="font-bold text-teal-400 mt-0.5">₹{allowance.toLocaleString()}/mo</p>
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
                    </div>

                    <div className="pt-3 border-t border-white/5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Remaining Allowance:</span>
                        <span className="font-extrabold text-emerald-400">₹{remaining.toLocaleString()}</span>
                      </div>

                      {/* Copy Personal OPEX Logger Link Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyPersonalLink(emp);
                        }}
                        className={`w-full py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-xs border ${
                          copiedEmpId === emp.id
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : "bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border-teal-500/20 hover:border-teal-500/40"
                        }`}
                      >
                        {copiedEmpId === emp.id ? (
                          <>
                            <BsCheck2 className="w-4 h-4 text-emerald-400" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <BsLink45Deg className="w-4 h-4" />
                            <span>Copy Personal OPEX Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredEmployees.length === 0 && (
                <div className="col-span-full py-10 text-center text-xs text-gray-500">
                  No non-login employees added yet. Click <strong>"+ Add Employee"</strong> to record staff and issue personalized OPEX links.
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Add / Edit Department Modal */}
      {isAddDeptOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-base font-bold text-white">
                {editingDept ? `Edit Department: ${editingDept.name}` : "Add New Department"}
              </h2>
              <button onClick={() => setIsAddDeptOpen(false)} className="text-gray-400 hover:text-white">
                <BsXCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDepartment} className="space-y-4 text-xs">
              {/* Dept Name & Code */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-gray-300 font-semibold mb-1">Department Name *</label>
                  <input
                    type="text"
                    required
                    value={deptFormName}
                    onChange={(e) => setDeptFormName(e.target.value)}
                    placeholder="e.g. Sales, Operations, Finance"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-teal-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Code</label>
                  <input
                    type="text"
                    value={deptFormCode}
                    onChange={(e) => setDeptFormCode(e.target.value)}
                    placeholder="e.g. SAL"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-teal-500 uppercase"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={deptFormDescription}
                  onChange={(e) => setDeptFormDescription(e.target.value)}
                  placeholder="Describe department function and responsibilities..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Head & Parent Hierarchy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Department Head / Responsible Person</label>
                  <select
                    value={deptFormHeadId}
                    onChange={(e) => setDeptFormHeadId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="">Unassigned (Assign later)</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.designation || 'Employee'})</option>
                    ))}
                    {members.map(m => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.users?.name || m.users?.email || m.user_id} ({m.role || 'Member'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Parent Department (Hierarchy)</label>
                  <select
                    value={deptFormParentId}
                    onChange={(e) => setDeptFormParentId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="">None (Top-Level Department)</option>
                    {departments
                      .filter(d => !editingDept || d.id !== editingDept.id)
                      .map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))
                    }
                  </select>
                </div>
              </div>

              {/* Status & Budgets */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Status</label>
                  <select
                    value={deptFormStatus}
                    onChange={(e) => setDeptFormStatus(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Monthly Budget (₹)</label>
                  <input
                    type="number"
                    value={deptFormMonthlyBudget}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDeptFormMonthlyBudget(val);
                      if (val && !deptFormAnnualBudget) {
                        setDeptFormAnnualBudget(String(Number(val) * 12));
                      }
                    }}
                    placeholder="100000"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Annual Budget (₹)</label>
                  <input
                    type="number"
                    value={deptFormAnnualBudget}
                    onChange={(e) => setDeptFormAnnualBudget(e.target.value)}
                    placeholder="1200000"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Multi-select employees to link */}
              {employees.length > 0 && (
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Assign Employees to Department</label>
                  <div className="max-h-28 overflow-y-auto space-y-1 bg-black/40 p-2.5 rounded-xl border border-white/10">
                    {employees.map((emp) => {
                      const checked = selectedEmpIdsForDept.includes(emp.id);
                      return (
                        <label key={emp.id} className="flex items-center space-x-2 text-gray-300 hover:text-white cursor-pointer py-1">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEmpIdsForDept([...selectedEmpIdsForDept, emp.id]);
                              } else {
                                setSelectedEmpIdsForDept(selectedEmpIdsForDept.filter(id => id !== emp.id));
                              }
                            }}
                            className="rounded border-white/20 text-teal-500 focus:ring-0 bg-black/50"
                          />
                          <span className="truncate">{emp.name} ({emp.designation || 'Staff'})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddDeptOpen(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-black font-extrabold rounded-xl transition-colors shadow-lg shadow-teal-500/20"
                >
                  {editingDept ? "Update Department" : "Save Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Employees to Department Modal */}
      {isLinkModalOpen && linkTargetDept && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Link Employees to {linkTargetDept.name}</h2>
            <p className="text-xs text-gray-400">Select employees to include in this department:</p>

            <form onSubmit={handleSaveDeptEmployeeLinks} className="space-y-4 text-xs">
              <div className="max-h-60 overflow-y-auto space-y-1.5 bg-black/40 p-3 rounded-xl border border-white/10">
                {employees.length > 0 ? (
                  employees.map((emp) => {
                    const checked = linkEmpIds.includes(emp.id);
                    return (
                      <label key={emp.id} className="flex items-center space-x-2.5 text-gray-300 hover:text-white cursor-pointer py-1 border-b border-white/5 last:border-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setLinkEmpIds([...linkEmpIds, emp.id]);
                            } else {
                              setLinkEmpIds(linkEmpIds.filter(id => id !== emp.id));
                            }
                          }}
                          className="rounded border-white/20 text-teal-500 focus:ring-0 bg-black/50"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white truncate">{emp.name}</p>
                          <p className="text-[10px] text-gray-400">{emp.designation || 'Staff'} • Current Dept: {emp.department_name || 'None'}</p>
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <p className="text-gray-500 italic py-2">No employees created yet.</p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-black font-bold rounded-xl"
                >
                  Save Links
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
                    <option value="">No departments created yet</option>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Monthly Base Salary (₹)</label>
                  <input
                    type="number"
                    value={newEmpSalary}
                    onChange={(e) => setNewEmpSalary(e.target.value)}
                    placeholder="65000"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Monthly OPEX Limit (₹)</label>
                  <input
                    type="number"
                    value={newEmpAllowance}
                    onChange={(e) => setNewEmpAllowance(e.target.value)}
                    placeholder="15000"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
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

      {/* Employee Claims Modal */}
      <EmployeeClaimsModal
        employee={selectedEmpForClaims}
        workbenchId={activeWorkbench?.id}
        isOpen={!!selectedEmpForClaims}
        onClose={() => setSelectedEmpForClaims(null)}
        onUpdate={fetchDeptsAndEmployees}
      />

      {/* Platform Member Detail Drawer */}
      {selectedMember && (
        <div 
          onClick={() => setSelectedMember(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-end animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-[#141414] h-full shadow-2xl flex flex-col border-l border-white/10"
          >
            <MemberDetail
              member={selectedMember}
              workbenchId={activeWorkbench?.id}
              onClose={() => setSelectedMember(null)}
              onRoleChangeClick={(m) => {
                setIsRoleChangeOpen(true);
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
}
