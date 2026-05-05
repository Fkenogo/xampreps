const {setGlobalOptions} = require("firebase-functions/v2");
const {onRequest, onCall, HttpsError} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({maxInstances: 10});

// ============================================================================
// V2 EXAM ENGINE FUNCTIONS
// Import and export V2 marking engine functions
// ============================================================================
const { createV2MarkingFunctions } = require("./v2/markingEngine");
const v2Functions = createV2MarkingFunctions(db);

// Export V2 functions with v2_ prefix to avoid naming conflicts
exports.v2AutoMarkSubmission = v2Functions.autoMarkSubmission;
exports.v2GetReviewQueue = v2Functions.getReviewQueue;
exports.v2ListTeacherReviewQueue = v2Functions.listTeacherReviewQueue;
exports.v2SubmitTeacherReview = v2Functions.submitTeacherReview;
exports.v2AggregateAttemptScores = v2Functions.aggregateAttemptScores;
exports.v2CreateModelAnswerVersion = v2Functions.createModelAnswerVersion;
exports.v2ApproveModelAnswerVersion = v2Functions.approveModelAnswerVersion;
exports.v2CreateTeacherAnswerSuggestion = v2Functions.createTeacherAnswerSuggestion;
exports.v2ListAdminAnswerSuggestions = v2Functions.listAdminAnswerSuggestions;
exports.v2AdminResolveAnswerSuggestion = v2Functions.adminResolveAnswerSuggestion;

exports.healthCheck = onRequest((req, res) => {
  logger.info("healthCheck called");
  res.status(200).json({
    ok: true,
    service: "functions",
    timestamp: new Date().toISOString(),
  });
});

exports.whoAmI = onCall((request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  return {
    uid: request.auth.uid,
    token: request.auth.token || {},
  };
});

function makeLinkCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const ACCESS_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TEMP_SECRET_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz";
const RESET_CONFIRM_TOKEN = "RESET_IDENTITY_SYSTEM";
const INTERNAL_STUDENT_EMAIL_DOMAIN = "students.xampreps.local";
const STUDENT_LINK_CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EDUCATION_LEVELS_BY_COUNTRY = Object.freeze({
  UGANDA: ["PLE", "UCE", "UACE"],
  KENYA: ["KCPE", "KPSEA", "KJSEA", "KCSE"],
  TANZANIA: ["PSLE", "CSEE", "ACSEE"],
  RWANDA: ["PLE", "O_LEVEL", "A_LEVEL"],
  BURUNDI: ["CEP", "CYCLE_FONDAMENTAL", "EXAMEN_ETAT"],
});
const STAGE_BY_COUNTRY_AND_LEVEL = Object.freeze({
  UGANDA: {PLE: "PRIMARY", UCE: "LOWER_SECONDARY", UACE: "UPPER_SECONDARY"},
  KENYA: {KCPE: "PRIMARY", KPSEA: "PRIMARY", KJSEA: "LOWER_SECONDARY", KCSE: "UPPER_SECONDARY"},
  TANZANIA: {PSLE: "PRIMARY", CSEE: "LOWER_SECONDARY", ACSEE: "UPPER_SECONDARY"},
  RWANDA: {PLE: "PRIMARY", O_LEVEL: "LOWER_SECONDARY", A_LEVEL: "UPPER_SECONDARY"},
  BURUNDI: {CEP: "PRIMARY", CYCLE_FONDAMENTAL: "LOWER_SECONDARY", EXAMEN_ETAT: "UPPER_SECONDARY"},
});
const COUNTRY_LABELS = Object.freeze({
  UGANDA: "Uganda",
  KENYA: "Kenya",
  TANZANIA: "Tanzania",
  RWANDA: "Rwanda",
  BURUNDI: "Burundi",
});

function makeReadableCode(length = 8, alphabet = ACCESS_CODE_CHARS) {
  let code = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
}

function normalizeCountryValue(country) {
  if (typeof country !== "string") return null;
  const trimmed = country.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (COUNTRY_LABELS[upper]) {
    return upper;
  }
  const matched = Object.entries(COUNTRY_LABELS)
      .find(([, label]) => label.toUpperCase() === upper);
  return matched ? matched[0] : null;
}

function normalizeEducationLevelValue(level) {
  if (typeof level !== "string") return null;
  const normalized = level.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return normalized || null;
}

function normalizeCountryAndEducationLevel(country, educationLevel) {
  const countryCode = normalizeCountryValue(country);
  const levelCode = normalizeEducationLevelValue(educationLevel);

  if (!countryCode) {
    throw new HttpsError("invalid-argument", "country must be one of: Uganda, Kenya, Tanzania, Rwanda, Burundi.");
  }
  if (!levelCode) {
    throw new HttpsError("invalid-argument", "educationLevel is required.");
  }

  const stage = STAGE_BY_COUNTRY_AND_LEVEL[countryCode]?.[levelCode];
  if (!stage) {
    throw new HttpsError("invalid-argument", `educationLevel ${educationLevel} is not valid for ${COUNTRY_LABELS[countryCode]}.`);
  }

  return {
    countryCode,
    countryLabel: COUNTRY_LABELS[countryCode],
    educationLevel: levelCode,
    educationStage: stage,
  };
}

function makeAccessCode() {
  const raw = makeReadableCode(8);
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

function normalizeAccessCode(code) {
  return String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function makeTemporarySecret(length = 10) {
  return makeReadableCode(length, TEMP_SECRET_CHARS);
}

function hashSecret(secret, salt = crypto.randomBytes(16).toString("hex")) {
  const derived = crypto.scryptSync(secret, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

function verifySecretHash(secret, storedHash) {
  if (!secret || !storedHash || typeof storedHash !== "string") {
    return false;
  }
  const [algorithm, salt, derived] = storedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !derived) {
    return false;
  }
  const candidate = crypto.scryptSync(secret, salt, 64).toString("hex");
  const left = Buffer.from(candidate, "hex");
  const right = Buffer.from(derived, "hex");
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function makeInternalStudentEmail(accessCodeNormalized) {
  const suffix = crypto.randomBytes(4).toString("hex");
  return `student.${accessCodeNormalized.toLowerCase()}.${suffix}@${INTERNAL_STUDENT_EMAIL_DOMAIN}`;
}

function makeSystemPassword() {
  return crypto.randomBytes(24).toString("base64url");
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function listAllAuthUsers() {
  const users = [];
  let pageToken;

  do {
    const response = await admin.auth().listUsers(1000, pageToken);
    users.push(...response.users);
    pageToken = response.pageToken;
  } while (pageToken);

  return users;
}

async function getResolvedRoleForUser(userId, authToken, roleMaps = null) {
  if (authToken && authToken.uid === userId && authToken.role) {
    return authToken.role;
  }

  if (roleMaps) {
    if (roleMaps.canonicalRoles[userId]) {
      return roleMaps.canonicalRoles[userId];
    }
  }

  const canonicalUserSnap = await db.collection("users").doc(userId).get();
  if (canonicalUserSnap.exists && canonicalUserSnap.data().primaryRole) {
    return canonicalUserSnap.data().primaryRole;
  }

  return null;
}

async function loadRoleMaps() {
  const [canonicalUsersSnap, legacyRolesSnap] = await Promise.all([
    db.collection("users").get(),
    db.collection("user_roles").get(),
  ]);

  const canonicalRoles = {};
  canonicalUsersSnap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    if (typeof data.primaryRole === "string") {
      canonicalRoles[docSnap.id] = data.primaryRole;
    }
  });

  const legacyRoles = {};
  legacyRolesSnap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    if (typeof data.role === "string") {
      legacyRoles[docSnap.id] = data.role;
      if (typeof data.userId === "string") legacyRoles[data.userId] = data.role;
      if (typeof data.user_id === "string") legacyRoles[data.user_id] = data.role;
    }
  });

  return {canonicalRoles, legacyRoles};
}

async function getRoleForUser(userId, authToken) {
  return getResolvedRoleForUser(userId, authToken);
}

function buildLinkId(parentOrSchoolId, studentId) {
  return `${parentOrSchoolId}_${studentId}`;
}

function buildTeacherSchoolLinkId(teacherUid, schoolId) {
  return `${teacherUid}_${schoolId}`;
}

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function slugifySchoolName(name) {
  return (name || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
}

function generateSchoolId(name) {
  const base = slugifySchoolName(name) || "school";
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

async function assertAdminRole(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const role = request.auth.token && request.auth.token.role ?
    request.auth.token.role :
    await getRoleForUser(request.auth.uid, null);
  if (role !== "admin" && role !== "super_admin") {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  return request.auth.uid;
}

async function assertSuperAdminRole(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const role = request.auth.token && request.auth.token.role ?
    request.auth.token.role :
    await getResolvedRoleForUser(request.auth.uid, null);
  if (role !== "super_admin") {
    throw new HttpsError("permission-denied", "Super admin access required.");
  }
  return request.auth.uid;
}

async function assertManagedStudentCreatorRole(request, allowedRole) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const role = request.auth.token && request.auth.token.role ?
    request.auth.token.role :
    await getResolvedRoleForUser(request.auth.uid, null);
  if (role !== allowedRole) {
    throw new HttpsError("permission-denied", `${allowedRole} access required.`);
  }
  return request.auth.uid;
}

async function assertStudentRole(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const role = request.auth.token && request.auth.token.role ?
    request.auth.token.role :
    await getResolvedRoleForUser(request.auth.uid, null);
  if (role !== "student") {
    throw new HttpsError("permission-denied", "Student access required.");
  }
  const uid = request.auth.uid;
  if (!uid || typeof uid !== "string") {
    throw new HttpsError("unauthenticated", "Student identity is missing.");
  }
  return uid;
}

function coerceOptionalString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function coerceStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
      .map((entry) => typeof entry === "string" ? entry.trim() : "")
      .filter(Boolean);
}

function coerceTimestamp(value, fallback) {
  if (!value) return fallback;
  if (value instanceof admin.firestore.Timestamp) return value;
  if (value && typeof value.toDate === "function") {
    return admin.firestore.Timestamp.fromDate(value.toDate());
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return admin.firestore.Timestamp.fromDate(value);
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return admin.firestore.Timestamp.fromDate(parsed);
    }
  }
  return fallback;
}

function splitDisplayName(value) {
  const parts = String(value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ") || "",
  };
}

function buildAuthProviderSummary(authUser) {
  const providers = authUser.providerData
      .map((provider) => provider.providerId)
      .filter(Boolean);
  return {
    hasPassword: providers.includes("password") || Boolean(authUser.email),
    providers,
  };
}

async function deleteDocRefs(docRefs) {
  for (const chunk of chunkArray(docRefs, 400)) {
    const batch = db.batch();
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

async function resetCollection(collectionName, dryRun) {
  const snapshot = await db.collection(collectionName).get();
  if (!dryRun && snapshot.size > 0) {
    await deleteDocRefs(snapshot.docs.map((docSnap) => docSnap.ref));
  }
  return {
    collection: collectionName,
    matched: snapshot.size,
    deleted: dryRun ? 0 : snapshot.size,
  };
}

async function pruneCollectionByDocId(collectionName, keepDocIds, dryRun) {
  const snapshot = await db.collection(collectionName).get();
  const docsToDelete = snapshot.docs.filter((docSnap) => !keepDocIds.has(docSnap.id));
  if (!dryRun && docsToDelete.length > 0) {
    await deleteDocRefs(docsToDelete.map((docSnap) => docSnap.ref));
  }
  return {
    collection: collectionName,
    matched: snapshot.size,
    preserved: snapshot.size - docsToDelete.length,
    deleted: dryRun ? 0 : docsToDelete.length,
    wouldDelete: dryRun ? docsToDelete.length : 0,
  };
}

async function createCanonicalUsersForPreservedAdmins(preservedAuthUsers, roleMaps) {
  if (preservedAuthUsers.length === 0) return [];

  const now = admin.firestore.Timestamp.now();
  const profileRefs = preservedAuthUsers.map((authUser) => db.collection("profiles").doc(authUser.uid));
  const profileSnaps = await db.getAll(...profileRefs);
  const profileMap = new Map(profileSnaps.filter((snap) => snap.exists).map((snap) => [snap.id, snap.data()]));

  const batch = db.batch();
  const preservedSummaries = [];

  preservedAuthUsers.forEach((authUser) => {
    const legacyProfile = profileMap.get(authUser.uid) || {};
    const role = authUser.customClaims?.role ||
      roleMaps.canonicalRoles[authUser.uid] ||
      roleMaps.legacyRoles[authUser.uid] ||
      "admin";
    const creationTime = authUser.metadata?.creationTime ?
      admin.firestore.Timestamp.fromDate(new Date(authUser.metadata.creationTime)) :
      now;
    const docData = {
      uid: authUser.uid,
      primaryRole: role,
      secondaryRoles: [],
      status: "active",
      displayName: legacyProfile.name ||
        authUser.displayName ||
        authUser.email ||
        "Admin User",
      email: legacyProfile.email || authUser.email || null,
      phone: legacyProfile.phone || null,
      hasEmailLogin: Boolean(authUser.email),
      createdAt: coerceTimestamp(legacyProfile.createdAt || legacyProfile.created_at, creationTime),
      updatedAt: now,
      createdBy: legacyProfile.createdBy || legacyProfile.created_by || null,
      authProviderSummary: buildAuthProviderSummary(authUser),
      profileVersion: 2,
    };

    batch.set(db.collection("users").doc(authUser.uid), docData, {merge: true});
    preservedSummaries.push({
      uid: authUser.uid,
      email: authUser.email || null,
      role,
    });
  });

  await batch.commit();
  return preservedSummaries;
}

async function createUniqueAccessCode() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const accessCode = makeAccessCode();
    const accessCodeNormalized = normalizeAccessCode(accessCode);
    const aliasRef = db.collection("auth_login_aliases").doc(accessCodeNormalized);
    const aliasSnap = await aliasRef.get();
    if (!aliasSnap.exists) {
      return {accessCode, accessCodeNormalized};
    }
  }
  throw new HttpsError("resource-exhausted", "Failed to generate a unique student access code.");
}

async function createStudentLinkCodeRecord({
  studentUid,
  studentDisplayName,
  studentCountry,
  studentEducationLevel,
  issuerUid,
  issuerRole,
  targetType,
  schoolId = null,
}) {
  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + STUDENT_LINK_CODE_TTL_MS);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = makeAccessCode();
    const codeNormalized = normalizeAccessCode(code);
    const codeRef = db.collection("student_link_codes").doc(codeNormalized);

    try {
      await db.runTransaction(async (tx) => {
        const existingSnap = await tx.get(codeRef);
        if (existingSnap.exists) {
          throw new HttpsError("already-exists", "Generated link code already exists.");
        }

        let activeQuery = db.collection("student_link_codes")
            .where("targetType", "==", targetType)
            .where("status", "==", "active");
        if (studentUid) {
          activeQuery = activeQuery.where("studentUid", "==", studentUid);
        } else if (issuerUid && issuerRole) {
          activeQuery = activeQuery
              .where("issuerUid", "==", issuerUid)
              .where("issuerRole", "==", issuerRole);
        }
        const activeSnap = await tx.get(activeQuery);

        activeSnap.docs.forEach((docSnap) => {
          tx.update(docSnap.ref, {
            status: "revoked",
            updatedAt: now,
          });
        });

        tx.set(codeRef, {
          codeId: codeNormalized,
          code,
          codeNormalized,
          studentUid: studentUid || null,
          studentDisplayName: studentDisplayName || null,
          studentCountry: studentCountry || null,
          studentEducationLevel: studentEducationLevel || null,
          issuerUid: issuerUid || null,
          issuerRole: issuerRole || null,
          targetType,
          schoolId: schoolId || null,
          status: "active",
          expiresAt,
          claimedByUid: null,
          claimedAt: null,
          createdAt: now,
          updatedAt: now,
        });
      });

      return {
        codeId: codeNormalized,
        code,
        codeNormalized,
        status: "active",
        expiresAt,
      };
    } catch (error) {
      if (error instanceof HttpsError && error.code === "already-exists") {
        continue;
      }
      throw error;
    }
  }

  throw new HttpsError("resource-exhausted", "Failed to generate a unique student link code.");
}

function splitName(displayName) {
  if (!displayName) {
    return {firstName: "", lastName: ""};
  }
  const parts = String(displayName).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {firstName: "", lastName: ""};
  if (parts.length === 1) return {firstName: parts[0], lastName: ""};
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

async function resolveStudentIdentityByUid(uid) {
  const [userSnap, studentProfileSnap] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("student_profiles").doc(uid).get(),
  ]);

  if (userSnap.exists && studentProfileSnap.exists) {
    const studentProfile = studentProfileSnap.data();
    const canonicalUser = userSnap.data();
    return {
      uid,
      displayName: canonicalUser.displayName ||
        `${studentProfile.firstName || ""} ${studentProfile.lastName || ""}`.trim() ||
        "Student",
      firstName: studentProfile.firstName || "",
      lastName: studentProfile.lastName || "",
      country: studentProfile.country || null,
      educationLevel: studentProfile.educationLevel || null,
      educationStage: studentProfile.educationStage || null,
      source: "canonical_student_profile",
      canonicalUserExists: true,
      legacyProfileExists: false,
    };
  }

  return {
    uid,
    source: "missing",
    canonicalUserExists: userSnap.exists,
    legacyProfileExists: false,
  };
}

function parseStudentProvisioningInput(data) {
  const firstName = coerceOptionalString(data.firstName);
  const lastName = coerceOptionalString(data.lastName);
  const preferredName = coerceOptionalString(data.preferredName);
  const country = coerceOptionalString(data.country);
  const educationLevel = coerceOptionalString(data.educationLevel);
  const gradeLevel = coerceOptionalString(data.gradeLevel);
  const candidateNumber = coerceOptionalString(data.candidateNumber);
  const gender = coerceOptionalString(data.gender);
  const relationshipType = coerceOptionalString(data.relationshipType) || "guardian";
  const schoolId = coerceOptionalString(data.schoolId);
  const studentNumber = coerceOptionalString(data.studentNumber);
  const className = coerceOptionalString(data.className);
  const streamName = coerceOptionalString(data.streamName);
  const subjectTags = coerceStringArray(data.subjectTags);

  if (!firstName) {
    throw new HttpsError("invalid-argument", "firstName is required.");
  }
  if (!lastName) {
    throw new HttpsError("invalid-argument", "lastName is required.");
  }
  const normalizedEducation = normalizeCountryAndEducationLevel(country, educationLevel);

  let dateOfBirth = null;
  if (data.dateOfBirth !== undefined && data.dateOfBirth !== null && String(data.dateOfBirth).trim() !== "") {
    const parsed = new Date(String(data.dateOfBirth));
    if (Number.isNaN(parsed.getTime())) {
      throw new HttpsError("invalid-argument", "dateOfBirth must be a valid date.");
    }
    dateOfBirth = admin.firestore.Timestamp.fromDate(parsed);
  }

  return {
    firstName,
    lastName,
    preferredName,
    country: normalizedEducation.countryLabel,
    educationLevel: normalizedEducation.educationLevel,
    educationStage: normalizedEducation.educationStage,
    gradeLevel,
    candidateNumber,
    gender,
    dateOfBirth,
    relationshipType,
    schoolId,
    studentNumber,
    className,
    streamName,
    subjectTags,
  };
}

async function assertActiveSchoolAdminLink(uid, schoolId) {
  const linkId = `${schoolId}_${uid}`;
  const linkSnap = await db.collection("school_admin_links").doc(linkId).get();
  if (!linkSnap.exists) {
    throw new HttpsError("permission-denied", "School admin is not linked to the selected school.");
  }
  const data = linkSnap.data();
  if (data.status !== "active") {
    throw new HttpsError("permission-denied", "School admin link is not active.");
  }
  return data;
}

