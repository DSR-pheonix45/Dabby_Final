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
    if (!res.ok) throw new Error("Failed to create party");
    return res.json();
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
  }
};
