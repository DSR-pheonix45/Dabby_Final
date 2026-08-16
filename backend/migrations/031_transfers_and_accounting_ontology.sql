-- Migration 031: Transfers and Accounting Ontology Engine
-- Creates tables for storing Contra transfers, Petty Cash movements, Founder Capital, and Stakeholder Drawings.

CREATE TABLE IF NOT EXISTS business_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    transfer_type VARCHAR(50) NOT NULL CHECK (
        transfer_type IN (
            'bank_to_bank', 
            'petty_cash_deposit', 
            'petty_cash_withdrawal', 
            'founder_capital_infusion', 
            'initial_funding', 
            'founder_drawings'
        )
    ),
    from_account VARCHAR(255) NOT NULL,
    to_account VARCHAR(255) NOT NULL,
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_number VARCHAR(100),
    narration TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'approved', 'posted', 'cancelled')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_transfers_workbench_id ON business_transfers(workbench_id);
CREATE INDEX IF NOT EXISTS idx_business_transfers_type ON business_transfers(transfer_type);
CREATE INDEX IF NOT EXISTS idx_business_transfers_date ON business_transfers(transfer_date);

COMMENT ON TABLE business_transfers IS 'Stores inter-bank contra transfers, petty cash movements, and equity/capital infusions or drawings.';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_business_transfers_updated_at ON business_transfers;
CREATE TRIGGER trg_business_transfers_updated_at BEFORE UPDATE ON business_transfers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