async function provisionManagedStudent({
  creatorUid,
  creatorRole,
  creationMethod,
  learningMode,
  baseData,
  linkBuilder,
}) {
  const now = admin.firestore.Timestamp.now();
  const {accessCode, accessCodeNormalized} = await createUniqueAccessCode();
  const temporarySecret = makeTemporarySecret();
  const temporarySecretHash = hashSecret(temporarySecret);
  const syntheticEmail = makeInternalStudentEmail(accessCodeNormalized);
  const systemPassword = makeSystemPassword();
  const displayName = `${baseData.firstName} ${baseData.lastName}`.trim();

  const authUser = await admin.auth().createUser({
    email: syntheticEmail,
    password: systemPassword,
    displayName,
    disabled: false,
  });

  try {
    await admin.auth().setCustomUserClaims(authUser.uid, {role: "student"});

    const userRef = db.collection("users").doc(authUser.uid);
    const studentProfileRef = db.collection("student_profiles").doc(authUser.uid);
    const studentAccessRef = db.collection("student_access").doc(authUser.uid);
    const aliasRef = db.collection("auth_login_aliases").doc(accessCodeNormalized);
    const creationRecordRef = db.collection("student_creation_records").doc();

    const userDoc = {
      uid: authUser.uid,
      primaryRole: "student",
      secondaryRoles: [],
      status: "pending_setup",
      displayName,
      email: null,
      phone: null,
      hasEmailLogin: false,
      createdAt: now,
      updatedAt: now,
      createdBy: creatorUid,
      authProviderSummary: {
        hasPassword: true,
        providers: ["password"],
      },
      profileVersion: 2,
    };

    const studentProfileDoc = {
      uid: authUser.uid,
      firstName: baseData.firstName,
      lastName: baseData.lastName,
      preferredName: baseData.preferredName,
      dateOfBirth: baseData.dateOfBirth,
      gender: baseData.gender,
      country: baseData.country,
      educationLevel: baseData.educationLevel,
      educationStage: baseData.educationStage,
      gradeLevel: baseData.gradeLevel,
      candidateNumber: baseData.candidateNumber,
      learningMode,
      loginMode: "access_code",
      onboardingState: "first_login_pending",
      mustChangePassword: true,
      mustSetPin: true,
      createdAt: now,
      updatedAt: now,
    };

    const studentAccessDoc = {
      studentUid: authUser.uid,
      accessCode,
      accessCodeNormalized,
      temporarySecretHash,
      pinHash: null,
      passwordInitialized: false,
      failedAttempts: 0,
      lockedUntil: null,
      lastAccessCodeRotationAt: null,
      lastLoginAt: null,
      credentialState: "temporary",
      createdAt: now,
      updatedAt: now,
    };

    const aliasDoc = {
      aliasKey: accessCodeNormalized,
      uid: authUser.uid,
      type: "student_access_code",
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    const linkData = linkBuilder({
      studentUid: authUser.uid,
      createdAt: now,
      createdBy: creatorUid,
    });

    const creationRecordDoc = {
      recordId: creationRecordRef.id,
      studentUid: authUser.uid,
      createdByUid: creatorUid,
      createdByRole: creatorRole,
      creationMethod,
      initialLinkTargets: linkData.initialLinkTargets,
      initialAccessCode: accessCode,
      setupState: "first_login_pending",
      createdAt: now,
    };

    await db.runTransaction(async (tx) => {
      const aliasSnap = await tx.get(aliasRef);
      if (aliasSnap.exists) {
        throw new HttpsError("already-exists", "Generated access code already exists. Retry the request.");
      }

      tx.set(userRef, userDoc);
      tx.set(studentProfileRef, studentProfileDoc);
      tx.set(studentAccessRef, studentAccessDoc);
      tx.set(aliasRef, aliasDoc);
      tx.set(linkData.ref, linkData.doc);
      tx.set(creationRecordRef, creationRecordDoc);
    });

    return {
      ok: true,
      studentUid: authUser.uid,
      studentDisplayName: displayName,
      accessCode,
      temporarySecret,
      temporarySecretIssued: true,
      creatorRole,
      schoolId: baseData.schoolId || null,
      creationRecordId: creationRecordRef.id,
      relationshipLinkId: linkData.ref.id,
    };
  } catch (error) {
    await admin.auth().deleteUser(authUser.uid).catch(() => null);
    throw error;
  }
}

function toIsoString(timestampValue) {
  if (!timestampValue) return null;
  if (typeof timestampValue.toDate === "function") {
    return timestampValue.toDate().toISOString();
  }
  if (timestampValue instanceof Date && !Number.isNaN(timestampValue.getTime())) {
    return timestampValue.toISOString();
  }
  if (typeof timestampValue === "string") {
    const parsed = new Date(timestampValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  return null;
}

async function hydrateManagedStudentItems(links, mapLinkToMeta) {
  if (links.length === 0) return [];

  const studentRefs = [];
  const validLinks = links.filter((link) => typeof link.studentUid === "string" && link.studentUid.trim().length > 0);
  validLinks.forEach((link) => {
    studentRefs.push(db.collection("users").doc(link.studentUid));
    studentRefs.push(db.collection("student_profiles").doc(link.studentUid));
  });

  if (studentRefs.length === 0) {
    return [];
  }

  const snapshots = await db.getAll(...studentRefs);
  const userMap = new Map();
  const profileMap = new Map();

  snapshots.forEach((snap) => {
    if (!snap.exists) return;
    if (snap.ref.parent.id === "users") {
      userMap.set(snap.id, snap.data());
    }
    if (snap.ref.parent.id === "student_profiles") {
      profileMap.set(snap.id, snap.data());
    }
  });

  return validLinks.map((link) => {
    const userData = userMap.get(link.studentUid) || {};
    const profileData = profileMap.get(link.studentUid) || {};
    const meta = mapLinkToMeta(link);

    return {
      studentUid: link.studentUid,
      studentDisplayName:
        userData.displayName ||
        `${profileData.firstName || ""} ${profileData.lastName || ""}`.trim() ||
        "Student",
      educationLevel: profileData.educationLevel || null,
      country: profileData.country || null,
      createdAt: toIsoString(link.createdAt || userData.createdAt || profileData.createdAt),
      relationshipLabel: meta.relationshipLabel,
      relationshipType: meta.relationshipType || null,
      schoolId: meta.schoolId || null,
      schoolName: meta.schoolName || null,
      className: link.className || null,
      streamName: link.streamName || null,
    };
  });
}

async function hydrateManagedStudentItemsWithStats(links, mapLinkToMeta) {
  const malformedLinks = links.filter(
      (link) => !link || typeof link.studentUid !== "string" || link.studentUid.trim().length === 0,
  );
  const items = await hydrateManagedStudentItems(links, mapLinkToMeta);

  return {
    items,
    stats: {
      totalLinks: links.length,
      malformedLinks: malformedLinks.length,
      hydrated: items.length,
    },
  };
}

async function listParentManagedStudents(parentUid) {
  logger.info("listManagedStudentsAsParent:start", {parentUid});

  const debug = {
    totalLinks: 0,
    hydrated: 0,
    skippedMalformedLinks: 0,
    missingUsers: 0,
    missingStudentProfiles: 0,
  };

  try {
    const linksSnap = await db.collection("parent_student_links")
        .where("parentUid", "==", parentUid)
        .orderBy("createdAt", "desc")
        .get();

    debug.totalLinks = linksSnap.size;

    const items = [];
    for (const docSnap of linksSnap.docs) {
      const link = docSnap.data() || {};
      const rawStudentUid = typeof link.studentUid === "string" ? link.studentUid.trim() : "";

      if (!rawStudentUid) {
        debug.skippedMalformedLinks += 1;
        logger.info("listManagedStudentsAsParent:skipMalformedLink", {
          parentUid,
          linkId: docSnap.id,
        });
        continue;
      }

      try {
        const [userSnap, studentProfileSnap] = await Promise.all([
          db.collection("users").doc(rawStudentUid).get(),
          db.collection("student_profiles").doc(rawStudentUid).get(),
        ]);

        if (!userSnap.exists) {
          debug.missingUsers += 1;
          logger.info("listManagedStudentsAsParent:missingUser", {
            parentUid,
            linkId: docSnap.id,
            studentUid: rawStudentUid,
          });
          continue;
        }

        if (!studentProfileSnap.exists) {
          debug.missingStudentProfiles += 1;
          logger.info("listManagedStudentsAsParent:missingStudentProfile", {
            parentUid,
            linkId: docSnap.id,
            studentUid: rawStudentUid,
          });
          continue;
        }

        const userData = userSnap.data() || {};
        const profileData = studentProfileSnap.data() || {};

        items.push({
          studentUid: rawStudentUid,
          studentDisplayName:
            userData.displayName ||
            `${profileData.firstName || ""} ${profileData.lastName || ""}`.trim() ||
            "Student",
          educationLevel: profileData.educationLevel || null,
          country: profileData.country || null,
          createdAt: toIsoString(link.createdAt || userData.createdAt || profileData.createdAt),
          relationshipLabel: "Managed by parent",
          relationshipType: link.relationshipType || "guardian",
          schoolId: null,
          schoolName: null,
          className: typeof link.className === "string" ? link.className : null,
          streamName: typeof link.streamName === "string" ? link.streamName : null,
        });
        debug.hydrated += 1;
      } catch (error) {
        debug.skippedMalformedLinks += 1;
        logger.info("listManagedStudentsAsParent:skipMalformedLink", {
          parentUid,
          linkId: docSnap.id,
          studentUid: rawStudentUid,
          reason: error?.message || "unknown",
        });
      }
    }

    logger.info("listManagedStudentsAsParent:success", {
      parentUid,
      ...debug,
    });

    return {items, debug};
  } catch (error) {
    logger.error("listManagedStudentsAsParent:failed", {
      parentUid,
      message: error?.message || "unknown",
      code: error?.code || null,
    });
    if (error?.code === 9 || error?.code === "failed-precondition") {
      throw new HttpsError(
          "failed-precondition",
          "Missing Firestore index for parent_student_links.",
      );
    }
    throw error;
  }
}

async function listTeacherManagedStudents(teacherUid) {
  logger.info("listManagedStudentsAsTeacher:queryStart", {
    teacherUid,
    queryPath: "teacher_student_links where teacherUid == uid orderBy createdAt desc",
  });

  const debug = {
    totalLinks: 0,
    hydrated: 0,
    skippedMalformedLinks: 0,
    missingUsers: 0,
    missingStudentProfiles: 0,
  };

  try {
    const linksSnap = await db.collection("teacher_student_links")
        .where("teacherUid", "==", teacherUid)
        .orderBy("createdAt", "desc")
        .get();

    debug.totalLinks = linksSnap.size;
    logger.info("listManagedStudentsAsTeacher:queryResultCount", {
      teacherUid,
      totalLinks: debug.totalLinks,
    });

    logger.info("listManagedStudentsAsTeacher:hydrationStart", {
      teacherUid,
      totalLinks: debug.totalLinks,
    });

    const items = [];
    for (const docSnap of linksSnap.docs) {
      const link = docSnap.data() || {};
      const rawStudentUid = typeof link.studentUid === "string" ? link.studentUid.trim() : "";

      if (!rawStudentUid) {
        debug.skippedMalformedLinks += 1;
        logger.info("listManagedStudentsAsTeacher:skipMalformedLink", {
          teacherUid,
          linkId: docSnap.id,
        });
        continue;
      }

      try {
        const [userSnap, studentProfileSnap] = await Promise.all([
          db.collection("users").doc(rawStudentUid).get(),
          db.collection("student_profiles").doc(rawStudentUid).get(),
        ]);

        if (!userSnap.exists) {
          debug.missingUsers += 1;
          logger.info("listManagedStudentsAsTeacher:missingUser", {
            teacherUid,
            linkId: docSnap.id,
            studentUid: rawStudentUid,
          });
          continue;
        }

        if (!studentProfileSnap.exists) {
          debug.missingStudentProfiles += 1;
          logger.info("listManagedStudentsAsTeacher:missingStudentProfile", {
            teacherUid,
            linkId: docSnap.id,
            studentUid: rawStudentUid,
          });
          continue;
        }

        const userData = userSnap.data() || {};
        const profileData = studentProfileSnap.data() || {};
        items.push({
          studentUid: rawStudentUid,
          studentDisplayName:
            userData.displayName ||
            `${profileData.firstName || ""} ${profileData.lastName || ""}`.trim() ||
            "Student",
          educationLevel: profileData.educationLevel || null,
          country: profileData.country || null,
          createdAt: toIsoString(link.createdAt || userData.createdAt || profileData.createdAt),
          relationshipLabel: "Managed by teacher",
          relationshipType: link.source || "teacher_created",
          schoolId: link.schoolId || null,
          schoolName: null,
          className: link.className || null,
          streamName: link.streamName || null,
        });
      } catch (error) {
        debug.skippedMalformedLinks += 1;
        logger.error("listManagedStudentsAsTeacher:skipHydrationError", {
          teacherUid,
          linkId: docSnap.id,
          studentUid: rawStudentUid,
          code: error?.code || null,
          message: error?.message || "unknown",
        });
      }
    }

    debug.hydrated = items.length;
    logger.info("listManagedStudentsAsTeacher:malformedItemSkipCount", {
      teacherUid,
      skippedMalformedLinks: debug.skippedMalformedLinks,
      missingUsers: debug.missingUsers,
      missingStudentProfiles: debug.missingStudentProfiles,
    });

    return {items, stats: debug};
  } catch (error) {
    logger.error("listManagedStudentsAsTeacher:failure", {
      teacherUid,
      code: error?.code || null,
      message: error?.message || "unknown",
    });
    if (error?.code === 9 || error?.code === "failed-precondition") {
      throw new HttpsError(
          "failed-precondition",
          "Missing Firestore index for teacher_student_links.",
      );
    }
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to load teacher-managed students.");
  }
}

async function getTeacherActiveSchools(uid) {
  const linksSnap = await db.collection("teacher_school_links")
      .where("teacherUid", "==", uid)
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .get();

  if (linksSnap.empty) {
    return [];
  }

  const schoolRefs = linksSnap.docs.map((docSnap) => db.collection("schools").doc(docSnap.data().schoolId));
  const [schoolSnaps, adultProfileSnap] = await Promise.all([
    db.getAll(...schoolRefs),
    db.collection("adult_profiles").doc(uid).get(),
  ]);
  const schoolMap = new Map(schoolSnaps.filter((snap) => snap.exists).map((snap) => [snap.id, snap.data()]));
  const adultProfile = adultProfileSnap.exists ? adultProfileSnap.data() : {};

  return linksSnap.docs.map((docSnap) => {
    const link = docSnap.data();
    const school = schoolMap.get(link.schoolId) || {};
    return {
      schoolId: link.schoolId,
      schoolName: school.name || link.schoolId,
      role: link.role || "teacher",
      employmentType: link.employmentType || "staff",
      createdAt: toIsoString(link.createdAt),
      jobTitle: adultProfile?.jobTitle || null,
    };
  });
}

async function getSchoolAdminActiveSchools(uid) {
  const linksSnap = await db.collection("school_admin_links")
      .where("uid", "==", uid)
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .get();

  if (linksSnap.empty) {
    return [];
  }

  const schoolRefs = linksSnap.docs.map((docSnap) => db.collection("schools").doc(docSnap.data().schoolId));
  const schoolSnaps = await db.getAll(...schoolRefs);
  const schoolMap = new Map(schoolSnaps.filter((snap) => snap.exists).map((snap) => [snap.id, snap.data()]));

  return linksSnap.docs.map((docSnap) => {
    const link = docSnap.data();
    const school = schoolMap.get(link.schoolId) || {};
    return {
      schoolId: link.schoolId,
      schoolName: school.name || link.schoolId,
      role: link.role || "school_admin",
      createdAt: toIsoString(link.createdAt),
    };
  });
}

async function resolveSchoolScopeForStaffRequest(request, explicitSchoolId = null) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const actorUid = request.auth.uid;
  const actorRole = request.auth.token && request.auth.token.role ?
    request.auth.token.role :
    await getResolvedRoleForUser(actorUid, null);

  if (actorRole === "school_admin") {
    const activeSchools = await getSchoolAdminActiveSchools(actorUid);
    if (activeSchools.length === 0) {
      throw new HttpsError("failed-precondition", "You do not have an active school_admin link yet.");
    }
    if (activeSchools.length > 1) {
      throw new HttpsError("failed-precondition", "This flow only supports school admins linked to exactly one active school.");
    }
    return {
      actorUid,
      actorRole,
      schoolId: activeSchools[0].schoolId,
      schoolName: activeSchools[0].schoolName,
    };
  }

  if (actorRole === "admin" || actorRole === "super_admin") {
    const schoolId = coerceOptionalString(explicitSchoolId);
    if (!schoolId) {
      throw new HttpsError("invalid-argument", "schoolId is required for admin-managed school staff operations.");
    }
    const schoolSnap = await db.collection("schools").doc(schoolId).get();
    if (!schoolSnap.exists) {
      throw new HttpsError("not-found", "School not found.");
    }
    return {
      actorUid,
      actorRole,
      schoolId,
      schoolName: schoolSnap.data()?.name || schoolId,
    };
  }

  throw new HttpsError("permission-denied", "School staff management access required.");
}

async function hydrateSchoolStaffItems({schoolId, schoolName, schoolAdminLinks, teacherLinks}) {
  const userIds = [
    ...schoolAdminLinks.map((link) => link.uid),
    ...teacherLinks.map((link) => link.teacherUid),
  ];

  if (userIds.length === 0) {
    return [];
  }

  const userRefs = userIds.map((uid) => db.collection("users").doc(uid));
  const adultRefs = userIds.map((uid) => db.collection("adult_profiles").doc(uid));
  const snaps = await db.getAll(...userRefs, ...adultRefs);

  const userMap = new Map();
  const adultMap = new Map();

  snaps.forEach((snap) => {
    if (!snap.exists) return;
    if (snap.ref.parent.id === "users") {
      userMap.set(snap.id, snap.data());
    } else if (snap.ref.parent.id === "adult_profiles") {
      adultMap.set(snap.id, snap.data());
    }
  });

  const schoolAdminItems = schoolAdminLinks.map((link) => {
    const user = userMap.get(link.uid) || {};
    const adult = adultMap.get(link.uid) || {};
    return {
      uid: link.uid,
      displayName: user.displayName || `${adult.firstName || ""} ${adult.lastName || ""}`.trim() || "Unknown",
      email: user.email || "",
      role: "school_admin",
      status: link.status || user.status || "active",
      schoolId,
      schoolName,
      createdAt: toIsoString(link.createdAt),
      jobTitle: adult.jobTitle || "School Administrator",
    };
  });

  const teacherItems = teacherLinks.map((link) => {
    const user = userMap.get(link.teacherUid) || {};
    const adult = adultMap.get(link.teacherUid) || {};
    return {
      uid: link.teacherUid,
      displayName: user.displayName || `${adult.firstName || ""} ${adult.lastName || ""}`.trim() || "Unknown",
      email: user.email || "",
      role: "teacher",
      status: link.status || user.status || "active",
      schoolId,
      schoolName,
      createdAt: toIsoString(link.createdAt),
      jobTitle: adult.jobTitle || "Teacher",
    };
  });

  return [...schoolAdminItems, ...teacherItems].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
}

async function provisionSchoolStaffUser({
  actorUid,
  schoolId,
  role,
  displayName,
  email,
  country,
  phone,
  jobTitle,
  passwordInput,
}) {
  const password = passwordInput || makeTemporarySecret(12);
  if (password.length < 8) {
    throw new HttpsError("invalid-argument", "password must be at least 8 characters long.");
  }

  let authUser;
  let created = false;

  try {
    authUser = await admin.auth().getUserByEmail(email);
  } catch (error) {
    if (error && error.code === "auth/user-not-found") {
      authUser = await admin.auth().createUser({
        email,
        password,
        displayName,
        disabled: false,
      });
      created = true;
    } else {
      throw error;
    }
  }

  if (!created) {
    const updatePayload = {};
    if (displayName && displayName !== authUser.displayName) {
      updatePayload.displayName = displayName;
    }
    if (passwordInput) {
      updatePayload.password = password;
    }
    if (Object.keys(updatePayload).length > 0) {
      authUser = await admin.auth().updateUser(authUser.uid, updatePayload);
    }
  }

  await admin.auth().setCustomUserClaims(authUser.uid, {role});

  const now = admin.firestore.Timestamp.now();
  const canonicalUserRef = db.collection("users").doc(authUser.uid);
  const adultProfileRef = db.collection("adult_profiles").doc(authUser.uid);
  const existingCanonicalUserSnap = await canonicalUserRef.get();
  const existingCanonicalUser = existingCanonicalUserSnap.exists ? existingCanonicalUserSnap.data() : null;
  const nameParts = splitDisplayName(displayName);

  const secondaryRoles = Array.from(new Set([
    ...(Array.isArray(existingCanonicalUser?.secondaryRoles) ? existingCanonicalUser.secondaryRoles : []),
    existingCanonicalUser?.primaryRole,
  ].filter((entry) => typeof entry === "string" && entry !== role)));

  const linkRef = role === "school_admin" ?
    db.collection("school_admin_links").doc(`${schoolId}_${authUser.uid}`) :
    db.collection("teacher_school_links").doc(buildTeacherSchoolLinkId(authUser.uid, schoolId));

  await db.runTransaction(async (tx) => {
    tx.set(canonicalUserRef, {
      uid: authUser.uid,
      primaryRole: role,
      secondaryRoles,
      status: "active",
      displayName,
      email,
      phone,
      hasEmailLogin: true,
      createdAt: existingCanonicalUser?.createdAt ||
        (authUser.metadata?.creationTime ?
          admin.firestore.Timestamp.fromDate(new Date(authUser.metadata.creationTime)) :
          now),
      updatedAt: now,
      createdBy: existingCanonicalUser?.createdBy || actorUid,
      authProviderSummary: buildAuthProviderSummary(authUser),
      profileVersion: 2,
    }, {merge: true});

    tx.set(adultProfileRef, {
      uid: authUser.uid,
      adultType: role,
      firstName: nameParts.firstName || role,
      lastName: nameParts.lastName || "",
      phone,
      country,
      jobTitle: jobTitle || (role === "school_admin" ? "School Administrator" : "Teacher"),
      status: "active",
      createdAt: existingCanonicalUser?.createdAt || now,
      updatedAt: now,
    }, {merge: true});

    if (role === "school_admin") {
      const linkId = `${schoolId}_${authUser.uid}`;
      tx.set(linkRef, {
        linkId,
        schoolId,
        uid: authUser.uid,
        role: "admin",
        status: "active",
        permissions: {
          manageStudents: true,
          manageTeachers: false,
          manageBilling: false,
          viewAnalytics: true,
        },
        createdAt: now,
        createdBy: actorUid,
      }, {merge: true});
    } else {
      const linkId = buildTeacherSchoolLinkId(authUser.uid, schoolId);
      tx.set(linkRef, {
        linkId,
        teacherUid: authUser.uid,
        schoolId,
        role: "teacher",
        status: "active",
        employmentType: "staff",
        subjectTags: [],
        createdAt: now,
        createdBy: actorUid,
      }, {merge: true});
    }
  });

  return {
    ok: true,
    created,
    uid: authUser.uid,
    email,
    role,
    displayName,
    passwordIssued: created || Boolean(passwordInput),
    temporaryPassword: created || passwordInput ? password : null,
    schoolId,
    linkId: linkRef.id,
  };
}

async function listSchoolAdminManagedStudents(uid) {
  const activeSchools = await getSchoolAdminActiveSchools(uid);

  if (activeSchools.length !== 1) {
    return {
      activeSchools,
      selectedSchoolId: activeSchools.length === 1 ? activeSchools[0].schoolId : null,
      items: [],
    };
  }

  const selectedSchool = activeSchools[0];
  const linksSnap = await db.collection("school_student_links")
      .where("schoolId", "==", selectedSchool.schoolId)
      .orderBy("createdAt", "desc")
      .get();

  const items = await hydrateManagedStudentItems(
      linksSnap.docs.map((docSnap) => docSnap.data()),
      () => ({
        relationshipLabel: "Managed by school",
        relationshipType: "school_admin_created",
        schoolId: selectedSchool.schoolId,
        schoolName: selectedSchool.schoolName,
      }),
  );

  return {
    activeSchools,
    selectedSchoolId: selectedSchool.schoolId,
    items,
  };
}

exports.generateLinkCode = onCall(async (request) => {
  void request;
  throw new HttpsError("failed-precondition", "Legacy link-code generation is disabled. Use canonical student_link_codes flows.");
});

exports.listActiveLinkCodes = onCall(async (request) => {
  void request;
  throw new HttpsError("failed-precondition", "Legacy link-code listing is disabled. Use canonical student_link_codes flows.");
});

exports.redeemLinkCode = onCall(async (request) => {
  void request;
  throw new HttpsError("failed-precondition", "Legacy link-code redemption is disabled. Use claimStudentLinkCode.");
});

exports.searchLinkTarget = onCall(async (request) => {
  void request;
  throw new HttpsError("failed-precondition", "Legacy link-target search is disabled. Use canonical student linking flows.");
});

exports.sendLinkRequest = onCall(async (request) => {
  void request;
  throw new HttpsError("failed-precondition", "Legacy link requests are disabled. Use canonical student linking flows.");
});

exports.listLinkRequests = onCall(async (request) => {
  void request;
  throw new HttpsError("failed-precondition", "Legacy link-request listing is disabled.");
});

exports.respondToLinkRequest = onCall(async (request) => {
  void request;
  throw new HttpsError("failed-precondition", "Legacy link-request responses are disabled.");
});

exports.listLinkedAccounts = onCall(async (request) => {
  void request;
  throw new HttpsError("failed-precondition", "Legacy linked-account listing is disabled.");
});

exports.unlinkAccount = onCall(async (request) => {
  void request;
  throw new HttpsError("failed-precondition", "Legacy unlink is disabled.");
});

exports.listLinkedStudentsOverview = onCall(async (request) => {
  void request;
  throw new HttpsError("failed-precondition", "Legacy linked-student overview is disabled.");
});

function computeProgressUpdate(currentProgress, scorePercentage, totalQuestions) {
  const baseXP = totalQuestions * 10;
  const bonusMultiplier = scorePercentage >= 80 ? 1.5 : scorePercentage >= 60 ? 1.2 : 1;
  const xpEarned = Math.round(baseXP * (scorePercentage / 100) * bonusMultiplier);

  const todayIso = new Date().toISOString().split("T")[0];
  const lastExamDate = currentProgress && currentProgress.lastExamDate ?
    currentProgress.lastExamDate :
    currentProgress && currentProgress.last_exam_date ?
      currentProgress.last_exam_date :
      null;

  let newStreak = currentProgress && typeof currentProgress.streak === "number" ?
    currentProgress.streak :
    0;
  let streakUpdated = false;

  if (!lastExamDate) {
    newStreak = 1;
    streakUpdated = true;
  } else {
    const lastDate = new Date(lastExamDate);
    const todayDate = new Date(todayIso);
    const diffDays = Math.floor(
        (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 1) {
      newStreak += 1;
      streakUpdated = true;
    } else if (diffDays > 1) {
      newStreak = 1;
      streakUpdated = true;
    }
  }

  return {xpEarned, newStreak, streakUpdated, todayIso};
}

exports.submitExamAttempt = onCall(async (request) => {
  throw new HttpsError(
      "failed-precondition",
      "Legacy exam-engine attempt submission has been disabled. Use the V2 exam engine.",
  );
});

exports.getLatestExamAttemptId = onCall(async (request) => {
  throw new HttpsError(
      "failed-precondition",
      "Legacy exam-engine attempt lookup has been disabled. Use the V2 exam engine.",
  );
});

exports.getExamAttempt = onCall(async (request) => {
  throw new HttpsError(
      "failed-precondition",
      "Legacy exam-engine attempt lookup has been disabled. Use the V2 exam engine.",
  );
});

exports.listExamHistory = onCall(async (request) => {
  throw new HttpsError(
      "failed-precondition",
      "Legacy exam history has been disabled. Use the V2 exam engine.",
  );
});

exports.listExams = onCall(async (request) => {
  throw new HttpsError(
      "failed-precondition",
      "Legacy exam-library listing has been disabled. Use the V2 exam engine.",
  );
});

exports.getExamContent = onCall(async (request) => {
  throw new HttpsError(
      "failed-precondition",
      "Legacy exam content lookup has been disabled. Use the V2 exam engine.",
  );
});

exports.listReviewDueQuestions = onCall(async (request) => {
  throw new HttpsError(
      "failed-precondition",
      "Legacy review-session lookup has been disabled. Use the V2 exam engine.",
  );
});

exports.submitReviewAnswer = onCall(async (request) => {
  throw new HttpsError(
      "failed-precondition",
      "Legacy review-session submission has been disabled. Use the V2 exam engine.",
  );
});

exports.listStudentDashboardSummary = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const userId = request.auth.uid;

  const achievementsSnap = await db.collection("achievements").limit(50).get();
  const achievements = achievementsSnap.docs.map((docSnap) => {
    const a = docSnap.data();
    return {
      id: docSnap.id,
      name: a.name || "",
      description: a.description || "",
      icon: a.icon || "trophy",
      xp_reward: typeof a.xpReward === "number" ?
        a.xpReward :
        typeof a.xp_reward === "number" ?
          a.xp_reward :
          0,
    };
  });

  let userAchievementsSnap;
  try {
    userAchievementsSnap = await db.collection("user_achievements")
        .where("userId", "==", userId)
        .get();
  } catch (_error) {
    userAchievementsSnap = await db.collection("user_achievements")
        .where("user_id", "==", userId)
        .get();
  }
  const userAchievementIds = userAchievementsSnap.docs
      .map((docSnap) => {
        const d = docSnap.data();
        return d.achievementId || d.achievement_id || null;
      })
      .filter(Boolean);

  let attemptsSnap;
  try {
    attemptsSnap = await db.collection("exam_attempts")
        .where("userId", "==", userId)
        .orderBy("completedAt", "desc")
        .limit(300)
        .get();
  } catch (_error) {
    attemptsSnap = await db.collection("exam_attempts")
        .where("user_id", "==", userId)
        .orderBy("completed_at", "desc")
        .limit(300)
        .get();
  }
  const attempts = attemptsSnap.docs.map((docSnap) => docSnap.data());

  const examSubjectCache = {};
  const getExamSubject = async (examId) => {
    if (!examId) return "Unknown";
    if (examSubjectCache[examId]) return examSubjectCache[examId];
    const examSnap = await db.collection("exams").doc(examId).get();
    if (!examSnap.exists) return "Unknown";
    const subject = examSnap.data().subject || "Unknown";
    examSubjectCache[examId] = subject;
    return subject;
  };

  let totalScorePercentage = 0;
  const subjectData = {};
  for (const attempt of attempts) {
    const score = typeof attempt.score === "number" ? attempt.score : 0;
    const total = typeof attempt.totalQuestions === "number" ?
      attempt.totalQuestions :
      typeof attempt.total_questions === "number" ?
        attempt.total_questions :
        0;
    if (total <= 0) continue;
    totalScorePercentage += (score / total) * 100;

    const examId = attempt.examId || attempt.exam_id || null;
    const subject = await getExamSubject(examId);
    if (!subjectData[subject]) {
      subjectData[subject] = {correct: 0, total: 0, count: 0};
    }
    subjectData[subject].correct += score;
    subjectData[subject].total += total;
    subjectData[subject].count += 1;
  }

  let bestSubject = "Mathematics";
  let bestSubjectScore = 0;
  Object.entries(subjectData).forEach(([subject, data]) => {
    const pct = data.total > 0 ? (data.correct / data.total) * 100 : 0;
    if (pct > bestSubjectScore) {
      bestSubjectScore = pct;
      bestSubject = subject;
    }
  });

  const totalAttempts = attempts.length;
  const averageScore = totalAttempts > 0 ?
    Math.round(totalScorePercentage / totalAttempts) :
    0;

  const subjects = ["Mathematics", "Science", "English", "Social Studies"];
  const subjectProgress = subjects.map((subject) => {
    const s = subjectData[subject];
    return {
      subject,
      progress: s && s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      examCount: s ? s.count : 0,
    };
  });

  return {
    ok: true,
    achievements,
    userAchievementIds,
    examStats: {
      totalAttempts,
      averageScore,
      bestSubject,
    },
    subjectProgress,
  };
});

exports.listNotifications = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const userId = request.auth.uid;
  const limit = request.data && typeof request.data.limit === "number" ?
    Math.max(1, Math.min(100, request.data.limit)) :
    20;

  let snap;
  try {
    snap = await db.collection("notifications")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();
  } catch (_error) {
    snap = await db.collection("notifications")
        .where("user_id", "==", userId)
        .orderBy("created_at", "desc")
        .limit(limit)
        .get();
  }

  const items = snap.docs.map((docSnap) => {
    const n = docSnap.data();
    const createdAtVal = n.createdAt || n.created_at || null;
    const createdAtIso = createdAtVal && createdAtVal.toDate ?
      createdAtVal.toDate().toISOString() :
      typeof createdAtVal === "string" ?
        createdAtVal :
        new Date().toISOString();
    return {
      id: docSnap.id,
      user_id: n.userId || n.user_id || userId,
      text: n.text || "",
      read: typeof n.read === "boolean" ? n.read : false,
      created_at: createdAtIso,
    };
  });

  return {ok: true, items};
});

