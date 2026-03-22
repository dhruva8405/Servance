# Servance - AC Reminder System Template

This repository is the full-stack template and complete codebase for **Servance**, a premium Service Reminder CRM built tailored for AC maintenance companies.

## Project Structure
- **/servance/**: Beautiful frontend client built in React + Vite and styled exclusively with Tailwind CSS v4.
- **/supabase/**: Application backend config including the Edge Function for transactional emails via Resend.
- **supabase_schema.sql**: The core schema builder including automatic Postgres triggers and RLS policies.

## Features Included
- **Client-Side Scalability**: Contains a high-performance memory generator that stress-tests the UI perfectly with 1000 dynamically related records (Customers + Devices + Service Logs).
- **Automated Service Architecture**: Automatically calculates next-due service dates on intervals, pushing SQL triggers directly to the edge worker to dispatch Resend Emails and AWS SNS Text Messages.
- **Premium SaaS UI**: Vibrant, responsive layout with embedded, real-time search logic across all application arrays.

## Deploying
To plug in your own Supabase database and spin this project up in the wild, check out the deployment instructions in the included documentation!
