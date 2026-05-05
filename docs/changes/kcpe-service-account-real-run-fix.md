# KCPE Mathematics 2023 Service Account Real Run Fix

## Date: 2026-04-16

## Problem Identified

The import script accepted the `--service-account` argument but did not actually use it during real import mode. The script only checked for environment variables in the `initializeFirebase()` method, causing it to fail with:

```
"Missing Firebase credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables."
```

Even when running:
```bash
node scripts/import-kcpe-mathematics-2023-standalone.mjs --service-account /path/to/service-account.json
```

## Root Cause

The argument parsing code extracted the `--service-account` path into a variable `serviceAccountPath`, but the `initializeFirebase()` method completely ignored this variable and only checked environment variables. The service account file argument was parsed but never used.

## Exact Fix Applied

### 1. Updated Argument Parsing
Added proper extraction of the `--service-account` argument:
```javascript
const serviceAccountIndex = args.indexOf('--service-account');
const serviceAccountPath = serviceAccountIndex !== -1 ? args[serviceAccountIndex + 1] : null;
```

### 2. Fixed Firebase Initialization
Completely rewrote the `initializeFirebase()` method to:

**Priority 1: Service Account File**
```javascript
if (serviceAccountPath) {
  // Read and parse the service account JSON file
  const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf8');
  const serviceAccount = JSON.parse(serviceAccountContent);
  
  // Extract credentials
  credentialConfig = {
    projectId: serviceAccount.project_id,
    clientEmail: serviceAccount.client_email,
    privateKey: serviceAccount.private_key.replace(/\\n/g, '\n')
  };
  this.credentialSource = `service-account file: ${serviceAccountPath}`;
}
```

**Priority 2: Environment Variables**
```javascript
else {
  // Fall back to environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  credentialConfig = { projectId, clientEmail, privateKey };
  this.credentialSource = 'environment variables';
}
```

### 3. Added Credential Source Logging
The script now clearly logs where credentials came from:
```javascript
console.log(`✅ Firebase Admin SDK initialized using ${this.credentialSource}`);
console.log(`📋 Project ID: ${credentialConfig.projectId}\n`);
```

## Final Correct Commands

### Using Service Account File (Recommended)
```bash
node scripts/import-kcpe-mathematics-2023-standalone.mjs --service-account /path/to/service-account.json
```

### Using Environment Variables
```bash
export FIREBASE_PROJECT_ID="xampreps-427913"
export FIREBASE_CLIENT_EMAIL="service-account@xampreps-427913.iam.gserviceaccount.com"
export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
node scripts/import-kcpe-mathematics-2023-standalone.mjs
```

### Dry Run with Service Account
```bash
node scripts/import-kcpe-mathematics-2023-standalone.mjs --dry-run --service-account /path/to/service-account.json
```

### Verbose Mode
```bash
node scripts/import-kcpe-mathematics-2023-standalone.mjs --verbose --service-account /path/to/service-account.json
```

## Expected Output

When running with a valid service account file:
```
🚀 Starting KCPE Mathematics 2023 Kenya import...

0. Validating import package...
   ✅ All 50 items validated
   ✅ All 50 interactions validated
   ✅ All 50 marking rules validated
   ✅ All 50 model answer versions validated
   ✅ Validation passed

📄 Reading service account from: /path/to/service-account.json
✅ Firebase Admin SDK initialized using service-account file: /path/to/service-account.json
📋 Project ID: xampreps-427913

1. Creating Exam...
   ✅ Exam created with ID: abc123...
...
```

When running without credentials:
```
🚀 Starting KCPE Mathematics 2023 Kenya import...

0. Validating import package...
   ✅ Validation passed

❌ Firebase initialization failed: Missing Firebase credentials. Either:
  1. Use --service-account <path-to-json-file>, OR
  2. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.
```

## Files Modified

- `scripts/import-kcpe-mathematics-2023-standalone.mjs` - Complete rewrite of credential handling

## Testing Performed

✅ **Dry run mode** - Works correctly without credentials
✅ **Argument parsing** - Correctly extracts `--service-account` path
✅ **File reading** - Properly reads and parses JSON service account files
✅ **Credential extraction** - Correctly extracts project_id, client_email, private_key
✅ **Firebase initialization** - Successfully initializes with both file and env var methods
✅ **Error handling** - Provides clear error messages when credentials are missing

## Summary

The service account file argument now works correctly in both dry-run and real import modes. The script:

- ✅ Reads service account JSON files when `--service-account` is provided
- ✅ Falls back to environment variables if no file is specified
- ✅ Logs the credential source clearly
- ✅ Provides helpful error messages
- ✅ Works with `--dry-run` for validation
- ✅ Works with `--verbose` for debugging

The import script is now fully functional and ready for production use.