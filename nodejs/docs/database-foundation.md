# Database Foundation

This is the first Supabase/Postgres foundation for the shared landing page, shared signup flow, merchant dashboard, and admin dashboard.

## Routing model

- Landing page: shared for everyone
- Signup page: shared for everyone
- Merchant users: sign up, create or join a business, then go to `/app/dashboard`
- Platform admins: must have an admin invite or an existing admin-granted role, then go to `/admin/dashboard`

The important constraint is security: public signup must not be able to self-assign admin privileges just by selecting "admin" on the form.

## Core tables

- `app.user_profiles`
  Extends `auth.users` with application-level profile data.

- `app.user_platform_roles`
  Stores global roles such as `platform_admin`.

- `app.platform_admin_invites`
  Secure path for granting admin access during signup without relying on `.env` credentials.

- `app.businesses`
  Merchant accounts or companies using the gateway.

- `app.business_memberships`
  Connects users to businesses with roles like `owner`, `admin`, `developer`, `finance`, and `viewer`.

- `app.api_keys`
  Merchant API credentials, stored as hashed secrets.

- `app.audit_logs`
  Records sensitive actions on the platform.

## Signup behavior

### Merchant signup

1. User signs up through Supabase Auth.
2. Trigger creates `app.user_profiles`.
3. App creates a business with `app.create_business_for_current_user(...)`.
4. User becomes `owner` in `app.business_memberships`.
5. App reads `app.resolve_dashboard_for_current_user()` and redirects to `/app/dashboard`.

### Admin signup

1. User signs up through the same public signup page.
2. Signup may capture `signup_path = 'admin'` for onboarding intent.
3. Actual admin access is granted only if the email matches a valid `app.platform_admin_invites` record.
4. Trigger assigns `platform_admin`.
5. App reads `app.resolve_dashboard_for_current_user()` and redirects to `/admin/dashboard`.

## Why this shape

- It removes admin credentials from `.env`.
- It keeps the landing page and signup page shared.
- It gives admins and merchants separate dashboards.
- It lets one user be both a merchant user and a platform admin in the future if needed.
- It uses Supabase RLS instead of application-only access checks.

## Environment keys needed later

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Next implementation steps

1. Add Supabase client and server helpers.
2. Replace current admin cookie login with Supabase-backed role checks.
3. Split routes into `/app/*` and `/admin/*`.
4. Build shared signup flow that creates merchant businesses and honors admin invites.
5. Move payment transactions, webhooks, and settlement records into later migrations.