exports.markNotificationRead = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const userId = request.auth.uid;
  const id = request.data && request.data.id;
  if (!id || typeof id !== "string") {
    throw new HttpsError("invalid-argument", "id is required.");
  }
  const ref = db.collection("notifications").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Notification not found.");
  }
  const n = snap.data();
  const ownerId = n.userId || n.user_id;
  if (ownerId !== userId) {
    throw new HttpsError("permission-denied", "Cannot edit this notification.");
  }
  await ref.set({
    read: true,
    updatedAt: admin.firestore.Timestamp.now(),
  }, {merge: true});
  return {ok: true};
});

exports.markAllNotificationsRead = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const userId = request.auth.uid;

  let snap;
  try {
    snap = await db.collection("notifications").where("userId", "==", userId).get();
  } catch (_error) {
    snap = await db.collection("notifications").where("user_id", "==", userId).get();
  }

  const batch = db.batch();
  snap.docs.forEach((docSnap) => {
    batch.set(docSnap.ref, {
      read: true,
      updatedAt: admin.firestore.Timestamp.now(),
    }, {merge: true});
  });
  await batch.commit();
  return {ok: true, count: snap.size};
});

exports.deleteNotification = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const userId = request.auth.uid;
  const id = request.data && request.data.id;
  if (!id || typeof id !== "string") {
    throw new HttpsError("invalid-argument", "id is required.");
  }
  const ref = db.collection("notifications").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return {ok: true};
  }
  const n = snap.data();
  const ownerId = n.userId || n.user_id;
  if (ownerId !== userId) {
    throw new HttpsError("permission-denied", "Cannot delete this notification.");
  }
  await ref.delete();
  return {ok: true};
});

exports.listForumCategories = onCall(async () => {
  const snap = await db.collection("forum_categories").orderBy("name").get();
  const items = snap.docs.map((docSnap) => {
    const c = docSnap.data();
    return {
      id: docSnap.id,
      name: c.name || "",
      description: c.description || null,
      icon: c.icon || null,
    };
  });
  return {ok: true, items};
});

exports.listForumPosts = onCall(async (request) => {
  const categoryId = request.data && typeof request.data.categoryId === "string" ?
    request.data.categoryId :
    null;
  let query = db.collection("forum_posts");
  if (categoryId) query = query.where("categoryId", "==", categoryId);

  let snap;
  try {
    snap = await query.orderBy("isPinned", "desc").orderBy("createdAt", "desc").limit(200).get();
  } catch (_error) {
    snap = await query.orderBy("is_pinned", "desc").orderBy("created_at", "desc").limit(200).get();
  }

  const posts = snap.docs.map((docSnap) => {
    const p = docSnap.data();
    return {
      id: docSnap.id,
      title: p.title || "",
      content: p.content || "",
      author_id: p.authorId || p.author_id || "",
      category_id: p.categoryId || p.category_id || "",
      is_pinned: typeof p.isPinned === "boolean" ? p.isPinned : !!p.is_pinned,
      is_locked: typeof p.isLocked === "boolean" ? p.isLocked : !!p.is_locked,
      tags: Array.isArray(p.tags) ? p.tags : [],
      created_at: p.createdAt && p.createdAt.toDate ?
        p.createdAt.toDate().toISOString() :
        p.created_at && p.created_at.toDate ?
          p.created_at.toDate().toISOString() :
          new Date().toISOString(),
      updated_at: p.updatedAt && p.updatedAt.toDate ?
        p.updatedAt.toDate().toISOString() :
        p.updated_at && p.updated_at.toDate ?
          p.updated_at.toDate().toISOString() :
          new Date().toISOString(),
    };
  });

  const authorIds = [...new Set(posts.map((p) => p.author_id).filter(Boolean))];
  const authorMap = {};
  for (const authorId of authorIds) {
    const profileSnap = await db.collection("profiles").doc(authorId).get();
    authorMap[authorId] = profileSnap.exists ? profileSnap.data().name || "Unknown" : "Unknown";
  }

  const postIds = posts.map((p) => p.id);
  const replyCounts = {};
  for (const postId of postIds) {
    let repliesSnap;
    try {
      repliesSnap = await db.collection("forum_replies").where("postId", "==", postId).get();
    } catch (_error) {
      repliesSnap = await db.collection("forum_replies").where("post_id", "==", postId).get();
    }
    replyCounts[postId] = repliesSnap.size;
  }

  const items = posts.map((post) => ({
    ...post,
    author: {name: authorMap[post.author_id] || "Unknown"},
    replies_count: replyCounts[post.id] || 0,
  }));
  return {ok: true, items};
});

exports.listForumReplies = onCall(async (request) => {
  const postId = request.data && request.data.postId;
  if (!postId || typeof postId !== "string") {
    throw new HttpsError("invalid-argument", "postId is required.");
  }

  let snap;
  try {
    snap = await db.collection("forum_replies")
        .where("postId", "==", postId)
        .orderBy("createdAt", "asc")
        .limit(500)
        .get();
  } catch (_error) {
    snap = await db.collection("forum_replies")
        .where("post_id", "==", postId)
        .orderBy("created_at", "asc")
        .limit(500)
        .get();
  }

  const replies = snap.docs.map((docSnap) => {
    const r = docSnap.data();
    return {
      id: docSnap.id,
      post_id: r.postId || r.post_id || postId,
      author_id: r.authorId || r.author_id || "",
      content: r.content || "",
      created_at: r.createdAt && r.createdAt.toDate ?
        r.createdAt.toDate().toISOString() :
        r.created_at && r.created_at.toDate ?
          r.created_at.toDate().toISOString() :
          new Date().toISOString(),
    };
  });

  const authorIds = [...new Set(replies.map((r) => r.author_id).filter(Boolean))];
  const authorMap = {};
  for (const authorId of authorIds) {
    const profileSnap = await db.collection("profiles").doc(authorId).get();
    authorMap[authorId] = profileSnap.exists ? profileSnap.data().name || "Unknown" : "Unknown";
  }

  const items = replies.map((reply) => ({
    ...reply,
    author: {name: authorMap[reply.author_id] || "Unknown"},
  }));
  return {ok: true, items};
});

exports.createForumPost = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const userId = request.auth.uid;
  const role = request.auth.token && request.auth.token.role ?
    request.auth.token.role :
    await getRoleForUser(userId, null);
  if (role !== "parent" && role !== "admin") {
    throw new HttpsError("permission-denied", "Only parents/admin can create posts.");
  }

  const data = request.data || {};
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const content = typeof data.content === "string" ? data.content.trim() : "";
  const categoryId = typeof data.categoryId === "string" ? data.categoryId : "";
  const tags = Array.isArray(data.tags) ? data.tags.filter((t) => typeof t === "string") : [];
  if (!title || !content || !categoryId) {
    throw new HttpsError("invalid-argument", "title/content/categoryId are required.");
  }

  const now = admin.firestore.Timestamp.now();
  const ref = db.collection("forum_posts").doc();
  await ref.set({
    title,
    content,
    categoryId,
    authorId: userId,
    isPinned: false,
    isLocked: false,
    tags,
    createdAt: now,
    updatedAt: now,
  });
  return {ok: true, id: ref.id};
});

exports.createForumReply = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const userId = request.auth.uid;
  const data = request.data || {};
  const postId = typeof data.postId === "string" ? data.postId : "";
  const content = typeof data.content === "string" ? data.content.trim() : "";
  if (!postId || !content) {
    throw new HttpsError("invalid-argument", "postId and content are required.");
  }

  const postSnap = await db.collection("forum_posts").doc(postId).get();
  if (!postSnap.exists) {
    throw new HttpsError("not-found", "Forum post not found.");
  }
  const post = postSnap.data();
  const isLocked = typeof post.isLocked === "boolean" ? post.isLocked : !!post.is_locked;
  if (isLocked) {
    throw new HttpsError("failed-precondition", "This post is locked.");
  }

  const now = admin.firestore.Timestamp.now();
  const ref = db.collection("forum_replies").doc();
  await ref.set({
    postId,
    authorId: userId,
    content,
    createdAt: now,
    updatedAt: now,
  });
  return {ok: true, id: ref.id};
});

