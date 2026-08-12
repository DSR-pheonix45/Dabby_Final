import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { toast } from "react-hot-toast";

const WorkbenchContext = createContext();

export function WorkbenchProvider({ children }) {
  const { user } = useAuth();
  const [workbenches, setWorkbenches] = useState([]);
  const [activeWorkbench, setActiveWorkbench] = useState(null);
  const [isWorkbenchContextEnabled, setIsWorkbenchContextEnabled] = useState(() => {
    return localStorage.getItem("dabby_workbench_context_enabled") !== "false";
  });
  const [loading, setLoading] = useState(true);

  const toggleWorkbenchContext = (forcedVal) => {
    setIsWorkbenchContextEnabled((prev) => {
      const nextVal = typeof forcedVal === 'boolean' ? forcedVal : !prev;
      localStorage.setItem("dabby_workbench_context_enabled", String(nextVal));
      toast(nextVal ? "Workbench Context Enabled" : "Workbench Context Disabled", {
        icon: nextVal ? "⚡" : "⏸️"
      });
      window.dispatchEvent(new Event("workbenchContextToggled"));
      return nextVal;
    });
  };

  useEffect(() => {
    if (user) {
      fetchWorkbenches();
    } else {
      setWorkbenches([]);
      setActiveWorkbench(null);
      setLoading(false);
    }
  }, [user]);

  const fetchWorkbenches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("workbenches")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      let list = data || [];

      // Auto-heal missing license keys / passwords for legacy workbenches
      const healPromises = list.map(async (wb) => {
        if (!wb.license_key || !wb.access_password) {
          const newKey = wb.license_key || `WB-${wb.id.substring(0, 4).toUpperCase()}-${wb.id.substring(4, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          const newPass = wb.access_password || `Wb-${wb.id.substring(0, 6)}`;
          try {
            const { error: healErr } = await supabase.from("workbenches").update({
              license_key: newKey,
              access_password: newPass
            }).eq("id", wb.id);
            if (healErr) {
              // Silently handle schema cache error if license columns do not exist in DB yet
            }
            wb.license_key = newKey;
            wb.access_password = newPass;
          } catch (e) {
            wb.license_key = newKey;
            wb.access_password = newPass;
          }
        }
        return wb;
      });

      list = await Promise.all(healPromises);

      setWorkbenches(list);

      // If we have workbenches, set the active one
      if (list && list.length > 0) {
        // Try to restore previous active workbench from localStorage
        const savedWorkbenchId = localStorage.getItem("dabby_active_workbench");
        const found = list.find((w) => w.id === savedWorkbenchId);
        if (found) {
          setActiveWorkbench(found);
        } else {
          setActiveWorkbench(list[0]);
          localStorage.setItem("dabby_active_workbench", list[0].id);
        }
      } else {
        setActiveWorkbench(null);
      }
    } catch (error) {
      console.error("Error fetching workbenches:", error);
      toast.error("Failed to fetch workbenches");
    } finally {
      setLoading(false);
    }
  };

  const changeActiveWorkbench = (workbench) => {
    setActiveWorkbench(workbench);
    if (workbench) {
      localStorage.setItem("dabby_active_workbench", workbench.id);
      window.dispatchEvent(new Event("workbenchChanged"));
    }
  };

  const deleteWorkbench = async (workbenchId) => {
    if (!workbenchId) return { error: new Error("No workbench ID provided") };

    try {
      // 1. Fetch account IDs belonging to this workbench from di_accounts
      // and delete referencing di_ledger_entries by account_id (prevents di_ledger_entries_account_id_fkey 409 conflict)
      try {
        const { data: accounts } = await supabase
          .from("di_accounts")
          .select("id")
          .eq("workbench_id", workbenchId);

        if (accounts && accounts.length > 0) {
          const accountIds = accounts.map((a) => a.id);
          await supabase
            .from("di_ledger_entries")
            .delete()
            .in("account_id", accountIds);
        }
      } catch (e) {
        console.warn("di_ledger_entries cleanup by account_id warning:", e);
      }

      // Also attempt delete on di_ledger_entries by workbench_id if column exists
      try {
        await supabase.from("di_ledger_entries").delete().eq("workbench_id", workbenchId);
      } catch (e) {}

      // 2. Delete dependent event & draft records
      try {
        await supabase.from("di_event_settlements").delete().eq("workbench_id", workbenchId);
      } catch (e) {}
      try {
        await supabase.from("di_business_events").delete().eq("workbench_id", workbenchId);
      } catch (e) {}
      try {
        await supabase.from("di_trade_drafts").delete().eq("workbench_id", workbenchId);
      } catch (e) {}

      // 3. Delete di_journals & di_journal_entries
      try {
        await supabase.from("di_journals").delete().eq("workbench_id", workbenchId);
      } catch (e) {}
      try {
        await supabase.from("di_journal_entries").delete().eq("workbench_id", workbenchId);
      } catch (e) {}

      // 4. Delete di_workbench_labels
      try {
        await supabase.from("di_workbench_labels").delete().eq("workbench_id", workbenchId);
      } catch (e) {}

      // 5. Delete di_accounts (safe now that di_ledger_entries references are deleted)
      try {
        await supabase.from("di_accounts").delete().eq("workbench_id", workbenchId);
      } catch (e) {}

      // 6. Delete Document Vault records (di_documents and child notes/logs)
      try {
        const { data: docs } = await supabase
          .from("di_documents")
          .select("id")
          .eq("workbench_id", workbenchId);

        if (docs && docs.length > 0) {
          const docIds = docs.map((d) => d.id);
          try {
            await supabase.from("di_analysis_notes").delete().in("document_id", docIds);
          } catch (e) {}
          try {
            await supabase.from("di_document_processing_logs").delete().in("document_id", docIds);
          } catch (e) {}
        }
        await supabase.from("di_documents").delete().eq("workbench_id", workbenchId);
      } catch (e) {}

      // 7. Delete workbench_accounts
      try {
        await supabase.from("workbench_accounts").delete().eq("workbench_id", workbenchId);
      } catch (e) {}

      // 8. Delete workbench_members membership row
      try {
        await supabase.from("workbench_members").delete().eq("workbench_id", workbenchId);
      } catch (e) {}

      // 9. Delete parent workbench record
      const { error } = await supabase
        .from("workbenches")
        .delete()
        .eq("id", workbenchId);

      if (error) {
        console.error("Error deleting workbench record:", error);
        return { error };
      }

      // Cleanup local storage & active workbench state
      if (activeWorkbench?.id === workbenchId) {
        setActiveWorkbench(null);
        localStorage.removeItem("dabby_active_workbench");
      }
      try {
        localStorage.removeItem(`dabby_wb_settings_${workbenchId}`);
      } catch (e) {}

      await fetchWorkbenches();
      return { error: null };
    } catch (err) {
      console.error("deleteWorkbench error:", err);
      return { error: err };
    }
  };

  return (
    <WorkbenchContext.Provider
      value={{
        workbenches,
        activeWorkbench,
        isWorkbenchContextEnabled,
        toggleWorkbenchContext,
        loading,
        fetchWorkbenches,
        changeActiveWorkbench,
        deleteWorkbench,
      }}
    >
      {children}
    </WorkbenchContext.Provider>
  );
}

export const useWorkbench = () => {
  const context = useContext(WorkbenchContext);
  if (context === undefined) {
    throw new Error("useWorkbench must be used within a WorkbenchProvider");
  }
  return context;
};
