# Production migration runbook

## Topology

Production remains on Render: the Node API reads the Render PostgreSQL connection from `DATABASE_URL` and the API service starts with `prisma migrate deploy`. The local Docker PostgreSQL instance used during development is disposable migration rehearsal infrastructure; it is never a production replacement.

The public frontend may continue on Firebase Hosting while calling `https://mcb-ghana-hrm-api.onrender.com/api`. Keep the API hostname consistent across Firebase and Render frontend environments.

## First migration-history rollout

1. Stop writes and take a verified PostgreSQL backup.
2. Rehearse the restore and migration against staging with anonymized data.
3. Confirm the live database already matches the pre-migration Prisma schema represented by `00000000000000_existing_schema_baseline`.
4. **Before deploying this code**, securely export the existing Render database URL on an authorized workstation or one-off shell. Never print or commit it.
5. For the existing production database only, record the generated baseline without executing it:
   `npx prisma migrate resolve --applied 00000000000000_existing_schema_baseline`
   Never run the baseline SQL against an existing populated database.
6. Review `npx prisma migrate status`. A new empty database should execute the baseline normally; an existing database should show it as resolved/applied.
7. Run `npx prisma migrate deploy` and confirm `prisma migrate diff` reports no schema difference.
8. Deploy the Render API. Its start command will safely re-run `migrate deploy` as an idempotent check.
9. Confirm Render has `FRONTEND_URL`, `API_BASE_URL`, SMTP variables, JWT secrets, `PURGE_RECOVERY_SECRET`, Firebase credentials and Redis configured.
10. Run `npm run setup` once to synchronize permission bundles/default departmental accounts and issue secure invitation links. Treat any invitation delivery failure as a rollout failure.
11. Deploy the frontend with `VITE_API_URL=https://mcb-ghana-hrm-api.onrender.com/api`.
12. Run authorization, tenant-isolation, leave, onboarding, cards, help-desk and payroll live smoke tests.

Do not run `migrate reset` against staging or production. Payroll creation remains blocked until an accountant-approved `PayrollStatutoryRule` exists for the pay period.
