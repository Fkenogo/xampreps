const {setGlobalOptions} = require("firebase-functions/v2");
const {onRequest, onCall, HttpsError} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({maxInstances: 10});

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

async function getRoleForUser(userId, authToken) {
  if (authToken && authToken.uid === userId && authToken.role) {
    return authToken.role;
  }
  const roleSnap = await db.collection("user_roles").doc(userId).get();
  return roleSnap.exists ? roleSnap.data().role : null;
}

function buildLinkId(parentOrSchoolId, studentId) {
  return `${parentOrSchoolId}_${studentId}`;
}

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

async function assertAdminRole(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const role = request.auth.token && request.auth.token.role ?
    request.auth.token.role :
    await getRoleForUser(request.auth.uid, null);
  if (role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  return request.auth.uid;
}

exports.generateLinkCode = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const creatorId = request.auth.uid;
  const inputType = request.data && request.data.creatorType;
  const creatorType = inputType === "school" ? "school" : "parent";
  const tokenRole = request.auth.token && request.auth.token.role;

  if (tokenRole && tokenRole !== creatorType) {
    throw new HttpsError("permission-denied",
        "Creator type does not match authenticated role.");
  }

  let generatedCode = "";
  let isUnique = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    generatedCode = makeLinkCode();
    const existingSnap = await db.collection("link_codes")
        .where("code", "==", generatedCode)
        .limit(1)
        .get();
    if (existingSnap.empty) {
      isUnique = true;
      break;
    }
  }

  if (!generatedCode || !isUnique) {
    throw new HttpsError("internal", "Failed to generate a unique link code.");
  }

  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 24 * 60 * 60 * 1000,
  );

  const ref = db.collection("link_codes").doc();
  await ref.set({
    code: generatedCode,
    creatorId,
    creatorType,
    expiresAt,
    usedBy: null,
    usedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  return {
    ok: true,
    id: ref.id,
    code: generatedCode,
    creatorType,
    expiresAt: new Date(expiresAt.toMillis()).toISOString(),
  };
});

exports.listActiveLinkCodes = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const creatorId = request.auth.uid;
  const nowMs = Date.now();

  const snap = await db.collection("link_codes")
      .where("creatorId", "==", creatorId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

  const items = snap.docs
      .map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          code: data.code || "",
          creatorType: data.creatorType || "parent",
          usedBy: data.usedBy || null,
          usedAt: data.usedAt ? new Date(data.usedAt.toMillis()).toISOString() : null,
          createdAt: data.createdAt ?
            new Date(data.createdAt.toMillis()).toISOString() :
            null,
          expiresAt: data.expiresAt ?
            new Date(data.expiresAt.toMillis()).toISOString() :
            null,
        };
      })
      .filter((item) => item.usedBy === null && item.expiresAt &&
        new Date(item.expiresAt).getTime() > nowMs);

  return {
    ok: true,
    items,
  };
});

exports.redeemLinkCode = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const studentId = request.auth.uid;
  const role = request.auth.token && request.auth.token.role;
  if (role !== "student") {
    throw new HttpsError("permission-denied",
        "Only students can redeem link codes.");
  }

  const codeInput = request.data && request.data.code;
  const code = typeof codeInput === "string" ?
    codeInput.trim().toUpperCase() :
    "";

  if (!code || code.length < 6 || code.length > 16) {
    throw new HttpsError("invalid-argument",
        "A valid link code is required.");
  }

  const now = admin.firestore.Timestamp.now();

  return db.runTransaction(async (tx) => {
    const codeQuery = db.collection("link_codes")
        .where("code", "==", code)
        .limit(1);
    const codeSnap = await tx.get(codeQuery);

    if (codeSnap.empty) {
      throw new HttpsError("not-found", "Invalid link code.");
    }

    const codeDoc = codeSnap.docs[0];
    const codeData = codeDoc.data();

    if (!codeData.expiresAt || codeData.expiresAt.toMillis() <= now.toMillis()) {
      throw new HttpsError("failed-precondition", "This link code has expired.");
    }

    if (codeData.usedBy) {
      if (codeData.usedBy === studentId) {
        return {
          ok: true,
          status: "already_redeemed",
          linkId: `${codeData.creatorId}_${studentId}`,
        };
      }
      throw new HttpsError("already-exists", "This link code has already been used.");
    }

    const creatorId = codeData.creatorId;
    if (!creatorId || typeof creatorId !== "string") {
      throw new HttpsError("data-loss", "Invalid link code payload.");
    }

    const linkId = `${creatorId}_${studentId}`;
    const linkRef = db.collection("linked_accounts").doc(linkId);
    const existingLink = await tx.get(linkRef);

    // Consume code inside the same transaction, regardless of link pre-existence.
    tx.update(codeDoc.ref, {
      usedBy: studentId,
      usedAt: now,
      updatedAt: now,
    });

    if (!existingLink.exists) {
      tx.set(linkRef, {
        parentOrSchoolId: creatorId,
        studentId,
        linkedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      ok: true,
      status: existingLink.exists ? "already_linked" : "linked",
      linkId,
      creatorId,
    };
  });
});

