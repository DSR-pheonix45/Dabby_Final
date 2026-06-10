import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const WorkbenchContext = createContext();

export const useWorkbench = () => {
    const context = useContext(WorkbenchContext);
    if (!context) {
        throw new Error('useWorkbench must be used within a WorkbenchProvider');
    }
    return context;
};

export const WorkbenchProvider = ({ children, workbenchId }) => {
    const [data, setData] = useState({
        workbench: null,
        coa: [],
        labels: [],
        balances: {},
        transactions: [],
        inventory: [],
        parties: [],
        loading: true,
        error: null,
    });

    const fetchContext = useCallback(async (showLoading = true) => {
        if (!workbenchId) return;

        try {
            if (showLoading) setData(prev => ({ ...prev, loading: true }));

            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            
            const response = await fetch(`http://localhost:8000/api/context/${workbenchId}`, {
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Failed to fetch workbench context');
            }
            
            const contextData = await response.json();
            setData({
                ...contextData,
                loading: false,
                error: null,
            });
            
            console.log(`[DEBUG] Workbench context synced for: ${workbenchId}`);
        } catch (err) {
            console.error('Error syncing workbench context:', err);
            setData(prev => ({ ...prev, loading: false, error: err.message }));
            toast.error(`Sync failed: ${err.message}`);
        }
    }, [workbenchId]);

    // Initial fetch
    useEffect(() => {
        fetchContext();
    }, [fetchContext]);

    // Listen for refresh events
    useEffect(() => {
        const handleRefresh = () => fetchContext(false); // Refresh in background
        window.addEventListener('refresh-ledger-data', handleRefresh);
        return () => window.removeEventListener('refresh-ledger-data', handleRefresh);
    }, [fetchContext]);

    // Real-time updates for labels and transactions
    useEffect(() => {
        if (!workbenchId) return;

        const channel = supabase.channel(`workbench-context-${workbenchId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'labels', filter: `workbench_id=eq.${workbenchId}` }, () => fetchContext(false))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `workbench_id=eq.${workbenchId}` }, () => fetchContext(false))
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [workbenchId, fetchContext]);

    const value = {
        ...data,
        refreshContext: fetchContext,
    };

    return (
        <WorkbenchContext.Provider value={value}>
            {children}
        </WorkbenchContext.Provider>
    );
};
