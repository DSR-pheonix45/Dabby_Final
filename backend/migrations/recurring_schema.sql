-- Recurring transactions (subscriptions, rent, salaries, EMIs ...).
CREATE TABLE IF NOT EXISTS recurring_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    from_label_id UUID NOT NULL REFERENCES labels(id),
    to_label_id   UUID NOT NULL REFERENCES labels(id),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    frequency TEXT NOT NULL DEFAULT 'monthly'
        CHECK (frequency IN ('daily','weekly','monthly','quarterly','yearly')),
    next_run_date DATE NOT NULL,
    end_date DATE,
    party_id UUID,
    active BOOLEAN DEFAULT TRUE,
    last_run_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_workbench ON recurring_transactions(workbench_id);
CREATE INDEX IF NOT EXISTS idx_recurring_due ON recurring_transactions(next_run_date) WHERE active;
