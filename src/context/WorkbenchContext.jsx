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
            
            // 1. Try fetching from backend API
            try {
                const response = await fetch(`/api/context/${workbenchId}`);
                if (response.ok) {
                    const contextData = await response.json();
                    setData({
                        ...contextData,
                        loading: false,
                        error: null,
                    });
                    console.log(`[DEBUG] Workbench context synced for: ${workbenchId}`);
                    return;
                }
            } catch (apiErr) {
                console.warn("Backend API not reachable, falling back to direct Supabase fetch:", apiErr);
            }

            // 2. Direct Supabase Query Fallback
            const { data: workbench, error: wbErr } = await supabase
                .from('workbenches')
                .select('*')
                .eq('id', workbenchId)
                .maybeSingle();

            if (wbErr) throw wbErr;

            // Fetch from workbench_accounts instead of labels
            const { data: rawLabels, error: labelsErr } = await supabase
                .from('workbench_accounts')
                .select('*, master_accounts(account_name, account_code), master_sub_accounts(sub_account_name)')
                .eq('workbench_id', workbenchId)
                .eq('is_active', true);

            if (labelsErr) throw labelsErr;

            const nameMap = {
                "ASSETS": "asset",
                "LIABILITIES": "liability",
                "EQUITY": "equity",
                "REVENUE": "revenue",
                "EXPENSES": "expense",
                "INCOME": "revenue"
            };

            const labels = (rawLabels || []).map(item => ({
                id: item.id,
                workbench_id: item.workbench_id,
                master_account_id: item.master_account_id,
                master_sub_account_id: item.master_sub_account_id,
                account_code: item.account_code,
                name: item.full_account_name,
                full_account_name: item.full_account_name,
                type: nameMap[(item.master_accounts?.account_name || "").toUpperCase()] || "expense",
                sub_account: item.master_sub_accounts?.sub_account_name || "General",
                description: item.description,
                current_amount: Number(item.current_amount || 0),
                is_active: item.is_active,
                is_shadow: item.is_shadow
            }));

            // Fetch parties
            const { data: parties } = await supabase
                .from('parties')
                .select('*')
                .eq('workbench_id', workbenchId);

            // Fetch transaction entries for balances
            const labelIds = labels.map(l => l.id);
            let rawEntries = [];
            if (labelIds.length > 0) {
                const { data: entRes } = await supabase
                    .from('transaction_entries')
                    .select('*')
                    .in('label_id', labelIds);
                rawEntries = entRes || [];
            }

            // Fetch transactions
            const { data: rawTransactions } = await supabase
                .from('transactions')
                .select('*')
                .eq('workbench_id', workbenchId)
                .order('transaction_date', { ascending: false });

            // Fetch all entries for transactions
            let txEntries = [];
            const txIds = (rawTransactions || []).map(t => t.id);
            if (txIds.length > 0) {
                const { data: entRes } = await supabase
                    .from('transaction_entries')
                    .select('*')
                    .in('transaction_id', txIds);
                txEntries = entRes || [];
            }

            // Map entries to transactions
            const mappedTransactions = (rawTransactions || []).map(tx => {
                const entries = txEntries.filter(e => e.transaction_id === tx.id).map(e => {
                    const lbl = labels.find(l => l.id === e.label_id);
                    return {
                        ...e,
                        labels: lbl ? { id: lbl.id, name: lbl.name } : null
                    };
                });
                return {
                    ...tx,
                    entries
                };
            });

            // Fetch inventory
            const { data: inventory } = await supabase
                .from('items')
                .select('*')
                .eq('workbench_id', workbenchId);

            // Compute ledger balances client-side
            const computedBalances = {};
            labels.forEach(label => {
                computedBalances[label.id] = { gross: 0, net: 0 };
            });

            // Calculate positive/negative volume for gross
            const positives = {};
            const negatives = {};
            labels.forEach(l => {
                positives[l.id] = 0;
                negatives[l.id] = 0;
            });

            rawEntries.forEach(entry => {
                const lid = entry.label_id;
                if (computedBalances[lid]) {
                    const amt = Number(entry.amount || 0);
                    computedBalances[lid].net += amt;
                    if (amt > 0) {
                        positives[lid] += amt;
                    } else {
                        negatives[lid] += Math.abs(amt);
                    }
                }
            });

            labels.forEach(l => {
                if (l.type === "asset" || l.type === "expense") {
                    computedBalances[l.id].gross = positives[l.id];
                } else {
                    computedBalances[l.id].gross = Math.max(positives[l.id], negatives[l.id]);
                }
            });

            setData({
                workbench,
                coa: labels,
                labels: labels,
                balances: computedBalances,
                transactions: mappedTransactions,
                inventory: inventory || [],
                parties: parties || [],
                loading: false,
                error: null,
            });

            console.log(`[DEBUG] Workbench context directly loaded from Supabase for: ${workbenchId}`);
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
