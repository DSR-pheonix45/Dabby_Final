-- Migration: Add missing 'cin' column to workbenches table
ALTER TABLE public.workbenches ADD COLUMN IF NOT EXISTS cin TEXT;
