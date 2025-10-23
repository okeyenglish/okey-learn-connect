-- Remove records with position "преподаватель" from employees table
DELETE FROM public.employees 
WHERE position ILIKE '%преподаватель%' OR position ILIKE '%teacher%';