exports.upsertForumCategory = onCall(async (request) => {
  await assertAdminRole(request);
  const data = request.data || {};
  const id = typeof data.id === "string" ? data.id : "";
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const description = typeof data.description === "string" ?
    data.description.trim() :
    "";
  const icon = typeof data.icon === "string" ? data.icon : "MessageSquare";

  if (!name) {
    throw new HttpsError("invalid-argument", "Category name is required.");
  }

  const now = admin.firestore.Timestamp.now();
  const ref = id ?
    db.collection("forum_categories").doc(id) :
    db.collection("forum_categories").doc();

  await ref.set({
    name,
    description: description || null,
    icon,
    updatedAt: now,
    ...(id ? {} : {createdAt: now}),
  }, {merge: true});

  return {ok: true, id: ref.id};
});

exports.deleteForumCategory = onCall(async (request) => {
  await assertAdminRole(request);
  const categoryId = request.data && request.data.categoryId;
  if (!categoryId || typeof categoryId !== "string") {
    throw new HttpsError("invalid-argument", "categoryId is required.");
  }

  const categoryRef = db.collection("forum_categories").doc(categoryId);
  const categorySnap = await categoryRef.get();
  if (!categorySnap.exists) {
    return {ok: true};
  }

  let postsByCategoryId;
  try {
    postsByCategoryId = await db.collection("forum_posts")
        .where("categoryId", "==", categoryId)
        .get();
  } catch (_error) {
    postsByCategoryId = await db.collection("forum_posts")
        .where("category_id", "==", categoryId)
        .get();
  }
  let postsBySnake = postsByCategoryId;
  if (postsByCategoryId.empty) {
    try {
      postsBySnake = await db.collection("forum_posts")
          .where("category_id", "==", categoryId)
          .get();
    } catch (_error) {
      postsBySnake = postsByCategoryId;
    }
  }
  const allPosts = [...postsByCategoryId.docs];
  for (const docSnap of postsBySnake.docs) {
    if (!allPosts.find((d) => d.id === docSnap.id)) {
      allPosts.push(docSnap);
    }
  }
  const postIds = allPosts.map((d) => d.id);

  for (const postId of postIds) {
    let repliesSnap;
    try {
      repliesSnap = await db.collection("forum_replies")
          .where("postId", "==", postId)
          .get();
    } catch (_error) {
      repliesSnap = await db.collection("forum_replies")
          .where("post_id", "==", postId)
          .get();
    }
    let replyBatch = db.batch();
    let replyCount = 0;
    for (const replyDoc of repliesSnap.docs) {
      replyBatch.delete(replyDoc.ref);
      replyCount++;
      if (replyCount === 450) {
        await replyBatch.commit();
        replyBatch = db.batch();
        replyCount = 0;
      }
    }
    if (replyCount > 0) {
      await replyBatch.commit();
    }
  }

  let postBatch = db.batch();
  let postCount = 0;
  for (const docSnap of allPosts) {
    postBatch.delete(docSnap.ref);
    postCount++;
    if (postCount === 450) {
      await postBatch.commit();
      postBatch = db.batch();
      postCount = 0;
    }
  }
  if (postCount > 0) {
    await postBatch.commit();
  }

  await categoryRef.delete();
  return {ok: true};
});

exports.setForumPostPinned = onCall(async (request) => {
  await assertAdminRole(request);
  const postId = request.data && request.data.postId;
  const isPinned = request.data && request.data.isPinned;
  if (!postId || typeof postId !== "string" || typeof isPinned !== "boolean") {
    throw new HttpsError("invalid-argument", "postId and isPinned are required.");
  }

  const ref = db.collection("forum_posts").doc(postId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Forum post not found.");
  }
  await ref.set({
    isPinned,
    is_pinned: isPinned,
    updatedAt: admin.firestore.Timestamp.now(),
  }, {merge: true});
  return {ok: true};
});

exports.setForumPostLocked = onCall(async (request) => {
  await assertAdminRole(request);
  const postId = request.data && request.data.postId;
  const isLocked = request.data && request.data.isLocked;
  if (!postId || typeof postId !== "string" || typeof isLocked !== "boolean") {
    throw new HttpsError("invalid-argument", "postId and isLocked are required.");
  }

  const ref = db.collection("forum_posts").doc(postId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Forum post not found.");
  }
  await ref.set({
    isLocked,
    is_locked: isLocked,
    updatedAt: admin.firestore.Timestamp.now(),
  }, {merge: true});
  return {ok: true};
});

exports.deleteForumPost = onCall(async (request) => {
  await assertAdminRole(request);
  const postId = request.data && request.data.postId;
  if (!postId || typeof postId !== "string") {
    throw new HttpsError("invalid-argument", "postId is required.");
  }

  const postRef = db.collection("forum_posts").doc(postId);
  const postSnap = await postRef.get();
  if (!postSnap.exists) {
    return {ok: true};
  }

  let repliesSnap;
  try {
    repliesSnap = await db.collection("forum_replies").where("postId", "==", postId).get();
  } catch (_error) {
    repliesSnap = await db.collection("forum_replies").where("post_id", "==", postId).get();
  }
  let batch = db.batch();
  let count = 0;
  for (const replyDoc of repliesSnap.docs) {
    batch.delete(replyDoc.ref);
    count++;
    if (count === 450) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }
  if (count > 0) {
    await batch.commit();
  }

  await postRef.delete();
  return {ok: true};
});

exports.aiExplanations = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const data = request.data || {};
  const type = data.type === "feedback" ? "feedback" : "explanation";
  const questionText = typeof data.questionText === "string" ? data.questionText : "";
  const correctAnswer = typeof data.correctAnswer === "string" ? data.correctAnswer : "";
  const userAnswer = typeof data.userAnswer === "string" ? data.userAnswer : "";
  const studentLevel = typeof data.studentLevel === "string" ? data.studentLevel : "primary school";
  const subject = typeof data.subject === "string" ? data.subject : "a subject";
  const marks = typeof data.marks === "number" ? data.marks : null;

  if (!questionText || !correctAnswer) {
    throw new HttpsError("invalid-argument", "questionText and correctAnswer are required.");
  }

  const lovableApiKey = process.env.LOVABLE_API_KEY;
  if (!lovableApiKey) {
    throw new HttpsError("failed-precondition", "LOVABLE_API_KEY is not configured.");
  }

  let systemPrompt = "";
  let userPrompt = "";
  if (type === "explanation") {
    systemPrompt = `You are a patient, encouraging Ugandan teacher helping a ${studentLevel}` +
      ` student understand ${subject}. Your explanations should be clear, age-appropriate,` +
      " step-by-step, and concise.";
    userPrompt = `Please explain how to solve this question step by step:\n\n` +
      `Question: ${questionText}\nCorrect Answer: ${correctAnswer}\n` +
      `${marks ? `This question is worth ${marks} marks.` : ""}`;
  } else {
    systemPrompt = `You are a supportive Ugandan teacher helping a ${studentLevel}` +
      " student learn from mistakes. Be encouraging and practical.";
    userPrompt = `A student answered this question incorrectly. Help them understand their` +
      ` mistake.\n\nQuestion: ${questionText}\nStudent's Answer: ${userAnswer}\n` +
      `Correct Answer: ${correctAnswer}`;
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {role: "system", content: systemPrompt},
        {role: "user", content: userPrompt},
      ],
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error("aiExplanations gateway error", {status: response.status, text});
    if (response.status === 429) {
      throw new HttpsError("resource-exhausted", "Rate limit exceeded. Please retry shortly.");
    }
    if (response.status === 402) {
      throw new HttpsError("failed-precondition", "AI service credits exhausted.");
    }
    throw new HttpsError("internal", `AI gateway error: ${response.status}`);
  }

  const payload = await response.json();
  const explanation = payload &&
    payload.choices &&
    payload.choices[0] &&
    payload.choices[0].message &&
    typeof payload.choices[0].message.content === "string" ?
      payload.choices[0].message.content :
      "Unable to generate explanation.";

  return {ok: true, explanation};
});

exports.studyAssistant = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const rawMessages = request.data && Array.isArray(request.data.messages) ?
    request.data.messages :
    [];
  const messages = rawMessages
      .filter((m) => m && (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string")
      .slice(-20);
  if (messages.length === 0) {
    throw new HttpsError("invalid-argument", "At least one message is required.");
  }

  const lovableApiKey = process.env.LOVABLE_API_KEY;
  if (!lovableApiKey) {
    throw new HttpsError("failed-precondition", "LOVABLE_API_KEY is not configured.");
  }

  const systemPrompt = "You are XamPreps AI, a friendly and encouraging study assistant for " +
    "Ugandan students preparing for PLE, UCE, and UACE exams. Keep answers concise, clear, " +
    "supportive, and focused on study help.";

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{role: "system", content: systemPrompt}, ...messages],
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error("studyAssistant gateway error", {status: response.status, text});
    if (response.status === 429) {
      throw new HttpsError("resource-exhausted", "Too many requests. Try again shortly.");
    }
    if (response.status === 402) {
      throw new HttpsError("failed-precondition", "AI service temporarily unavailable.");
    }
    throw new HttpsError("internal", `AI gateway error: ${response.status}`);
  }

  const payload = await response.json();
  const reply = payload &&
    payload.choices &&
    payload.choices[0] &&
    payload.choices[0].message &&
    typeof payload.choices[0].message.content === "string" ?
      payload.choices[0].message.content :
      "I could not generate a response right now.";

  return {ok: true, reply};
});

function mapExamForClient(docSnap) {
  const e = docSnap.data();
  return {
    id: docSnap.id,
    title: e.title || "",
    subject: e.subject || "",
    level: e.level || "PLE",
    year: typeof e.year === "number" ? e.year : new Date().getFullYear(),
    type: e.type || "Past Paper",
    difficulty: e.difficulty || "Medium",
    time_limit: typeof e.timeLimit === "number" ?
      e.timeLimit :
      typeof e.time_limit === "number" ?
        e.time_limit :
        60,
    is_free: typeof e.isFree === "boolean" ? e.isFree : !!e.is_free,
    description: e.description || null,
    topic: e.topic || null,
    question_count: typeof e.questionCount === "number" ?
      e.questionCount :
      typeof e.question_count === "number" ?
        e.question_count :
        0,
    explanation_pdf_url: e.explanationPdfUrl || e.explanation_pdf_url || null,
    created_at: e.createdAt && e.createdAt.toDate ?
      e.createdAt.toDate().toISOString() :
      e.created_at && e.created_at.toDate ?
        e.created_at.toDate().toISOString() :
        null,
  };
}

exports.adminDashboardSummary = onCall(async (request) => {
  const uid = request.auth?.uid || 'unknown';
  const tokenRole = request.auth?.token?.role || null;
  logger.info('adminDashboardSummary called', { uid, tokenRole });

  await assertAdminRole(request);
  logger.info('adminDashboardSummary: admin access granted', { uid, tokenRole });

  const [profilesSnap, rolesSnap, canonicalUsersSnap, examsSnap] = await Promise.all([
    db.collection("profiles").limit(200).get(),
    db.collection("user_roles").limit(200).get(),
    db.collection("users").limit(200).get(),
    db.collection("exams").orderBy("year", "desc").limit(200).get(),
  ]);

  const roleMap = {};
  rolesSnap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    roleMap[docSnap.id] = data.role || "student";
    if (data.userId) roleMap[data.userId] = data.role || "student";
    if (data.user_id) roleMap[data.user_id] = data.role || "student";
  });

  const users = canonicalUsersSnap.size > 0 ?
    canonicalUsersSnap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.displayName || "Unknown",
        email: data.email || "",
        role: data.primaryRole || roleMap[docSnap.id] || "student",
        createdAt: data.createdAt && data.createdAt.toDate ?
          data.createdAt.toDate().toISOString() :
          new Date().toISOString(),
      };
    }) :
    profilesSnap.docs.map((docSnap) => {
      const p = docSnap.data();
      return {
        id: docSnap.id,
        name: p.name || "Unknown",
        email: p.email || "",
        role: roleMap[docSnap.id] || "student",
        createdAt: p.createdAt && p.createdAt.toDate ?
          p.createdAt.toDate().toISOString() :
          p.created_at && p.created_at.toDate ?
            p.created_at.toDate().toISOString() :
            new Date().toISOString(),
      };
    });

  const exams = examsSnap.docs.map((docSnap) => mapExamForClient(docSnap));
  const attemptsSnap = await db.collection("exam_attempts").limit(10000).get();
  const subsSnap = await db.collection("subscriptions").where("plan", "==", "Premium").get();

  return {
    ok: true,
    users,
    exams,
    stats: {
      totalUsers: canonicalUsersSnap.size > 0 ? canonicalUsersSnap.size : profilesSnap.size,
      totalExams: examsSnap.size,
      totalAttempts: attemptsSnap.size,
      premiumUsers: subsSnap.size,
    },
  };
});

exports.adminListExams = onCall(async (request) => {
  const uid = request.auth?.uid || 'unknown';
  const tokenRole = request.auth?.token?.role || null;
  logger.info('adminListExams called', { uid, tokenRole });

  await assertAdminRole(request);
  logger.info('adminListExams: admin access granted', { uid, tokenRole });

  const snap = await db.collection("exams").orderBy("year", "desc").limit(200).get();
  logger.info('adminListExams: found exams', { count: snap.size });
  return {ok: true, items: snap.docs.map((docSnap) => mapExamForClient(docSnap))};
});

exports.adminListSchools = onCall(async (request) => {
  const uid = request.auth?.uid || "unknown";
  const tokenRole = request.auth?.token?.role || null;
  logger.info("adminListSchools called", {uid, tokenRole});

  await assertAdminRole(request);

  const schoolsSnap = await db.collection("schools")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

  const items = await Promise.all(schoolsSnap.docs.map(async (docSnap) => {
    const data = docSnap.data();
    const primaryAdminUid = data.primaryAdminUid || null;
    let primaryAdmin = null;

    if (primaryAdminUid) {
      const [canonicalUserSnap, profileSnap] = await Promise.all([
        db.collection("users").doc(primaryAdminUid).get(),
        db.collection("profiles").doc(primaryAdminUid).get(),
      ]);
      if (canonicalUserSnap.exists) {
        const canonicalData = canonicalUserSnap.data();
        primaryAdmin = {
          uid: primaryAdminUid,
          name: canonicalData?.displayName || "Unknown",
          email: canonicalData?.email || "",
        };
      } else if (profileSnap.exists) {
        const profileData = profileSnap.data();
        primaryAdmin = {
          uid: primaryAdminUid,
          name: profileData?.name || "Unknown",
          email: profileData?.email || "",
        };
      } else {
        primaryAdmin = {uid: primaryAdminUid, name: "Unknown", email: ""};
      }
    }

    return {
      schoolId: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : null,
      primaryAdmin,
    };
  }));

  return {
    ok: true,
    items,
  };
});

exports.adminListSchoolAdminCandidates = onCall(async (request) => {
  await assertAdminRole(request);

  const canonicalUsersSnap = await db.collection("users")
      .where("primaryRole", "==", "school_admin")
      .limit(200)
      .get();

  const items = canonicalUsersSnap.docs
      .map((docSnap) => {
        const data = docSnap.data() || {};
        return {
          id: docSnap.id,
          name: data.displayName || "Unknown",
          email: data.email || "",
          role: "school_admin",
          status: data.status || "active",
        };
      })
      .filter((candidate) => candidate.status === "active");

  return {
    ok: true,
    items,
    debug: {
      source: "users.primaryRole",
      matchedCanonicalUsers: canonicalUsersSnap.size,
      eligibleCandidates: items.length,
    },
  };
});

exports.adminCreateSchool = onCall(async (request) => {
  const uid = await assertAdminRole(request);
  const data = request.data || {};

  const name = typeof data.name === "string" ? data.name.trim() : "";
  const rawCountry = typeof data.country === "string" ? data.country.trim() : "";
  const normalizedCountry = normalizeCountryValue(rawCountry);
  const country = normalizedCountry ? COUNTRY_LABELS[normalizedCountry] : "";
  const schoolType = typeof data.schoolType === "string" ? data.schoolType.trim() : "other";
  const onboardingMode = typeof data.onboardingMode === "string" ? data.onboardingMode.trim() : "admin_created";
  const schoolAdminUid = typeof data.schoolAdminUid === "string" ? data.schoolAdminUid.trim() : "";
  const shortName = typeof data.shortName === "string" ? data.shortName.trim() : null;
  const registrationNumber = typeof data.registrationNumber === "string" ? data.registrationNumber.trim() : null;
  const district = typeof data.district === "string" ? data.district.trim() : null;

  if (!name) {
    throw new HttpsError("invalid-argument", "School name is required.");
  }
  if (!country) {
    throw new HttpsError("invalid-argument", "Country is required.");
  }
  if (!schoolAdminUid) {
    throw new HttpsError("invalid-argument", "A first school admin user is required.");
  }

  const allowedSchoolTypes = ["primary", "secondary", "mixed", "other"];
  if (!allowedSchoolTypes.includes(schoolType)) {
    throw new HttpsError("invalid-argument", "Invalid school type.");
  }

  const schoolAdminAuthUser = await admin.auth().getUser(schoolAdminUid).catch(() => null);
  if (!schoolAdminAuthUser) {
    throw new HttpsError("not-found", "Selected school admin auth user was not found.");
  }

  const schoolAdminRole = await getRoleForUser(schoolAdminUid, null);
  if (schoolAdminRole !== "school_admin") {
    throw new HttpsError(
        "failed-precondition",
        "Selected user must already have the school_admin role before linking to a school.",
    );
  }

  const [schoolAdminProfileSnap, schoolAdminCanonicalUserSnap] = await Promise.all([
    db.collection("profiles").doc(schoolAdminUid).get(),
    db.collection("users").doc(schoolAdminUid).get(),
  ]);
  if (!schoolAdminProfileSnap.exists && !schoolAdminCanonicalUserSnap.exists) {
    throw new HttpsError("failed-precondition", "Selected school admin is missing a profile record.");
  }

  const now = admin.firestore.Timestamp.now();
  const schoolId = generateSchoolId(name);
  const schoolRef = db.collection("schools").doc(schoolId);
  const schoolAdminLinkId = `${schoolId}_${schoolAdminUid}`;
  const schoolAdminLinkRef = db.collection("school_admin_links").doc(schoolAdminLinkId);
  const canonicalUserRef = db.collection("users").doc(schoolAdminUid);
  const adultProfileRef = db.collection("adult_profiles").doc(schoolAdminUid);

  const schoolData = {
    schoolId,
    name,
    shortName,
    registrationNumber,
    country,
    district,
    schoolType,
    status: "active",
    subscriptionTier: "free",
    onboardingMode,
    primaryAdminUid: schoolAdminUid,
    billingOwnerUid: schoolAdminUid,
    createdAt: now,
    updatedAt: now,
    createdBy: uid,
  };

  const schoolAdminProfile = schoolAdminProfileSnap.data() || {};
  const schoolAdminCanonicalUser = schoolAdminCanonicalUserSnap.data() || {};
  const [firstName = "", ...restNameParts] = (
    schoolAdminProfile?.name ||
    schoolAdminCanonicalUser?.displayName ||
    schoolAdminAuthUser.displayName ||
    ""
  )
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  const lastName = restNameParts.join(" ") || "";

  await db.runTransaction(async (tx) => {
    const existingSchool = await tx.get(schoolRef);
    if (existingSchool.exists) {
      throw new HttpsError("already-exists", "Generated school ID already exists. Retry the request.");
    }

    tx.set(schoolRef, schoolData);
    tx.set(schoolAdminLinkRef, {
      linkId: schoolAdminLinkId,
      schoolId,
      uid: schoolAdminUid,
      role: "owner",
      status: "active",
      permissions: {
        manageStudents: true,
        manageTeachers: true,
        manageBilling: true,
        viewAnalytics: true,
      },
      createdAt: now,
      createdBy: uid,
    });
    tx.set(canonicalUserRef, {
      uid: schoolAdminUid,
      primaryRole: "school_admin",
      secondaryRoles: [],
      status: "active",
      displayName:
        schoolAdminCanonicalUser?.displayName ||
        schoolAdminProfile?.name ||
        schoolAdminAuthUser.displayName ||
        schoolAdminAuthUser.email ||
        "School Admin",
      email: schoolAdminCanonicalUser?.email || schoolAdminProfile?.email || schoolAdminAuthUser.email || null,
      phone: schoolAdminCanonicalUser?.phone || schoolAdminProfile?.phone || null,
      hasEmailLogin: Boolean(schoolAdminAuthUser.email),
      createdAt: schoolAdminCanonicalUser?.createdAt || schoolAdminProfile?.created_at || now,
      updatedAt: now,
      createdBy: schoolAdminCanonicalUser?.createdBy || schoolAdminProfile?.created_by || null,
      authProviderSummary: {
        hasPassword: true,
        providers: schoolAdminAuthUser.providerData.map((provider) => provider.providerId).filter(Boolean),
      },
      profileVersion: 2,
    }, {merge: true});
    tx.set(adultProfileRef, {
      uid: schoolAdminUid,
      adultType: "school_admin",
      firstName: schoolAdminProfile?.firstName || firstName,
      lastName: schoolAdminProfile?.lastName || lastName,
      phone: schoolAdminCanonicalUser?.phone || schoolAdminProfile?.phone || null,
      country,
      jobTitle: schoolAdminProfile?.contact_person || "School Administrator",
      status: "active",
      createdAt: schoolAdminCanonicalUser?.createdAt || schoolAdminProfile?.created_at || now,
      updatedAt: now,
    }, {merge: true});
  });

  return {
    ok: true,
    schoolId,
    school: {
      ...schoolData,
      createdAt: new Date(now.toMillis()).toISOString(),
      updatedAt: new Date(now.toMillis()).toISOString(),
    },
    schoolAdminLinkId,
  };
});

