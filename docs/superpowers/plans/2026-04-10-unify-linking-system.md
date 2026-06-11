# Unify Linking System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate all student-parent/school linking into a single `student_link_codes` Firestore collection with one canonical `claimStudentLinkCode` callable, removing all legacy link_codes / link_requests / linked_accounts runtime paths.

**Architecture:** Every code (whether issued by a student, parent, or school admin) lands in `student_link_codes` with full `issuerUid`/`issuerRole`/`targetType` fields. A single `claimStudentLinkCode` Cloud Function, called by a parent or school admin, validates the code and writes to `parent_student_links` or `school_student_links`. All legacy callables and the `linking.ts` frontend module are removed.

**Tech Stack:** Firebase Cloud Functions v2 (Node.js), Firestore, TypeScript (React frontend), firebase/functions `httpsCallable`.

---

## File Map

**Backend (functions/index.js)**
- Modify: `createStudentLinkCodeRecord` helper — add `issuerUid`, `issuerRole` params
- Modify: `generateStudentLinkCode` export — pass `issuerUid`/`issuerRole: "student"`
- Modify: `generateStudentInviteAsParent` — route to `createStudentLinkCodeRecord`, drop `student_link_invites`
- Modify: `generateStudentInviteAsSchoolAdmin` — same migration
- Modify: `listStudentInvitesAsParent` — query `student_link_codes` instead of `student_link_invites`
- Modify: `listStudentInvitesAsSchoolAdmin` — same migration
- **Add:** `exports.claimStudentLinkCode` — unified claim callable
- **Remove (comment out):** `exports.claimStudentLinkAsParent`, `exports.claimStudentLinkAsSchoolAdmin`, `exports.claimStudentLinkFromInviteCode`
- **Remove (comment out):** `exports.generateLinkCode`, `exports.listActiveLinkCodes`, `exports.redeemLinkCode`, `exports.sendLinkRequest`, `exports.listLinkRequests`, `exports.respondToLinkRequest`, `exports.listLinkedAccounts`, `exports.unlinkAccount`, `exports.listLinkedStudentsOverview`
- **Remove:** `createStudentInviteCodeRecord` helper (fully replaced)

**Frontend**
- Modify: `src/integrations/firebase/identity.ts` — add `claimStudentLinkCodeFirebase`, remove three old claim wrappers
- Delete runtime content of: `src/integrations/firebase/linking.ts` — stub-out all exports so build doesn't break, then hunt-and-replace all import sites
- Modify: `src/pages/dashboards/ParentDashboardContent.tsx` — switch to `claimStudentLinkCodeFirebase`
- Modify: `src/pages/dashboards/SchoolAdminDashboard.tsx` — switch to `claimStudentLinkCodeFirebase`
- Modify: `src/components/identity/StudentLinkCodesPanel.tsx` — remove invite-claim section (students generate, not claim)
- Modify: `src/pages/dashboards/ParentDashboard.tsx` — remove `listLinkedStudentsOverviewFirebase` call
- Modify: `src/pages/dashboards/SchoolDashboard.tsx` — same removal
- Modify: `src/pages/dashboards/SchoolDashboardContent.tsx` — same removal
- Modify: `src/components/settings/AccountLinkingSection.tsx` — remove linking.ts imports
- Modify: `src/components/dashboard/LinkRequestsCard.tsx` — remove linking.ts imports
- Modify: `src/components/dashboard/LinkedAccountsCard.tsx` — remove linking.ts imports
- Modify: `src/components/modals/AddStudentDialog.tsx` — remove linking.ts imports
- Modify: `src/components/modals/SendLinkRequestDialog.tsx` — remove linking.ts imports
- Modify: `src/components/modals/LinkChildDialog.tsx` — remove linking.ts imports
- Modify: `src/components/modals/RedeemLinkCodeDialog.tsx` — remove linking.ts imports
- Modify: `src/components/modals/GenerateLinkCodeDialog.tsx` — remove linking.ts imports
- Modify: `src/contexts/AuthContext.tsx` — add deprecation console.warn on legacy role fallbacks
- Modify: `firestore.rules` — ensure `student_link_codes` has correct read rules

---

## Task 1: Update `createStudentLinkCodeRecord` schema

**Files:**
- Modify: `functions/index.js` (approx line 488–557)

- [ ] **Step 1: Open `functions/index.js` and find `createStudentLinkCodeRecord`**

The function signature at line ~488 is:
```js
async function createStudentLinkCodeRecord({
  studentUid,
  studentDisplayName,
  studentCountry,
  studentEducationLevel,
  targetType,
}) {
```

Replace it with:
```js
async function createStudentLinkCodeRecord({
  studentUid,
  studentDisplayName,
  studentCountry,
  studentEducationLevel,
  targetType,
  issuerUid,
  issuerRole,
}) {
```

And inside the `tx.set(codeRef, { ... })` block (around line 523), add the two new fields:
```js
        tx.set(codeRef, {
          codeId: codeNormalized,
          studentUid,
          studentDisplayName,
          studentCountry,
          studentEducationLevel,
          targetType,
          issuerUid: issuerUid || studentUid,
          issuerRole: issuerRole || "student",
          code,
          codeNormalized,
          status: "active",
          expiresAt,
          claimedByUid: null,
          claimedAt: null,
          createdAt: now,
          updatedAt: now,
        });
```

- [ ] **Step 2: Verify syntax**
```bash
node --check functions/index.js
```
Expected: no output (clean).

