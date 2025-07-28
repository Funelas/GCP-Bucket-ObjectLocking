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

export function clearAllBucketSessions() {
  const keys = Object.keys(sessionStorage);
  keys.forEach((key) => {
    if (
      key.startsWith("metadataChanges-") ||
      key.startsWith("lockChanges-") ||
      key.startsWith("newFiles-") ||
      key.startsWith("expiredFiles-")
    ) {
      sessionStorage.removeItem(key);
    }
  });
}

 export const getAllChangedBucketNames = () => {
    const bucketNames = new Set();
  
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      const match = key.match(/^(metadataChanges|lockChanges|newFiles|expiredFiles)-(.+)$/);
      if (match) {
        const bucketName = match[2];
        bucketNames.add(bucketName);
      }
    }
  
    return Array.from(bucketNames);
  };
