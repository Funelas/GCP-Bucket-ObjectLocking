const METADATA_KEY = "metadataChanges";
const LOCK_KEY = "lockChanges";
const NEW_FILES_KEY = "newFiles"; // ✅

export function saveChangesToSession(metadataChanges, lockChanges, newFiles) {
  sessionStorage.setItem(METADATA_KEY, JSON.stringify(metadataChanges));
  sessionStorage.setItem(LOCK_KEY, JSON.stringify(lockChanges));
  sessionStorage.setItem(NEW_FILES_KEY, JSON.stringify(newFiles || [])); // ✅ optional chaining
}

export function loadChangesFromSession() {
  const metadata = JSON.parse(sessionStorage.getItem(METADATA_KEY) || "{}");
  const lock = JSON.parse(sessionStorage.getItem(LOCK_KEY) || "{}");
  const newFiles = JSON.parse(sessionStorage.getItem(NEW_FILES_KEY) || "[]"); // ✅
  return { metadataChanges: metadata, lockChanges: lock, newFiles };
}

export function clearSession() {
  sessionStorage.removeItem(METADATA_KEY);
  sessionStorage.removeItem(LOCK_KEY);
  sessionStorage.removeItem(NEW_FILES_KEY); // ✅
}
