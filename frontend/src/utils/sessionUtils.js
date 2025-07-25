export function saveChangesToSession(bucketName, metadataChanges, lockChanges, newFiles, expiredFiles) {
  sessionStorage.setItem(`metadataChanges-${bucketName}`, JSON.stringify(metadataChanges));
  sessionStorage.setItem(`lockChanges-${bucketName}`, JSON.stringify(lockChanges));
  sessionStorage.setItem(`newFiles-${bucketName}`, JSON.stringify(newFiles || []));
  sessionStorage.setItem(`expiredFiles-${bucketName}`, JSON.stringify(expiredFiles || []))
}

export function loadChangesFromSession(bucketName) {
  const metadata = JSON.parse(sessionStorage.getItem(`metadataChanges-${bucketName}`) || "{}");
  const lock = JSON.parse(sessionStorage.getItem(`lockChanges-${bucketName}`) || "{}");
  const newFiles = JSON.parse(sessionStorage.getItem(`newFiles-${bucketName}`) || "[]");
  const expiredFiles = JSON.parse(sessionStorage.getItem(`expiredFiles-${bucketName}`) || "[]")
  return { metadataChanges: metadata, lockChanges: lock, newFiles, expiredFiles };
}


