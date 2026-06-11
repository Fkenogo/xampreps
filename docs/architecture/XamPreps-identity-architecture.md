# XamPreps Identity Architecture

# **XamPreps Identity Architecture**

## **School + School Admin + Teacher + Student Model**

## **1. Core principle**

Separate:

- **institution records**
- **human login identities**
- **relationship links**

That means:

- a **school** is not a login user
- a **school admin** is a login user
- a **teacher** is a login user
- a **student** is a login user
- a **parent** is a login user

All login users are real Auth users.

All organization and supervision relationships are stored separately.

---

## **2. Identity rules**

## **2.1 Who is a real Auth user**

These should all be Firebase Auth users:

- student
- parent
- teacher
- school_admin
- admin
- super_admin

## **2.2 Who is not a real Auth user**

These are not login identities:

- school
- class
- stream
- institution
- subscription account
- billing entity

These are records, not people.

---

## **3. Main model**

## **3.1 School**

A school is an organization record.

Example:

- St. Mary’s College
- Greenhill Academy
- Bright Future Primary School

A school can have:

- one or more school admins
- one or more teachers
- many students

The school continues to exist even if one school admin leaves.

---

## **3.2 School admin**

A school admin is a human who logs in and manages a school dashboard.

Examples:

- bursar
- head teacher
- director
- school operations officer

A school admin:

- belongs to a school through a link
- can manage students if granted permission
- can manage teachers if granted permission
- can view school-level analytics if granted permission

---

## **3.3 Teacher**

A teacher is a human login user.

A teacher can be:

- independent
- linked to a school
- linked to students directly
- linked to students through a school

A teacher may later become:

- a marker
- a reviewer
- a tutor
- a supervised learning coach

---

## **3.4 Student**

A student is always a real independent Auth user.

A student may be:

- self-created
- parent-created
- school-created
- teacher-created

But once created, the student remains an independent user with their own dashboard.

The creator does not “own” the student identity.

---

## **3.5 Parent**

A parent is a real login user.

A parent can:

- create student accounts
- link to existing students
- monitor progress
- pay
- receive alerts

---

# **4. Roles**

Use one canonical user profile collection.

## **users/{uid}**

Fields:

- uid
- primaryRole: student | parent | teacher | school_admin | admin | super_admin
- secondaryRoles: string[]
- status: active | invited | pending_setup | suspended | archived
- displayName
- email nullable
- phone nullable
- hasEmailLogin
- createdAt
- updatedAt
- createdBy nullable
- profileVersion

Notes:

- school_admin is separate from school
- teacher is a first-class role
- student remains first-class and independent

---

# **5. Organization model**

## **schools/{schoolId}**

Fields:

- schoolId
- name
- shortName nullable
- registrationNumber nullable
- country
- district nullable
- schoolType: primary | secondary | mixed | other
- status: pending | active | suspended | archived
- subscriptionTier: free | premium | enterprise
- onboardingMode: admin_created | request_approved
- primaryAdminUid nullable
- billingOwnerUid nullable
- createdAt
- updatedAt
- createdBy

This is the institution record.

No password. No login.

---

# **6. Human profile collections**

## **student_profiles/{uid}**

Fields:

- uid
- firstName
- lastName
- preferredName nullable
- dateOfBirth nullable
- gender nullable
- country
- educationLevel
- gradeLevel nullable
- candidateNumber nullable
- learningMode: self | parent_managed | school_managed | teacher_managed | hybrid
- loginMode: access_code | email_password | both
- onboardingState: provisioned | first_login_pending | active | recovery_required
- mustChangePassword
- mustSetPin
- createdAt
- updatedAt

## **adult_profiles/{uid}**

For:

- parent
- teacher
- school_admin

Fields:

- uid
- adultType: parent | teacher | school_admin
- firstName
- lastName
- phone nullable
- country
- jobTitle nullable
- status
- createdAt
- updatedAt

---

# **7. Relationship model**

This is the most important part.

## **7.1 School admin links**

## **school_admin_links/{schoolId_uid}**

Fields:

- linkId
- schoolId
- uid
- roleAtSchool: owner | admin | operator | bursar | academic_head
- status: active | invited | revoked
- permissions:
    - manageStudents
    - manageTeachers
    - viewSchoolAnalytics
    - manageBilling
    - manageSchoolProfile
- createdAt
- createdBy

This allows many admins per school.

---

## **7.2 Teacher-school links**

## **teacher_school_links/{teacherUid_schoolId}**

Fields:

- linkId
- teacherUid
- schoolId
- status: active | invited | revoked
- employmentType: staff | contractor | tutor | partner
- subjectTags: string[]
- permissions:
    - viewAssignedStudents
    - createStudents
    - reviewSubmissions
    - assignWork
- createdAt
- createdBy

A teacher may be linked to a school or remain independent.

---

## **7.3 Parent-student links**

## **parent_student_links/{parentUid_studentUid}**

Fields:

- linkId
- parentUid
- studentUid
- relationshipType: mother | father | guardian | sponsor | other
- status: active | pending | revoked
- permissions:
    - viewProgress
    - receiveAlerts
    - manageAccount
    - payForStudent
- createdAt
- createdBy

---

## **7.4 School-student links**

## **school_student_links/{schoolId_studentUid}**

Fields:

- linkId
- schoolId
- studentUid
- status: active | pending | transferred | revoked
- studentNumber nullable
- className nullable
- streamName nullable
- startDate nullable
- endDate nullable
- permissions:
    - viewProgress
    - includeInSchoolReports
    - manageRoster
