-- Migration 032: Members, Departments, Claims, Allowances, and Financial Dimensions

-- 1. Extend departments table
ALTER TABLE departments ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE departments ADD COLUMN IF NOT EXISTS head_id UUID;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS head_name VARCHAR(255) DEFAULT '';
ALTER TABLE departments ADD COLUMN IF NOT EXISTS parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS parent_department_name VARCHAR(255) DEFAULT '';
ALTER TABLE departments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE departments ADD COLUMN IF NOT EXISTS annual_budget NUMERIC(15,2) DEFAULT 0.0;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS monthly_budget_allocation JSONB DEFAULT '{}'::jsonb;

-- 2. Extend employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_code VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS allowance_config JSONB DEFAULT '{}'::jsonb;

-- 3. Department Members Junction Table
CREATE TABLE IF NOT EXISTS department_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_in_dept VARCHAR(100) DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(department_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dept_members_wb ON department_members(workbench_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_dept ON department_members(department_id);

-- 4. Employee Allowances Table
CREATE TABLE IF NOT EXISTS employee_allowances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    allowance_type VARCHAR(100) NOT NULL, -- e.g. Travel, Food, Conveyance, Daily
    amount_rate NUMERIC(15,2) NOT NULL DEFAULT 0.0,
    frequency_unit VARCHAR(50) DEFAULT 'monthly', -- daily | monthly | per_km | per_trip
    effective_date DATE DEFAULT CURRENT_DATE,
    monthly_limit NUMERIC(15,2) DEFAULT 0.0,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_allowances_emp ON employee_allowances(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_allowances_wb ON employee_allowances(workbench_id);

-- 5. Expense Claims & Department Spend Table
CREATE TABLE IF NOT EXISTS expense_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    claim_number VARCHAR(100) NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    employee_name VARCHAR(255) NOT NULL,
    employee_email VARCHAR(255),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    department_name VARCHAR(255) DEFAULT 'General Operations',
    expense_account_id UUID REFERENCES di_accounts(id) ON DELETE SET NULL,
    category VARCHAR(255) NOT NULL,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0.0,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_type VARCHAR(50) DEFAULT 'REIMBURSEMENT', -- REIMBURSEMENT | DIRECT_COMPANY_PAYMENT
    description TEXT,
    notes TEXT,
    document_id UUID REFERENCES di_documents(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING | UNDER_REVIEW | APPROVED | REJECTED | RETURNED
    reimbursement_status VARCHAR(50) DEFAULT 'UNPAID', -- UNPAID | PARTIAL | REIMBURSED
    settlement_status VARCHAR(50) DEFAULT 'UNSETTLED', -- UNSETTLED | SETTLED
    voucher_id UUID REFERENCES di_ledger_transactions(id) ON DELETE SET NULL,
    payment_voucher_id UUID REFERENCES di_ledger_transactions(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    reimbursed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_wb ON expense_claims(workbench_id);
CREATE INDEX IF NOT EXISTS idx_claims_emp ON expense_claims(employee_id);
CREATE INDEX IF NOT EXISTS idx_claims_dept ON expense_claims(department_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON expense_claims(status);

-- 6. Add Financial Dimension (department_id & department_name) to Universal Ledger tables & Business Events
ALTER TABLE di_ledger_transactions ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE di_ledger_transactions ADD COLUMN IF NOT EXISTS department_name VARCHAR(255);

ALTER TABLE di_ledger_entries ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE di_ledger_entries ADD COLUMN IF NOT EXISTS department_name VARCHAR(255);

ALTER TABLE business_events ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE business_events ADD COLUMN IF NOT EXISTS department_name VARCHAR(255);

ALTER TABLE trade_drafts ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE trade_drafts ADD COLUMN IF NOT EXISTS department_name VARCHAR(255);

-- 7. Add Approval Authority columns to workbench_members
ALTER TABLE workbench_members ADD COLUMN IF NOT EXISTS approval_authority JSONB DEFAULT '{}'::jsonb;
ALTER TABLE workbench_members ADD COLUMN IF NOT EXISTS department_ids JSONB DEFAULT '[]'::jsonb;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trg_employee_allowances_updated_at ON employee_allowances;
CREATE TRIGGER trg_employee_allowances_updated_at BEFORE UPDATE ON employee_allowances FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_expense_claims_updated_at ON expense_claims;
CREATE TRIGGER trg_expense_claims_updated_at BEFORE UPDATE ON expense_claims FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS Policies
ALTER TABLE department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_allowances ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_claims ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='expense_claims' AND policyname='workbench_members_claims') THEN
        CREATE POLICY workbench_members_claims ON expense_claims FOR ALL
        USING (workbench_id IN (SELECT workbench_id FROM workbench_members WHERE user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='employee_allowances' AND policyname='workbench_members_allowances') THEN
        CREATE POLICY workbench_members_allowances ON employee_allowances FOR ALL
        USING (workbench_id IN (SELECT workbench_id FROM workbench_members WHERE user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='department_members' AND policyname='workbench_dept_members') THEN
        CREATE POLICY workbench_dept_members ON department_members FOR ALL
        USING (workbench_id IN (SELECT workbench_id FROM workbench_members WHERE user_id = auth.uid()));
    END IF;
END $$;
