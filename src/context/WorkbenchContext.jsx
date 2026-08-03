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

      setWorkbenches(data || []);

      // If we have workbenches, set the active one
      if (data && data.length > 0) {
        // Try to restore previous active workbench from localStorage
        const savedWorkbenchId = localStorage.getItem("dabby_active_workbench");
        const found = data.find((w) => w.id === savedWorkbenchId);
        if (found) {
          setActiveWorkbench(found);
        } else {
          setActiveWorkbench(data[0]);
          localStorage.setItem("dabby_active_workbench", data[0].id);
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