exports.adminResetIdentitySystem = onCall(async (request) => {
  const actorUid = await assertSuperAdminRole(request);
  const data = request.data || {};
  const dryRun = data.dryRun !== false;
  const confirm = typeof data.confirm === "string" ? data.confirm.trim() : "";

  if (!dryRun && confirm !== RESET_CONFIRM_TOKEN) {
    throw new HttpsError(
        "failed-precondition",
        `Set confirm to ${RESET_CONFIRM_TOKEN} to execute the identity reset.`,
    );
  }

  const roleMaps = await loadRoleMaps();
  const authUsers = await listAllAuthUsers();
  const preservedAuthUsers = [];
  const authUsersToDelete = [];

  for (const authUser of authUsers) {
    const resolvedRole = await getResolvedRoleForUser(
        authUser.uid,
        {uid: authUser.uid, role: authUser.customClaims?.role || null},
        roleMaps,
    );
    if (resolvedRole === "admin" || resolvedRole === "super_admin") {
      preservedAuthUsers.push(authUser);
    } else {
      authUsersToDelete.push(authUser);
    }
  }

  const preservedSummaries = dryRun ?
    preservedAuthUsers.map((authUser) => ({
      uid: authUser.uid,
      email: authUser.email || null,
      role: authUser.customClaims?.role || roleMaps.canonicalRoles[authUser.uid] || roleMaps.legacyRoles[authUser.uid] || null,
    })) :
    await createCanonicalUsersForPreservedAdmins(preservedAuthUsers, roleMaps);

  const fullResetCollections = [
    "profiles",
    "user_roles",
    "linked_accounts",
    "link_codes",
    "link_requests",
    "schools",
    "student_profiles",
    "student_access",
    "auth_login_aliases",
    "parent_student_links",
    "school_student_links",
    "teacher_student_links",
    "teacher_school_links",
    "school_admin_links",
    "student_creation_records",
    "admin_preview_sessions",
  ];

  const firestoreCollections = [];
  for (const collectionName of fullResetCollections) {
    firestoreCollections.push(await resetCollection(collectionName, dryRun));
  }

  const preservedUserIds = new Set(preservedAuthUsers.map((authUser) => authUser.uid));
  const prunedCollections = [
    await pruneCollectionByDocId("users", preservedUserIds, dryRun),
    await pruneCollectionByDocId("adult_profiles", preservedUserIds, dryRun),
  ];

  const authDeletionSummary = {
    matched: authUsers.length,
    preserved: preservedAuthUsers.length,
    wouldDelete: dryRun ? authUsersToDelete.length : 0,
    deleted: 0,
    failures: [],
  };

  if (!dryRun && authUsersToDelete.length > 0) {
    for (const chunk of chunkArray(authUsersToDelete.map((authUser) => authUser.uid), 100)) {
      const result = await admin.auth().deleteUsers(chunk);
      authDeletionSummary.deleted += result.successCount;
      result.errors.forEach((error) => {
        authDeletionSummary.failures.push({
          index: error.index,
          uid: chunk[error.index],
          error: error.error?.message || "delete-failed",
        });
      });
    }
  }

  logger.info("adminResetIdentitySystem completed", {
    actorUid,
    dryRun,
    preservedUsers: preservedSummaries,
    authDeletionSummary,
    firestoreCollections,
    prunedCollections,
  });

  return {
    ok: true,
    dryRun,
    confirmRequiredToken: dryRun ? RESET_CONFIRM_TOKEN : null,
    actorUid,
    preservedUsers: preservedSummaries,
    auth: authDeletionSummary,
    firestoreCollections,
    prunedCollections,
  };
});

exports.adminProvisionIdentityTestUser = onCall(async (request) => {
  const actorUid = await assertAdminRole(request);
  const data = request.data || {};
  const role = typeof data.role === "string" ? data.role.trim() : "";
  const email = normalizeEmail(data.email);
  const displayName = typeof data.displayName === "string" ? data.displayName.trim() : "";
  const rawCountry = typeof data.country === "string" ? data.country.trim() : "";
  const normalizedCountry = rawCountry ? normalizeCountryValue(rawCountry) : "UGANDA";
  if (!normalizedCountry) {
    throw new HttpsError("invalid-argument", "country must be one of: Uganda, Kenya, Tanzania, Rwanda, Burundi.");
  }
  const country = COUNTRY_LABELS[normalizedCountry];
  const passwordInput = typeof data.password === "string" ? data.password.trim() : "";

  if (!["parent", "teacher", "school_admin"].includes(role)) {
    throw new HttpsError("invalid-argument", "role must be one of: parent, teacher, school_admin.");
  }
  if (!email) {
    throw new HttpsError("invalid-argument", "email is required.");
  }
  if (!displayName) {
    throw new HttpsError("invalid-argument", "displayName is required.");
  }

  const password = passwordInput || makeTemporarySecret(12);
  if (password.length < 8) {
    throw new HttpsError("invalid-argument", "password must be at least 8 characters long.");
  }

  let authUser;
  let created = false;

  try {
    authUser = await admin.auth().getUserByEmail(email);
  } catch (error) {
    if (error && error.code === "auth/user-not-found") {
      authUser = await admin.auth().createUser({
        email,
        password,
        displayName,
        disabled: false,
      });
      created = true;
    } else {
      throw error;
    }
  }

  if (!created) {
    const updatePayload = {};
    if (displayName && displayName !== authUser.displayName) {
      updatePayload.displayName = displayName;
    }
    if (passwordInput) {
      updatePayload.password = password;
    }
    if (Object.keys(updatePayload).length > 0) {
      authUser = await admin.auth().updateUser(authUser.uid, updatePayload);
    }
  }

  await admin.auth().setCustomUserClaims(authUser.uid, {role});

  const now = admin.firestore.Timestamp.now();
  const canonicalUserRef = db.collection("users").doc(authUser.uid);
  const adultProfileRef = db.collection("adult_profiles").doc(authUser.uid);
  const existingCanonicalUserSnap = await canonicalUserRef.get();
  const existingCanonicalUser = existingCanonicalUserSnap.exists ? existingCanonicalUserSnap.data() : null;
  const nameParts = splitDisplayName(displayName);

  const secondaryRoles = Array.from(new Set([
    ...(Array.isArray(existingCanonicalUser?.secondaryRoles) ? existingCanonicalUser.secondaryRoles : []),
    existingCanonicalUser?.primaryRole,
  ].filter((entry) => typeof entry === "string" && entry !== role)));

  await db.runTransaction(async (tx) => {
    tx.set(canonicalUserRef, {
      uid: authUser.uid,
      primaryRole: role,
      secondaryRoles,
      status: "active",
      displayName,
      email,
      phone: existingCanonicalUser?.phone || null,
      hasEmailLogin: true,
      createdAt: existingCanonicalUser?.createdAt ||
        (authUser.metadata?.creationTime ?
          admin.firestore.Timestamp.fromDate(new Date(authUser.metadata.creationTime)) :
          now),
      updatedAt: now,
      createdBy: existingCanonicalUser?.createdBy || actorUid,
      authProviderSummary: buildAuthProviderSummary(authUser),
      profileVersion: 2,
    }, {merge: true});

    tx.set(adultProfileRef, {
      uid: authUser.uid,
      adultType: role,
      firstName: nameParts.firstName || role,
      lastName: nameParts.lastName || "",
      phone: null,
      country,
      jobTitle: role === "school_admin" ? "School Administrator" : null,
      status: "active",
      createdAt: existingCanonicalUser?.createdAt || now,
      updatedAt: now,
    }, {merge: true});
  });

  logger.info("adminProvisionIdentityTestUser completed", {
    actorUid,
    targetUid: authUser.uid,
    email,
    role,
    created,
  });

  return {
    ok: true,
    created,
    uid: authUser.uid,
    email,
    role,
    displayName,
    passwordIssued: created || Boolean(passwordInput),
    temporaryPassword: created || Boolean(passwordInput) ? password : null,
  };
});

exports.completeAdultSelfSignup = onCall(async (request) => {
  logger.info("completeAdultSelfSignup:start", {
    hasAuth: Boolean(request.auth),
    requestedRole: coerceOptionalString(request.data?.role) || null,
  });

  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const uid = request.auth.uid;
    logger.info("completeAdultSelfSignup:authUidPresent", {uid});

    const requestedRole = coerceOptionalString(request.data?.role);
    if (!["parent", "teacher", "school_admin"].includes(requestedRole || "")) {
      throw new HttpsError("invalid-argument", "role must be one of: parent, teacher, school_admin.");
    }
    logger.info("completeAdultSelfSignup:roleValidated", {uid, role: requestedRole});

    const authUser = await admin.auth().getUser(uid).catch(() => null);
    logger.info("completeAdultSelfSignup:authUserLookup", {
      uid,
      found: Boolean(authUser),
      hasEmail: Boolean(authUser?.email),
    });
    if (!authUser) {
      throw new HttpsError("not-found", "Authenticated Firebase user was not found.");
    }

    const displayNameInput = coerceOptionalString(request.data?.displayName);
    const rawCountry = coerceOptionalString(request.data?.country) || "";
    const normalizedCountry = rawCountry ? normalizeCountryValue(rawCountry) : null;
    const country = normalizedCountry ? COUNTRY_LABELS[normalizedCountry] : null;
    const phone = coerceOptionalString(request.data?.phone) || null;
    const jobTitle = coerceOptionalString(request.data?.jobTitle) || null;
    const fallbackDisplayName = authUser.displayName || authUser.email || "Adult User";
    const displayName = displayNameInput || fallbackDisplayName;
    const nameParts = splitDisplayName(displayName);
    const createdAt =
      authUser.metadata?.creationTime ?
        admin.firestore.Timestamp.fromDate(new Date(authUser.metadata.creationTime)) :
        admin.firestore.Timestamp.now();
    const now = admin.firestore.Timestamp.now();

    await admin.auth().setCustomUserClaims(uid, {
      ...(authUser.customClaims || {}),
      role: requestedRole,
    });
    logger.info("completeAdultSelfSignup:customClaimSet", {uid, role: requestedRole});

    const canonicalUserRef = db.collection("users").doc(uid);
    const adultProfileRef = db.collection("adult_profiles").doc(uid);
    const progressRef = db.collection("user_progress").doc(uid);

    await db.runTransaction(async (tx) => {
      const [canonicalUserSnap, adultProfileSnap, progressSnap] = await Promise.all([
        tx.get(canonicalUserRef),
        tx.get(adultProfileRef),
        tx.get(progressRef),
      ]);
      const existingCanonicalUser = canonicalUserSnap.exists ? canonicalUserSnap.data() || {} : {};
      const existingAdultProfile = adultProfileSnap.exists ? adultProfileSnap.data() || {} : {};
      const existingProgress = progressSnap.exists ? progressSnap.data() || {} : {};
      const existingPrimaryRole =
        typeof existingCanonicalUser.primaryRole === "string" ? existingCanonicalUser.primaryRole : null;
      const secondaryRoles = Array.from(new Set([
        ...(Array.isArray(existingCanonicalUser.secondaryRoles) ? existingCanonicalUser.secondaryRoles : []),
        existingPrimaryRole,
      ].filter((entry) => typeof entry === "string" && entry !== requestedRole)));

      tx.set(canonicalUserRef, {
        uid,
        primaryRole: requestedRole,
        secondaryRoles,
        status: "active",
        displayName,
        email: authUser.email || existingCanonicalUser.email || null,
        phone,
        hasEmailLogin: Boolean(authUser.email),
        createdAt: existingCanonicalUser.createdAt || createdAt,
        updatedAt: now,
        createdBy: existingCanonicalUser.createdBy || null,
        authProviderSummary: buildAuthProviderSummary(authUser),
        profileVersion: 2,
      }, {merge: true});

      tx.set(adultProfileRef, {
        uid,
        adultType: requestedRole,
        firstName: existingAdultProfile.firstName || nameParts.firstName || requestedRole,
        lastName: existingAdultProfile.lastName || nameParts.lastName || "",
        phone,
        country,
        jobTitle: jobTitle || existingAdultProfile.jobTitle || null,
        status: "active",
        createdAt: existingAdultProfile.createdAt || existingCanonicalUser.createdAt || createdAt,
        updatedAt: now,
      }, {merge: true});

      tx.set(progressRef, {
        xp: typeof existingProgress.xp === "number" ? existingProgress.xp : 0,
        streak: typeof existingProgress.streak === "number" ? existingProgress.streak : 0,
        updated_at: now,
      }, {merge: true});
    });

    logger.info("completeAdultSelfSignup:usersDocWrite", {uid, role: requestedRole});
    logger.info("completeAdultSelfSignup:adultProfileWrite", {uid, role: requestedRole});
    logger.info("completeAdultSelfSignup:userProgressWrite", {uid});
    logger.info("completeAdultSelfSignup:success", {
      uid,
      role: requestedRole,
      hasEmail: Boolean(authUser.email),
    });

    return {
      ok: true,
      uid,
      role: requestedRole,
    };
  } catch (error) {
    logger.error("completeAdultSelfSignup:failure", {
      uid: request.auth?.uid || null,
      code: error?.code || null,
      message: error?.message || "Unknown error",
    });
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Adult self-signup provisioning failed.");
  }
});

exports.createStudentAsParent = onCall(async (request) => {
  const creatorUid = await assertManagedStudentCreatorRole(request, "parent");
  const baseData = parseStudentProvisioningInput(request.data || {});

  return provisionManagedStudent({
    creatorUid,
    creatorRole: "parent",
    creationMethod: "parent_created",
    learningMode: "parent_managed",
    baseData,
    linkBuilder: ({studentUid, createdAt, createdBy}) => {
      const linkId = buildLinkId(creatorUid, studentUid);
      return {
        ref: db.collection("parent_student_links").doc(linkId),
        doc: {
          linkId,
          parentUid: creatorUid,
          studentUid,
          relationshipType: baseData.relationshipType,
          status: "active",
          permissions: {
            viewProgress: true,
            manageAccount: true,
            receiveAlerts: true,
          },
          createdAt,
          createdBy,
        },
        initialLinkTargets: {
          parentUid: creatorUid,
        },
      };
    },
  });
});

exports.listManagedStudentsAsParent = onCall(async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const creatorUid = await assertManagedStudentCreatorRole(request, "parent");

  try {
    const {items, debug} = await listParentManagedStudents(creatorUid);
    return {
      ok: true,
      creatorRole: "parent",
      items,
      debug,
    };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    const message =
      error?.message || "Failed to load parent-managed students.";
    throw new HttpsError("internal", message);
  }
});

exports.getParentChildPerformanceSummary = onCall(async (request) => {
  const parentUid = await assertManagedStudentCreatorRole(request, "parent");
  const studentUid = coerceOptionalString(request.data && request.data.studentUid);

  if (!studentUid) {
    throw new HttpsError("invalid-argument", "studentUid is required.");
  }

  const linkId = buildLinkId(parentUid, studentUid);
  const linkSnap = await db.collection("parent_student_links").doc(linkId).get();
  const linkData = linkSnap.exists ? linkSnap.data() || {} : null;

  if (
    !linkData ||
    linkData.parentUid !== parentUid ||
    linkData.studentUid !== studentUid ||
    (typeof linkData.status === "string" && linkData.status !== "active")
  ) {
    throw new HttpsError("permission-denied", "You do not have access to this student's performance summary.");
  }

  const [userSnap, studentProfileSnap, schoolLinkSnap] = await Promise.all([
    db.collection("users").doc(studentUid).get(),
    db.collection("student_profiles").doc(studentUid).get(),
    db.collection("school_student_links")
        .where("studentUid", "==", studentUid)
        .where("status", "==", "active")
        .limit(1)
        .get(),
  ]);

  let schoolName = null;
  if (!schoolLinkSnap.empty) {
    const schoolLink = schoolLinkSnap.docs[0].data() || {};
    const schoolId = typeof schoolLink.schoolId === "string" ? schoolLink.schoolId : null;
    if (schoolId) {
      const schoolSnap = await db.collection("schools").doc(schoolId).get();
      if (schoolSnap.exists) {
        schoolName = schoolSnap.data()?.name || null;
      }
    }
  }

  let attemptsSnap;
  try {
    attemptsSnap = await db.collection("exam_attempts")
        .where("userId", "==", studentUid)
        .orderBy("completedAt", "desc")
        .limit(100)
        .get();
  } catch (_error) {
    try {
      attemptsSnap = await db.collection("exam_attempts")
          .where("userId", "==", studentUid)
          .limit(100)
          .get();
    } catch (_fallbackError) {
      attemptsSnap = await db.collection("exam_attempts")
          .where("user_id", "==", studentUid)
          .limit(100)
          .get();
    }
  }

  const rawAttempts = attemptsSnap.docs.map((docSnap) => {
    const data = docSnap.data() || {};
    const examId = typeof data.examId === "string" ? data.examId :
      typeof data.exam_id === "string" ? data.exam_id :
      null;
    const completedAt = toIsoString(
        data.completedAt ||
        data.submittedAt ||
        data.completed_at ||
        data.submitted_at ||
        null,
    );
    const score = typeof data.finalScore === "number" ? data.finalScore :
      typeof data.score === "number" ? data.score :
      typeof data.autoScore === "number" ? data.autoScore :
      null;
    const total = typeof data.maxScore === "number" ? data.maxScore :
      typeof data.totalQuestions === "number" ? data.totalQuestions :
      typeof data.total_questions === "number" ? data.total_questions :
      null;
    const scorePercent = typeof score === "number" && typeof total === "number" && total > 0 ?
      Math.round((score / total) * 100) :
      null;

    return {
      id: docSnap.id,
      examId,
      completedAt,
      scorePercent,
    };
  }).sort((left, right) => (right.completedAt || "").localeCompare(left.completedAt || ""));

  const examIds = [...new Set(rawAttempts.map((attempt) => attempt.examId).filter(Boolean))];
  const examMap = new Map();

  await Promise.all(examIds.map(async (examId) => {
    const examSnap = await db.collection("exams").doc(examId).get();
    if (!examSnap.exists) return;
    const data = examSnap.data() || {};
    examMap.set(examId, {
      title: typeof data.title === "string" ? data.title : null,
      subject: typeof data.subject === "string" ? data.subject : null,
    });
  }));

  const attemptsWithExam = rawAttempts.map((attempt) => {
    const examData = attempt.examId ? examMap.get(attempt.examId) || null : null;
    return {
      ...attempt,
      examTitle: examData ? examData.title : null,
      subject: examData ? examData.subject : null,
    };
  });

  const scoredAttempts = attemptsWithExam.filter((attempt) => typeof attempt.scorePercent === "number");
  const subjectBuckets = new Map();
  scoredAttempts.forEach((attempt) => {
    if (!attempt.subject) return;
    const existing = subjectBuckets.get(attempt.subject) || {total: 0, count: 0};
    existing.total += attempt.scorePercent;
    existing.count += 1;
    subjectBuckets.set(attempt.subject, existing);
  });

  const subjectAverages = [...subjectBuckets.entries()].map(([subject, stats]) => ({
    subject,
    averageScorePercent: stats.count > 0 ? Math.round(stats.total / stats.count) : null,
  })).filter((entry) => typeof entry.averageScorePercent === "number");

  subjectAverages.sort((left, right) => {
    if (right.averageScorePercent === left.averageScorePercent) {
      return left.subject.localeCompare(right.subject);
    }
    return right.averageScorePercent - left.averageScorePercent;
  });

  const latestAttempts = attemptsWithExam.slice(0, 3).map((attempt) => ({
    examId: attempt.examId,
    examTitle: attempt.examTitle,
    subject: attempt.subject,
    scorePercent: attempt.scorePercent,
    completedAt: attempt.completedAt,
  }));

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
  const attemptsLast7Days = attemptsWithExam.filter((attempt) => {
    if (!attempt.completedAt) return false;
    const completedMs = new Date(attempt.completedAt).getTime();
    return !Number.isNaN(completedMs) && completedMs >= sevenDaysAgo;
  }).length;

  const averageScorePercent = scoredAttempts.length > 0 ?
    Math.round(scoredAttempts.reduce((sum, attempt) => sum + attempt.scorePercent, 0) / scoredAttempts.length) :
    null;

  const lastActivityAt = attemptsWithExam[0]?.completedAt || null;
  const lastActivityMs = lastActivityAt ? new Date(lastActivityAt).getTime() : Number.NaN;
  const inactive = !lastActivityAt || Number.isNaN(lastActivityMs) || lastActivityMs < fourteenDaysAgo;

  const userData = userSnap.exists ? userSnap.data() || {} : {};
  const studentProfileData = studentProfileSnap.exists ? studentProfileSnap.data() || {} : {};
  const displayName = typeof userData.displayName === "string" ? userData.displayName :
    `${studentProfileData.firstName || ""} ${studentProfileData.lastName || ""}`.trim() || null;

  return {
    ok: true,
    student: {
      uid: studentUid,
      displayName,
      educationLevel: typeof studentProfileData.educationLevel === "string" ? studentProfileData.educationLevel : null,
      schoolName,
    },
    summary: {
      latestAttempts,
      attemptsLast7Days,
      averageScorePercent,
      strongestSubject: subjectAverages[0] || null,
      weakestSubject: subjectAverages.length > 0 ? subjectAverages[subjectAverages.length - 1] : null,
      lastActivityAt,
      inactive,
    },
  };
});