exports.searchLinkTarget = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const requesterId = request.auth.uid;
  const emailInput = request.data && request.data.email;
  const targetRoleInput = request.data && request.data.targetRole;
  const targetRole = ["student", "parent", "school"].includes(targetRoleInput) ?
    targetRoleInput :
    null;
  const email = normalizeEmail(typeof emailInput === "string" ? emailInput : "");

  if (!email || !targetRole) {
    throw new HttpsError("invalid-argument", "Email and targetRole are required.");
  }

  const profileByLower = await db.collection("profiles")
      .where("emailLower", "==", email)
      .limit(1)
      .get();
  const profileByEmail = profileByLower.empty ?
    await db.collection("profiles").where("email", "==", email).limit(1).get() :
    profileByLower;

  if (profileByEmail.empty) {
    return {ok: false, reason: "not_found"};
  }

  const targetDoc = profileByEmail.docs[0];
  const targetId = targetDoc.id;
  if (targetId === requesterId) {
    return {ok: false, reason: "self"};
  }

  const targetProfile = targetDoc.data();
  const targetRoleResolved = await getRoleForUser(targetId, null);
  if (targetRoleResolved !== targetRole) {
    return {ok: false, reason: "role_mismatch"};
  }

  const requesterRole = await getRoleForUser(requesterId, {
    uid: requesterId,
    role: request.auth.token && request.auth.token.role,
  });
  const isRequesterStudent = requesterRole === "student";
  const parentOrSchoolId = isRequesterStudent ? targetId : requesterId;
  const studentId = isRequesterStudent ? requesterId : targetId;
  const linkId = buildLinkId(parentOrSchoolId, studentId);

  const linkSnap = await db.collection("linked_accounts").doc(linkId).get();
  if (linkSnap.exists) {
    return {ok: false, reason: "already_linked"};
  }

  const pairId = [requesterId, targetId].sort().join("_");
  const pairRequestSnap = await db.collection("link_requests").doc(pairId).get();
  if (pairRequestSnap.exists && pairRequestSnap.data().status === "pending") {
    return {ok: false, reason: "pending_exists"};
  }

  return {
    ok: true,
    target: {
      id: targetId,
      name: targetProfile.name || "Unknown",
      email: targetProfile.email || "",
      role: targetRoleResolved,
    },
  };
});

exports.sendLinkRequest = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const requesterId = request.auth.uid;
  const targetId = request.data && request.data.targetId;
  if (!targetId || typeof targetId !== "string") {
    throw new HttpsError("invalid-argument", "A targetId is required.");
  }
  if (targetId === requesterId) {
    throw new HttpsError("invalid-argument", "Cannot send a request to yourself.");
  }

  const requesterRole = await getRoleForUser(requesterId, {
    uid: requesterId,
    role: request.auth.token && request.auth.token.role,
  });
  const targetRole = await getRoleForUser(targetId, null);
  if (!targetRole) {
    throw new HttpsError("not-found", "Target user role was not found.");
  }

  const isRequesterStudent = requesterRole === "student";
  const parentOrSchoolId = isRequesterStudent ? targetId : requesterId;
  const studentId = isRequesterStudent ? requesterId : targetId;
  const linkId = buildLinkId(parentOrSchoolId, studentId);
  const existingLink = await db.collection("linked_accounts").doc(linkId).get();
  if (existingLink.exists) {
    throw new HttpsError("already-exists", "Accounts are already linked.");
  }

  const pairId = [requesterId, targetId].sort().join("_");
  const now = admin.firestore.Timestamp.now();

  await db.collection("link_requests").doc(pairId).set({
    requesterId,
    targetId,
    participantIds: [requesterId, targetId],
    status: "pending",
    requesterRole: requesterRole || null,
    targetRole,
    createdAt: now,
    updatedAt: now,
  }, {merge: true});

  return {ok: true, requestId: pairId};
});

exports.listLinkRequests = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const userId = request.auth.uid;
  const snap = await db.collection("link_requests")
      .where("participantIds", "array-contains", userId)
      .limit(100)
      .get();

  const pendingRequests = snap.docs.filter((docSnap) =>
    docSnap.data().status === "pending",
  );

  const userIds = new Set();
  pendingRequests.forEach((docSnap) => {
    const data = docSnap.data();
    userIds.add(data.requesterId);
    userIds.add(data.targetId);
  });

  const profileMap = {};
  for (const id of userIds) {
    const profileSnap = await db.collection("profiles").doc(id).get();
    profileMap[id] = profileSnap.exists ? profileSnap.data() : {};
  }

  const items = pendingRequests.map((docSnap) => {
    const data = docSnap.data();
    const requester = profileMap[data.requesterId] || {};
    const target = profileMap[data.targetId] || {};
    return {
      id: docSnap.id,
      requesterId: data.requesterId,
      targetId: data.targetId,
      status: data.status,
      createdAt: data.createdAt ? new Date(data.createdAt.toMillis()).toISOString() : null,
      requesterName: requester.name || "Unknown",
      requesterEmail: requester.email || "",
      requesterType: data.requesterRole === "school" ? "school" : "parent",
      isIncoming: data.targetId === userId,
      targetName: target.name || "",
      targetEmail: target.email || "",
    };
  });

  return {ok: true, items};
});

