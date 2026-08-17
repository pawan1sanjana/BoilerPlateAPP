-- Migration: Add username to users table
-- Run this script in the Supabase SQL Editor

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
