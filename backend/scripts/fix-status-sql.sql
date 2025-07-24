-- SQL Script to fix invalid status values
-- Run this directly in your PostgreSQL database

-- Fix Team status values
UPDATE teams 
SET status = 'aktiv' 
WHERE status IS NULL 
   OR status = '' 
   OR status = 'Choose here' 
   OR status NOT IN ('aktiv', 'inaktiv', 'pausiert');

-- Fix Team trend values  
UPDATE teams 
SET trend = 'gleich' 
WHERE trend IS NULL 
   OR trend = '' 
   OR trend = 'Choose here'
   OR trend NOT IN ('steigend', 'gleich', 'fallend');

-- Fix Spiel status values
UPDATE spiele 
SET status = 'geplant' 
WHERE status IS NULL 
   OR status = '' 
   OR status = 'Choose here'
   OR status NOT IN ('geplant', 'laufend', 'beendet', 'abgesagt');

-- Check results
SELECT 'Teams with fixed status' as info, COUNT(*) as count 
FROM teams 
WHERE status = 'aktiv';

SELECT 'Teams with fixed trend' as info, COUNT(*) as count 
FROM teams 
WHERE trend = 'gleich';

SELECT 'Spiele with fixed status' as info, COUNT(*) as count 
FROM spiele 
WHERE status = 'geplant';