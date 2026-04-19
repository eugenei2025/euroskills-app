# EuroSkills Status Report App

An operational dashboard for managing EuroSkills competition readiness, role assignments, documentation status, events, and bulk imports.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **State:** TanStack Query (React Query v5)
- **Forms:** React Hook Form + Zod
- **CSV Import:** PapaParse

## Features

- Dashboard with metrics across all skills
- Per-skill detail view with tabs for Roles, Documents, Position, Events, and Audit Log
- Colour-coded status badges (Vacant / Pending / Filled, doc statuses, attendance)
- Filter and search across the skills table
- Print / PDF view of the filtered table
- 3-step bulk import wizard for competition roles via CSV
- Last-updated timestamps on every record

## Setup Instructions

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd euroskills-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment configuration

Copy the example file and fill in your credentials:

```bash
cp .env.example .env.local
```

Open `.env.local` and replace the placeholder values:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Your credentials are found in the Supabase dashboard under **Settings → API**.

### 4. Database setup

1. Create a project at [https://supabase.com](https://supabase.com)
2. Go to **SQL Editor** in your Supabase dashboard
3. Paste the full contents of `supabase/schema.sql` and run it
4. This creates all tables, enums, RLS policies, triggers, and seeds the skills list

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 6. Build for production

```bash
npm run build
```

Deploy the `dist/` folder to Vercel, Netlify, or any static host.

## Repository Structure

```
euroskills-app/
├── .env.example          ← copy to .env.local and fill in
├── supabase/
│   └── schema.sql        ← run this in Supabase SQL Editor
└── src/
    ├── types/            ← TypeScript types (database + UI)
    ├── lib/              ← Supabase client, constants, utils, validators
    ├── hooks/            ← TanStack Query hooks
    └── components/
        ├── ui/           ← Badge, Button, Card, Tabs
        ├── layout/       ← Header
        ├── dashboard/    ← Dashboard, MetricCard, SkillsTable, FilterBar
        ├── skill/        ← SkillDetail, RolesPanel, PositionPanel
        └── import/       ← ImportWizard, StepUpload, StepMapping, StepValidation
```

## CSV Import Format

For bulk importing competition roles, your CSV must have these columns (header row required):

```
skill_number, role_type, first_name, family_name, email, nationality
```

Example:
```
S01,Workshop Manager,Jane,Smith,jane@example.com,GBR
S01,Workshop Manager Assistant,John,Doe,john@example.com,IRL
```

`skill_number` and `role_type` are required. All other fields are optional.

## GitHub

This project is ready to push to GitHub as-is. The `.gitignore` already excludes `node_modules`, `dist`, and `.env*.local`.

```bash
git init
git add .
git commit -m "Initial commit — EuroSkills Status App"
git remote add origin <your-github-repo-url>
git push -u origin main
```
