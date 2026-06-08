-- Recurring (subscription) invoice templates. The scheduler generates a real
-- invoice from each template when it falls due.
CREATE TABLE IF NOT EXISTS recurring_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    party_id UUID NOT NULL REFERENCES parties(id),
    description TEXT,
    taxable_amount NUMERIC NOT NULL CHECK (taxable_amount > 0),
    gst_rate NUMERIC DEFAULT 0,
    place_of_supply TEXT,
    revenue_label_id UUID REFERENCES labels(id),
    ar_label_id UUID REFERENCES labels(id),
    items_json JSONB DEFAULT '[]',
    frequency TEXT NOT NULL DEFAULT 'monthly'
        CHECK (frequency IN ('weekly','monthly','quarterly','yearly')),
    next_run_date DATE NOT NULL,
    end_date DATE,
    active BOOLEAN DEFAULT TRUE,
    last_invoice_number INT DEFAULT 0,
    last_run_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_wb ON recurring_invoices(workbench_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_due ON recurring_invoices(next_run_date) WHERE active;