exports.getTeacherStudentPerformanceSummary = onCall(async (request) => {
  const teacherUid = await assertManagedStudentCreatorRole(request, "teacher");
  const studentUid = coerceOptionalString(request.data && request.data.studentUid);

  if (!studentUid) {
    throw new HttpsError("invalid-argument", "studentUid is required.");
  }

  const linkId = buildLinkId(teacherUid, studentUid);
  const linkSnap = await db.collection("teacher_student_links").doc(linkId).get();
  const linkData = linkSnap.exists ? linkSnap.data() || {} : null;

  if (
    !linkData ||
    linkData.teacherUid !== teacherUid ||
    linkData.studentUid !== studentUid ||
    (typeof linkData.status === "string" && linkData.status !== "active")
  ) {
    throw new HttpsError("permission-denied", "You do not have access to this student's performance summary.");
  }

  if (
    linkData.permissions &&
    typeof linkData.permissions === "object" &&
    linkData.permissions.viewProgress === false
  ) {
    throw new HttpsError("permission-denied", "Progress access is not permitted for this student link.");
  }

  const [userSnap, studentProfileSnap, schoolLinkSnap] = await Promise.all([
    db.collection("users").doc(studentUid).get(),
    db.collection("student_profiles").doc(studentUid).get(),
    db.collection("school_student_links")
        .where("studentUid", "==", studentUid)
        .where("status", "==", "active")
        .limit(1)
        .get(),
  ]);

  let schoolName = null;
  if (!schoolLinkSnap.empty) {
    const schoolLink = schoolLinkSnap.docs[0].data() || {};
    const schoolId = typeof schoolLink.schoolId === "string" ? schoolLink.schoolId : null;
    if (schoolId) {
      const schoolSnap = await db.collection("schools").doc(schoolId).get();
      if (schoolSnap.exists) {
        schoolName = schoolSnap.data()?.name || null;
      }
    }
  }

  let attemptsSnap;
  try {
    attemptsSnap = await db.collection("exam_attempts")
        .where("userId", "==", studentUid)
        .orderBy("completedAt", "desc")
        .limit(100)
        .get();
  } catch (_error) {
    try {
      attemptsSnap = await db.collection("exam_attempts")
          .where("userId", "==", studentUid)
          .limit(100)
          .get();
    } catch (_fallbackError) {
      attemptsSnap = await db.collection("exam_attempts")
          .where("user_id", "==", studentUid)
          .limit(100)
          .get();
    }
  }

  const rawAttempts = attemptsSnap.docs.map((docSnap) => {
    const data = docSnap.data() || {};
    const examId = typeof data.examId === "string" ? data.examId :
      typeof data.exam_id === "string" ? data.exam_id :
      null;
    const completedAt = toIsoString(
        data.completedAt ||
        data.submittedAt ||
        data.completed_at ||
        data.submitted_at ||
        null,
    );
    const score = typeof data.finalScore === "number" ? data.finalScore :
      typeof data.score === "number" ? data.score :
      typeof data.autoScore === "number" ? data.autoScore :
      null;
    const total = typeof data.maxScore === "number" ? data.maxScore :
      typeof data.totalQuestions === "number" ? data.totalQuestions :
      typeof data.total_questions === "number" ? data.total_questions :
      null;
    const scorePercent = typeof score === "number" && typeof total === "number" && total > 0 ?
      Math.round((score / total) * 100) :
      null;

    return {
      id: docSnap.id,
      examId,
      completedAt,
      scorePercent,
    };
  }).sort((left, right) => (right.completedAt || "").localeCompare(left.completedAt || ""));

  const examIds = [...new Set(rawAttempts.map((attempt) => attempt.examId).filter(Boolean))];
  const examMap = new Map();

  await Promise.all(examIds.map(async (examId) => {
    const examSnap = await db.collection("exams").doc(examId).get();
    if (!examSnap.exists) return;
    const data = examSnap.data() || {};
    examMap.set(examId, {
      title: typeof data.title === "string" ? data.title : null,
      subject: typeof data.subject === "string" ? data.subject : null,
    });
  }));

  const attemptsWithExam = rawAttempts.map((attempt) => {
    const examData = attempt.examId ? examMap.get(attempt.examId) || null : null;
    return {
      ...attempt,
      examTitle: examData ? examData.title : null,
      subject: examData ? examData.subject : null,
    };
  });

  const scoredAttempts = attemptsWithExam.filter((attempt) => typeof attempt.scorePercent === "number");
  const subjectBuckets = new Map();
  scoredAttempts.forEach((attempt) => {
    if (!attempt.subject) return;
    const existing = subjectBuckets.get(attempt.subject) || {total: 0, count: 0};
    existing.total += attempt.scorePercent;
    existing.count += 1;
    subjectBuckets.set(attempt.subject, existing);
  });

  const subjectAverages = [...subjectBuckets.entries()].map(([subject, stats]) => ({
    subject,
    averageScorePercent: stats.count > 0 ? Math.round(stats.total / stats.count) : null,
  })).filter((entry) => typeof entry.averageScorePercent === "number");

  subjectAverages.sort((left, right) => {
    if (right.averageScorePercent === left.averageScorePercent) {
      return left.subject.localeCompare(right.subject);
    }
    return right.averageScorePercent - left.averageScorePercent;
  });

  const latestAttempts = attemptsWithExam.slice(0, 3).map((attempt) => ({
    examId: attempt.examId,
    examTitle: attempt.examTitle,
    subject: attempt.subject,
    scorePercent: attempt.scorePercent,
    completedAt: attempt.completedAt,
  }));

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
  const attemptsLast7Days = attemptsWithExam.filter((attempt) => {
    if (!attempt.completedAt) return false;
    const completedMs = new Date(attempt.completedAt).getTime();
    return !Number.isNaN(completedMs) && completedMs >= sevenDaysAgo;
  }).length;

  const averageScorePercent = scoredAttempts.length > 0 ?
    Math.round(scoredAttempts.reduce((sum, attempt) => sum + attempt.scorePercent, 0) / scoredAttempts.length) :
    null;

  const lastActivityAt = attemptsWithExam[0]?.completedAt || null;
  const lastActivityMs = lastActivityAt ? new Date(lastActivityAt).getTime() : Number.NaN;
  const inactive = !lastActivityAt || Number.isNaN(lastActivityMs) || lastActivityMs < fourteenDaysAgo;

  const userData = userSnap.exists ? userSnap.data() || {} : {};
  const studentProfileData = studentProfileSnap.exists ? studentProfileSnap.data() || {} : {};
  const displayName = typeof userData.displayName === "string" ? userData.displayName :
    `${studentProfileData.firstName || ""} ${studentProfileData.lastName || ""}`.trim() || null;

  return {
    ok: true,
    student: {
      uid: studentUid,
      displayName,
      educationLevel: typeof studentProfileData.educationLevel === "string" ? studentProfileData.educationLevel : null,
      schoolName,
    },
    summary: {
      latestAttempts,
      attemptsLast7Days,
      averageScorePercent,
      strongestSubject: subjectAverages[0] || null,
      weakestSubject: subjectAverages.length > 0 ? subjectAverages[subjectAverages.length - 1] : null,
      lastActivityAt,
      inactive,
    },
  };
});

exports.createStudentAsTeacher = onCall(async (request) => {
  const creatorUid = await assertManagedStudentCreatorRole(request, "teacher");
  const baseData = parseStudentProvisioningInput(request.data || {});

  return provisionManagedStudent({
    creatorUid,
    creatorRole: "teacher",
    creationMethod: "teacher_created",
    learningMode: "teacher_managed",
    baseData,
    linkBuilder: ({studentUid, createdAt, createdBy}) => {
      const linkId = buildLinkId(creatorUid, studentUid);
      return {
        ref: db.collection("teacher_student_links").doc(linkId),
        doc: {
          linkId,
          teacherUid: creatorUid,
          studentUid,
          status: "active",
          source: "teacher_created",
          scope: "full",
          subjectTags: baseData.subjectTags,
          permissions: {
            viewProgress: true,
            assignWork: true,
            futureMarking: true,
          },
          createdAt,
          createdBy,
        },
        initialLinkTargets: {
          teacherUids: [creatorUid],
        },
      };
    },
  });
});

exports.listManagedStudentsAsTeacher = onCall(async (request) => {
  logger.info("listManagedStudentsAsTeacher:start", {
    hasAuth: Boolean(request.auth),
  });
  try {
    logger.info("listManagedStudentsAsTeacher:authValidation", {
      requestUid: request.auth?.uid || null,
    });
    const creatorUid = await assertManagedStudentCreatorRole(request, "teacher");
    logger.info("listManagedStudentsAsTeacher:teacherUidResolved", {
      teacherUid: creatorUid,
    });
    const result = await listTeacherManagedStudents(creatorUid);
    logger.info("listManagedStudentsAsTeacher:success", {
      teacherUid: creatorUid,
      totalLinks: result.stats.totalLinks,
      hydrated: result.stats.hydrated,
      skippedMalformedLinks: result.stats.skippedMalformedLinks,
      missingUsers: result.stats.missingUsers,
      missingStudentProfiles: result.stats.missingStudentProfiles,
    });
    return {
      ok: true,
      creatorRole: "teacher",
      items: result.items,
      debug: result.stats,
    };
  } catch (error) {
    logger.error("listManagedStudentsAsTeacher:failed", {
      teacherUid: request.auth?.uid || null,
      code: error?.code || null,
      message: error?.message || "unknown",
    });
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to load teacher-managed students.");
  }
});

exports.getTeacherDashboardContext = onCall(async (request) => {
  const teacherUid = await assertManagedStudentCreatorRole(request, "teacher");
  const activeSchools = await getTeacherActiveSchools(teacherUid);
  return {
    ok: true,
    activeSchools,
  };
});

exports.createStudentAsSchoolAdmin = onCall(async (request) => {
  const creatorUid = await assertManagedStudentCreatorRole(request, "school_admin");
  const baseData = parseStudentProvisioningInput(request.data || {});

  if (!baseData.schoolId) {
    throw new HttpsError("invalid-argument", "schoolId is required for school-admin student creation.");
  }

  await assertActiveSchoolAdminLink(creatorUid, baseData.schoolId);

  return provisionManagedStudent({
    creatorUid,
    creatorRole: "school_admin",
    creationMethod: "school_admin_created",
    learningMode: "school_managed",
    baseData,
    linkBuilder: ({studentUid, createdAt, createdBy}) => {
      const linkId = buildLinkId(baseData.schoolId, studentUid);
      return {
        ref: db.collection("school_student_links").doc(linkId),
        doc: {
          linkId,
          schoolId: baseData.schoolId,
          studentUid,
          status: "active",
          studentNumber: baseData.studentNumber,
          className: baseData.className,
          streamName: baseData.streamName,
          startDate: null,
          endDate: null,
          permissions: {
            viewProgress: true,
            manageRoster: true,
          },
          createdAt,
          createdBy,
        },
        initialLinkTargets: {
          schoolId: baseData.schoolId,
        },
      };
    },
  });
});

exports.listManagedStudentsAsSchoolAdmin = onCall(async (request) => {
  const creatorUid = await assertManagedStudentCreatorRole(request, "school_admin");
  const roster = await listSchoolAdminManagedStudents(creatorUid);
  return {
    ok: true,
    creatorRole: "school_admin",
    ...roster,
  };
});

exports.generateStudentInviteAsParent = onCall(async (request) => {
  const parentUid = await assertManagedStudentCreatorRole(request, "parent");
  const result = await createStudentLinkCodeRecord({
    studentUid: null,
    studentDisplayName: null,
    studentCountry: null,
    studentEducationLevel: null,
    issuerUid: parentUid,
    issuerRole: "parent",
    targetType: "parent",
  });

  return {
    ok: true,
    ...result,
    targetType: "parent",
    expiresAt: toIsoString(result.expiresAt),
  };
});

exports.listStudentInvitesAsParent = onCall(async (request) => {
  const parentUid = await assertManagedStudentCreatorRole(request, "parent");
  logger.info("listStudentInvitesAsParent:start", {
    parentUid,
    queryPath: "student_link_codes issuerUid/issuerRole/targetType/status orderBy createdAt desc",
  });
  try {
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

    logger.info("listStudentInvitesAsParent:success", {
      parentUid,
      count: items.length,
    });
    return {ok: true, items};
  } catch (error) {
    logger.error("listStudentInvitesAsParent:failed", {
      parentUid,
      message: error?.message || "unknown",
      code: error?.code || null,
    });
    if (error?.code === 9 || error?.code === "failed-precondition") {
      throw new HttpsError(
          "failed-precondition",
          "Missing Firestore index for parent-issued student_link_codes.",
      );
    }
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to load parent-issued invite codes.");
  }
});

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

exports.generateStudentInviteAsTeacher = onCall(async (request) => {
  const teacherUid = await assertManagedStudentCreatorRole(request, "teacher");
  const result = await createStudentLinkCodeRecord({
    studentUid: null,
    studentDisplayName: null,
    studentCountry: null,
    studentEducationLevel: null,
    issuerUid: teacherUid,
    issuerRole: "teacher",
    targetType: "teacher",
  });

  return {
    ok: true,
    ...result,
    targetType: "teacher",
    expiresAt: toIsoString(result.expiresAt),
  };
});

exports.listStudentInvitesAsTeacher = onCall(async (request) => {
  const teacherUid = await assertManagedStudentCreatorRole(request, "teacher");
  logger.info("listStudentInvitesAsTeacher:start", {
    teacherUid,
    queryPath: "student_link_codes issuerUid/issuerRole/targetType/status orderBy createdAt desc",
  });
  try {
    const snap = await db.collection("student_link_codes")
        .where("issuerUid", "==", teacherUid)
        .where("issuerRole", "==", "teacher")
        .where("targetType", "==", "teacher")
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

    logger.info("listStudentInvitesAsTeacher:success", {
      teacherUid,
      count: items.length,
    });
    return {ok: true, items};
  } catch (error) {
    logger.error("listStudentInvitesAsTeacher:failed", {
      teacherUid,
      message: error?.message || "unknown",
      code: error?.code || null,
    });
    if (error?.code === 9 || error?.code === "failed-precondition") {
      throw new HttpsError(
          "failed-precondition",
          "Missing Firestore index for teacher-issued student_link_codes.",
      );
    }
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to load teacher-issued invite codes.");
  }
});

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
      schoolId: data.schoolId || null,
    };
  });

  return {ok: true, items};
});

exports.generateStudentLinkCode = onCall(async (request) => {
  const studentUid = await assertStudentRole(request);
  const targetType = coerceOptionalString(request.data?.targetType);
  if (targetType !== "parent" && targetType !== "school_admin" && targetType !== "teacher") {
    throw new HttpsError("invalid-argument", "targetType must be parent, school_admin, or teacher.");
  }

  const resolved = await resolveStudentIdentityByUid(studentUid);
  logger.info("generateStudentLinkCode:resolve", {
    studentUid,
    source: resolved.source,
    canonicalUserExists: resolved.canonicalUserExists,
    legacyProfileExists: resolved.legacyProfileExists,
  });

  if (resolved.source === "missing") {
    throw new HttpsError("failed-precondition", "Canonical student identity is missing. Expected users/{uid} and student_profiles/{uid}.");
  }

  const result = await createStudentLinkCodeRecord({
    studentUid,
    studentDisplayName: resolved.displayName,
    studentCountry: resolved.country,
    studentEducationLevel: resolved.educationLevel,
    issuerUid: studentUid,
    issuerRole: "student",
    targetType,
  });

  return {
    ok: true,
    ...result,
    targetType,
    expiresAt: toIsoString(result.expiresAt),
  };
});

exports.listStudentLinkCodes = onCall(async (request) => {
  const studentUid = await assertStudentRole(request);
  logger.info("listStudentLinkCodes:start", {studentUid});
  try {
    const snap = await db.collection("student_link_codes")
        .where("studentUid", "==", studentUid)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();

    const items = snap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        codeId: docSnap.id,
        code: data.code || null,
        codeNormalized: data.codeNormalized || null,
        targetType: data.targetType || null,
        status: data.status || null,
        expiresAt: toIsoString(data.expiresAt),
        claimedByUid: data.claimedByUid || null,
        claimedAt: toIsoString(data.claimedAt),
        createdAt: toIsoString(data.createdAt),
      };
    });

    logger.info("listStudentLinkCodes:success", {
      studentUid,
      count: items.length,
    });
    return {ok: true, items};
  } catch (error) {
    logger.error("listStudentLinkCodes:failed", {
      studentUid,
      message: error?.message || "unknown",
      code: error?.code || null,
    });
    throw new HttpsError("internal", "Failed to load student link codes.");
  }
});

exports.claimStudentLinkFromInviteCode = onCall(async () => {
  throw new HttpsError("failed-precondition", "Legacy invite linking is disabled. Use claimStudentLinkCode.");
});

