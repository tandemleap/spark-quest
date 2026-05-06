-- Migration 009: Add created_by field to quests
-- Run this in Supabase SQL editor

alter table quests add column if not exists created_by text;
