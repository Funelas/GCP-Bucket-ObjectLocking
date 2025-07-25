import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import MetadataModal from "./MetadataModal.jsx";
import ObjectLockModal from "./ObjectLockModal.jsx";
import Pagination from "./Pagination.jsx";
import LockByUrlInput from "./LockByUrlInput.jsx";
import { loadChangesFromSession, saveChangesToSession } from "./utils/sessionUtils.js";
import LockByIdInput from "./LockByIdInput.jsx";

const FilesList = ({ setLoading, loading, allFiles, setAllFiles, page, setPage, fetchFiles, currentLockFileGeneration, expiredFiles, bucketName, buckets}) => {
  const [pages, setPages] = useState(1);
  const [visibleFiles, setVisibleFiles] = useState([]);

  const pageSize = 5;
  const [editingFile, setEditingFile] = useState(null);
  const [editingMetadata, setEditingMetadata] = useState(null);
  const [metadataChanges, setMetadataChanges] = useState({});
  const [lockChanges, setLockChanges] = useState({});
  const [lockingFile, setLockingFile] = useState(null);
  const [newFiles, setNewFiles] = useState([]);
  const [objectId, setObjectId] = useState(null);
  const [bucketChanges, setBucketChanges] = useState([]);
  useEffect(() => {
    const total = allFiles.length;
    setPages(Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    setVisibleFiles(allFiles.slice(start, end));
  }, [allFiles, page]);
  

  // Load from sessionStorage on mount
  useEffect(() => {
    const { metadataChanges, lockChanges, newFiles: savedNewFiles } = loadChangesFromSession(bucketName);
    setMetadataChanges(metadataChanges);
    setLockChanges(lockChanges);
    setNewFiles(savedNewFiles); // ✅ load new files too

  }, []);
  const getAllChangedBucketNames = () => {
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
  // Save to sessionStorage when either changes, Saving to session
  useEffect(() => {
    saveChangesToSession(bucketName, metadataChanges, lockChanges, newFiles, expiredFiles);
    console.log("Metadata Changes: ", metadataChanges);
    console.log("Lock Changes", lockChanges);
    console.log("New Files: ", newFiles);
  }, [metadataChanges, lockChanges, newFiles]);

  if (loading) return <p className="text-green-400">Loading...</p>;
  
  const addFileToList = (filename) => {
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
        const updatedAllFiles = [...allFiles, ...generatedNewFiles];
        const updatedNewFiles = [...newFiles, ...generatedNewFiles];
  
        setAllFiles(updatedAllFiles);
        setNewFiles(updatedNewFiles);
  
        const newTotal = updatedAllFiles.length;
        const newLastPage = Math.ceil(newTotal / pageSize);
        setPage(newLastPage);
  
        // Also save to session
        saveChangesToSession(bucket, metadataChanges, lockChanges, updatedNewFiles,expiredFiles);
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
  };
  
  
  
  
  const handleEditMetadata = (filename) => {
    const existing = metadataChanges[filename];
    const fileObject = allFiles.find((f) => f.name === filename);
    const original = fileObject?.metadata || {};
    setEditingFile(filename);
    setEditingMetadata(existing || original);
  };

  const closeModal = (filename, update = null, updateType = null) => {
    const filenames = typeof filename === "string" ? { [bucketName]: [filename] } : filename;
  
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
  
          saveChangesToSession(bucket, sessionMetadataChanges, sessionLockChanges, sessionNewFiles, expiredFiles);
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
  
          saveChangesToSession(bucket, sessionMetadataChanges, sessionLockChanges, sessionNewFiles, expiredFiles);
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
  };
  


  const calculateLockDuration = (holdExpiry) => {
    if (!holdExpiry) return "Indefinite";
  
    const now = dayjs();
    const expiry = dayjs(holdExpiry);
  
    // 👉 Treat anything 30 seconds or more into the future as indefinite
    if (expiry.diff(now, "second") <= 30) {
      return "Indefinite";
    }
  
    const diff = expiry.diff(now, "day");
  
    if (diff > 0) return `${diff} day(s) left`;
    if (diff === 0) return "Expires today";
    return `Expired ${Math.abs(diff)} day(s) ago`;
  };
  

  const handleToggleLock = (filename, currentLockState) => {
    if (currentLockState) {
      // 🔓 Unlock
      setLockChanges((prev) => ({
        ...prev,
        [filename]: {
          temporary_hold: false,
          hold_expiry: dayjs().add(10, 'second'), // 💥 explicitly set to null to override old expiration
        },
      }));
    } else {
      // 🔒 Lock
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
    setLoading(true);
    // let updatedFiles = [ ...allFiles ];
    // const allChangedBuckets = getAllChangedBucketNames();
    // console.log("All Changed Buckets: ", allChangedBuckets);
    for (const bucket of bucketChanges){
      const {metadataChanges : sessionMetadataChanges,
            lockChanges : sessionLockChanges,
            newFiles : sessionNewFiles,
            expiredFiles : sessionExpiredFiles
      } = loadChangesFromSession(bucketName);
      const formattedExpiredFiles = sessionExpiredFiles.length > 0 ? (sessionExpiredFiles.map((file) => 
        {return {
          "filename" : file.name,
          "metadata" : file.metadata,
          "lockstatus" : {
            "temporary_hold" : file.temporary_hold,
            "hold_expiry" : file.expiration_date
          }
        }})) : []
        // Combine metadata + lockChanges into one array
        const combinedUpdates = [...formattedExpiredFiles];
      
        const filenames = new Set([
          ...Object.keys(sessionMetadataChanges),
          ...Object.keys(sessionLockChanges),
        ]);
        
        filenames.forEach((filename) => {
          const entry = { filename };
          if (sessionMetadataChanges[filename]) {
            entry.metadata = sessionMetadataChanges[filename];
          }
          if (sessionLockChanges[filename]) {
            
            const { temporary_hold, hold_expiry } = sessionLockChanges[filename];
            const entryLock = { temporary_hold };
            if (hold_expiry) {
    
              entryLock.hold_expiry = hold_expiry;  // 🔥 Include inside lockstatus
            }
            entry.lockstatus = entryLock;  // ✅ assign final object with retention_days
          }
          
          combinedUpdates.push(entry);
        });
        const new_data = {
          "updates" : combinedUpdates,
          "currentGeneration" : String(currentLockFileGeneration)
        }
        try {
          const response = await fetch(`http://localhost:8000/update-files-batch?bucket=${bucket}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(new_data),
          });
      
          if (!response.ok) throw new Error("Lock File Generation Mismatch. Please refresh webpage.");
      }catch(err){
        alert(err);
      }finally{
        setNewFiles([]);  // ✅ reset new unsaved additions
        setMetadataChanges({});
        setLockChanges({});
        await fetchFiles()
        alert("✅ All changes saved.");
        setLoading(false);
      }
    };
    }
    
  
      // Apply metadataChanges to local state
      // filenames.forEach((filename) => {
      //   const fileIndex = updatedFiles.findIndex((f) => f.name === filename);
      //   if (fileIndex !== -1) {
      //     if (metadataChanges[filename]) {
      //       updatedFiles[fileIndex].metadata = metadataChanges[filename];
      //     }
      //     if (lockChanges[filename]) {
      //       const { temporary_hold, hold_expiry } = lockChanges[filename];
      //       updatedFiles[fileIndex].temporary_hold = temporary_hold;
          
      //       // ✅ Clear expiration properly on unlock
      //       if (temporary_hold === false && !hold_expiry) {
      //         updatedFiles[fileIndex].expiration_date = null;
      //       } else {
      //         updatedFiles[fileIndex].expiration_date = hold_expiry;
      //       }

      //       if (
      //         lockChanges[filename].temporary_hold === false &&
      //         lockChanges[filename].hold_expiry === null
      //       ) {
      //         updatedFiles[fileIndex].expiration_date = null;
      //       }
      //     }
          
        
      //   }
      // });
  
      // setAllFiles(updatedFiles);
      
      
    
  
  
  if (!Array.isArray(allFiles)) return <p className="text-green-400">Loading files...</p>;
  const fileEntries = visibleFiles;

  return (
    <>
      {editingFile && (
        <MetadataModal
          filename={editingFile}
          metadata={editingMetadata}
          onClose={closeModal}
          objectId = {objectId}
        />
      )}
      {lockingFile && (
        <ObjectLockModal filename={lockingFile} onClose={closeModal} objectId= {objectId}/>
      )}

      <h2 className="text-green-400 text-xl mb-3">📁 Files</h2>
      <LockByIdInput onAddMultiple={setLockingFile} onFileAddMultiple = {addFileToList} setObjectId={setObjectId} availableBuckets={buckets}/>
      <LockByUrlInput onAdd={setLockingFile} onFileAdd={addFileToList} bucketName={bucketName}/>
      
      <div className="bg-gray-800 p-4 w-full h-64 overflow-y-auto space-y-2">

      { fileEntries.length === 0 ? (
      <p className="text-green-400">🪹 No files in this bucket are currently locked.</p>) : 
      fileEntries.map((details, index) => {
      const filename = details.name;
      const pendingMetadata = metadataChanges[filename];
      const metadata = pendingMetadata || details.metadata || {};

      const pendingLock = lockChanges[filename];
      const finalLockState = pendingLock?.temporary_hold ?? details.temporary_hold;
      const finalExpiry = pendingLock?.hold_expiry ?? details.expiration_date;
      const now = dayjs().add(30, 'second');
      const expiryDate = finalExpiry ? dayjs(finalExpiry) : null;
      const isExpiryValid = expiryDate && expiryDate.isAfter(now);
      const isLocked = finalLockState === true || isExpiryValid;
      const lockDuration = isLocked ? calculateLockDuration(finalExpiry) : null;

      const isModified =
        metadataChanges.hasOwnProperty(filename) ||
        lockChanges.hasOwnProperty(filename);

      return (
        <div
          key={index}
          className={`bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 transition flex min-h-[40px] items-center ${isModified ? "border-l-4 border-yellow-400" : ""}`}
        >
          <div className="w-[30%] text-left truncate">{filename}</div>
          <div className="w-[20%] text-xs text-green-400">
            <div>Project: {metadata.project || "None"}</div>
            <div>Category: {metadata.category || "None"}</div>
          </div>

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


      {bucketChanges.length > 0 && (
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
