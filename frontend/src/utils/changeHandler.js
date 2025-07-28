import dayjs from "dayjs";
import { loadChangesFromSession, saveChangesToSession, getAllChangedBucketNames, clearAllBucketSessions } from "./sessionUtils";

export function addFileToListHelper({
    filename,
    bucketName,
    allFiles,
    newFiles,
    setAllFiles,
    setNewFiles,
    setPage,
    pageSize,
    expiredFiles,
    metadataChanges,
    lockChanges,
  }) {
    const newFilesToAdd = typeof filename === "string" ? { [bucketName]: [filename] } : filename;
  
    for (const [bucket, files] of Object.entries(newFilesToAdd)) {
      if (!files || files.length === 0) continue;
  
      const now = new Date().toISOString();
  
      const generatedNewFiles = files.map((file) => ({
        name: file,
        temporary_hold: false,
        expiration_date: null,
        metadata: {},
        updated_at: now,
      }));
  
      if (bucket === bucketName) {
        const filteredFiles = generatedNewFiles.filter(
          (file) =>
            !allFiles.some((f) => f.name === file.name) &&
            !newFiles.some((f) => f.name === file.name)
        );
  
        const updatedAllFiles = [...allFiles, ...filteredFiles];
        const updatedNewFiles = [...newFiles, ...filteredFiles];
  
        setAllFiles(updatedAllFiles);
        setNewFiles(updatedNewFiles);
  
        const newTotal = updatedAllFiles.length;
        const newLastPage = Math.ceil(newTotal / pageSize);
        setPage(newLastPage);
  
        saveChangesToSession(bucket, metadataChanges, lockChanges, updatedNewFiles, expiredFiles);
      } else {
        const {
          metadataChanges: sessionMetadataChanges,
          lockChanges: sessionLockChanges,
          newFiles: sessionNewFiles,
        } = loadChangesFromSession(bucket);
  
        const updatedNewFiles = [...sessionNewFiles, ...generatedNewFiles];
  
        saveChangesToSession(bucket, sessionMetadataChanges, sessionLockChanges, updatedNewFiles, expiredFiles);
      }
    }
  }
  
export function closeModalHandler({
  filename,
  update = null,
  updateType = null,
  bucketName,
  expiredFiles,
  setMetadataChanges,
  setLockChanges,
  setEditingFile,
  setEditingMetadata,
  setLockingFile,
  setObjectId,
  setBucketChanges,
}) {
  if (filename === null) {
    setEditingMetadata(null);
    setLockingFile(null);
    setEditingFile(null);
    return;
  }

  const filenames =
    typeof filename === "string" ? { [bucketName]: [filename] } : filename;

  for (const [bucket, files] of Object.entries(filenames)) {
    if (updateType === "metadata" && update) {
      if (bucket === bucketName) {
        files.forEach((file) => {
          setMetadataChanges((prev) => ({
            ...prev,
            [file]: update,
          }));
        });
      } else {
        const {
          metadataChanges: sessionMetadataChanges,
          lockChanges: sessionLockChanges,
          newFiles: sessionNewFiles,
        } = loadChangesFromSession(bucket);

        files.forEach((file) => {
          sessionMetadataChanges[file] = update;
        });

        saveChangesToSession(
          bucket,
          sessionMetadataChanges,
          sessionLockChanges,
          sessionNewFiles,
          expiredFiles
        );
      }
    } else if (updateType === "lock") {
      const isIndefinite = update === null;
      const holdExpiry = isIndefinite
        ? dayjs().add(10, "second").toISOString()
        : update;

      if (bucket === bucketName) {
        files.forEach((file) => {
          setLockChanges((prev) => ({
            ...prev,
            [file]: {
              temporary_hold: isIndefinite,
              hold_expiry: holdExpiry,
            },
          }));
        });
      } else {
        const {
          metadataChanges: sessionMetadataChanges,
          lockChanges: sessionLockChanges,
          newFiles: sessionNewFiles,
        } = loadChangesFromSession(bucket);

        files.forEach((file) => {
          sessionLockChanges[file] = {
            temporary_hold: isIndefinite,
            hold_expiry: holdExpiry,
          };
        });

        saveChangesToSession(
          bucket,
          sessionMetadataChanges,
          sessionLockChanges,
          sessionNewFiles,
          expiredFiles
        );
      }
    }
  }

  if (typeof filename === "object" && updateType === "lock") {
    setEditingFile(filenames);
  } else {
    setEditingFile(null);
    setObjectId(null);
  }

  setBucketChanges(getAllChangedBucketNames());
  setEditingMetadata(null);
  setLockingFile(null);
}


// Formats a single expired file entry
const formatExpiredFile = (file) => ({
  filename: file.name,
  metadata: file.metadata,
  lockstatus: {
    temporary_hold: file.temporary_hold,
    hold_expiry: file.expiration_date,
  },
});

export async function saveAllChangesHandler({
  bucketChanges,
  fetchFiles,
  setLoading,
  setNewFiles,
  setMetadataChanges,
  setLockChanges,
  setBucketChanges
}) {
  setLoading(true);

  for (const bucket of bucketChanges) {
    const {
      metadataChanges: sessionMetadataChanges,
      lockChanges: sessionLockChanges,
      expiredFiles: sessionExpiredFiles,
    } = loadChangesFromSession(bucket);

    const formattedExpiredFiles = sessionExpiredFiles?.length
      ? sessionExpiredFiles.map(formatExpiredFile)
      : [];

    const filenames = new Set([
      ...Object.keys(sessionMetadataChanges),
      ...Object.keys(sessionLockChanges),
    ]);

    const combinedUpdates = [...formattedExpiredFiles];

    filenames.forEach((filename) => {
      const entry = { filename };

      if (sessionMetadataChanges[filename]) {
        entry.metadata = sessionMetadataChanges[filename];
      }

      if (sessionLockChanges[filename]) {
        const { temporary_hold, hold_expiry } = sessionLockChanges[filename];
        entry.lockstatus = {
          temporary_hold,
          ...(hold_expiry && { hold_expiry }),
        };
      }

      combinedUpdates.push(entry);
    });

    const payload = { updates: combinedUpdates };

    try {
      const response = await fetch(`http://localhost:8000/update-files-batch?bucket=${bucket}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("🚨 Lock File Generation Mismatch. Please refresh the webpage.");
    } catch (err) {
      alert(err.message);
    }
  }

  
  setNewFiles([]);
  setMetadataChanges({});
  setLockChanges({});
  await fetchFiles();
  clearAllBucketSessions();
  setBucketChanges([]);
  alert("✅ All changes saved.");
  setLoading(false);
}

// changeHandler.js
export const handleToggleLockHelper = ({ filename, currentLockState, setLockChanges, setLockingFile }) => {
    if (currentLockState) {
      setLockChanges((prev) => ({
        ...prev,
        [filename]: {
          temporary_hold: false,
          hold_expiry: dayjs().add(10, 'second'),
        },
      }));
    } else {
      setLockingFile(filename);
      setLockChanges((prev) => {
        const filtered = Object.fromEntries(Object.entries(prev).filter(([key]) => key !== filename));
        return filtered;
      });
    }
  };
  
  export const prepareMetadataEdit = ({ filename, allFiles, metadataChanges }) => {
    const existing = metadataChanges[filename];
    const fileObject = allFiles.find((f) => f.name === filename);
    const original = fileObject?.metadata || {};
    return {
      filename,
      metadata: existing || original,
    };
  };
  