# Estate Roles Implementation

This walkthrough outlines the changes made to support the specific Tea Estate roles requested.

## 1. Role Expansion
We've replaced the generic `estate_admin` role with the three new roles you defined:
- **Estate Manager** (`estate_manager`)
- **Estate Office** (`estate_office`)
- **Field Officer** (`field_officer`)

Additionally, we retain the `system_admin` (for cross-estate management) and the general `user` role.

## 2. Dynamic Module Provisioning
- **Estates Management Module:** The System Admin view at `/estates` has been updated. When editing an estate, the System Admin can now individually configure which modules are accessible by the **Estate Manager**, **Estate Office**, **Field Officer**, and **User** within that estate.
- The `useAuthStore` and `useModulePermissionsStore` were updated across the app so the Sidebar and routes correctly isolate modules based on these new role names.

## 3. Account Creation & Edge Function
- **Registration Form:** The form at `/accounts/new` now presents "Estate Manager", "Estate Office", "Field Officer", and "User" in the role dropdown.
- **Backend Fix:** The `create-user` Supabase Edge Function previously had a strict check that required the caller's role to be exactly `"admin"`. This would have prevented any users from being created under the new system! The Edge Function has been updated to correctly allow `system_admin` and `estate_manager` users to create new accounts.

## Next Steps
> [!IMPORTANT]
> You must re-deploy your Supabase Edge Function for the registration fix to take effect in your backend. Run the following command in your terminal:
> ```bash
> supabase functions deploy create-user
> ```