- [ ] **Step 3: Commit**
```bash
git add functions/index.js
git commit -m "feat(linking): add issuerUid/issuerRole fields to createStudentLinkCodeRecord"
```

---

## Task 2: Wire `generateStudentLinkCode` to pass issuer fields

**Files:**
- Modify: `functions/index.js` (approx line 3775–3817)

- [ ] **Step 1: Find the `createStudentLinkCodeRecord` call inside `generateStudentLinkCode`** (~line 3803)

Current call:
```js
  const result = await createStudentLinkCodeRecord({
    studentUid,
    studentDisplayName: resolved.displayName,
    studentCountry: resolved.country,
    studentEducationLevel: resolved.educationLevel,
    targetType,
  });
```

Replace with:
```js
  const result = await createStudentLinkCodeRecord({
    studentUid,
    studentDisplayName: resolved.displayName,
    studentCountry: resolved.country,
    studentEducationLevel: resolved.educationLevel,
    targetType,
    issuerUid: studentUid,
    issuerRole: "student",
  });
```

- [ ] **Step 2: Verify syntax**
```bash
node --check functions/index.js
```
Expected: no output.

- [ ] **Step 3: Commit**
```bash
git add functions/index.js
git commit -m "feat(linking): generateStudentLinkCode sets issuerRole=student"
```

---

## Task 3: Migrate parent/school invite generation to `student_link_codes`

**Files:**
- Modify: `functions/index.js` (approx lines 3681–3748)

The goal is to replace `createStudentInviteCodeRecord` calls (which write to `student_link_invites`) with `createStudentLinkCodeRecord` (which writes to `student_link_codes`). Parent/school-issued codes don't have a `studentUid` yet — that gets resolved at claim time — so set `studentUid` to `null`.

- [ ] **Step 1: Update `generateStudentInviteAsParent`** (~line 3681)

Replace:
```js
exports.generateStudentInviteAsParent = onCall(async (request) => {
  const parentUid = await assertManagedStudentCreatorRole(request, "parent");
  const result = await createStudentInviteCodeRecord({
    issuerUid: parentUid,
    issuerRole: "parent",
    targetType: "parent",
    schoolId: null,
  });

  return {
    ok: true,
    ...result,
    targetType: "parent",
    expiresAt: toIsoString(result.expiresAt),
  };
});
```

With:
```js
exports.generateStudentInviteAsParent = onCall(async (request) => {
  const parentUid = await assertManagedStudentCreatorRole(request, "parent");
  const result = await createStudentLinkCodeRecord({
    studentUid: null,
    studentDisplayName: null,
    studentCountry: null,
    studentEducationLevel: null,
    targetType: "parent",
    issuerUid: parentUid,
    issuerRole: "parent",
  });

  return {
    ok: true,
    ...result,
    targetType: "parent",
    expiresAt: toIsoString(result.expiresAt),
  };
});
```

- [ ] **Step 2: Update `generateStudentInviteAsSchoolAdmin`** (~line 3722)

Replace:
```js
exports.generateStudentInviteAsSchoolAdmin = onCall(async (request) => {
  const schoolAdminUid = await assertManagedStudentCreatorRole(request, "school_admin");
  const activeSchools = await getSchoolAdminActiveSchools(schoolAdminUid);
  if (activeSchools.length === 0) {
    throw new HttpsError("failed-precondition", "You do not have an active school_admin link yet.");
  }
  if (activeSchools.length > 1) {
    throw new HttpsError("failed-precondition", "This flow only supports school admins linked to exactly one active school.");
  }

  const selectedSchool = activeSchools[0];
  const result = await createStudentInviteCodeRecord({
    issuerUid: schoolAdminUid,
    issuerRole: "school_admin",
    targetType: "school_admin",
    schoolId: selectedSchool.schoolId,
  });

  return {
    ok: true,
    ...result,
    targetType: "school_admin",
    schoolId: selectedSchool.schoolId,
    schoolName: selectedSchool.schoolName,
    expiresAt: toIsoString(result.expiresAt),
  };
});
```

With:
```js
exports.generateStudentInviteAsSchoolAdmin = onCall(async (request) => {
  const schoolAdminUid = await assertManagedStudentCreatorRole(request, "school_admin");
  const activeSchools = await getSchoolAdminActiveSchools(schoolAdminUid);
  if (activeSchools.length === 0) {
    throw new HttpsError("failed-precondition", "You do not have an active school_admin link yet.");
  }
  if (activeSchools.length > 1) {
    throw new HttpsError("failed-precondition", "This flow only supports school admins linked to exactly one active school.");
  }

  const selectedSchool = activeSchools[0];
  const result = await createStudentLinkCodeRecord({
    studentUid: null,
    studentDisplayName: null,
    studentCountry: null,
    studentEducationLevel: null,
    targetType: "school_admin",
    issuerUid: schoolAdminUid,
    issuerRole: "school_admin",
  });

  return {
    ok: true,
    ...result,
    targetType: "school_admin",
    schoolId: selectedSchool.schoolId,
    schoolName: selectedSchool.schoolName,
    expiresAt: toIsoString(result.expiresAt),
  };
});
```

- [ ] **Step 3: Verify syntax**
```bash
node --check functions/index.js
```
Expected: no output.

- [ ] **Step 4: Commit**
```bash
git add functions/index.js
git commit -m "feat(linking): migrate invite generation from student_link_invites to student_link_codes"
```

---

## Task 4: Migrate invite list queries to `student_link_codes`

**Files:**
- Modify: `functions/index.js` (approx lines 3698–3773)