exports.getStudentLinkSummary = onCall(async (request) => {
  const studentUid = await assertStudentRole(request);
  const parentLinksSnap = await db.collection("parent_student_links")
      .where("studentUid", "==", studentUid)
      .get();
  const schoolLinksSnap = await db.collection("school_student_links")
      .where("studentUid", "==", studentUid)
      .get();
  const teacherLinksSnap = await db.collection("teacher_student_links")
      .where("studentUid", "==", studentUid)
      .get();

  const activeParentLinks = parentLinksSnap.docs
      .map((docSnap) => docSnap.data())
      .filter((link) => link.status === "active" && typeof link.parentUid === "string");
  const activeSchoolLinks = schoolLinksSnap.docs
      .map((docSnap) => docSnap.data())
      .filter((link) => link.status === "active" && typeof link.schoolId === "string");
  const activeTeacherLinks = teacherLinksSnap.docs
      .map((docSnap) => docSnap.data())
      .filter((link) => link.status === "active" && typeof link.teacherUid === "string");

  const uniqueParentUids = [...new Set(activeParentLinks.map((link) => link.parentUid))];
  const uniqueTeacherUids = [...new Set(activeTeacherLinks.map((link) => link.teacherUid))];

  const parentUserRefs = uniqueParentUids.map((uid) => db.collection("users").doc(uid));
  const teacherUserRefs = uniqueTeacherUids.map((uid) => db.collection("users").doc(uid));
  const schoolRef = activeSchoolLinks[0]?.schoolId ?
    db.collection("schools").doc(activeSchoolLinks[0].schoolId) :
    null;

  const teacherSchoolQueryPromises = uniqueTeacherUids.map((teacherUid) => db.collection("teacher_school_links")
      .where("teacherUid", "==", teacherUid)
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(2)
      .get());

  const [
    parentUserSnaps,
    teacherUserSnaps,
    schoolSnap,
    teacherSchoolLinkSnaps,
  ] = await Promise.all([
    parentUserRefs.length ? db.getAll(...parentUserRefs) : Promise.resolve([]),
    teacherUserRefs.length ? db.getAll(...teacherUserRefs) : Promise.resolve([]),
    schoolRef ? schoolRef.get() : Promise.resolve(null),
    teacherSchoolQueryPromises.length ? Promise.all(teacherSchoolQueryPromises) : Promise.resolve([]),
  ]);

  const parentUserMap = new Map(parentUserSnaps.map((snap) => [snap.id, snap.exists ? snap.data() : null]));
  const teacherUserMap = new Map(teacherUserSnaps.map((snap) => [snap.id, snap.exists ? snap.data() : null]));

  const teacherSchoolIdByTeacherUid = new Map();
  teacherSchoolLinkSnaps.forEach((snap, index) => {
    if (snap.size === 1) {
      const schoolId = snap.docs[0].data()?.schoolId;
      if (typeof schoolId === "string") {
        teacherSchoolIdByTeacherUid.set(uniqueTeacherUids[index], schoolId);
      }
    }
  });

  const uniqueTeacherSchoolIds = [...new Set([...teacherSchoolIdByTeacherUid.values()])];
  const teacherSchoolRefs = uniqueTeacherSchoolIds.map((schoolId) => db.collection("schools").doc(schoolId));
  const teacherSchoolSnaps = teacherSchoolRefs.length ? await db.getAll(...teacherSchoolRefs) : [];
  const teacherSchoolNameById = new Map(
      teacherSchoolSnaps.map((snap) => [snap.id, snap.exists ? snap.data()?.name || null : null]),
  );

  const parents = activeParentLinks.map((link) => {
    const parentUid = link.parentUid;
    const parentData = parentUserMap.get(parentUid) || null;
    return {
      uid: parentUid,
      displayName: parentData?.displayName || null,
      email: parentData?.email || null,
      relationshipLabel: link.relationshipType || "guardian",
    };
  });

  const teachers = activeTeacherLinks.map((link) => {
    const teacherUid = link.teacherUid;
    const teacherData = teacherUserMap.get(teacherUid) || null;
    const teacherSchoolId = teacherSchoolIdByTeacherUid.get(teacherUid) || null;
    return {
      uid: teacherUid,
      displayName: teacherData?.displayName || null,
      email: teacherData?.email || null,
      schoolName: teacherSchoolId ? teacherSchoolNameById.get(teacherSchoolId) || null : null,
    };
  });

  const response = {
    ok: true,
    parents,
    teachers,
    school: activeSchoolLinks[0]?.schoolId ? {
      id: activeSchoolLinks[0].schoolId,
      name: schoolSnap?.exists ? schoolSnap.data()?.name || null : null,
    } : null,
  };
  logger.info("getStudentLinkSummary:success", {
    studentUid,
    parentCount: parents.length,
    hasSchool: Boolean(activeSchoolLinks[0]),
    teacherCount: teachers.length,
  });
  return response;
});

exports.claimStudentLinkCode = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const authUid = request.auth.uid;
  const role = request.auth.token && request.auth.token.role ?
    request.auth.token.role :
    await getResolvedRoleForUser(authUid, null);

  if (role !== "parent" && role !== "school_admin" && role !== "student" && role !== "teacher") {
    throw new HttpsError("permission-denied", "Student, parent, school admin, or teacher access required.");
  }

  const codeInput = coerceOptionalString(request.data?.code);
  if (!codeInput) {
    throw new HttpsError("invalid-argument", "code is required.");
  }

  const codeNormalized = normalizeAccessCode(codeInput);
  const now = admin.firestore.Timestamp.now();

  return db.runTransaction(async (tx) => {
    const codeQuery = db.collection("student_link_codes")
        .where("codeNormalized", "==", codeNormalized)
        .limit(1);
    const codeSnap = await tx.get(codeQuery);
    if (codeSnap.empty) {
      throw new HttpsError("not-found", "Invalid student link code.");
    }

    const codeDoc = codeSnap.docs[0];
    const codeData = codeDoc.data();

    if (role === "parent" && codeData.targetType !== "parent") {
      throw new HttpsError("permission-denied", "This link code is not intended for parent linking.");
    }
    if (role === "school_admin" && codeData.targetType !== "school_admin") {
      throw new HttpsError("permission-denied", "This link code is not intended for school linking.");
    }
    if (role === "teacher" && codeData.targetType !== "teacher") {
      throw new HttpsError("permission-denied", "This link code is not intended for teacher linking.");
    }
    if (role === "student" && !["parent", "school_admin", "teacher"].includes(codeData.targetType || "")) {
      throw new HttpsError("permission-denied", "This link code is not intended for student linking.");
    }

    const studentUid = role === "student" ? authUid : codeData.studentUid;
    if (!studentUid) {
      throw new HttpsError("failed-precondition", "Student link code is missing student identity.");
    }

    if (role === "parent") {
      const linkId = buildLinkId(authUid, studentUid);
      const linkRef = db.collection("parent_student_links").doc(linkId);
      const linkSnap = await tx.get(linkRef);
      const existingLinkData = linkSnap.exists ? linkSnap.data() || {} : null;
      const alreadyLinked = Boolean(linkSnap.exists && existingLinkData?.status === "active");

      if (alreadyLinked) {
        return {
          ok: true,
          status: "already_linked",
          alreadyLinked: true,
          message: "Student is already linked to this parent.",
          linkId,
          studentUid,
        };
      }

      if (codeData.status !== "active") {
        throw new HttpsError("failed-precondition", "This student link code is no longer active.");
      }
      if (codeData.expiresAt && codeData.expiresAt.toMillis() <= now.toMillis()) {
        throw new HttpsError("failed-precondition", "This student link code has expired.");
      }

      if (!linkSnap.exists || existingLinkData?.status !== "active") {
        tx.set(linkRef, {
          linkId,
          parentUid: authUid,
          studentUid,
          relationshipType: "guardian",
          status: "active",
          permissions: {
            viewProgress: true,
            manageAccount: true,
            receiveAlerts: true,
          },
          createdAt: now,
          createdBy: authUid,
        }, {merge: true});
      }

      tx.update(codeDoc.ref, {
        status: "claimed",
        claimedByUid: authUid,
        claimedAt: now,
        updatedAt: now,
      });

      return {
        ok: true,
        status: "linked",
        alreadyLinked: false,
        linkId,
        studentUid,
      };
    }

    if (role === "teacher") {
      if (codeData.issuerRole !== "student") {
        throw new HttpsError("permission-denied", "Only student-issued teacher codes can be claimed here.");
      }
      if (codeData.status !== "active") {
        throw new HttpsError("failed-precondition", "This teacher code is no longer active.");
      }
      if (codeData.expiresAt && codeData.expiresAt.toMillis() <= now.toMillis()) {
        throw new HttpsError("failed-precondition", "This teacher code has expired.");
      }

      const linkId = buildLinkId(authUid, studentUid);
      const linkRef = db.collection("teacher_student_links").doc(linkId);
      const linkSnap = await tx.get(linkRef);
      const existingLinkData = linkSnap.exists ? linkSnap.data() || {} : null;
      const alreadyLinked = Boolean(linkSnap.exists && existingLinkData?.status === "active");

      if (alreadyLinked) {
        return {
          ok: true,
          status: "already_linked",
          alreadyLinked: true,
          message: "Student is already linked to this teacher.",
          linkId,
          studentUid,
        };
      }

      tx.set(linkRef, {
        linkId,
        teacherUid: authUid,
        studentUid,
        status: "active",
        source: "claimed",
        scope: existingLinkData?.scope || "full",
        subjectTags: Array.isArray(existingLinkData?.subjectTags) ? existingLinkData.subjectTags : [],
        permissions: existingLinkData?.permissions || {
          viewProgress: true,
          assignWork: true,
          futureMarking: true,
        },
        createdAt: now,
        createdBy: authUid,
      }, {merge: true});

      tx.update(codeDoc.ref, {
        status: "claimed",
        claimedByUid: authUid,
        claimedAt: now,
        updatedAt: now,
      });

      return {
        ok: true,
        status: "linked",
        alreadyLinked: false,
        message: "Student linked to teacher.",
        linkId,
        studentUid,
      };
    }

    if (role === "student") {
      const issuerUid = typeof codeData.issuerUid === "string" ? codeData.issuerUid : null;
      const targetType = typeof codeData.targetType === "string" ? codeData.targetType : null;
      const schoolIdFromCode = typeof codeData.schoolId === "string" ? codeData.schoolId : null;

      if (!issuerUid || !targetType) {
        throw new HttpsError("failed-precondition", "Student invite code is missing issuer identity.");
      }

      if (targetType === "parent") {
        const linkId = buildLinkId(issuerUid, studentUid);
        const linkRef = db.collection("parent_student_links").doc(linkId);
        const linkSnap = await tx.get(linkRef);
        const existingLinkData = linkSnap.exists ? linkSnap.data() || {} : null;
        const alreadyLinked = Boolean(linkSnap.exists && existingLinkData?.status === "active");

        if (alreadyLinked) {
          return {
            ok: true,
            status: "already_linked",
            alreadyLinked: true,
            message: "Student is already linked to this parent.",
            linkId,
            studentUid,
          };
        }

        if (codeData.status !== "active") {
          throw new HttpsError("failed-precondition", "This student invite code is no longer active.");
        }
        if (codeData.expiresAt && codeData.expiresAt.toMillis() <= now.toMillis()) {
          throw new HttpsError("failed-precondition", "This student invite code has expired.");
        }

        tx.set(linkRef, {
          linkId,
          parentUid: issuerUid,
          studentUid,
          relationshipType: "guardian",
          status: "active",
          permissions: {
            viewProgress: true,
            manageAccount: true,
            receiveAlerts: true,
          },
          createdAt: now,
          createdBy: authUid,
        }, {merge: true});

        tx.update(codeDoc.ref, {
          status: "claimed",
          claimedByUid: authUid,
          claimedAt: now,
          updatedAt: now,
        });

        return {
          ok: true,
          status: "linked",
          alreadyLinked: false,
          linkId,
          studentUid,
        };
      }

      if (targetType === "school_admin") {
        let schoolId = schoolIdFromCode;
        if (!schoolId) {
          const activeSchools = await getSchoolAdminActiveSchools(issuerUid);
          if (activeSchools.length !== 1) {
            throw new HttpsError("failed-precondition", "School invite code is missing school context.");
          }
          schoolId = activeSchools[0].schoolId;
        }

        const linkId = buildLinkId(schoolId, studentUid);
        const linkRef = db.collection("school_student_links").doc(linkId);
        const linkSnap = await tx.get(linkRef);
        const existingLinkData = linkSnap.exists ? linkSnap.data() || {} : null;
        const alreadyLinked = Boolean(linkSnap.exists && existingLinkData?.status === "active");

        if (alreadyLinked) {
          return {
            ok: true,
            status: "already_linked",
            alreadyLinked: true,
            message: "Student is already linked to this school.",
            linkId,
            studentUid,
            schoolId,
          };
        }

        if (codeData.status !== "active") {
          throw new HttpsError("failed-precondition", "This student invite code is no longer active.");
        }
        if (codeData.expiresAt && codeData.expiresAt.toMillis() <= now.toMillis()) {
          throw new HttpsError("failed-precondition", "This student invite code has expired.");
        }

        const existingSchoolLinks = await tx.get(
            db.collection("school_student_links")
                .where("studentUid", "==", studentUid)
                .where("status", "==", "active"),
        );
        const activeSchoolIds = existingSchoolLinks.docs
            .map((docSnap) => docSnap.data()?.schoolId)
            .filter((value) => typeof value === "string");

        if (activeSchoolIds.length > 0 && !activeSchoolIds.includes(schoolId)) {
          throw new HttpsError(
              "failed-precondition",
              "Student is already linked to another school. A student can only have one active school link.",
          );
        }

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
          permissions: {
            viewProgress: true,
            manageRoster: true,
          },
          createdAt: now,
          createdBy: authUid,
        }, {merge: true});

        tx.update(codeDoc.ref, {
          status: "claimed",
          claimedByUid: authUid,
          claimedAt: now,
          updatedAt: now,
        });

        return {
          ok: true,
          status: "linked",
          alreadyLinked: false,
          linkId,
          studentUid,
          schoolId,
        };
      }

      const teacherLinkId = buildLinkId(issuerUid, studentUid);
      const teacherLinkRef = db.collection("teacher_student_links").doc(teacherLinkId);
      const teacherLinkSnap = await tx.get(teacherLinkRef);
      const existingTeacherLinkData = teacherLinkSnap.exists ? teacherLinkSnap.data() || {} : null;
      const alreadyTeacherLinked = Boolean(teacherLinkSnap.exists && existingTeacherLinkData?.status === "active");

      if (alreadyTeacherLinked) {
        return {
          ok: true,
          status: "already_linked",
          alreadyLinked: true,
          message: "Student is already linked to this teacher.",
          linkId: teacherLinkId,
          studentUid,
        };
      }

      if (codeData.status !== "active") {
        throw new HttpsError("failed-precondition", "This student invite code is no longer active.");
      }
      if (codeData.expiresAt && codeData.expiresAt.toMillis() <= now.toMillis()) {
        throw new HttpsError("failed-precondition", "This student invite code has expired.");
      }

      tx.set(teacherLinkRef, {
        linkId: teacherLinkId,
        teacherUid: issuerUid,
        studentUid,
        status: "active",
        source: "claimed",
        scope: "full",
        subjectTags: [],
        permissions: {
          viewProgress: true,
          assignWork: true,
          futureMarking: true,
        },
        createdAt: now,
        createdBy: authUid,
      }, {merge: true});

      tx.update(codeDoc.ref, {
        status: "claimed",
        claimedByUid: authUid,
        claimedAt: now,
        updatedAt: now,
      });

      return {
        ok: true,
        status: "linked",
        alreadyLinked: false,
        linkId: teacherLinkId,
        studentUid,
      };
    }

    if (codeData.status !== "active") {
      throw new HttpsError("failed-precondition", "This student link code is no longer active.");
    }
    if (codeData.expiresAt && codeData.expiresAt.toMillis() <= now.toMillis()) {
      throw new HttpsError("failed-precondition", "This student link code has expired.");
    }

    const activeSchools = await getSchoolAdminActiveSchools(authUid);
    if (activeSchools.length === 0) {
      throw new HttpsError("failed-precondition", "You do not have an active school_admin link yet.");
    }
    if (activeSchools.length > 1) {
      throw new HttpsError("failed-precondition", "This flow only supports school admins linked to exactly one active school.");
    }

    const selectedSchool = activeSchools[0];
    const existingSchoolLinks = await tx.get(
        db.collection("school_student_links")
            .where("studentUid", "==", studentUid)
            .where("status", "==", "active"),
    );
    if (!existingSchoolLinks.empty) {
      throw new HttpsError("failed-precondition", "Student is already linked to a school.");
    }

    const linkId = buildLinkId(selectedSchool.schoolId, studentUid);
    const linkRef = db.collection("school_student_links").doc(linkId);
    const linkSnap = await tx.get(linkRef);

    if (!linkSnap.exists) {
      tx.set(linkRef, {
        linkId,
        schoolId: selectedSchool.schoolId,
        studentUid,
        status: "active",
        studentNumber: null,
        className: null,
        streamName: null,
        startDate: null,
        endDate: null,
        permissions: {
          viewProgress: true,
          manageRoster: true,
        },
        createdAt: now,
        createdBy: authUid,
      });
    }

    tx.update(codeDoc.ref, {
      status: "claimed",
      claimedByUid: authUid,
      claimedAt: now,
      updatedAt: now,
    });

    return {
      ok: true,
      status: linkSnap.exists ? "already_linked" : "linked",
      linkId,
      studentUid,
      schoolId: selectedSchool.schoolId,
    };
  });
});

exports.claimStudentLinkAsParent = onCall(async () => {
  throw new HttpsError("failed-precondition", "Legacy claim is disabled. Use claimStudentLinkCode.");
});

exports.claimStudentLinkAsSchoolAdmin = onCall(async () => {
  throw new HttpsError("failed-precondition", "Legacy claim is disabled. Use claimStudentLinkCode.");
});

exports.studentAccessSignIn = onCall(async (request) => {
  try {
    const accessCode = coerceOptionalString(request.data?.accessCode);
    const secret = coerceOptionalString(request.data?.secret);

    if (!accessCode || !secret) {
      throw new HttpsError("invalid-argument", "accessCode and secret are required.");
    }

    const accessCodeNormalized = normalizeAccessCode(accessCode);
    logger.info("studentAccessSignIn:start", {accessCodeNormalized});

    const aliasRef = db.collection("auth_login_aliases").doc(accessCodeNormalized);
    const aliasSnap = await aliasRef.get();
    logger.info("studentAccessSignIn:alias", {
      accessCodeNormalized,
      aliasExists: aliasSnap.exists,
    });
    if (!aliasSnap.exists) {
      throw new HttpsError("not-found", "Student access code was not found.");
    }

    const aliasData = aliasSnap.data() || {};
    const aliasUid =
      typeof aliasData.uid === "string" ? aliasData.uid :
      (typeof aliasData.studentUid === "string" ? aliasData.studentUid :
        (typeof aliasData.userId === "string" ? aliasData.userId : null));
    logger.info("studentAccessSignIn:aliasShape", {
      hasUid: typeof aliasData.uid === "string",
      hasStudentUid: typeof aliasData.studentUid === "string",
      hasUserId: typeof aliasData.userId === "string",
      status: aliasData.status || null,
      type: aliasData.type || null,
    });
    if (aliasData.status !== "active") {
      throw new HttpsError("permission-denied", "Student access is not active.");
    }

    const uid = aliasUid;
    if (!uid || typeof uid !== "string") {
      throw new HttpsError("failed-precondition", "Student access code is malformed.");
    }

    const [accessRefSnap, profileSnap, userSnap] = await Promise.all([
      db.collection("student_access").doc(uid).get(),
      db.collection("student_profiles").doc(uid).get(),
      db.collection("users").doc(uid).get(),
    ]);

    logger.info("studentAccessSignIn:docReads", {
      uid,
      accessExists: accessRefSnap.exists,
      profileExists: profileSnap.exists,
      userExists: userSnap.exists,
    });

    if (!accessRefSnap.exists) {
      throw new HttpsError("failed-precondition", "Student access record is missing.");
    }
    if (!profileSnap.exists) {
      throw new HttpsError("failed-precondition", "Student profile is missing.");
    }
    if (!userSnap.exists) {
      throw new HttpsError("failed-precondition", "Student identity is missing.");
    }

    const accessData = accessRefSnap.data();
    const profileData = profileSnap.data();
    const userData = userSnap.data();
    const now = admin.firestore.Timestamp.now();

    const lockedUntilActive =
      accessData.lockedUntil &&
      accessData.lockedUntil.toDate &&
      accessData.lockedUntil.toDate() > new Date();
    logger.info("studentAccessSignIn:lockState", {
      lockedUntilActive: Boolean(lockedUntilActive),
      credentialState: accessData.credentialState || null,
    });
    if (lockedUntilActive) {
      throw new HttpsError("permission-denied", "Student access is temporarily locked. Try again later.");
    }

    const needsFirstLogin =
      profileData.onboardingState === "provisioned" ||
      profileData.onboardingState === "first_login_pending" ||
      accessData.credentialState === "temporary" ||
      !accessData.passwordInitialized;

    const temporarySecretHash = accessData.temporarySecretHash || accessData.tempSecretHash || null;
    const expectedHash = needsFirstLogin ?
      temporarySecretHash :
      accessData.pinHash || temporarySecretHash;

    logger.info("studentAccessSignIn:hashState", {
      needsFirstLogin,
      hasTemporarySecretHash: Boolean(temporarySecretHash),
      hasPinHash: Boolean(accessData.pinHash),
      hasExpectedHash: Boolean(expectedHash),
    });

    if (!expectedHash) {
      throw new HttpsError("failed-precondition", "Student access credential is missing.");
    }

    if (!verifySecretHash(secret, expectedHash)) {
      const failedAttempts = (typeof accessData.failedAttempts === "number" ? accessData.failedAttempts : 0) + 1;
      const lockedUntil = failedAttempts >= 5 ?
        admin.firestore.Timestamp.fromDate(new Date(Date.now() + 15 * 60 * 1000)) :
        null;

      await accessRefSnap.ref.set({
        failedAttempts,
        lockedUntil,
        updatedAt: now,
      }, {merge: true});

      throw new HttpsError("permission-denied", "Invalid access code or secret.");
    }

    await accessRefSnap.ref.set({
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: now,
      updatedAt: now,
    }, {merge: true});

    const app = admin.app();
    const appOptions = app?.options || {};
    logger.info("studentAccessSignIn:tokenAttempt", {
      uid,
      appProjectId: appOptions.projectId || null,
      envProjectId: process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || null,
      hasAppCredential: Boolean(appOptions.credential),
      appCount: admin.apps.length,
    });

    let customToken;
    try {
      customToken = await admin.auth().createCustomToken(uid, {role: "student"});
    } catch (tokenError) {
      logger.error("studentAccessSignIn:tokenFailure", {
        uid,
        message: tokenError?.message || "token_failed",
        code: tokenError?.code || null,
      });
      throw new HttpsError("internal", "Custom token creation failed.", {
        code: tokenError?.code || null,
        message: tokenError?.message || "token_failed",
      });
    }

    logger.info("studentAccessSignIn:success", {uid, needsFirstLogin});

    return {
      ok: true,
      uid,
      role: "student",
      customToken,
      displayName: userData.displayName || `${profileData.firstName || ""} ${profileData.lastName || ""}`.trim() || "Student",
      onboardingState: profileData.onboardingState || "first_login_pending",
      loginMode: profileData.loginMode || "access_code",
      mustChangePassword: Boolean(profileData.mustChangePassword),
      mustSetPin: Boolean(profileData.mustSetPin),
    };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    logger.error("studentAccessSignIn:failed", {
      message: error?.message || "unknown",
      code: error?.code || null,
    });
    throw new HttpsError("internal", "Student access sign-in failed.");
  }
});

