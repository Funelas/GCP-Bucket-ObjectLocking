import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import MetadataModal from "./MetadataModal.jsx";
import ObjectLockModal from "./ObjectLockModal.jsx";
import Pagination from "./Pagination.jsx";

const FilesList = ({ loading, files, setFiles, page, setPage, pages }) => {
  const [editingFile, setEditingFile] = useState(null);
  const [editingMetadata, setEditingMetadata] = useState(null);
  const [metadataChanges, setMetadataChanges] = useState({});
  const [lockChanges, setLockChanges] = useState({});
  const [lockingFile, setLockingFile] = useState(null);
  

  

  if (loading) return <p className="text-green-400">Loading...</p>;

  const handleEditMetadata = (filename) => {
    const existing = metadataChanges[filename];
    const fileObject = files.find((f) => f.name === filename);
    const original = fileObject?.metadata || {};
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
    let updatedFiles = [ ...files ];
  
    // Combine metadata + lockChanges into one array
    const combinedUpdates = [];
  
    const filenames = new Set([
      ...Object.keys(metadataChanges),
      ...Object.keys(lockChanges),
    ]);
  
    filenames.forEach((filename) => {
      const entry = { filename };
      if (metadataChanges[filename]) {
        entry.metadata = metadataChanges[filename];
      }
      if (lockChanges[filename]) {
        entry.lockstatus = lockChanges[filename];
      }
      combinedUpdates.push(entry);
    });
  
    try {
      const response = await fetch("http://localhost:8000/update-files-batch", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(combinedUpdates),
      });
  
      if (!response.ok) throw new Error("Failed to save batch updates.");
  
      // Apply metadataChanges to local state
      filenames.forEach((filename) => {
        const fileIndex = updatedFiles.findIndex((f) => f.name === filename);
        if (fileIndex !== -1) {
          if (metadataChanges[filename]) {
            updatedFiles[fileIndex].metadata = metadataChanges[filename];
          }
          if (lockChanges[filename]) {
            updatedFiles[fileIndex].temporary_hold = lockChanges[filename].temporary_hold;
            updatedFiles[fileIndex].expiry_date = lockChanges[filename].hold_expiry || null;
          }
        }
      });
  
      setFiles(updatedFiles);
      setMetadataChanges({});
      setLockChanges({});
      alert("✅ All changes saved.");
    }catch(err){
      console.log(err);
    }
  };
  
  
  if (!Array.isArray(files)) return <p className="text-green-400">Loading files...</p>;
  const fileEntries = files;


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
      {fileEntries.map((details, index) => {
          const filename = details.name;

          const metadata = details.metadata || {};
          const pendingLock = lockChanges[filename];

          const finalLockState =
            pendingLock?.temporary_hold ?? details.temporary_hold;



          const finalExpiry =
          pendingLock?.hold_expiry ??
          metadata?.hold_expiry ??
          details.expiry_date;
          

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
      <Pagination page={page} pages={pages} setPage={setPage} />


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