- [ ] **Step 1: Update `listStudentInvitesAsParent`** (~line 3698)

Replace the full function:
```js
exports.listStudentInvitesAsParent = onCall(async (request) => {
  const parentUid = await assertManagedStudentCreatorRole(request, "parent");
  const snap = await db.collection("student_link_invites")
      .where("issuerUid", "==", parentUid)
      .where("targetType", "==", "parent")
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

  const items = snap.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      codeId: docSnap.id,
      code: data.code || null,
      status: data.status || null,
      expiresAt: toIsoString(data.expiresAt),
      createdAt: toIsoString(data.createdAt),
    };
  });

  return {ok: true, items};
});
```

With:
```js
exports.listStudentInvitesAsParent = onCall(async (request) => {
  const parentUid = await assertManagedStudentCreatorRole(request, "parent");
  const snap = await db.collection("student_link_codes")
      .where("issuerUid", "==", parentUid)
      .where("issuerRole", "==", "parent")
      .where("targetType", "==", "parent")
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

  const items = snap.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      codeId: docSnap.id,
      code: data.code || null,
      status: data.status || null,
      expiresAt: toIsoString(data.expiresAt),
      createdAt: toIsoString(data.createdAt),
    };
  });

  return {ok: true, items};
});
```

- [ ] **Step 2: Update `listStudentInvitesAsSchoolAdmin`** (~line 3750)

Replace the full function:
```js
exports.listStudentInvitesAsSchoolAdmin = onCall(async (request) => {
  const schoolAdminUid = await assertManagedStudentCreatorRole(request, "school_admin");
  const snap = await db.collection("student_link_invites")
      .where("issuerUid", "==", schoolAdminUid)
      .where("targetType", "==", "school_admin")
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

  const items = snap.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      codeId: docSnap.id,
      code: data.code || null,
      status: data.status || null,
      expiresAt: toIsoString(data.expiresAt),
      createdAt: toIsoString(data.createdAt),
      schoolId: data.schoolId || null,
    };
  });

  return {ok: true, items};
});
```

With:
```js
exports.listStudentInvitesAsSchoolAdmin = onCall(async (request) => {
  const schoolAdminUid = await assertManagedStudentCreatorRole(request, "school_admin");
  const snap = await db.collection("student_link_codes")
      .where("issuerUid", "==", schoolAdminUid)
      .where("issuerRole", "==", "school_admin")
      .where("targetType", "==", "school_admin")
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

  const items = snap.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      codeId: docSnap.id,
      code: data.code || null,
      status: data.status || null,
      expiresAt: toIsoString(data.expiresAt),
      createdAt: toIsoString(data.createdAt),
    };
  });

  return {ok: true, items};
});
```

- [ ] **Step 3: Verify syntax**
```bash
node --check functions/index.js
```
Expected: no output.

- [ ] **Step 4: Commit**
```bash
git add functions/index.js
git commit -m "feat(linking): migrate invite list queries to student_link_codes"
```

---

## Task 5: Add the unified `claimStudentLinkCode` callable

**Files:**
- Modify: `functions/index.js` — add new export immediately before `exports.claimStudentLinkAsParent`

- [ ] **Step 1: Insert the new callable**

Find the line `exports.claimStudentLinkAsParent = onCall(async (request) => {` (approx line 4157) and insert the following block immediately **before** it:

```js
exports.claimStudentLinkCode = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const callerUid = request.auth.uid;
  const callerRole = (request.auth.token && request.auth.token.role) ||
    await getRoleForUser(callerUid, null);

  if (callerRole !== "parent" && callerRole !== "school_admin") {
    throw new HttpsError("permission-denied", "Only parents and school admins can claim student link codes.");
  }

  const codeInput = coerceOptionalString(request.data && request.data.code);
  if (!codeInput) {
    throw new HttpsError("invalid-argument", "code is required.");
  }

  // Pre-fetch school for school_admin before entering the transaction
  let selectedSchool = null;
  if (callerRole === "school_admin") {
    const activeSchools = await getSchoolAdminActiveSchools(callerUid);
    if (activeSchools.length === 0) {
      throw new HttpsError("failed-precondition", "You do not have an active school_admin link yet.");
    }
    if (activeSchools.length > 1) {
      throw new HttpsError("failed-precondition", "This flow only supports school admins linked to exactly one active school.");
    }
    selectedSchool = activeSchools[0];
  }

  const codeNormalized = normalizeAccessCode(codeInput);
  const codeRef = db.collection("student_link_codes").doc(codeNormalized);
  const now = admin.firestore.Timestamp.now();

  return db.runTransaction(async (tx) => {
    // Primary lookup by doc ID (codeNormalized is the doc ID)
    let codeSnap = await tx.get(codeRef);
    if (!codeSnap.exists) {
      // Fallback: query by field in case doc was stored under a different ID
      const fallbackQuery = db.collection("student_link_codes")
          .where("codeNormalized", "==", codeNormalized)
          .limit(1);
      const fallbackSnap = await tx.get(fallbackQuery);
      if (!fallbackSnap.empty) {
        codeSnap = fallbackSnap.docs[0];
      } else {
        throw new HttpsError("not-found", "Invalid student link code.");
      }
    }

    const codeData = codeSnap.data();

    if (codeData.status !== "active") {
      throw new HttpsError("failed-precondition", "This student link code is no longer active.");
    }
    if (codeData.expiresAt && codeData.expiresAt.toMillis() <= now.toMillis()) {
      throw new HttpsError("failed-precondition", "This link code has expired.");
    }

    const expectedTargetType = callerRole === "parent" ? "parent" : "school_admin";
    if (codeData.targetType !== expectedTargetType) {
      throw new HttpsError(
          "permission-denied",
          `This link code is not intended for ${callerRole} linking.`,
      );
    }

    const studentUid = codeData.studentUid;
    if (!studentUid) {
      throw new HttpsError("data-loss", "Student link code is malformed — missing studentUid.");
    }

    // Backfill canonical student profile from legacy if needed
    const [userSnap, studentProfileSnap, legacyProfileSnap] = await Promise.all([
      tx.get(db.collection("users").doc(studentUid)),
      tx.get(db.collection("student_profiles").doc(studentUid)),
      tx.get(db.collection("profiles").doc(studentUid)),
    ]);

    if (!studentProfileSnap.exists && legacyProfileSnap.exists) {
      const legacyProfile = legacyProfileSnap.data() || {};
      const legacyName = legacyProfile.name || legacyProfile.full_name || "";
      const nameParts = splitName(legacyName);
      const legacyCountry = legacyProfile.country || "Uganda";
      const legacyLevel = legacyProfile.level || "PLE";
      let normalizedEducation;
      try {
        normalizedEducation = normalizeCountryAndEducationLevel(legacyCountry, legacyLevel);
      } catch (_err) {
        normalizedEducation = {
          countryLabel: legacyCountry,
          educationLevel: legacyLevel,
          educationStage: legacyProfile.stage || null,
        };
      }

      tx.set(db.collection("student_profiles").doc(studentUid), {
        uid: studentUid,
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        preferredName: legacyProfile.preferredName || null,
        dateOfBirth: legacyProfile.dob ? coerceTimestamp(legacyProfile.dob, null) : null,
        gender: legacyProfile.gender || null,
        country: normalizedEducation.countryLabel || null,
        educationLevel: normalizedEducation.educationLevel || null,
        educationStage: normalizedEducation.educationStage || null,
        gradeLevel: legacyProfile.gradeLevel || null,
        candidateNumber: legacyProfile.candidate_number || legacyProfile.candidateNumber || null,
        learningMode: "self",
        loginMode: "email_password",
        onboardingState: "active",
        mustChangePassword: false,
        mustSetPin: false,
        createdAt: now,
        updatedAt: now,
      }, {merge: true});

      if (!userSnap.exists) {
        tx.set(db.collection("users").doc(studentUid), {
          uid: studentUid,
          primaryRole: "student",
          secondaryRoles: [],
          status: "active",
          displayName: legacyName || "Student",
          email: legacyProfile.email || null,
          phone: legacyProfile.phone || null,
          hasEmailLogin: Boolean(legacyProfile.email),
          createdAt: coerceTimestamp(legacyProfile.created_at, now),
          updatedAt: now,
          createdBy: legacyProfile.createdBy || null,
          authProviderSummary: {hasPassword: true, providers: ["password"]},
          profileVersion: 2,
        }, {merge: true});
      }
    } else if (!studentProfileSnap.exists && !legacyProfileSnap.exists && !userSnap.exists) {
      throw new HttpsError("failed-precondition", "Student identity is missing.");
    }

    let linkId;
    let linkRef;

    if (callerRole === "parent") {
      linkId = buildLinkId(callerUid, studentUid);
      linkRef = db.collection("parent_student_links").doc(linkId);
      const linkSnap = await tx.get(linkRef);

      if (!linkSnap.exists) {
        tx.set(linkRef, {
          linkId,
          parentUid: callerUid,
          studentUid,
          relationshipType: "guardian",
          status: "active",
          permissions: {viewProgress: true, manageAccount: true, receiveAlerts: true},
          createdAt: now,
          createdBy: callerUid,
        });
      }

      tx.update(codeSnap.ref, {
        status: "claimed",
        claimedByUid: callerUid,
        claimedAt: now,
        updatedAt: now,
      });

      return {
        ok: true,
        status: linkSnap.exists ? "already_linked" : "linked",
        linkId,
        studentUid,
      };
    }

    // school_admin branch
    const existingSchoolLinks = await tx.get(
        db.collection("school_student_links")
            .where("studentUid", "==", studentUid)
            .where("status", "==", "active"),
    );
    if (!existingSchoolLinks.empty) {
      throw new HttpsError("failed-precondition", "Student is already linked to a school.");
    }

    const schoolId = selectedSchool.schoolId;
    linkId = buildLinkId(schoolId, studentUid);
    linkRef = db.collection("school_student_links").doc(linkId);
    const linkSnap = await tx.get(linkRef);

    if (!linkSnap.exists) {
      tx.set(linkRef, {
        linkId,
        schoolId,
        studentUid,
        status: "active",
        studentNumber: null,
        className: null,
        streamName: null,
        startDate: null,
        endDate: null,
        permissions: {viewProgress: true, manageRoster: true},
        createdAt: now,
        createdBy: callerUid,
      });
    }

    tx.update(codeSnap.ref, {
      status: "claimed",
      claimedByUid: callerUid,
      claimedAt: now,
      updatedAt: now,
    });

    return {
      ok: true,
      status: linkSnap.exists ? "already_linked" : "linked",
      linkId,
      studentUid,
      schoolId,
    };
  });
});

```

- [ ] **Step 2: Verify syntax**
```bash
node --check functions/index.js
```
Expected: no output.

- [ ] **Step 3: Commit**
```bash
git add functions/index.js
git commit -m "feat(linking): add unified claimStudentLinkCode callable"
```