exports.respondToLinkRequest = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const userId = request.auth.uid;
  const requestId = request.data && request.data.requestId;
  const action = request.data && request.data.action;
  if (!requestId || typeof requestId !== "string" ||
    !["accept", "reject"].includes(action)) {
    throw new HttpsError("invalid-argument", "requestId and action are required.");
  }

  const requestRef = db.collection("link_requests").doc(requestId);
  const now = admin.firestore.Timestamp.now();

  return db.runTransaction(async (tx) => {
    const reqSnap = await tx.get(requestRef);
    if (!reqSnap.exists) {
      throw new HttpsError("not-found", "Link request not found.");
    }
    const reqData = reqSnap.data();
    if (reqData.status !== "pending") {
      throw new HttpsError("failed-precondition",
          "Link request has already been processed.");
    }
    if (reqData.targetId !== userId) {
      throw new HttpsError("permission-denied",
          "Only the target can respond to this request.");
    }

    if (action === "reject") {
      tx.update(requestRef, {
        status: "rejected",
        updatedAt: now,
      });
      return {ok: true, status: "rejected"};
    }

    const requesterRole = reqData.requesterRole ||
      await getRoleForUser(reqData.requesterId, null);
    const isRequesterStudent = requesterRole === "student";
    const parentOrSchoolId = isRequesterStudent ? reqData.targetId : reqData.requesterId;
    const studentId = isRequesterStudent ? reqData.requesterId : reqData.targetId;
    const linkId = buildLinkId(parentOrSchoolId, studentId);
    const linkRef = db.collection("linked_accounts").doc(linkId);
    const linkSnap = await tx.get(linkRef);
    if (!linkSnap.exists) {
      tx.set(linkRef, {
        parentOrSchoolId,
        studentId,
        linkedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    tx.update(requestRef, {
      status: "accepted",
      updatedAt: now,
    });

    return {ok: true, status: "accepted", linkId};
  });
});

exports.listLinkedAccounts = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const userId = request.auth.uid;
  const role = request.auth.token && request.auth.token.role ?
    request.auth.token.role :
    await getRoleForUser(userId, null);
  const isStudent = role === "student";

  const query = isStudent ?
    db.collection("linked_accounts").where("studentId", "==", userId) :
    db.collection("linked_accounts").where("parentOrSchoolId", "==", userId);
  const snap = await query.get();

  const items = [];
  for (const linkDoc of snap.docs) {
    const link = linkDoc.data();
    const otherId = isStudent ? link.parentOrSchoolId : link.studentId;
    const profileSnap = await db.collection("profiles").doc(otherId).get();
    const profile = profileSnap.exists ? profileSnap.data() : {};
    let accountType = isStudent ? "parent" : "student";
    if (isStudent) {
      const roleSnap = await db.collection("user_roles").doc(otherId).get();
      const linkedRole = roleSnap.exists ? roleSnap.data().role : null;
      accountType = linkedRole === "school" ? "school" : "parent";
    }
    items.push({
      id: linkDoc.id,
      name: profile.name || "Unknown",
      email: profile.email || "",
      type: accountType,
      linkedAt: link.linkedAt ? new Date(link.linkedAt.toMillis()).toISOString() : null,
      parentOrSchoolId: link.parentOrSchoolId,
      studentId: link.studentId,
    });
  }

  return {ok: true, items};
});

exports.unlinkAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const userId = request.auth.uid;
  const linkId = request.data && request.data.linkId;
  if (!linkId || typeof linkId !== "string") {
    throw new HttpsError("invalid-argument", "A linkId is required.");
  }

  const linkRef = db.collection("linked_accounts").doc(linkId);
  const snap = await linkRef.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Linked account not found.");
  }
  const data = snap.data();
  if (data.studentId !== userId && data.parentOrSchoolId !== userId) {
    throw new HttpsError("permission-denied", "Cannot unlink this account.");
  }

  await linkRef.delete();
  return {ok: true};
});

