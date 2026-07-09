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

  async updateSettings(workbenchId, settingsData) {
    const res = await apiFetch(`/api/collaboration/${workbenchId}/settings`, {
      method: "PUT",
      body: JSON.stringify(settingsData),
    });
    if (!res.ok) throw new Error("Failed to update settings");
    return res.json();
  },
};
