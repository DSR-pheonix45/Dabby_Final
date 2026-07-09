-- Migration 014: Rename workbench_accounts to user_accounts

-- Rename the table
ALTER TABLE IF EXISTS workbench_accounts RENAME TO user_accounts;

-- Rename workbench_id to user_id if it exists
DO $$ 
BEGIN
    IF EXISTS(SELECT *
    FROM information_schema.columns
    WHERE table_name='user_accounts' and column_name='workbench_id')
    THEN
        ALTER TABLE "public"."user_accounts" RENAME COLUMN "workbench_id" TO "user_id";
    END IF;
END $$;

-- Rename indices if necessary
ALTER INDEX IF EXISTS idx_workbench_accounts_workbench RENAME TO idx_user_accounts_user;