---

## Task 6: Remove legacy callables from backend

**Files:**
- Modify: `functions/index.js`

Comment out (don't delete — safer for rollback) each legacy callable. Prefix the entire `exports.X = onCall(...)` block with `/* LEGACY_REMOVED */` and wrap in `if (false) { ... }`.

A faster approach: replace the export assignment with a no-op that throws "removed":

- [ ] **Step 1: Disable `claimStudentLinkAsParent`, `claimStudentLinkAsSchoolAdmin`, `claimStudentLinkFromInviteCode`**

For each of the three functions, wrap the entire `onCall` body so it becomes a stub. Find the line:
```js
exports.claimStudentLinkAsParent = onCall(async (request) => {
```
And replace the complete function definition (from that line through its closing `});`) with:
```js
// REMOVED: use claimStudentLinkCode instead
exports.claimStudentLinkAsParent = onCall(async (_request) => {
  throw new HttpsError("not-found", "This function has been removed. Use claimStudentLinkCode.");
});
```

Do the same for `claimStudentLinkAsSchoolAdmin` and `claimStudentLinkFromInviteCode`.

- [ ] **Step 2: Disable legacy link_codes / link_requests / linked_accounts callables**

Replace each of the following full function bodies with a one-line stub:
- `exports.generateLinkCode`
- `exports.listActiveLinkCodes`
- `exports.redeemLinkCode`
- `exports.sendLinkRequest`
- `exports.listLinkRequests`
- `exports.respondToLinkRequest`
- `exports.listLinkedAccounts`
- `exports.unlinkAccount`
- `exports.listLinkedStudentsOverview`

Pattern for each:
```js
exports.generateLinkCode = onCall(async (_request) => {
  throw new HttpsError("not-found", "Legacy linking removed.");
});
```

- [ ] **Step 3: Remove `createStudentInviteCodeRecord` helper**

Find the full `async function createStudentInviteCodeRecord(...)` definition (approx lines 559–626) and delete it entirely (it is no longer called anywhere).

- [ ] **Step 4: Verify syntax**
```bash
node --check functions/index.js
```
Expected: no output.

- [ ] **Step 5: Commit**
```bash
git add functions/index.js
git commit -m "feat(linking): stub out all legacy link callables, remove createStudentInviteCodeRecord"
```

---

## Task 7: Add `claimStudentLinkCodeFirebase` to frontend identity.ts, remove old wrappers

**Files:**
- Modify: `src/integrations/firebase/identity.ts`

- [ ] **Step 1: Open `src/integrations/firebase/identity.ts`**

Find the three functions (approx lines 261–276):
```ts
export async function claimStudentLinkAsParentFirebase(payload: { code: string }) {
  const fn = call<{ code: string }, ClaimStudentLinkResponse>('claimStudentLinkAsParent');
  return (await fn(payload)).data;
}

export async function claimStudentLinkAsSchoolAdminFirebase(payload: { code: string }) {
  const fn = call<{ code: string }, ClaimStudentLinkResponse>('claimStudentLinkAsSchoolAdmin');
  return (await fn(payload)).data;
}

export async function claimStudentLinkFromInviteCodeFirebase(payload: { code: string }) {
  const fn = call<{ code: string }, { ok: boolean; targetType: 'parent' | 'school_admin'; status: string; linkId: string }>(
    'claimStudentLinkFromInviteCode'
  );
  return (await fn(payload)).data;
}
```

Replace all three with the single new function:
```ts
export async function claimStudentLinkCodeFirebase(payload: { code: string }) {
  const fn = call<{ code: string }, ClaimStudentLinkResponse>('claimStudentLinkCode');
  return (await fn(payload)).data;
}
```

- [ ] **Step 2: Verify TypeScript compiles**
```bash
npx tsc --noEmit
```
Expected: errors only from components that still import the removed functions — note them, fix in next tasks.

- [ ] **Step 3: Commit what changed in identity.ts only**
```bash
git add src/integrations/firebase/identity.ts
git commit -m "feat(linking): add claimStudentLinkCodeFirebase, remove three old claim wrappers"
```

---

## Task 8: Gut `linking.ts` — stub every export so import sites don't break yet

**Files:**
- Modify: `src/integrations/firebase/linking.ts`

Rather than deleting the file (which would cause many build errors at once), replace its entire content with stubs that throw at runtime. This lets us tackle each import site one at a time.

- [ ] **Step 1: Replace the entire content of `linking.ts`**

```ts
/**
 * @deprecated All legacy linking functions have been removed.
 * Use functions in identity.ts (claimStudentLinkCodeFirebase) instead.
 * This file should be fully deleted once all import sites are cleaned up.
 */

export type FirebaseLinkCode = never;
export type FirebaseLinkRequest = never;
export type FirebaseLinkedAccount = never;
export type FirebaseLinkedStudentOverview = never;
export type SearchLinkTargetResult = never;

function removed(name: string): never {
  throw new Error(`[linking.ts] ${name} has been removed. Use claimStudentLinkCodeFirebase from identity.ts.`);
}

export const listActiveLinkCodesFirebase = () => removed('listActiveLinkCodesFirebase');
export const generateLinkCodeFirebase = () => removed('generateLinkCodeFirebase');
export const redeemLinkCodeFirebase = () => removed('redeemLinkCodeFirebase');
export const searchLinkTargetFirebase = () => removed('searchLinkTargetFirebase');
export const sendLinkRequestFirebase = () => removed('sendLinkRequestFirebase');
export const listLinkRequestsFirebase = () => removed('listLinkRequestsFirebase');
export const respondToLinkRequestFirebase = () => removed('respondToLinkRequestFirebase');
export const listLinkedAccountsFirebase = () => removed('listLinkedAccountsFirebase');
export const unlinkAccountFirebase = () => removed('unlinkAccountFirebase');
export const listLinkedStudentsOverviewFirebase = () => removed('listLinkedStudentsOverviewFirebase');
```

- [ ] **Step 2: Verify TypeScript compiles (ignoring remaining component errors)**
```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -40
```
Expected: errors only from components importing these — no errors in `linking.ts` itself.

- [ ] **Step 3: Commit**
```bash
git add src/integrations/firebase/linking.ts
git commit -m "feat(linking): stub out linking.ts — all legacy exports throw at runtime"
```

---

## Task 9: Update `ParentDashboardContent.tsx` — switch to `claimStudentLinkCodeFirebase`

**Files:**
- Modify: `src/pages/dashboards/ParentDashboardContent.tsx`

- [ ] **Step 1: Update the import**

Find:
```ts
import {
  createStudentAsParentFirebase,
  claimStudentLinkAsParentFirebase,
  generateStudentInviteAsParentFirebase,
  listStudentInvitesAsParentFirebase,
  listManagedStudentsAsParentFirebase,
  ...
} from '@/integrations/firebase/identity';
```

Replace `claimStudentLinkAsParentFirebase` with `claimStudentLinkCodeFirebase`:
```ts
import {
  createStudentAsParentFirebase,
  claimStudentLinkCodeFirebase,
  generateStudentInviteAsParentFirebase,
  listStudentInvitesAsParentFirebase,
  listManagedStudentsAsParentFirebase,
  type ManagedStudentListItem,
  type ManagedStudentProvisioningResult,
  type StudentInviteCodeItem,
} from '@/integrations/firebase/identity';
```

- [ ] **Step 2: Update the `handleClaimStudent` function** (~line 87)

Find:
```ts
  const handleClaimStudent = async (code: string) => {
    try {
      setLinkSubmitting(true);
      const result = await claimStudentLinkAsParentFirebase({ code });
```

Replace `claimStudentLinkAsParentFirebase` with `claimStudentLinkCodeFirebase`:
```ts
  const handleClaimStudent = async (code: string) => {
    try {
      setLinkSubmitting(true);
      const result = await claimStudentLinkCodeFirebase({ code });
```

- [ ] **Step 3: Verify TypeScript compiles for this file**
```bash
npx tsc --noEmit 2>&1 | grep "ParentDashboardContent"
```
Expected: no lines.

- [ ] **Step 4: Commit**
```bash
git add src/pages/dashboards/ParentDashboardContent.tsx
git commit -m "feat(linking): ParentDashboardContent uses claimStudentLinkCodeFirebase"
```

---

## Task 10: Update `SchoolAdminDashboard.tsx` — switch to `claimStudentLinkCodeFirebase`

**Files:**
- Modify: `src/pages/dashboards/SchoolAdminDashboard.tsx`

- [ ] **Step 1: Update the import**

Find the import of `claimStudentLinkAsSchoolAdminFirebase` from `@/integrations/firebase/identity` (approx line 17) and replace it with `claimStudentLinkCodeFirebase`.

- [ ] **Step 2: Update the call site** (~line 179)

Find:
```ts
      const result = await claimStudentLinkAsSchoolAdminFirebase({ code });
```

Replace with:
```ts
      const result = await claimStudentLinkCodeFirebase({ code });
```

- [ ] **Step 3: Verify**
```bash
npx tsc --noEmit 2>&1 | grep "SchoolAdminDashboard"
```
Expected: no lines.

- [ ] **Step 4: Commit**
```bash
git add src/pages/dashboards/SchoolAdminDashboard.tsx
git commit -m "feat(linking): SchoolAdminDashboard uses claimStudentLinkCodeFirebase"
```

---

## Task 11: Fix `StudentLinkCodesPanel.tsx` — remove invite-claim section

Students generate codes; they do not claim codes. Remove the UI that lets students enter an invite code. Keep only the generate-and-display flow.

**Files:**
- Modify: `src/components/identity/StudentLinkCodesPanel.tsx`

- [ ] **Step 1: Remove the `claimStudentLinkFromInviteCodeFirebase` import**

Find (line ~8):
```ts
import {
  claimStudentLinkFromInviteCodeFirebase,
  generateStudentLinkCodeFirebase,
  getStudentLinkSummaryFirebase,
  listStudentLinkCodesFirebase,
  type StudentLinkCodeItem,
} from '@/integrations/firebase/identity';
```

Remove `claimStudentLinkFromInviteCodeFirebase`:
```ts
import {
  generateStudentLinkCodeFirebase,
  getStudentLinkSummaryFirebase,
  listStudentLinkCodesFirebase,
  type StudentLinkCodeItem,
} from '@/integrations/firebase/identity';
```

- [ ] **Step 2: Remove invite-claim state and handler**

Remove these state declarations:
```ts
  const [claiming, setClaiming] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
```

Remove the `handleClaimInvite` (or equivalent) function that calls `claimStudentLinkFromInviteCodeFirebase`.

- [ ] **Step 3: Remove invite-claim JSX**

Find and delete the JSX block that renders the "Enter invite code" input and "Link" button (the section that calls `handleClaimInvite`). Keep only the code-generation and code-listing UI.

- [ ] **Step 4: Verify TypeScript compiles for this file**
```bash
npx tsc --noEmit 2>&1 | grep "StudentLinkCodesPanel"
```
Expected: no lines.

- [ ] **Step 5: Commit**
```bash
git add src/components/identity/StudentLinkCodesPanel.tsx
git commit -m "feat(linking): remove invite-claim section from StudentLinkCodesPanel"
```

---

## Task 12: Remove `listLinkedStudentsOverviewFirebase` from dashboard pages

These three files import from `linking.ts` and call the legacy overview function. Remove the call and replace with a static empty state or remove the dead component entirely.

**Files:**
- Modify: `src/pages/dashboards/ParentDashboard.tsx`
- Modify: `src/pages/dashboards/SchoolDashboard.tsx`
- Modify: `src/pages/dashboards/SchoolDashboardContent.tsx`

- [ ] **Step 1: Fix `ParentDashboard.tsx`**

Read the file. Find and remove:
```ts
import { listLinkedStudentsOverviewFirebase } from '@/integrations/firebase/linking';
```
And find the call site (~line 48):
```ts
        const response = await listLinkedStudentsOverviewFirebase();
```
Replace the entire data-fetching block that uses `listLinkedStudentsOverviewFirebase` with a no-op or an empty array assignment:
```ts
        // listLinkedStudentsOverview removed — data now comes from parent_student_links via managed students
        const items: never[] = [];
```
(Adjust based on what variable the result is stored into.)

- [ ] **Step 2: Fix `SchoolDashboard.tsx`**

Same pattern: remove the import line and replace the `listLinkedStudentsOverviewFirebase()` call with `const items: never[] = [];`.

- [ ] **Step 3: Fix `SchoolDashboardContent.tsx`**

Same pattern.

- [ ] **Step 4: Verify**
```bash
npx tsc --noEmit 2>&1 | grep -E "ParentDashboard|SchoolDashboard"
```
Expected: no lines.

- [ ] **Step 5: Commit**
```bash
git add src/pages/dashboards/ParentDashboard.tsx src/pages/dashboards/SchoolDashboard.tsx src/pages/dashboards/SchoolDashboardContent.tsx
git commit -m "feat(linking): remove listLinkedStudentsOverview calls from dashboard pages"
```

---

## Task 13: Clean up remaining `linking.ts` import sites

**Files:**
- `src/components/settings/AccountLinkingSection.tsx`
- `src/components/dashboard/LinkRequestsCard.tsx`
- `src/components/dashboard/LinkedAccountsCard.tsx`
- `src/components/modals/AddStudentDialog.tsx`
- `src/components/modals/SendLinkRequestDialog.tsx`
- `src/components/modals/LinkChildDialog.tsx`
- `src/components/modals/RedeemLinkCodeDialog.tsx`
- `src/components/modals/GenerateLinkCodeDialog.tsx`

- [ ] **Step 1: For each file, read it and determine what it renders**

Each component uses one or more legacy functions. The stubs in `linking.ts` already prevent TypeScript errors. Now determine whether each component:
- (a) Can be entirely deleted (e.g., `RedeemLinkCodeDialog` — redeemLinkCode is gone, dialog serves no purpose)
- (b) Must be preserved but with the legacy call removed (e.g., `AccountLinkingSection` — still used for unlinking via a different flow)

- [ ] **Step 2: For modals serving only legacy flows, remove the file or replace the body with a deprecation note**

For `RedeemLinkCodeDialog.tsx`, `GenerateLinkCodeDialog.tsx`, `SendLinkRequestDialog.tsx`, `LinkChildDialog.tsx` — check if they are referenced in any parent component. If not referenced, delete them. If referenced, replace body with:
```tsx
export default function LegacyDialog() {
  return null; // Legacy linking flow removed
}
```

- [ ] **Step 3: For components that are still used, remove only the linking.ts import and the dead code**

`AccountLinkingSection.tsx` and the `LinkedAccountsCard.tsx` / `LinkRequestsCard.tsx` — read each file, remove the `linking.ts` import line, remove any state/handlers that call removed functions, and leave any remaining UI in place.

- [ ] **Step 4: Verify no linking.ts imports remain**
```bash
npx tsc --noEmit 2>&1 | grep "linking" | head -20
grep -r "from '@/integrations/firebase/linking'" src/ --include="*.ts" --include="*.tsx"
```
Expected: zero results from the grep (all import sites removed).

- [ ] **Step 5: Commit**
```bash
git add src/components/
git commit -m "feat(linking): remove all linking.ts import sites"
```

---

## Task 14: Add deprecation logging in `AuthContext.tsx`

The spec says: log when fallback to `user_roles` or `profiles` is used — do NOT silently rely on legacy.

**Files:**
- Modify: `src/contexts/AuthContext.tsx`

- [ ] **Step 1: Find the role resolution block** (approx lines 186–196)

```ts
    if (!resolvedRole && tokenRole) {
      resolvedRole = tokenRole;
    }
    if (!resolvedRole && isAppRole(canonicalUserData?.primaryRole)) {
      resolvedRole = canonicalUserData.primaryRole;
    }
    if (!resolvedRole) {
      const roleValue = roleSnap?.data()?.role;
      resolvedRole = isAppRole(roleValue) ? roleValue : null;
    }
```

Replace with:
```ts
    if (!resolvedRole && tokenRole) {
      resolvedRole = tokenRole;
    }
    if (!resolvedRole && isAppRole(canonicalUserData?.primaryRole)) {
      resolvedRole = canonicalUserData.primaryRole;
    }
    if (!resolvedRole) {
      const roleValue = roleSnap?.data()?.role;
      if (isAppRole(roleValue)) {
        resolvedRole = roleValue;
        console.warn(
          '[AuthContext] DEPRECATED: role resolved from legacy user_roles collection.',
          { uid: userId, legacyRole: roleValue },
        );
      }
    }
```

- [ ] **Step 2: Find where `profiles` collection is used as a fallback for name/email** (~line 215)

After the `setProfile({...})` call, add a log if `profileData` (from `profiles`) was used but `canonicalUserData` was null:
```ts
    if (profileData && !canonicalUserData) {
      console.warn(
        '[AuthContext] DEPRECATED: profile data resolved from legacy profiles collection.',
        { uid: userId },
      );
    }
```

- [ ] **Step 3: Verify TypeScript compiles**
```bash
npx tsc --noEmit 2>&1 | grep "AuthContext"
```
Expected: no lines.

- [ ] **Step 4: Commit**
```bash
git add src/contexts/AuthContext.tsx
git commit -m "feat(linking): add deprecation warnings for legacy role/profile fallbacks in AuthContext"
```

---

## Task 15: Update Firestore rules for `student_link_codes`

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Find the current `student_link_codes` rule block** (if it exists)

Run:
```bash
grep -n "student_link_codes" firestore.rules
```

- [ ] **Step 2: Add or replace the rule**

Find the appropriate location in `firestore.rules` (after the `student_profiles` rules or in the linking section) and add:

```
    // Canonical student link codes — only one collection used
    match /student_link_codes/{codeId} {
      // Students can read their own generated codes
      allow read: if isAuthenticated() && (
        resource.data.studentUid == request.auth.uid ||
        resource.data.issuerUid == request.auth.uid
      );
      // All writes go through Cloud Functions (Admin SDK) — no direct client writes
      allow write: if false;
    }
```

If a `student_link_codes` rule already exists, replace it with the above.

- [ ] **Step 3: Commit**
```bash
git add firestore.rules
git commit -m "feat(linking): update Firestore rules for student_link_codes"
```

---

## Task 16: Full validation

- [ ] **Step 1: TypeScript — no errors**
```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 2: Frontend build — clean**
```bash
npm run build
```
Expected: successful build, zero errors. Warnings are acceptable.

- [ ] **Step 3: Backend syntax check**
```bash
node --check functions/index.js
```
Expected: no output.

- [ ] **Step 4: Confirm one linking collection**
```bash
grep -n "student_link_invites\|link_codes\|link_requests\|linked_accounts" functions/index.js | grep -v "LEGACY_REMOVED\|removed\|stub\|throw"
```
Expected: zero active references (only commented or stub lines).

- [ ] **Step 5: Confirm one claim callable**
```bash
grep -n "exports\.claim" functions/index.js
```
Expected: only `exports.claimStudentLinkCode` is active; the other three are stubs that throw.

- [ ] **Step 6: Confirm no live imports of `linking.ts`**
```bash
grep -r "from '@/integrations/firebase/linking'" src/ --include="*.ts" --include="*.tsx"
```
Expected: zero results.

- [ ] **Step 7: Assessment — deployment risk**

| Area | Risk | Reason |
|---|---|---|
| `student_link_codes` new fields | Low | Existing docs still work; new fields default via `\|\|` |
| Legacy callable stubs | Low | Return HttpsError — any remaining callers get a clear error |
| `student_link_invites` no longer written | Medium | Old active invite codes already in that collection expire naturally; no new ones will be created |
| `linking.ts` stubs | Low | All import sites removed in Tasks 12–13; stubs are a safety net |
| `listLinkedStudentsOverview` → empty array | Medium | Pages that showed overview data will show empty — acceptable during transition |

Recommended: deploy functions first, then frontend. Monitor Cloud Function logs for any `not-found` errors from the legacy stubs (indicating a client still calling old callables).

- [ ] **Step 8: Final commit and push**
```bash
git log --oneline main..HEAD
```
Review all commits in this branch, then push when satisfied.

---

## Self-Review Checklist

**Spec coverage:**

| Requirement | Task |
|---|---|
| `student_link_codes` only collection | Tasks 1–4 |
| Full schema (issuerUid, issuerRole, etc.) | Task 1 |
| Student generates → issuerRole=student | Task 2 |
| Parent generates → issuerRole=parent | Task 3 |
| School generates → issuerRole=school_admin | Task 3 |
| Single `claimStudentLinkCode` callable | Task 5 |
| Remove `claimStudentLinkAsParent` | Task 6 |
| Remove `claimStudentLinkAsSchoolAdmin` | Task 6 |
| Remove `claimStudentLinkFromInviteCode` | Task 6 |
| Remove link_codes backend | Task 6 |
| Remove link_requests backend | Task 6 |
| Remove linked_accounts backend | Task 6 |
| Remove `linking.ts` frontend | Task 8 |
| Remove `listLinkedStudentsOverviewFirebase` | Task 12 |
| Parent dashboard "Link a Child" uses new callable | Task 9 |
| Student dashboard shows codes with status/expiry/copy | Task 11 (panel preserved, invite-claim removed) |
| AuthContext deprecation logging | Task 14 |
| Firestore rules | Task 15 |
| `npx tsc --noEmit` passes | Task 16 |
| `npm run build` passes | Task 16 |
| `node --check` passes | Task 16 |
| Deployment risk assessment | Task 16 |
