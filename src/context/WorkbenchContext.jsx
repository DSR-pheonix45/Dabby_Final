import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';

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
            
            const response = await fetch(`http://localhost:8000/api/context/${workbenchId}`);
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
