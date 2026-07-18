-- ==========================================
-- Migration: 017_coa_seeder
-- Description: Financial Language and COA Seeder Schema
-- ==========================================

-- Standard function to update updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Account Categories (The 5 Universal Pillars)
CREATE TABLE IF NOT EXISTS di_account_categories (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    normal_balance TEXT NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE di_account_categories IS 'The five universal accounting pillars';

-- Seed the 5 Pillars
INSERT INTO di_account_categories (code, name, normal_balance) VALUES
('AST', 'Assets', 'debit'),
('LIA', 'Liabilities', 'credit'),
('EQU', 'Equity', 'credit'),
('REV', 'Revenue', 'credit'),
('EXP', 'Expenses', 'debit')
ON CONFLICT (code) DO NOTHING;


-- 2. Template Accounts
CREATE TABLE IF NOT EXISTS di_template_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category_code TEXT NOT NULL REFERENCES di_account_categories(code),
    normal_balance TEXT NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
    is_postable BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE di_template_accounts IS 'Global ledger account templates';

-- Seed Default Ledger Accounts
INSERT INTO di_template_accounts (code, name, category_code, normal_balance, sort_order) VALUES
('1000', 'Petty Cash', 'AST', 'debit', 10),
('1100', 'Bank Accounts', 'AST', 'debit', 20),
('1200', 'Accounts Receivable', 'AST', 'debit', 30),
('1300', 'Inventory', 'AST', 'debit', 40),
('1400', 'Fixed Assets', 'AST', 'debit', 50),
('1500', 'Deposits & Advances', 'AST', 'debit', 60),
('1600', 'Input Tax Credit', 'AST', 'debit', 70),
('1700', 'Other Current Assets', 'AST', 'debit', 80),

('2000', 'Accounts Payable', 'LIA', 'credit', 10),
('2100', 'Accrued Expenses', 'LIA', 'credit', 20),
('2200', 'Tax Payable', 'LIA', 'credit', 30),
('2300', 'Salary Payable', 'LIA', 'credit', 40),
('2400', 'Loans', 'LIA', 'credit', 50),
('2500', 'Customer Advances', 'LIA', 'credit', 60),
('2600', 'Other Liabilities', 'LIA', 'credit', 70),

('3000', 'Capital', 'EQU', 'credit', 10),
('3100', 'Retained Earnings', 'EQU', 'credit', 20),
('3200', 'Current Year Profit', 'EQU', 'credit', 30),

('4000', 'Sales Revenue', 'REV', 'credit', 10),
('4100', 'Service Revenue', 'REV', 'credit', 20),
('4200', 'Other Income', 'REV', 'credit', 30),
('4300', 'Interest Income', 'REV', 'credit', 40),

('5000', 'Cost of Goods Sold', 'EXP', 'debit', 10),
('5100', 'Purchase Expense', 'EXP', 'debit', 20),
('5200', 'Salary Expense', 'EXP', 'debit', 30),
('5300', 'Rent', 'EXP', 'debit', 40),
('5400', 'Utilities', 'EXP', 'debit', 50),
('5500', 'Software & SaaS', 'EXP', 'debit', 60),
('5600', 'Marketing', 'EXP', 'debit', 70),
('5700', 'Professional Fees', 'EXP', 'debit', 80),
('5800', 'Travel', 'EXP', 'debit', 90),
('5900', 'Bank Charges', 'EXP', 'debit', 100),
('5950', 'Depreciation', 'EXP', 'debit', 110),
('5999', 'Miscellaneous Expenses', 'EXP', 'debit', 120)
ON CONFLICT (code) DO NOTHING;


-- 3. Recreate Ledger Accounts (Instance)
DROP TABLE IF EXISTS di_accounts CASCADE;

CREATE TABLE di_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    parent_account_id UUID REFERENCES di_accounts(id) ON DELETE RESTRICT,
    template_account_code TEXT REFERENCES di_template_accounts(code) ON DELETE SET NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    category_code TEXT NOT NULL REFERENCES di_account_categories(code),
    normal_balance TEXT NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
    is_postable BOOLEAN NOT NULL DEFAULT true,
    is_system BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workbench_id, code)
);

COMMENT ON TABLE di_accounts IS 'Workbench-specific instantiated ledger accounts';

CREATE INDEX idx_di_accounts_workbench_id ON di_accounts(workbench_id);

CREATE TRIGGER trg_di_accounts_updated_at
BEFORE UPDATE ON di_accounts
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();


-- 4. Global AI Labels (Template)
CREATE TABLE IF NOT EXISTS di_ai_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    default_account_code TEXT NOT NULL REFERENCES di_template_accounts(code),
    confidence_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.85,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE di_ai_labels IS 'Semantic business concepts mapped to default ledger accounts';

-- Seed AI Labels
INSERT INTO di_ai_labels (name, default_account_code) VALUES
('Sales', '4000'),
('Service Revenue', '4100'),
('Purchase', '5100'),
('Raw Material', '5000'),
('Office Supplies', '5999'),
('Electricity', '5400'),
('Internet', '5400'),
('Fuel', '5800'),
('Salary', '5200'),
('Professional Services', '5700'),
('Rent', '5300'),
('Marketing', '5600'),
('Advertising', '5600'),
('Courier', '5999'),
('Freight', '5999'),
('GST Input', '1600'),
('GST Output', '2200'),
('TDS', '2200'),
('Interest', '4300'),
('Loan', '2400'),
('Asset Purchase', '1400'),
('Equipment', '1400'),
('Computer', '1400'),
('Vehicle', '1400'),
('Furniture', '1400'),
('Customer Advance', '2500'),
('Vendor Payment', '2000'),
('Customer Receipt', '1200'),
('Bank Charges', '5900'),
('Refund', '5999'),
('Credit Note', '4000'),
('Debit Note', '5100'),
('Inventory Adjustment', '1300'),
('Depreciation', '5950'),
('Miscellaneous', '5999')
ON CONFLICT (name) DO NOTHING;


-- 5. Workbench Instance AI Labels
CREATE TABLE IF NOT EXISTS di_workbench_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    template_label_id UUID REFERENCES di_ai_labels(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    ledger_account_id UUID NOT NULL REFERENCES di_accounts(id) ON DELETE RESTRICT,
    confidence_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.85,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workbench_id, name)
);

COMMENT ON TABLE di_workbench_labels IS 'Workbench-specific labels resolved deterministically to ledger accounts';

CREATE INDEX idx_di_workbench_labels_workbench_id ON di_workbench_labels(workbench_id);

CREATE TRIGGER trg_di_workbench_labels_updated_at
BEFORE UPDATE ON di_workbench_labels
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

-- Enable RLS
ALTER TABLE di_account_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE di_template_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE di_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE di_ai_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE di_workbench_labels ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public read for categories" ON di_account_categories FOR SELECT USING (true);
CREATE POLICY "Public read for template accounts" ON di_template_accounts FOR SELECT USING (true);
CREATE POLICY "Public read for ai labels" ON di_ai_labels FOR SELECT USING (true);

CREATE POLICY "Users manage accounts in their workbenches" ON di_accounts FOR ALL USING (
    EXISTS (SELECT 1 FROM workbench_members wm WHERE wm.workbench_id = di_accounts.workbench_id AND wm.user_id = auth.uid())
);

CREATE POLICY "Users manage labels in their workbenches" ON di_workbench_labels FOR ALL USING (
    EXISTS (SELECT 1 FROM workbench_members wm WHERE wm.workbench_id = di_workbench_labels.workbench_id AND wm.user_id = auth.uid())
);
