-- ============================================================================
-- GST / TDS support
-- Adds tax identity to workbenches & parties and a full tax breakdown to
-- bills (purchases / input tax + TDS) and invoices (sales / output tax).
-- Idempotent — safe to re-run.
-- ============================================================================

-- ---- Tax identity ----
ALTER TABLE workbenches ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE workbenches ADD COLUMN IF NOT EXISTS state_code TEXT;   -- 2-digit GST state code

ALTER TABLE parties ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE parties ADD COLUMN IF NOT EXISTS pan TEXT;
ALTER TABLE parties ADD COLUMN IF NOT EXISTS state_code TEXT;

-- ---- Invoices: GST output tax ----
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS taxable_amount  DECIMAL(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_rate        DECIMAL(5,2)  DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cgst            DECIMAL(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sgst            DECIMAL(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS igst            DECIMAL(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_tax       DECIMAL(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS place_of_supply TEXT;          -- state code
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_interstate   BOOLEAN DEFAULT FALSE;

-- ---- Bills: GST input tax + TDS on vendor payments ----
ALTER TABLE bills ADD COLUMN IF NOT EXISTS taxable_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS gst_rate       DECIMAL(5,2)  DEFAULT 0;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS cgst           DECIMAL(15,2) DEFAULT 0;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS sgst           DECIMAL(15,2) DEFAULT 0;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS igst           DECIMAL(15,2) DEFAULT 0;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS total_tax      DECIMAL(15,2) DEFAULT 0;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS is_interstate  BOOLEAN DEFAULT FALSE;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS tds_section    TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS tds_rate       DECIMAL(5,2)  DEFAULT 0;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS tds_amount     DECIMAL(15,2) DEFAULT 0;

-- ---- GST summary view: output (sales) vs input (purchases) per workbench/month ----
CREATE OR REPLACE VIEW view_gst_summary AS
WITH output_tax AS (
    SELECT workbench_id,
           date_trunc('month', issue_date)::date AS period,
           COALESCE(SUM(cgst),0) AS cgst,
           COALESCE(SUM(sgst),0) AS sgst,
           COALESCE(SUM(igst),0) AS igst,
           COALESCE(SUM(total_tax),0) AS total
    FROM invoices GROUP BY workbench_id, date_trunc('month', issue_date)
),
input_tax AS (
    SELECT workbench_id,
           date_trunc('month', issue_date)::date AS period,
           COALESCE(SUM(cgst),0) AS cgst,
           COALESCE(SUM(sgst),0) AS sgst,
           COALESCE(SUM(igst),0) AS igst,
           COALESCE(SUM(total_tax),0) AS total
    FROM bills GROUP BY workbench_id, date_trunc('month', issue_date)
)
SELECT
    COALESCE(o.workbench_id, i.workbench_id) AS workbench_id,
    COALESCE(o.period, i.period) AS period,
    COALESCE(o.total,0) AS output_gst,
    COALESCE(i.total,0) AS input_gst,
    COALESCE(o.total,0) - COALESCE(i.total,0) AS net_gst_payable
FROM output_tax o
FULL OUTER JOIN input_tax i
  ON o.workbench_id = i.workbench_id AND o.period = i.period;