exports.listLinkedStudentsOverview = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const userId = request.auth.uid;
  const linksSnap = await db.collection("linked_accounts")
      .where("parentOrSchoolId", "==", userId)
      .get();

  if (linksSnap.empty) {
    return {ok: true, items: []};
  }

  const getDateValue = (value) => {
    if (!value) return null;
    if (value.toDate) return value.toDate();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  const getNumber = (value) => (typeof value === "number" ? value : 0);

  const weekAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const items = [];

  for (const linkDoc of linksSnap.docs) {
    const linkData = linkDoc.data();
    const studentId = linkData.studentId;
    if (!studentId) continue;

    const profileSnap = await db.collection("profiles").doc(studentId).get();
    const profile = profileSnap.exists ? profileSnap.data() : {};

    const progressSnap = await db.collection("user_progress").doc(studentId).get();
    const progress = progressSnap.exists ? progressSnap.data() : {};

    let attempts = [];
    try {
      const attemptSnap = await db.collection("exam_attempts")
          .where("userId", "==", studentId)
          .orderBy("completedAt", "desc")
          .limit(100)
          .get();
      attempts = attemptSnap.docs.map((d) => d.data());
    } catch (_error) {
      try {
        const attemptSnap = await db.collection("exam_attempts")
            .where("user_id", "==", studentId)
            .orderBy("completed_at", "desc")
            .limit(100)
            .get();
        attempts = attemptSnap.docs.map((d) => d.data());
      } catch (_fallbackError) {
        attempts = [];
      }
    }

    const normalizedAttempts = attempts.map((a) => {
      const score = getNumber(a.score);
      const totalQuestions = getNumber(a.totalQuestions || a.total_questions);
      const completedAt = getDateValue(a.completedAt || a.completed_at);
      const examTitle = a.examTitle || a.exam_title || "Unknown Exam";
      const timeTakenSeconds = getNumber(a.timeTaken || a.time_taken);
      return {score, totalQuestions, completedAt, examTitle, timeTakenSeconds};
    });

    const scoredAttempts = normalizedAttempts.filter((a) => a.totalQuestions > 0);
    const avgScore = scoredAttempts.length > 0 ?
      Math.round(scoredAttempts.reduce((sum, a) =>
        sum + (a.score / a.totalQuestions) * 100, 0) / scoredAttempts.length) :
      0;
    const studyMinutesThisWeek = normalizedAttempts
        .filter((a) => a.completedAt && a.completedAt.getTime() >= weekAgoMs)
        .reduce((sum, a) => sum + a.timeTakenSeconds / 60, 0);

    const recentActivity = scoredAttempts.slice(0, 5).map((a) => ({
      date: a.completedAt ? a.completedAt.toISOString() : new Date().toISOString(),
      score: Math.round((a.score / a.totalQuestions) * 100),
      examTitle: a.examTitle,
    }));

    items.push({
      id: studentId,
      name: profile.name || "Unknown",
      email: profile.email || "",
      level: profile.level || null,
      xp: getNumber(progress.xp),
      streak: getNumber(progress.streak),
      avgScore,
      examsTaken: normalizedAttempts.length,
      studyMinutesThisWeek,
      recentActivity,
    });
  }

  return {ok: true, items};
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
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const userId = request.auth.uid;
  const data = request.data || {};
  const examId = typeof data.examId === "string" ? data.examId : "";
  const mode = typeof data.mode === "string" ? data.mode : "practice";
  const score = typeof data.score === "number" ? data.score : 0;
  const totalQuestions = typeof data.totalQuestions === "number" ? data.totalQuestions : 0;
  const timeTaken = typeof data.timeTaken === "number" ? data.timeTaken : 0;
  const questionHistoryUpdates = Array.isArray(data.questionHistoryUpdates) ?
    data.questionHistoryUpdates :
    [];

  if (!examId || totalQuestions <= 0) {
    throw new HttpsError("invalid-argument", "examId and totalQuestions are required.");
  }

  const now = admin.firestore.Timestamp.now();
  const attemptRef = db.collection("exam_attempts").doc();

  await attemptRef.set({
    userId,
    examId,
    mode,
    score,
    totalQuestions,
    timeTaken,
    completedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  for (const item of questionHistoryUpdates) {
    const questionPartId = typeof item.questionPartId === "string" ? item.questionPartId : "";
    if (!questionPartId) continue;
    const isCorrect = !!item.isCorrect;
    const nextReviewIso = typeof item.nextReview === "string" ? item.nextReview : null;
    const nowIso = new Date().toISOString();

    const historyRef = db.collection("question_history").doc(`${userId}_${questionPartId}`);
    const historySnap = await historyRef.get();

    if (historySnap.exists) {
      const existing = historySnap.data();
      const existingStreak = typeof existing.streak === "number" ? existing.streak : 0;
      const newStreak = isCorrect ? existingStreak + 1 : 0;
      const intervalHours = isCorrect ? Math.min(newStreak * 24, 720) : 1;
      const fallbackNext = new Date(Date.now() + intervalHours * 60 * 60 * 1000).toISOString();

      await historyRef.set({
        userId,
        questionPartId,
        examId,
        isCorrect,
        streak: newStreak,
        nextReview: nextReviewIso || fallbackNext,
        lastAttempt: nowIso,
        updatedAt: now,
      }, {merge: true});
    } else {
      await historyRef.set({
        userId,
        questionPartId,
        examId,
        isCorrect,
        streak: isCorrect ? 1 : 0,
        nextReview: nextReviewIso || new Date(Date.now() + (isCorrect ? 24 : 1) *
          60 * 60 * 1000).toISOString(),
        lastAttempt: nowIso,
        createdAt: now,
        updatedAt: now,
      }, {merge: true});
    }
  }

  const scorePercentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
  const progressRef = db.collection("user_progress").doc(userId);
  const progressSnap = await progressRef.get();
  const currentProgress = progressSnap.exists ? progressSnap.data() : {xp: 0, streak: 0};
  const update = computeProgressUpdate(currentProgress, scorePercentage, totalQuestions);

  await progressRef.set({
    xp: (typeof currentProgress.xp === "number" ? currentProgress.xp : 0) + update.xpEarned,
    streak: update.newStreak,
    lastExamDate: update.todayIso,
    updatedAt: now,
  }, {merge: true});

  return {
    ok: true,
    attemptId: attemptRef.id,
    xpEarned: update.xpEarned,
    newStreak: update.newStreak,
    streakUpdated: update.streakUpdated,
  };
});

exports.getLatestExamAttemptId = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const userId = request.auth.uid;
  const examId = request.data && request.data.examId;
  if (!examId || typeof examId !== "string") {
    throw new HttpsError("invalid-argument", "examId is required.");
  }

  const snap = await db.collection("exam_attempts")
      .where("userId", "==", userId)
      .where("examId", "==", examId)
      .orderBy("completedAt", "desc")
      .limit(1)
      .get();

  if (snap.empty) {
    return {ok: false, attemptId: null};
  }
  return {ok: true, attemptId: snap.docs[0].id};
});

exports.getExamAttempt = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const userId = request.auth.uid;
  const attemptId = request.data && request.data.attemptId;
  if (!attemptId || typeof attemptId !== "string") {
    throw new HttpsError("invalid-argument", "attemptId is required.");
  }

  const snap = await db.collection("exam_attempts").doc(attemptId).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Attempt not found.");
  }
  const attempt = snap.data();
  if (attempt.userId !== userId) {
    throw new HttpsError("permission-denied", "Not allowed to view this attempt.");
  }

  return {
    ok: true,
    attempt: {
      id: snap.id,
      userId: attempt.userId,
      examId: attempt.examId,
      mode: attempt.mode,
      score: attempt.score,
      totalQuestions: attempt.totalQuestions,
      timeTaken: attempt.timeTaken || 0,
      completedAt: attempt.completedAt ?
        new Date(attempt.completedAt.toMillis()).toISOString() :
        null,
    },
  };
});

exports.listExamHistory = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const userId = request.auth.uid;

  const snap = await db.collection("exam_attempts")
      .where("userId", "==", userId)
      .orderBy("completedAt", "desc")
      .limit(200)
      .get();

  const items = [];
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const examId = data.examId;
    let exam = null;
    if (examId) {
      const examSnap = await db.collection("exams").doc(examId).get();
      if (examSnap.exists) {
        exam = examSnap.data();
      }
    }
    items.push({
      id: docSnap.id,
      examId: data.examId,
      mode: data.mode || "practice",
      score: typeof data.score === "number" ? data.score : 0,
      totalQuestions: typeof data.totalQuestions === "number" ? data.totalQuestions : 0,
      timeTaken: typeof data.timeTaken === "number" ? data.timeTaken : 0,
      completedAt: data.completedAt ?
        new Date(data.completedAt.toMillis()).toISOString() :
        new Date().toISOString(),
      exam: exam ? {
        title: exam.title || "Unknown Exam",
        subject: exam.subject || "",
        level: exam.level || "",
      } : null,
    });
  }

  return {ok: true, items};
});