exports.adminDebugStudentAccess = onCall(async (request) => {
  const actorUid = await assertSuperAdminRole(request);
  const accessCode = coerceOptionalString(request.data?.accessCode);

  if (!accessCode) {
    throw new HttpsError("invalid-argument", "accessCode is required.");
  }

  const accessCodeNormalized = normalizeAccessCode(accessCode);
  const aliasRef = db.collection("auth_login_aliases").doc(accessCodeNormalized);
  const aliasSnap = await aliasRef.get();
  const aliasData = aliasSnap.exists ? aliasSnap.data() : null;

  const uid = aliasData?.uid;
  const [accessSnap, profileSnap, userSnap] = uid
    ? await Promise.all([
        db.collection("student_access").doc(uid).get(),
        db.collection("student_profiles").doc(uid).get(),
        db.collection("users").doc(uid).get(),
      ])
    : [null, null, null];

  const accessData = accessSnap && accessSnap.exists ? accessSnap.data() : null;
  const profileData = profileSnap && profileSnap.exists ? profileSnap.data() : null;
  const userData = userSnap && userSnap.exists ? userSnap.data() : null;

  logger.info("adminDebugStudentAccess", {
    actorUid,
    accessCodeNormalized,
    aliasExists: aliasSnap.exists,
    hasUid: typeof uid === "string",
  });

  return {
    ok: true,
    accessCodeNormalized,
    alias: {
      exists: aliasSnap.exists,
      status: aliasData?.status || null,
      type: aliasData?.type || null,
      hasUid: typeof uid === "string",
    },
    studentAccess: {
      exists: Boolean(accessSnap && accessSnap.exists),
      hasTemporarySecretHash: Boolean(accessData?.temporarySecretHash),
      hasPinHash: Boolean(accessData?.pinHash),
      credentialState: accessData?.credentialState || null,
      failedAttempts: typeof accessData?.failedAttempts === "number" ? accessData.failedAttempts : null,
      lockedUntil: accessData?.lockedUntil?.toDate ? accessData.lockedUntil.toDate().toISOString() : null,
    },
    studentProfile: {
      exists: Boolean(profileSnap && profileSnap.exists),
      onboardingState: profileData?.onboardingState || null,
      mustChangePassword: profileData?.mustChangePassword ?? null,
      mustSetPin: profileData?.mustSetPin ?? null,
    },
    canonicalUser: {
      exists: Boolean(userSnap && userSnap.exists),
      primaryRole: userData?.primaryRole || null,
      status: userData?.status || null,
    },
  };
});

async function auditCanonicalIdentityCoverage(maxUsers = 1000) {
  const users = [];
  let pageToken;
  do {
    const response = await admin.auth().listUsers(1000, pageToken);
    users.push(...response.users);
    pageToken = response.pageToken;
  } while (pageToken && users.length < maxUsers);

  const limitedUsers = users.slice(0, maxUsers);
  const uidChunks = chunkArray(limitedUsers.map((u) => u.uid), 25);

  const missing = {
    users: [],
    studentProfiles: [],
    adultProfiles: [],
  };
  const legacyFallback = {
    profiles: [],
    userRoles: [],
  };

  let total = 0;
  let studentCount = 0;
  let adultCount = 0;

  for (const chunk of uidChunks) {
    const [usersSnap, studentProfilesSnap, adultProfilesSnap, legacyProfilesSnap, legacyRolesSnap] = await Promise.all([
      db.getAll(...chunk.map((uid) => db.collection("users").doc(uid))),
      db.getAll(...chunk.map((uid) => db.collection("student_profiles").doc(uid))),
      db.getAll(...chunk.map((uid) => db.collection("adult_profiles").doc(uid))),
      db.getAll(...chunk.map((uid) => db.collection("profiles").doc(uid))),
      db.getAll(...chunk.map((uid) => db.collection("user_roles").doc(uid))),
    ]);

    usersSnap.forEach((docSnap, index) => {
      const uid = chunk[index];
      const legacyProfileSnap = legacyProfilesSnap[index];
      const legacyRoleSnap = legacyRolesSnap[index];
      total += 1;
      const canonicalUser = docSnap.exists ? docSnap.data() : null;
      const role = canonicalUser?.primaryRole || null;

      if (!canonicalUser) {
        missing.users.push(uid);
        if (legacyProfileSnap?.exists) {
          legacyFallback.profiles.push(uid);
        }
        if (legacyRoleSnap?.exists) {
          legacyFallback.userRoles.push(uid);
        }
        return;
      }

      if (!role && legacyRoleSnap?.exists) {
        legacyFallback.userRoles.push(uid);
      }

      if (role === "student") {
        studentCount += 1;
        const studentSnap = studentProfilesSnap[index];
        if (!studentSnap?.exists) {
          missing.studentProfiles.push(uid);
        }
      } else {
        adultCount += 1;
        const adultSnap = adultProfilesSnap[index];
        if (!adultSnap?.exists) {
          missing.adultProfiles.push(uid);
        }
      }
    });
  }

  return {
    ok: true,
    totalUsers: total,
    studentCount,
    adultCount,
    missing,
    legacyFallback,
    scanned: limitedUsers.length,
    truncated: users.length > maxUsers,
  };
}

exports.adminAuditCanonicalIdentityCoverage = onCall(async (request) => {
  await assertSuperAdminRole(request);
  const maxUsers = Number.isFinite(request.data?.maxUsers) ? Number(request.data?.maxUsers) : 1000;
  return auditCanonicalIdentityCoverage(maxUsers);
});

exports.adminRepairCanonicalIdentityCoverage = onCall(async (request) => {
  await assertSuperAdminRole(request);
  const maxUsers = Number.isFinite(request.data?.maxUsers) ? Number(request.data?.maxUsers) : 1000;

  const users = [];
  let pageToken;
  do {
    const response = await admin.auth().listUsers(1000, pageToken);
    users.push(...response.users);
    pageToken = response.pageToken;
  } while (pageToken && users.length < maxUsers);

  const limitedUsers = users.slice(0, maxUsers);
  const uidChunks = chunkArray(limitedUsers.map((u) => u.uid), 25);

  let repairedUsers = 0;
  let repairedStudentProfiles = 0;
  let repairedAdultProfiles = 0;
  let skipped = 0;

  for (const chunk of uidChunks) {
    const [usersSnap, studentProfilesSnap, adultProfilesSnap, legacyProfilesSnap, legacyRolesSnap] = await Promise.all([
      db.getAll(...chunk.map((uid) => db.collection("users").doc(uid))),
      db.getAll(...chunk.map((uid) => db.collection("student_profiles").doc(uid))),
      db.getAll(...chunk.map((uid) => db.collection("adult_profiles").doc(uid))),
      db.getAll(...chunk.map((uid) => db.collection("profiles").doc(uid))),
      db.getAll(...chunk.map((uid) => db.collection("user_roles").doc(uid))),
    ]);

    for (let index = 0; index < chunk.length; index += 1) {
      const uid = chunk[index];
      const authUser = limitedUsers.find((entry) => entry.uid === uid);
      if (!authUser) continue;

      const canonicalUserSnap = usersSnap[index];
      const studentProfileSnap = studentProfilesSnap[index];
      const adultProfileSnap = adultProfilesSnap[index];
      const legacyProfileSnap = legacyProfilesSnap[index];
      const legacyRoleSnap = legacyRolesSnap[index];

      const legacyProfile = legacyProfileSnap?.exists ? legacyProfileSnap.data() : null;
      const legacyRole = legacyRoleSnap?.exists ? legacyRoleSnap.data()?.role : null;

      let role = canonicalUserSnap?.exists ? canonicalUserSnap.data()?.primaryRole : null;
      if (!role && typeof legacyRole === "string") {
        role = legacyRole;
      }
      if (!role && legacyProfile?.role) {
        role = legacyProfile.role;
      }
      if (!role && authUser.customClaims?.role) {
        role = authUser.customClaims.role;
      }
      if (!role) {
        skipped += 1;
        continue;
      }

      if (!canonicalUserSnap?.exists) {
        const displayName = legacyProfile?.name || authUser.displayName || authUser.email?.split("@")[0] || "User";
        await db.collection("users").doc(uid).set({
          uid,
          primaryRole: role,
          secondaryRoles: [],
          status: legacyProfile?.status || "active",
          displayName,
          email: authUser.email || legacyProfile?.email || null,
          phone: legacyProfile?.phone || null,
          hasEmailLogin: Boolean(authUser.email),
          createdAt: coerceTimestamp(legacyProfile?.created_at, admin.firestore.Timestamp.now()),
          updatedAt: admin.firestore.Timestamp.now(),
          createdBy: legacyProfile?.createdBy || null,
          authProviderSummary: {
            hasPassword: true,
            providers: ["password"],
          },
          profileVersion: 2,
        }, {merge: true});
        repairedUsers += 1;
      }

      if (role === "student") {
        if (!studentProfileSnap?.exists) {
          const legacyName = legacyProfile?.name || authUser.displayName || "";
          const nameParts = splitName(legacyName);
          const legacyCountry = legacyProfile?.country || "Uganda";
          const legacyLevel = legacyProfile?.level || "PLE";
          let normalizedEducation;
          try {
            normalizedEducation = normalizeCountryAndEducationLevel(legacyCountry, legacyLevel);
          } catch (error) {
            normalizedEducation = {
              countryLabel: legacyCountry,
              educationLevel: legacyLevel,
              educationStage: legacyProfile?.stage || null,
            };
          }

          await db.collection("student_profiles").doc(uid).set({
            uid,
            firstName: nameParts.firstName,
            lastName: nameParts.lastName,
            preferredName: legacyProfile?.preferredName || null,
            dateOfBirth: legacyProfile?.dob ? coerceTimestamp(legacyProfile.dob, null) : null,
            gender: legacyProfile?.gender || null,
            country: normalizedEducation.countryLabel || null,
            educationLevel: normalizedEducation.educationLevel || null,
            educationStage: normalizedEducation.educationStage || null,
            gradeLevel: legacyProfile?.gradeLevel || null,
            candidateNumber: legacyProfile?.candidate_number || legacyProfile?.candidateNumber || null,
            learningMode: "self",
            loginMode: "email_password",
            onboardingState: "active",
            mustChangePassword: false,
            mustSetPin: false,
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
          }, {merge: true});
          repairedStudentProfiles += 1;
        }
      } else {
        if (!adultProfileSnap?.exists) {
          const legacyName = legacyProfile?.name || authUser.displayName || "";
          const nameParts = splitName(legacyName);
          await db.collection("adult_profiles").doc(uid).set({
            uid,
            adultType: role,
            firstName: nameParts.firstName,
            lastName: nameParts.lastName,
            phone: legacyProfile?.phone || null,
            country: legacyProfile?.country || null,
            jobTitle: legacyProfile?.jobTitle || null,
            status: legacyProfile?.status || "active",
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
          }, {merge: true});
          repairedAdultProfiles += 1;
        }
      }
    }
  }

  return {
    ok: true,
    scanned: limitedUsers.length,
    repairedUsers,
    repairedStudentProfiles,
    repairedAdultProfiles,
    skipped,
    missingAfterRepair: (await auditCanonicalIdentityCoverage(maxUsers)).missing,
  };
});

exports.adminDebugCustomToken = onCall(async (request) => {
  const actorUid = await assertSuperAdminRole(request);
  const uid = coerceOptionalString(request.data?.uid);

  if (!uid) {
    throw new HttpsError("invalid-argument", "uid is required.");
  }

  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) {
    throw new HttpsError("not-found", "Canonical user record not found.");
  }

  const app = admin.app();
  const appOptions = app?.options || {};
  let success = false;
  let errorMessage = null;
  let errorCode = null;

  try {
    await admin.auth().createCustomToken(uid, {role: "student"});
    success = true;
  } catch (error) {
    errorMessage = error?.message || "token_failed";
    errorCode = error?.code || null;
  }

  logger.info("adminDebugCustomToken", {
    actorUid,
    uid,
    success,
    errorCode,
  });

  return {
    ok: true,
    success,
    errorMessage,
    errorCode,
    appProjectId: appOptions.projectId || null,
    envProjectId: process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || null,
    hasAppCredential: Boolean(appOptions.credential),
    appCount: admin.apps.length,
  };
});

exports.completeStudentFirstLogin = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const uid = request.auth.uid;
  const role = request.auth.token?.role || await getResolvedRoleForUser(uid, null);
  if (role !== "student") {
    throw new HttpsError("permission-denied", "Student access required.");
  }

  const newSecret = coerceOptionalString(request.data?.newSecret);
  const loginMode = coerceOptionalString(request.data?.loginMode) || "access_code";

  if (!newSecret || newSecret.length < 4) {
    throw new HttpsError("invalid-argument", "newSecret must be at least 4 characters long.");
  }
  if (!["access_code", "email_password", "both"].includes(loginMode)) {
    throw new HttpsError("invalid-argument", "Invalid loginMode.");
  }

  const [accessSnap, profileSnap, userSnap] = await Promise.all([
    db.collection("student_access").doc(uid).get(),
    db.collection("student_profiles").doc(uid).get(),
    db.collection("users").doc(uid).get(),
  ]);

  if (!accessSnap.exists || !profileSnap.exists || !userSnap.exists) {
    throw new HttpsError("failed-precondition", "Student identity is incomplete.");
  }

  const now = admin.firestore.Timestamp.now();
  const newSecretHash = hashSecret(newSecret);

  await db.runTransaction(async (tx) => {
    tx.set(accessSnap.ref, {
      pinHash: newSecretHash,
      temporarySecretHash: null,
      passwordInitialized: true,
      credentialState: "active",
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: now,
      updatedAt: now,
    }, {merge: true});

    tx.set(profileSnap.ref, {
      onboardingState: "active",
      mustChangePassword: false,
      mustSetPin: false,
      loginMode,
      updatedAt: now,
    }, {merge: true});

    tx.set(userSnap.ref, {
      status: "active",
      updatedAt: now,
    }, {merge: true});
  });

  return {
    ok: true,
    onboardingState: "active",
    loginMode,
    mustChangePassword: false,
    mustSetPin: false,
  };
});

exports.createSchoolStaffUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const data = request.data || {};
  const role = coerceOptionalString(data.role);
  const displayName = coerceOptionalString(data.displayName);
  const email = normalizeEmail(data.email);
  const rawCountry = coerceOptionalString(data.country) || "";
  const normalizedCountry = rawCountry ? normalizeCountryValue(rawCountry) : "UGANDA";
  if (!normalizedCountry) {
    throw new HttpsError("invalid-argument", "country must be one of: Uganda, Kenya, Tanzania, Rwanda, Burundi.");
  }
  const country = COUNTRY_LABELS[normalizedCountry];
  const phone = coerceOptionalString(data.phone);
  const jobTitle = coerceOptionalString(data.jobTitle);
  const passwordInput = coerceOptionalString(data.password);

  if (!["school_admin", "teacher"].includes(role)) {
    throw new HttpsError("invalid-argument", "role must be school_admin or teacher.");
  }
  if (!displayName) {
    throw new HttpsError("invalid-argument", "displayName is required.");
  }
  if (!email) {
    throw new HttpsError("invalid-argument", "email is required.");
  }

  const scope = await resolveSchoolScopeForStaffRequest(request, data.schoolId || null);

  return provisionSchoolStaffUser({
    actorUid: scope.actorUid,
    schoolId: scope.schoolId,
    role,
    displayName,
    email,
    country,
    phone,
    jobTitle,
    passwordInput,
  });
});

exports.listSchoolStaff = onCall(async (request) => {
  const scope = await resolveSchoolScopeForStaffRequest(request, request.data?.schoolId || null);

  const [schoolAdminLinksSnap, teacherLinksSnap] = await Promise.all([
    db.collection("school_admin_links")
        .where("schoolId", "==", scope.schoolId)
        .where("status", "==", "active")
        .orderBy("createdAt", "desc")
        .get(),
    db.collection("teacher_school_links")
        .where("schoolId", "==", scope.schoolId)
        .where("status", "==", "active")
        .orderBy("createdAt", "desc")
        .get(),
  ]);

  const items = await hydrateSchoolStaffItems({
    schoolId: scope.schoolId,
    schoolName: scope.schoolName,
    schoolAdminLinks: schoolAdminLinksSnap.docs.map((docSnap) => docSnap.data()),
    teacherLinks: teacherLinksSnap.docs.map((docSnap) => docSnap.data()),
  });

  return {
    ok: true,
    schoolId: scope.schoolId,
    schoolName: scope.schoolName,
    items,
  };
});

exports.adminUpsertExam = onCall(async (request) => {
  throw new HttpsError(
      "failed-precondition",
      "Legacy exam editing has been disabled. Use the V2 exam engine.",
  );
});

exports.adminDuplicateExam = onCall(async (request) => {
  throw new HttpsError(
      "failed-precondition",
      "Legacy exam duplication has been disabled. Use the V2 exam engine.",
  );
});

exports.adminListExamQuestionsPreview = onCall(async (request) => {
  throw new HttpsError(
      "failed-precondition",
      "Legacy exam question preview has been disabled. Use the V2 exam engine.",
  );
});

exports.adminListExamQuestionsFull = onCall(async (request) => {
  throw new HttpsError(
      "failed-precondition",
      "Legacy exam question editor has been disabled. Use the V2 exam engine.",
  );
});

exports.adminSaveExamQuestions = onCall(async (request) => {
  throw new HttpsError(
      "failed-precondition",
      "Legacy exam question saving has been disabled. Use the V2 exam engine.",
  );
});

exports.adminBulkImportQuestions = onCall(async (request) => {
  throw new HttpsError(
      "failed-precondition",
      "Legacy exam bulk import has been disabled. Use the V2 exam engine.",
  );
});

exports.adminSetQuestionImageUrls = onCall(async (request) => {
  throw new HttpsError(
      "failed-precondition",
      "Legacy question image patching has been disabled. Use the V2 exam engine.",
  );
});
