/**
 * Front-end mirror of the backend RBAC matrix (backend/auth.py).
 *
 * This is for UX only — hiding/disabling actions a role can't perform. The
 * backend is the real gate; it independently rejects unauthorized calls with 403.
 * Keep these two matrices in sync.
 */
export const PERM = {
  VIEW: "view",
  VIEW_ALL_DOCS: "view_all_documents",
  UPLOAD_DOCUMENT: "upload_document",
  EDIT_DRAFT: "edit_draft",
  CONFIGURE_COA: "configure_coa",
  WRITE_RULESET: "write_ruleset",
  APPROVE_TRADE: "approve_trade",
  EXECUTE_TRADE: "execute_trade",
  DELETE_TRANSACTION: "delete_transaction",
  INVITE_MEMBERS: "invite_members",
  MANAGE_MEMBERS: "manage_members",
  MANAGE_BILLING: "manage_billing",
  DELETE_WORKBENCH: "delete_workbench",
};

const ACCOUNTANT = [
  PERM.VIEW, PERM.VIEW_ALL_DOCS, PERM.UPLOAD_DOCUMENT, PERM.EDIT_DRAFT,
  PERM.CONFIGURE_COA, PERM.WRITE_RULESET, PERM.APPROVE_TRADE, PERM.EXECUTE_TRADE,
];
const OWNER = [
  ...ACCOUNTANT, PERM.DELETE_TRANSACTION, PERM.INVITE_MEMBERS,
  PERM.MANAGE_MEMBERS, PERM.MANAGE_BILLING, PERM.DELETE_WORKBENCH,
];
const READ_ONLY = [PERM.VIEW, PERM.VIEW_ALL_DOCS];

// Role names mirror what user_members actually stores (owner, founder,
// editor, viewer) plus the spec's names as aliases. Keep in sync with backend/auth.py.
export const ROLE_PERMISSIONS = {
  owner: OWNER,
  founder: OWNER,
  editor: ACCOUNTANT,
  viewer: READ_ONLY,
  accountant: ACCOUNTANT,
  auditor: READ_ONLY,
  investor: READ_ONLY,
  member: [PERM.VIEW, PERM.UPLOAD_DOCUMENT],
};

export const ROLE_LABELS = {
  owner: "Owner",
  founder: "Founder",
  editor: "Editor",
  viewer: "Viewer",
  accountant: "Accountant",
  auditor: "Auditor",
  investor: "Investor",
  member: "Member",
};

/** True if `role` holds `permission`. Unknown/absent role → false (deny). */
export function roleCan(role, permission) {
  const perms = ROLE_PERMISSIONS[(role || "").toLowerCase()];
  return !!perms && perms.includes(permission);
}

/** Read-only roles that should never see write controls. */
export const READ_ONLY_ROLES = new Set(["auditor", "investor", "viewer", "member"]);