exports.listExams = onCall(async (request) => {
  const type = request.data && typeof request.data.type === "string" ? request.data.type : null;
  let query = db.collection("exams");
  if (type) {
    query = query.where("type", "==", type);
  }

  let snap;
  try {
    snap = await query.orderBy("year", "desc").get();
  } catch (_error) {
    snap = await query.get();
  }

  const items = snap.docs.map((docSnap) => {
    const exam = docSnap.data();
    return {
      id: docSnap.id,
      title: exam.title || "",
      subject: exam.subject || "",
      level: exam.level || "PLE",
      year: typeof exam.year === "number" ? exam.year : Number(exam.year || 0),
      time_limit: typeof exam.timeLimit === "number" ?
        exam.timeLimit :
        typeof exam.time_limit === "number" ?
          exam.time_limit :
          60,
      difficulty: exam.difficulty || "Medium",
      type: exam.type || "Past Paper",
      is_free: typeof exam.isFree === "boolean" ? exam.isFree : !!exam.is_free,
      question_count: typeof exam.questionCount === "number" ?
        exam.questionCount :
        typeof exam.question_count === "number" ?
          exam.question_count :
          0,
      explanation_pdf_url: exam.explanationPdfUrl || exam.explanation_pdf_url || null,
      description: exam.description || null,
    };
  });

  return {ok: true, items};
});

exports.getExamContent = onCall(async (request) => {
  const examId = request.data && request.data.examId;
  if (!examId || typeof examId !== "string") {
    throw new HttpsError("invalid-argument", "examId is required.");
  }

  const examSnap = await db.collection("exams").doc(examId).get();
  if (!examSnap.exists) {
    throw new HttpsError("not-found", "Exam not found.");
  }
  const examData = examSnap.data();
  const exam = {
    id: examSnap.id,
    title: examData.title || "",
    subject: examData.subject || "",
    level: examData.level || "PLE",
    year: typeof examData.year === "number" ? examData.year : Number(examData.year || 0),
    time_limit: typeof examData.timeLimit === "number" ?
      examData.timeLimit :
      typeof examData.time_limit === "number" ?
        examData.time_limit :
        60,
    difficulty: examData.difficulty || "Medium",
    type: examData.type || "Past Paper",
    is_free: typeof examData.isFree === "boolean" ? examData.isFree : !!examData.is_free,
    explanation_pdf_url: examData.explanationPdfUrl || examData.explanation_pdf_url || null,
  };

  let questionsSnap;
  try {
    questionsSnap = await db.collection("questions")
        .where("examId", "==", examId)
        .orderBy("questionNumber")
        .get();
  } catch (_error) {
    questionsSnap = await db.collection("questions")
        .where("exam_id", "==", examId)
        .orderBy("question_number")
        .get();
  }

  const questions = [];
  for (const questionDoc of questionsSnap.docs) {
    const questionData = questionDoc.data();
    const questionId = questionDoc.id;

    let partsSnap;
    try {
      partsSnap = await db.collection("question_parts")
          .where("questionId", "==", questionId)
          .orderBy("orderIndex")
          .get();
    } catch (_error) {
      partsSnap = await db.collection("question_parts")
          .where("question_id", "==", questionId)
          .orderBy("order_index")
          .get();
    }

    const parts = partsSnap.docs.map((partDoc) => {
      const partData = partDoc.data();
      return {
        id: partDoc.id,
        question_id: partData.questionId || partData.question_id || questionId,
        text: partData.text || "",
        answer: partData.answer || "",
        explanation: partData.explanation || null,
        marks: typeof partData.marks === "number" ? partData.marks : 1,
        order_index: typeof partData.orderIndex === "number" ?
          partData.orderIndex :
          typeof partData.order_index === "number" ?
            partData.order_index :
            0,
        answer_type: partData.answerType || partData.answer_type || "text",
      };
    });

    questions.push({
      id: questionId,
      exam_id: questionData.examId || questionData.exam_id || examId,
      question_number: typeof questionData.questionNumber === "number" ?
        questionData.questionNumber :
        typeof questionData.question_number === "number" ?
          questionData.question_number :
          0,
      text: questionData.text || "",
      image_url: questionData.imageUrl || questionData.image_url || null,
      question_parts: parts.sort((a, b) => a.order_index - b.order_index),
      parts,
    });
  }

  questions.sort((a, b) => a.question_number - b.question_number);
  return {ok: true, exam, questions};
});

exports.listReviewDueQuestions = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const userId = request.auth.uid;
  const limit = request.data && typeof request.data.limit === "number" ?
    Math.max(1, Math.min(50, request.data.limit)) :
    20;
  const nowIso = new Date().toISOString();

  let historySnap;
  try {
    historySnap = await db.collection("question_history")
        .where("userId", "==", userId)
        .where("nextReview", "<=", nowIso)
        .limit(limit)
        .get();
  } catch (_error) {
    historySnap = await db.collection("question_history")
        .where("user_id", "==", userId)
        .where("next_review", "<=", nowIso)
        .limit(limit)
        .get();
  }

  if (historySnap.empty) {
    return {ok: true, items: []};
  }

  const items = [];
  for (const historyDoc of historySnap.docs) {
    const history = historyDoc.data();
    const questionPartId = history.questionPartId || history.question_part_id;
    if (!questionPartId) continue;

    const partSnap = await db.collection("question_parts").doc(questionPartId).get();
    if (!partSnap.exists) continue;
    const part = partSnap.data();

    const questionId = part.questionId || part.question_id;
    if (!questionId) continue;
    const questionSnap = await db.collection("questions").doc(questionId).get();
    if (!questionSnap.exists) continue;
    const question = questionSnap.data();

    const examId = question.examId || question.exam_id || history.examId || history.exam_id;
    if (!examId) continue;
    const examSnap = await db.collection("exams").doc(examId).get();
    if (!examSnap.exists) continue;
    const exam = examSnap.data();

    items.push({
      history: {
        id: historyDoc.id,
        user_id: history.userId || history.user_id || userId,
        question_part_id: questionPartId,
        exam_id: history.examId || history.exam_id || examId,
        is_correct: typeof history.isCorrect === "boolean" ?
          history.isCorrect :
          !!history.is_correct,
        streak: typeof history.streak === "number" ? history.streak : 0,
        next_review: history.nextReview || history.next_review || nowIso,
        last_attempt: history.lastAttempt || history.last_attempt || nowIso,
      },
      part: {
        id: partSnap.id,
        question_id: questionId,
        text: part.text || "",
        answer: part.answer || "",
        marks: typeof part.marks === "number" ? part.marks : 1,
        explanation: part.explanation || null,
        order_index: typeof part.orderIndex === "number" ?
          part.orderIndex :
          typeof part.order_index === "number" ?
            part.order_index :
            0,
        answer_type: part.answerType || part.answer_type || "text",
      },
      question: {
        id: questionSnap.id,
        exam_id: examId,
        question_number: typeof question.questionNumber === "number" ?
          question.questionNumber :
          typeof question.question_number === "number" ?
            question.question_number :
            0,
        text: question.text || "",
        image_url: question.imageUrl || question.image_url || null,
      },
      exam: {
        id: examSnap.id,
        title: exam.title || "",
        subject: exam.subject || "",
        level: exam.level || "PLE",
      },
    });
  }

  return {ok: true, items};
});

