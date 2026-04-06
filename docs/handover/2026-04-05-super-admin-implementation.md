# Super Admin Implementation - Handover Report

**Date:** April 5, 2026  
**Focus:** Real super admin provisioning with Firebase Auth custom claims and Firestore role

## 1. Summary

Implemented a proper super admin system for XamPreps where `fredkenogo@gmail.com` is the designated super admin. The implementation uses:

- **Firebase Auth Custom Claims** for secure role verification
- **Firestore `user_roles` collection** as the source of truth
- **Frontend role resolution** that checks custom claims first, then Firestore
- **View As Role Switcher** for UI preview without privilege escalation

## 2. Architecture

### Role Resolution Precedence

1. **Firebase Auth Custom Claims** (highest priority) - Set via Admin SDK
2. **Firestore `user_roles/{uid}.role`** - Fallback if no custom claims
3. **Default: `student`** - If neither exists

### Security Model

- Super admin privileges are granted ONLY when `role === 'super_admin'`
- The `isSuperAdmin` flag is computed from the resolved role, not email
- View As switching is UI-only and does NOT modify stored role or custom claims
- Firestore rules check `user_roles` collection for admin/super_admin role

## 3. Files Changed

| File                                        | Change                                                                              |
| ------------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/contexts/AuthContext.tsx`              | Removed hardcoded email logic; `isSuperAdmin` now based on `role === 'super_admin'` |
| `src/components/ProtectedRoute.tsx`         | Uses `effectiveRole` for UI routing; super admin can access all routes              |
| `src/pages/dashboards/BusinessConsole.tsx`  | Checks `isSuperAdmin` (role-based, not email-based)                                 |
| `src/App.tsx`                               | Added `/dashboard/business-console` route                                           |
| `src/components/layout/DashboardLayout.tsx` | Added `super_admin` nav config; safe fallback for undefined navItems                |
| `firestore.rules`                           | `isAdmin()` checks for both `admin` AND `super_admin`                               |
| `functions/scripts/setSuperAdmin.js`        | One-time provisioning script                                                        |

## 4. Provisioning Instructions

### Step 1: Run the Provisioning Script

```bash
# Navigate to project root
cd /Users/theo/xampreps

# Run the script
node functions/scripts/setSuperAdmin.js
```

The script will:

1. Find `fredkenogo@gmail.com` in Firebase Auth
2. Set custom claims: `{ role: "super_admin" }`
3. Update `user_roles/{uid}.role` to `"super_admin"`
4. Create profile document if missing

### Step 2: User Must Re-login

The user must sign out and sign back in for custom claims to take effect. Custom claims are embedded in the ID token.

### Alternative: Manual Firestore Update

If the script cannot be run, manually update Firestore:

1. Go to Firebase Console > Firestore
2. Find `user_roles/{uid}` for `fredkenogo@gmail.com`
3. Change `role` field from `student` to `super_admin`

Note: This alone will work, but custom claims provide stronger security.

## 5. How It Works

### Frontend Role Resolution (AuthContext.tsx)

```typescript
// 1. Check custom claims first
const tokenResult = await auth.currentUser.getIdTokenResult();
if (isAppRole(tokenResult.claims.role)) {
  resolvedRole = tokenResult.claims.role;
}

// 2. Fall back to Firestore
if (!resolvedRole) {
  const roleSnap = await getDoc(doc(db, "user_roles", userId));
  const roleValue = roleSnap.data()?.role;
  resolvedRole = isAppRole(roleValue) ? roleValue : "student";
}
```

### isSuperAdmin Check

```typescript
const isSuperAdmin = role === "super_admin";
```

### View As Switcher

```typescript
const setViewAsRole = (newRole: AppRole | null) => {
  if (isSuperAdmin) {
    setViewAsRoleState(newRole);
  }
};
```

- Only super admin can use the View As switcher
- Changes `effectiveRole` for UI rendering only
- Does NOT modify Firestore or custom claims
- Resets on sign out

## 6. Access Control

### Business Console (`/dashboard/business-console`)

- Protected by `ProtectedRoute` with `allowedRoles={['super_admin']}`
- Checks `isSuperAdmin` before rendering content
- Non-super-admin users see "Access Denied"

### ProtectedRoute Behavior

- Super admin can access ALL role-protected routes
- Uses `effectiveRole` (view-as) for UI navigation
- Uses real `role` for security decisions

### Firestore Rules

```javascript
function isAdmin() {
  let userRole = get(/databases/$(database)/documents/user_roles/$(request.auth.uid)).data.role;
  return isAuthenticated() && (userRole == 'admin' || userRole == 'super_admin');
}
```

## 7. Testing Checklist

After provisioning:

- [ ] Sign in as `fredkenogo@gmail.com`
- [ ] Verify redirect to Business Console (not student dashboard)
- [ ] Verify "Super Admin" badge is displayed
- [ ] Test View As switcher:
  - [ ] Select "Student View" → should show student dashboard
  - [ ] Select "Parent View" → should show parent dashboard
  - [ ] Select "Admin View" → should show admin dashboard
  - [ ] Select "Super Admin (default)" → should return to Business Console
- [ ] Verify real role remains `super_admin` after switching views
- [ ] Sign out and sign back in → should return to Business Console

## 8. Security Notes

### What Was Removed

- **Hardcoded email check** - Previously `fredkenogo@gmail.com` was automatically treated as super admin
- **Email-based privilege escalation** - No longer possible

### What Remains Secure

- Role is stored in Firebase Auth custom claims (tamper-proof)
- Role is stored in Firestore (admin-controlled)
- View As is UI-only and resets on sign out
- Firestore rules enforce role-based access

### Audit Trail

The provisioning script logs all actions:

- User lookup
- Custom claims set
- Firestore update
- Profile verification

## 9. Future Considerations

### Adding More Super Admins

To add another super admin:

1. Run the provisioning script with a different email
2. Or use Firebase Admin SDK directly:
   ```javascript
   await admin.auth().setCustomUserClaims(uid, { role: "super_admin" });
   await db
     .collection("user_roles")
     .doc(uid)
     .set({ role: "super_admin" }, { merge: true });
   ```

### Removing Super Admin Access

To revoke super admin:

1. Clear custom claims:
   ```javascript
   await admin.auth().setCustomUserClaims(uid, {});
   ```
2. Update Firestore:
   ```javascript
   await db.collection("user_roles").doc(uid).update({ role: "student" });
   ```
3. User must re-login for changes to take effect

## 10. Troubleshooting

### Business Console shows "Access Denied"

1. Verify `user_roles/{uid}.role` is `super_admin` in Firestore
2. Verify custom claims are set (check ID token in browser dev tools)
3. User must sign out and sign back in after provisioning

### View As switcher doesn't work

1. Verify `isSuperAdmin` is `true` in React DevTools
2. Check that `setViewAsRole` is only called when `isSuperAdmin` is true
3. Verify role is `super_admin` (not another role)

### Role shows as "student" after provisioning

1. User must sign out and sign back in
2. Custom claims are only refreshed on login
3. Check browser localStorage for stale token

---

_Report generated during Super Admin Implementation pass._
