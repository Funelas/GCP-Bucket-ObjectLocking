import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import MetadataModal from "./MetadataModal.jsx";
import ObjectLockModal from "./ObjectLockModal.jsx";

const FilesList = ({ loading, files, setFiles }) => {
  const [editingFile, setEditingFile] = useState(null);
  const [editingMetadata, setEditingMetadata] = useState(null);
  const [metadataChanges, setMetadataChanges] = useState({});
  const [lockChanges, setLockChanges] = useState({});
  const [lockingFile, setLockingFile] = useState(null);
  const [expiryMap, setExpiryMap] = useState({});

  useEffect(() => {
    const fetchExpiry = async () => {
      try {
        const response = await fetch("http://localhost:8000/expiry-locks");
        const data = await response.json();
        setExpiryMap(data);
      } catch (err) {
        console.error("❌ Failed to load expiry map:", err);
      }
    };

    fetchExpiry();
  }, []);

  if (loading) return <p className="text-green-400">Loading...</p>;

  const handleEditMetadata = (filename) => {
    const existing = metadataChanges[filename];
    const original = files[filename]?.metadata || {};
    setEditingFile(filename);
    setEditingMetadata(existing || original);
  };

  const closeModal = (filename, updatedMetadata = null, updatedLockStatus = null) => {
    if (updatedMetadata) {
      setMetadataChanges((prev) => ({
        ...prev,
        [filename]: updatedMetadata,
      }));
    } else if (updatedLockStatus && typeof updatedLockStatus === "string") {
      setLockChanges((prev) => ({
        ...prev,
        [filename]: {
          temporary_hold: true,
          hold_expiry: updatedLockStatus,
        },
      }));
    // } else if (updatedLockStatus === false) {
    //   setLockChanges((prev) => ({
    //     ...prev,
    //     [filename]: { temporary_hold: false },
    //   }));
    }

    setEditingFile(null);
    setEditingMetadata(null);
    setLockingFile(null);
    console.log("Hello");
    console.log(lockChanges);
  };

  const calculateLockDuration = (holdExpiry) => {
    if (!holdExpiry) return "Indefinite";
    const now = dayjs();
    const expiry = dayjs(holdExpiry);
    const diff = expiry.diff(now, "day");
    if (diff > 0) return `${diff} day(s) left`;
    if (diff === 0) return "Expires today";
    return `Expired ${Math.abs(diff)} day(s) ago`;
  };

  const handleToggleLock = (filename, currentLockState) => {
    if (currentLockState) {
      setLockChanges((prev) => ({
        ...prev,
        [filename]: { temporary_hold: false },
      }));
    } else {
      setLockingFile(filename);
      setLockChanges((prev) => {
        const filtered = Object.fromEntries(
          Object.entries(prev).filter(([key, _]) => key !== filename)
        );
        return filtered;
      });
    }
  };

  const saveAllChanges = async () => {
    let updatedFiles = { ...files };

    for (const [filename, lockstatus] of Object.entries(lockChanges)) {
      try {
        await fetch("http://localhost:8000/update-lock", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ filename, lockstatus }),
        });
      } catch (err) {
        console.error(`❌ Error updating ${filename}:`, err);
      }
    }

    for (const [filename, metadata] of Object.entries(metadataChanges)) {
      try {
        const response = await fetch("http://localhost:8000/update-metadata", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename, metadata }),
        });

        if (!response.ok) throw new Error(`Failed to update ${filename}`);

        updatedFiles[filename] = {
          ...updatedFiles[filename],
          metadata: metadata,
        };
      } catch (err) {
        console.error(`❌ Error updating ${filename}:`, err);
      }
    }

    setFiles(updatedFiles);
    setMetadataChanges({});
    alert("✅ All changes saved.");
  };

  const fileEntries = Object.entries(files);
  if (fileEntries.length === 0)
    return <p className="text-green-400">No files found.</p>;

  return (
    <>
      {editingFile && (
        <MetadataModal
          filename={editingFile}
          metadata={editingMetadata}
          onClose={closeModal}
        />
      )}
      {lockingFile && (
        <ObjectLockModal filename={lockingFile} onClose={closeModal} />
      )}

      <h2 className="text-green-400 text-xl mb-3">📁 Files</h2>

      <div className="bg-gray-800 p-4 w-full h-64 overflow-y-auto space-y-2">
        {fileEntries.map(([filename, details], index) => {
          const metadata = details.metadata || {};
          const pendingLock = lockChanges[filename];

          const finalLockState =
            pendingLock?.temporary_hold ?? details.temporary_hold;

          // 🔍 Use expiry from lockChanges > metadata > Supabase expiry.json
          const holdExpiryFromMap = expiryMap[filename];


          const finalExpiry =
            pendingLock?.hold_expiry ??
            metadata?.hold_expiry ??
            holdExpiryFromMap;

          const isLocked = finalLockState === true;
          const lockDuration = isLocked
            ? calculateLockDuration(finalExpiry)
            : null;
          const isModified = metadataChanges.hasOwnProperty(filename);

          return (
            <div
              key={index}
              className={`bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 transition flex min-h-[40px] items-center ${
                isModified ? "border-l-4 border-yellow-400" : ""
              }`}
            >
              <div className="w-[50%] text-left truncate">{filename}</div>

              {isLocked ? (
                <div className="w-[20%] text-left text-yellow-300 text-sm">
                  🔒 Locked
                  <div className="text-xs">{lockDuration}</div>
                </div>
              ) : (
                <div className="w-[20%]" />
              )}

              <div className="w-[30%] flex gap-2">
                <button
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs py-1 px-2 rounded"
                  onClick={() => handleEditMetadata(filename)}
                >
                  Edit Metadata
                </button>
                <button
                  className={`${
                    isLocked
                      ? "bg-red-600 hover:bg-red-500"
                      : "bg-green-600 hover:bg-green-500"
                  } text-white text-xs py-1 px-2 rounded`}
                  onClick={() => handleToggleLock(filename, isLocked)}
                >
                  {isLocked ? "Unlock" : "Lock"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {(Object.keys(metadataChanges).length > 0 ||
        Object.keys(lockChanges).length > 0) && (
        <button
          className="mt-4 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded"
          onClick={saveAllChanges}
        >
          📂 Save All Changes
        </button>
      )}
    </>
  );
};

export default FilesList;
