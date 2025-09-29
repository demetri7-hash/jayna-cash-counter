-- Add HTML content storage columns to weekly_combined_reports table
-- These columns store the generated HTML content for historical report display

ALTER TABLE weekly_combined_reports 
ADD COLUMN IF NOT EXISTS generated_cash_report_html TEXT,
ADD COLUMN IF NOT EXISTS generated_tip_pool_html TEXT;

-- Add comment explaining the purpose of these columns
COMMENT ON COLUMN weekly_combined_reports.generated_cash_report_html IS 'Stores the generated cash report HTML content for historical display';
COMMENT ON COLUMN weekly_combined_reports.generated_tip_pool_html IS 'Stores the generated tip pool HTML content for historical display';