exports.submitReviewAnswer = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const userId = request.auth.uid;
  const historyId = request.data && request.data.historyId;
  if (!historyId || typeof historyId !== "string") {
    throw new HttpsError("invalid-argument", "historyId is required.");
  }

  const isCorrect = !!(request.data && request.data.isCorrect);
  const streak = request.data && typeof request.data.streak === "number" ?
    request.data.streak :
    0;
  const nextReview = request.data && typeof request.data.nextReview === "string" ?
    request.data.nextReview :
    new Date().toISOString();
  const lastAttempt = request.data && typeof request.data.lastAttempt === "string" ?
    request.data.lastAttempt :
    new Date().toISOString();

  const historyRef = db.collection("question_history").doc(historyId);
  const snap = await historyRef.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Question history not found.");
  }
  const data = snap.data();
  const ownerId = data.userId || data.user_id;
  if (ownerId !== userId) {
    throw new HttpsError("permission-denied", "Not allowed to update this question history.");
  }

  await historyRef.set({
    isCorrect,
    is_correct: isCorrect,
    streak,
    nextReview,
    next_review: nextReview,
    lastAttempt,
    last_attempt: lastAttempt,
    updatedAt: admin.firestore.Timestamp.now(),
  }, {merge: true});

  return {ok: true};
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
  await assertAdminRole(request);

  const profilesSnap = await db.collection("profiles").limit(200).get();
  const rolesSnap = await db.collection("user_roles").limit(200).get();
  const examsSnap = await db.collection("exams").orderBy("year", "desc").limit(200).get();

  const roleMap = {};
  rolesSnap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    roleMap[docSnap.id] = data.role || "student";
    if (data.userId) roleMap[data.userId] = data.role || "student";
    if (data.user_id) roleMap[data.user_id] = data.role || "student";
  });

  const users = profilesSnap.docs.map((docSnap) => {
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
      totalUsers: profilesSnap.size,
      totalExams: examsSnap.size,
      totalAttempts: attemptsSnap.size,
      premiumUsers: subsSnap.size,
    },
  };
});

exports.adminListExams = onCall(async (request) => {
  await assertAdminRole(request);
  const snap = await db.collection("exams").orderBy("year", "desc").limit(200).get();
  return {ok: true, items: snap.docs.map((docSnap) => mapExamForClient(docSnap))};
});

exports.adminUpsertExam = onCall(async (request) => {
  await assertAdminRole(request);
  const d = request.data || {};
  const examId = typeof d.id === "string" ? d.id : "";
  const payload = {
    title: typeof d.title === "string" ? d.title : "",
    subject: typeof d.subject === "string" ? d.subject : "",
    level: typeof d.level === "string" ? d.level : "PLE",
    year: typeof d.year === "number" ? d.year : new Date().getFullYear(),
    type: typeof d.type === "string" ? d.type : "Past Paper",
    difficulty: typeof d.difficulty === "string" ? d.difficulty : "Medium",
    timeLimit: typeof d.time_limit === "number" ? d.time_limit : 60,
    time_limit: typeof d.time_limit === "number" ? d.time_limit : 60,
    isFree: !!d.is_free,
    is_free: !!d.is_free,
    description: d.description || null,
    topic: d.topic || null,
    explanationPdfUrl: d.explanation_pdf_url || null,
    explanation_pdf_url: d.explanation_pdf_url || null,
    updatedAt: admin.firestore.Timestamp.now(),
  };

  if (!payload.title || !payload.subject) {
    throw new HttpsError("invalid-argument", "title and subject are required.");
  }

  const ref = examId ? db.collection("exams").doc(examId) : db.collection("exams").doc();
  await ref.set({
    ...payload,
    ...(examId ? {} : {createdAt: admin.firestore.Timestamp.now(), questionCount: 0, question_count: 0}),
  }, {merge: true});
  return {ok: true, id: ref.id};
});

