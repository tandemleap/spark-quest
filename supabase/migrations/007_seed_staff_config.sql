-- Migration 007: Seed initial staff passcode
-- Replace the hash below with a fresh bcrypt hash of your chosen passcode.
-- Generate it by running in your terminal:
--   node -e "const b=require('bcryptjs'); b.hash('70047004', 12).then(console.log)"
--
-- The hash below is for the default passcode "spark2024" — change it immediately after setup.

insert into staff_config (passcode_hash)
values ('$2b$12$Ri/tYl42U7F1mwekAcpBueXio9VtHXY8mgZ/ufUnHD/vtt1iuZAqS');

-- After inserting, verify with:
-- select id, updated_at from staff_config;
