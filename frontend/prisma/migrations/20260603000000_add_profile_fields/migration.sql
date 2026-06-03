-- Add profile fields to User table.
-- Uses IF NOT EXISTS to be safe against partial prior application.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "socialLinks" JSONB DEFAULT '{}';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboarded" BOOLEAN NOT NULL DEFAULT false;