exports.adminDuplicateExam = onCall(async (request) => {
  await assertAdminRole(request);
  const examId = request.data && request.data.examId;
  if (!examId || typeof examId !== "string") {
    throw new HttpsError("invalid-argument", "examId is required.");
  }

  const sourceExamRef = db.collection("exams").doc(examId);
  const sourceExamSnap = await sourceExamRef.get();
  if (!sourceExamSnap.exists) {
    throw new HttpsError("not-found", "Source exam not found.");
  }
  const sourceExam = sourceExamSnap.data();
  const now = admin.firestore.Timestamp.now();
  const newExamRef = db.collection("exams").doc();
  await newExamRef.set({
    ...sourceExam,
    title: `${sourceExam.title || "Exam"} (Copy)`,
    questionCount: 0,
    question_count: 0,
    createdAt: now,
    updatedAt: now,
  }, {merge: true});

  const questionSnap = await db.collection("questions")
      .where("examId", "==", examId)
      .orderBy("questionNumber", "asc")
      .get()
      .catch(async () => await db.collection("questions")
          .where("exam_id", "==", examId)
          .orderBy("question_number", "asc")
          .get());

  let questionCount = 0;
  for (const questionDoc of questionSnap.docs) {
    const q = questionDoc.data();
    const newQuestionRef = db.collection("questions").doc();
    await newQuestionRef.set({
      examId: newExamRef.id,
      exam_id: newExamRef.id,
      questionNumber: typeof q.questionNumber === "number" ? q.questionNumber : q.question_number,
      question_number: typeof q.questionNumber === "number" ? q.questionNumber : q.question_number,
      text: q.text || "",
      imageUrl: q.imageUrl || q.image_url || null,
      image_url: q.imageUrl || q.image_url || null,
      tableData: q.tableData || q.table_data || null,
      table_data: q.tableData || q.table_data || null,
      createdAt: now,
      updatedAt: now,
    }, {merge: true});
    questionCount++;

    const partSnap = await db.collection("question_parts")
        .where("questionId", "==", questionDoc.id)
        .orderBy("orderIndex", "asc")
        .get()
        .catch(async () => await db.collection("question_parts")
            .where("question_id", "==", questionDoc.id)
            .orderBy("order_index", "asc")
            .get());

    for (const partDoc of partSnap.docs) {
      const p = partDoc.data();
      await db.collection("question_parts").add({
        questionId: newQuestionRef.id,
        question_id: newQuestionRef.id,
        text: p.text || "",
        answer: p.answer || "",
        explanation: p.explanation || null,
        marks: typeof p.marks === "number" ? p.marks : 1,
        orderIndex: typeof p.orderIndex === "number" ? p.orderIndex : p.order_index || 0,
        order_index: typeof p.orderIndex === "number" ? p.orderIndex : p.order_index || 0,
        answerType: p.answerType || p.answer_type || "text",
        answer_type: p.answerType || p.answer_type || "text",
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  await newExamRef.set({
    questionCount: questionCount,
    question_count: questionCount,
    updatedAt: now,
  }, {merge: true});

  return {ok: true, exam: mapExamForClient(await newExamRef.get())};
});

exports.adminListExamQuestionsPreview = onCall(async (request) => {
  await assertAdminRole(request);
  const examId = request.data && request.data.examId;
  if (!examId || typeof examId !== "string") {
    throw new HttpsError("invalid-argument", "examId is required.");
  }

  const questionSnap = await db.collection("questions")
      .where("examId", "==", examId)
      .orderBy("questionNumber", "asc")
      .get()
      .catch(async () => await db.collection("questions")
          .where("exam_id", "==", examId)
          .orderBy("question_number", "asc")
          .get());

  const items = [];
  for (const docSnap of questionSnap.docs) {
    const q = docSnap.data();
    const partsSnap = await db.collection("question_parts")
        .where("questionId", "==", docSnap.id)
        .get()
        .catch(async () => await db.collection("question_parts")
            .where("question_id", "==", docSnap.id)
            .get());
    items.push({
      id: docSnap.id,
      exam_id: examId,
      question_number: typeof q.questionNumber === "number" ? q.questionNumber : q.question_number || 0,
      text: q.text || "",
      image_url: q.imageUrl || q.image_url || null,
      table_data: q.tableData || q.table_data || null,
      parts_count: partsSnap.size,
    });
  }

  return {ok: true, items};
});

exports.adminListExamQuestionsFull = onCall(async (request) => {
  await assertAdminRole(request);
  const examId = request.data && request.data.examId;
  if (!examId || typeof examId !== "string") {
    throw new HttpsError("invalid-argument", "examId is required.");
  }

  const questionSnap = await db.collection("questions")
      .where("examId", "==", examId)
      .orderBy("questionNumber", "asc")
      .get()
      .catch(async () => await db.collection("questions")
          .where("exam_id", "==", examId)
          .orderBy("question_number", "asc")
          .get());

  const items = [];
  for (const qDoc of questionSnap.docs) {
    const q = qDoc.data();
    const partSnap = await db.collection("question_parts")
        .where("questionId", "==", qDoc.id)
        .orderBy("orderIndex", "asc")
        .get()
        .catch(async () => await db.collection("question_parts")
            .where("question_id", "==", qDoc.id)
            .orderBy("order_index", "asc")
            .get());

    items.push({
      id: qDoc.id,
      exam_id: examId,
      question_number: typeof q.questionNumber === "number" ? q.questionNumber : q.question_number || 0,
      text: q.text || "",
      image_url: q.imageUrl || q.image_url || null,
      table_data: q.tableData || q.table_data || null,
      created_at: q.createdAt && q.createdAt.toDate ? q.createdAt.toDate().toISOString() : new Date().toISOString(),
      parts: partSnap.docs.map((pDoc) => {
        const p = pDoc.data();
        return {
          id: pDoc.id,
          question_id: qDoc.id,
          text: p.text || "",
          answer: p.answer || "",
          explanation: p.explanation || "",
          marks: typeof p.marks === "number" ? p.marks : 1,
          order_index: typeof p.orderIndex === "number" ? p.orderIndex : p.order_index || 0,
          answer_type: p.answerType || p.answer_type || "text",
          created_at: p.createdAt && p.createdAt.toDate ? p.createdAt.toDate().toISOString() : new Date().toISOString(),
        };
      }),
    });
  }

  return {ok: true, items};
});

exports.adminSaveExamQuestions = onCall(async (request) => {
  await assertAdminRole(request);
  const examId = request.data && request.data.examId;
  const questions = request.data && Array.isArray(request.data.questions) ? request.data.questions : [];
  if (!examId || typeof examId !== "string") {
    throw new HttpsError("invalid-argument", "examId is required.");
  }

  const existingQuestionSnap = await db.collection("questions")
      .where("examId", "==", examId)
      .get()
      .catch(async () => await db.collection("questions").where("exam_id", "==", examId).get());
  for (const qDoc of existingQuestionSnap.docs) {
    const existingParts = await db.collection("question_parts")
        .where("questionId", "==", qDoc.id)
        .get()
        .catch(async () => await db.collection("question_parts").where("question_id", "==", qDoc.id).get());
    for (const pDoc of existingParts.docs) {
      await pDoc.ref.delete();
    }
    await qDoc.ref.delete();
  }

  const now = admin.firestore.Timestamp.now();
  for (const q of questions) {
    const qRef = db.collection("questions").doc();
    await qRef.set({
      examId,
      exam_id: examId,
      questionNumber: typeof q.question_number === "number" ? q.question_number : 0,
      question_number: typeof q.question_number === "number" ? q.question_number : 0,
      text: typeof q.text === "string" ? q.text : "",
      imageUrl: q.image_url || null,
      image_url: q.image_url || null,
      tableData: q.table_data || null,
      table_data: q.table_data || null,
      createdAt: now,
      updatedAt: now,
    });

    const parts = Array.isArray(q.parts) ? q.parts : [];
    for (const p of parts) {
      await db.collection("question_parts").add({
        questionId: qRef.id,
        question_id: qRef.id,
        text: typeof p.text === "string" ? p.text : "",
        answer: typeof p.answer === "string" ? p.answer : "",
        explanation: typeof p.explanation === "string" ? p.explanation : "",
        marks: typeof p.marks === "number" ? p.marks : 1,
        orderIndex: typeof p.order_index === "number" ? p.order_index : 0,
        order_index: typeof p.order_index === "number" ? p.order_index : 0,
        answerType: typeof p.answer_type === "string" ? p.answer_type : "text",
        answer_type: typeof p.answer_type === "string" ? p.answer_type : "text",
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  await db.collection("exams").doc(examId).set({
    questionCount: questions.length,
    question_count: questions.length,
    updatedAt: now,
  }, {merge: true});

  return {ok: true, questionCount: questions.length};
});

exports.adminBulkImportQuestions = onCall(async (request) => {
  await assertAdminRole(request);
  const examId = request.data && request.data.examId;
  const questions = request.data && Array.isArray(request.data.questions) ? request.data.questions : [];
  if (!examId || typeof examId !== "string") {
    throw new HttpsError("invalid-argument", "examId is required.");
  }
  const now = admin.firestore.Timestamp.now();

  for (const q of questions) {
    const qRef = db.collection("questions").doc();
    const questionNumber = typeof q.question_number === "number" ? q.question_number : 0;
    await qRef.set({
      examId,
      exam_id: examId,
      questionNumber,
      question_number: questionNumber,
      text: typeof q.text === "string" ? q.text : "",
      imageUrl: q.image_url || null,
      image_url: q.image_url || null,
      createdAt: now,
      updatedAt: now,
    }, {merge: true});

    const parts = Array.isArray(q.parts) ? q.parts : [];
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      await db.collection("question_parts").add({
        questionId: qRef.id,
        question_id: qRef.id,
        text: typeof p.text === "string" ? p.text : "",
        answer: typeof p.answer === "string" ? p.answer : "",
        explanation: typeof p.explanation === "string" ? p.explanation : "",
        marks: typeof p.marks === "number" ? p.marks : 1,
        orderIndex: i,
        order_index: i,
        answerType: typeof p.answer_type === "string" ? p.answer_type : "text",
        answer_type: typeof p.answer_type === "string" ? p.answer_type : "text",
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  const questionSnap = await db.collection("questions")
      .where("examId", "==", examId)
      .get()
      .catch(async () => await db.collection("questions").where("exam_id", "==", examId).get());
  await db.collection("exams").doc(examId).set({
    questionCount: questionSnap.size,
    question_count: questionSnap.size,
    updatedAt: now,
  }, {merge: true});

  return {ok: true, imported: questions.length, questionCount: questionSnap.size};
});

exports.adminSetQuestionImageUrls = onCall(async (request) => {
  await assertAdminRole(request);
  const examId = request.data && request.data.examId;
  const updates = request.data && Array.isArray(request.data.updates) ? request.data.updates : [];
  if (!examId || typeof examId !== "string") {
    throw new HttpsError("invalid-argument", "examId is required.");
  }

  const validUpdates = updates
      .map((u) => ({
        question_number: typeof u.question_number === "number" ? u.question_number : null,
        image_url: typeof u.image_url === "string" ? u.image_url : null,
      }))
      .filter((u) => u.question_number !== null && u.image_url);

  if (validUpdates.length === 0) {
    return {ok: true, updated: 0, missing: []};
  }

  const questionSnap = await db.collection("questions")
      .where("examId", "==", examId)
      .get()
      .catch(async () => await db.collection("questions").where("exam_id", "==", examId).get());

  const byNumber = new Map();
  for (const qDoc of questionSnap.docs) {
    const q = qDoc.data();
    const number = typeof q.questionNumber === "number" ? q.questionNumber :
      typeof q.question_number === "number" ? q.question_number : null;
    if (number !== null && !byNumber.has(number)) {
      byNumber.set(number, qDoc.ref);
    }
  }

  const batch = db.batch();
  const missing = [];
  let updated = 0;
  for (const u of validUpdates) {
    const ref = byNumber.get(u.question_number);
    if (!ref) {
      missing.push(u.question_number);
      continue;
    }
    batch.set(ref, {
      imageUrl: u.image_url,
      image_url: u.image_url,
      updatedAt: admin.firestore.Timestamp.now(),
    }, {merge: true});
    updated += 1;
  }

  if (updated > 0) {
    await batch.commit();
  }

  return {ok: true, updated, missing};
});
