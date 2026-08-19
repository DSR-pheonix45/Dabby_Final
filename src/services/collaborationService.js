import { apiFetch } from "../lib/apiClient";

export const collaborationService = {
  async getMembers(workbenchId) {
    const res = await apiFetch(`/api/collaboration/${workbenchId}/members`);
    if (!res.ok) throw new Error("Failed to fetch members");
    return res.json();
  },

  async inviteMember(workbenchId, userId, role) {
    const res = await apiFetch(`/api/collaboration/${workbenchId}/members`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId, role }),
    });
    if (!res.ok) throw new Error("Failed to invite member");
    return res.json();
  },

  async getParties(workbenchId) {
    const res = await apiFetch(`/api/collaboration/${workbenchId}/parties`);
    if (!res.ok) throw new Error("Failed to fetch parties");
    return res.json();
  },

  async createParty(workbenchId, partyData) {
    const res = await apiFetch(`/api/collaboration/${workbenchId}/parties`, {
      method: "POST",
      body: JSON.stringify(partyData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to create party");
    return data;
  },

  async updateParty(workbenchId, partyId, patchData) {
    const res = await apiFetch(`/api/collaboration/${workbenchId}/parties/${partyId}`, {
      method: "PATCH",
      body: JSON.stringify(patchData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to update party");
    return data;
  },

  async addPartyRole(workbenchId, partyId, role) {
    const res = await apiFetch(`/api/collaboration/${workbenchId}/parties/${partyId}/roles`, {
      method: "POST",
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to add party role");
    return data;
  },

  async removePartyRole(workbenchId, partyId, role) {
    const res = await apiFetch(`/api/collaboration/${workbenchId}/parties/${partyId}/roles/${role}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to remove party role");
    return data;
  },

  async resolveParty(workbenchId, queryData) {
    const res = await apiFetch(`/api/collaboration/${workbenchId}/parties/resolve`, {
      method: "POST",
      body: JSON.stringify(queryData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to resolve party identity");
    return data;
  },

  async generateInviteLink(workbenchId, role) {
    const res = await apiFetch(`/api/collaboration/${workbenchId}/invites/generate`, {
      method: "POST",
      body: JSON.stringify({ role }),
    });
    if (!res.ok) throw new Error("Failed to generate invite link");
    return res.json();
  },

  async joinWorkbench(token) {
    const res = await apiFetch(`/api/collaboration/join`, {
      method: "POST",
      body: JSON.stringify({ token }),
    });
    if (!res.ok) throw new Error("Failed to join workbench");
    return res.json();
  },

  async accessByLicense(licenseKey, accessPassword) {
    const res = await apiFetch(`/api/collaboration/access-by-license`, {
      method: "POST",
      body: JSON.stringify({
        license_key: licenseKey,
        access_password: accessPassword,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Failed to access workbench with provided credentials");
    }
    return data;
  },

  async updatePassword(workbenchId, accessPassword) {
    const res = await apiFetch(`/api/collaboration/${workbenchId}/password`, {
      method: "PATCH",
      body: JSON.stringify({
        access_password: accessPassword,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Failed to update workbench password");
    }
    return data;
  },

  async addTradeVessel(workbenchId, partyId, vesselData) {
    const res = await apiFetch(`/api/collaboration/${workbenchId}/parties/${partyId}/vessels`, {
      method: "POST",
      body: JSON.stringify(vesselData),
    });
    if (!res.ok) throw new Error("Failed to add trade vessel");
    return res.json();
  },

  async updateSettings(workbenchId, settingsData) {
    const res = await apiFetch(`/api/collaboration/${workbenchId}/settings`, {
      method: "PATCH",
      body: JSON.stringify(settingsData),
    });
    if (!res.ok) throw new Error("Failed to update settings");
    return res.json();
  },

  async getDepartments(workbenchId) {
    const res = await apiFetch(`/api/collaboration/${workbenchId}/departments`);
    if (!res.ok) return [];
    return res.json();
  },

  async createDepartment(workbenchId, deptData) {
    const res = await apiFetch(`/api/collaboration/${workbenchId}/departments`, {
      method: "POST",
      body: JSON.stringify(deptData),
    });
    if (!res.ok) throw new Error("Failed to create department");
    return res.json();
  },

  async updateDepartment(workbenchId, departmentId, deptData) {
    const res = await apiFetch(`/api/collaboration/${workbenchId}/departments/${departmentId}`, {
      method: "PUT",
      body: JSON.stringify(deptData),
    });
    if (!res.ok) throw new Error("Failed to update department");
    return res.json();
  },

  async linkEmployeesToDepartment(workbenchId, departmentId, departmentName, employeeIds) {
    const res = await apiFetch(`/api/collaboration/${workbenchId}/departments/${departmentId}/link-employees`, {
      method: "PUT",
      body: JSON.stringify({
        department_name: departmentName,
        employee_ids: employeeIds
      }),
    });
    if (!res.ok) throw new Error("Failed to link employees to department");
    return res.json();
  },

  async getEmployees(workbenchId) {
    const res = await apiFetch(`/api/collaboration/${workbenchId}/employees`);
    if (!res.ok) return [];
    return res.json();
  },

  async createEmployee(workbenchId, empData) {
    const res = await apiFetch(`/api/collaboration/${workbenchId}/employees`, {
      method: "POST",
      body: JSON.stringify(empData),
    });
    if (!res.ok) throw new Error("Failed to create employee");
    return res.json();
  },

  async submitClaim(workbenchId, claimData) {
    const res = await apiFetch(`/api/collaboration/${workbenchId}/claims`, {
      method: "POST",
      body: JSON.stringify(claimData),
    });
    if (!res.ok) throw new Error("Failed to submit claim");
    return res.json();
  },

  async getClaims(workbenchId) {
    const res = await apiFetch(`/api/collaboration/${workbenchId}/claims`);
    if (!res.ok) return [];
    return res.json();
  },

  async updateClaimStatus(workbenchId, claimId, status) {
    const res = await apiFetch(`/api/collaboration/${workbenchId}/claims/${claimId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed to update claim status");
    return res.json();
  },

  async reimburseClaim(workbenchId, claimId) {
    const res = await apiFetch(`/api/collaboration/${workbenchId}/claims/${claimId}/reimburse`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to process reimbursement payment");
    return res.json();
  },

  async getDepartmentBudgetVsActual(workbenchId, departmentId) {
    const res = await apiFetch(`/api/collaboration/${workbenchId}/departments/${departmentId}/budget-vs-actual`);
    if (!res.ok) return null;
    return res.json();
  },

  async deleteWorkbench(workbenchId) {
    const res = await apiFetch(`/api/collaboration/${workbenchId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to delete workbench");
    }
    return res.json();
  }
};
