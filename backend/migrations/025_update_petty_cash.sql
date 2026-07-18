-- Update account 1000 from 'Cash' to 'Petty Cash'

UPDATE di_template_accounts 
SET name = 'Petty Cash' 
WHERE code = '1000';

UPDATE di_accounts 
SET name = 'Petty Cash' 
WHERE code = '1000';
