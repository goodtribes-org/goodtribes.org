-- Renames the "PROJECT" lifecycle phase to "SPRINT" (PRD 4d) to remove the
-- naming collision between the phase value and the Project entity itself —
-- "project" now refers only to the whole initiative, never to one phase of it.
-- ALTER TYPE ... RENAME VALUE relabels the existing enum value in place, so
-- every row currently at phase = 'PROJECT' becomes phase = 'SPRINT' automatically.
ALTER TYPE "ProjectPhase" RENAME VALUE 'PROJECT' TO 'SPRINT';
