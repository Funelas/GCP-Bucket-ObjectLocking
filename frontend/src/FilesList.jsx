import React, { useState } from "react";
import dayjs from "dayjs";
import MetadataModal from "./MetadataModal.jsx";

const FilesList = ({ loading, files, setFiles }) => {
  const [editingFile, setEditingFile] = useState(null);
  const [editingMetadata, setEditingMetadata] = useState(null);
  const [metadataChanges, setMetadataChanges] = useState({});

  if (loading) return <p className="text-green-400">Loading...</p>;

  const handleEditMetadata = (filename) => {
    const existing = metadataChanges[filename];
    const original = files[filename]?.metadata || {};
    setEditingFile(filename);
    setEditingMetadata(existing || original);
  };

  const closeModal = (filename, updatedMetadata) => {
    if (updatedMetadata) {
      setMetadataChanges((prev) => ({
        ...prev,
        [filename]: updatedMetadata,
      }));
    }
    setEditingFile(null);
    setEditingMetadata(null);
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
    // You can implement lock toggling logic here
  };

  const saveAllChanges = async () => {
    let updatedFiles = { ...files }; // Copy current files
  
    for (const [filename, metadata] of Object.entries(metadataChanges)) {
      console.log("Betlog");
      console.log(metadata);
      try {
        const response = await fetch("http://localhost:8000/update-metadata", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename, metadata }),
        });
  
        if (!response.ok) throw new Error(`Failed to update ${filename}`);
  
        console.log(`✅ ${filename} updated`);
  
        // 🔁 Manually update local files state
        updatedFiles[filename] = {
          ...updatedFiles[filename],
          metadata: metadata,
        };
      } catch (err) {
        console.error(`❌ Error updating ${filename}:`, err);
      }
    }
  
    // ✅ Update state once after loop
    setFiles(updatedFiles);
    setMetadataChanges({});
    alert("✅ All changes saved.");
  };
  

  const fileEntries = Object.entries(files);
  if (fileEntries.length === 0) return <p className="text-green-400">No files found.</p>;

  return (
    <>
      {editingFile && (
        <MetadataModal
          filename={editingFile}
          metadata={editingMetadata}
          onClose={closeModal}
        />
      )}

      <h2 className="text-green-400 text-xl mb-3">📁 Files</h2>

      <div className="bg-gray-800 p-4 w-full h-64 overflow-y-auto shadow-md space-y-2">
        {fileEntries.map(([filename, details], index) => {
          const metadata = details.metadata || {};
          const { hold_expiry } = metadata;
          const isLocked = details.temporary_hold === true;
          const lockDuration = isLocked ? calculateLockDuration(hold_expiry) : null;
          const isModified = metadataChanges.hasOwnProperty(filename);

          return (
            <div
              key={index}
              className={`bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 transition flex min-h-[40px] items-center ${isModified ? "border-l-4 border-yellow-400" : ""}`}
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

      {Object.keys(metadataChanges).length > 0 && (
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