- createdAt
- createdBy

---

## **7.5 Teacher-student links**

## **teacher_student_links/{teacherUid_studentUid}**

Fields:

- linkId
- teacherUid
- studentUid
- status: active | pending | revoked
- source: teacher_created | school_assigned | invited | claimed
- scope: full | academic | marking_only | tutoring_only
- subjectTags: string[]
- permissions:
    - viewProgress
    - assignWork
    - reviewSubmissions
    - futureMarking
- createdAt
- createdBy

This is where the teacher growth model becomes real.

---

# **8. Student access model**

This solves the “student has no email” problem.

## **student_access/{studentUid}**

Fields:

- studentUid
- accessCode
- accessCodeNormalized
- temporarySecretHash nullable
- pinHash nullable
- passwordInitialized
- failedAttempts
- lockedUntil nullable
- lastAccessCodeRotationAt nullable
- lastLoginAt nullable
- credentialState: temporary | active | locked | reset_required
- createdAt
- updatedAt

## **auth_login_aliases/{aliasKey}**

Fields:

- aliasKey
- uid
- type: student_access_code
- status
- createdAt
- updatedAt

Important:

- do not store plain PINs
- do not store plain temporary passwords
- do all credential generation and hashing in backend functions only

---

# **9. School onboarding recommendation**

## **Recommended answer**

Use **admin-approved school onboarding**.

Not full instant self-service school activation.

## **Why**

You are still shaping:

- school dashboard
- teacher model
- student creation rules
- subscriptions
- permissions

So for now:

### **Flow**

1. A school can submit a request
2. Admin reviews
3. Admin approves and creates the school
4. First school admin is invited or provisioned
5. School admin logs in and begins setup

This gives control without blocking growth.

---

# **10. Creation flows**

## **10.1 Parent creates student**

Backend creates:

- Firebase Auth user
- users/{studentUid}
- student_profiles/{studentUid}
- student_access/{studentUid}
- auth_login_aliases/{accessCode}
- parent_student_links/{parentUid_studentUid}

Optional:

- later add school or teacher links

---

## **10.2 Teacher creates student**

Backend creates:

- Firebase Auth user
- users/{studentUid}
- student_profiles/{studentUid}
- student_access/{studentUid}
- auth_login_aliases/{accessCode}
- teacher_student_links/{teacherUid_studentUid}

Optional:

- if teacher belongs to a school and chooses it, also create school_student_links

---

## **10.3 School admin creates student**

Backend creates:

- Firebase Auth user
- users/{studentUid}
- student_profiles/{studentUid}
- student_access/{studentUid}
- auth_login_aliases/{accessCode}
- school_student_links/{schoolId_studentUid}

Optional:

- later link teacher(s)
- later link parent(s)

---

## **10.4 Student self-signup**

Student creates their own account with email/password.

Backend creates:

- users/{uid}
- student_profiles/{uid}

No mandatory parent/school/teacher dependency.

---

# **11. Login flows**

## **Adults**

Use:

- email + password

Roles:

- parent
- teacher
- school_admin
- admin
- super_admin

## **Students**

Use:

- access code + temporary secret for first login
- then access code + PIN/password
- optional email/password later if student has email

This keeps students independent without forcing email.

---

# **12. Permission model**

## **School admin**

Can manage within school scope only.

## **Teacher**

Can manage only students linked to them or assigned through school.

## **Parent**

Can manage only linked students.

## **Student**

Can access their own dashboard directly.

## **Admin**

Can preview and manage system-wide.

---

# **13. Admin preview model**

Admin should be able to preview:

- student
- parent
- teacher
- school_admin

Not “school” directly, because school is not a user.

Use:

- admin_preview_sessions/{sessionId}

Fields:

- adminUid
- targetUid
- targetRole
- reason
- createdAt
- expiresAt

---

# **14. School-specific recommendation**

This is the answer to your main concern.

## **Do schools sign up directly?**

### **Better answer:**

Schools do **not** become active directly by self-signup.

Instead:

### **Option to keep now**

- school submits a request
- admin approves
- school record is created
- first school admin user is invited/created

That means:

- school = institution record
- school admin = Auth user

This avoids confusion and dirty data later.

---

# **15. Conflict rules**

## **Allowed**

- student linked to parent + teacher
- student linked to school + teacher
- teacher linked to school + independent students
- teacher creates student without school

## **Restricted**

- second active school link for the same student should be blocked unless transfer flow exists

## **Future transfer flow**

Later add:

- school transfer request
- revoke previous school link
- activate new one

---

# **16. Recommended implementation phases**

## **Phase 1**

Identity foundation:

- add teacher and school_admin roles
- create schools
- create link collections
- create student_access

## **Phase 2**

Backend creation flows:

- parent creates student
- teacher creates student
- school admin creates student

## **Phase 3**

Student access login:

- access code flow
- first login setup
- PIN/password rotation

## **Phase 4**

UI management flows:

- parent-managed students
- teacher-managed students
- school-admin-managed students

## **Phase 5**

Admin tools:

- school approval
- duplicate review
- credential reset
- preview roles

## **Phase 6**

Migration:

- move old link logic into new relationship model
- keep student identity independent

---

# **17. Final recommendation**

Use this exact mental model:

- **School = organization**
- **School admin = person**
- **Teacher = person**
- **Parent = person**
- **Student = person**
- all are tied together with link documents

And for now:

- **school onboarding should be admin-approved**
- not fully open instant self-service activation

That is the safest route.