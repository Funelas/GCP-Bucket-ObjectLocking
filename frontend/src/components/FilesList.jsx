import React, { useState, useEffect } from "react";
import MetadataModal from "./MetadataModal.jsx";
import ObjectLockModal from "./ObjectLockModal.jsx";
import Pagination from "./Pagination.jsx";
import LockByUrlInput from "./LockByUrlInput.jsx";
import LockByIdInput from "./LockByIdInput.jsx";
import FileEntry from "./FileEntry.jsx"; 
import BucketSelector from "./BucketSelector.jsx";
import dayjs from "dayjs";
import { loadChangesFromSession, saveChangesToSession, clearAllBucketSessions, getAllChangedBucketNames } from "../utils/sessionUtils.js";
const FilesList = ({ setLoading, loading, allFiles, setAllFiles, page, setPage, fetchFiles, expiredFiles, bucketName, buckets, setBucketName}) => {
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
    const updatePagination = () => {
      const total = allFiles.length;
      setPages(Math.ceil(total / pageSize));
    
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
    
      setVisibleFiles(allFiles.slice(start, end));
    };
    updatePagination();
  }, [allFiles, page]);
  

  useEffect(() => {
      const { metadataChanges, lockChanges, newFiles } = loadChangesFromSession(bucketName);
      setMetadataChanges(metadataChanges);
      setLockChanges(lockChanges);
      setNewFiles(newFiles);
    }, [allFiles]);

  useEffect(() => {
      saveChangesToSession(bucketName, metadataChanges, lockChanges, newFiles, expiredFiles);
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
    };
  
  

  const handleEditMetadata = (filename) => {
    const existing = metadataChanges[filename];
    const fileObject = allFiles.find((f) => f.name === filename);
    const original = fileObject?.metadata || {};
    setEditingFile(filename);
    setEditingMetadata(existing || original);
  };


  const closeModal = (filename, update = null, updateType = null) => {
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
  };
  
  const handleToggleLock = (filename, currentLockState) => {
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
  
  const saveAllChanges = async () => {
    setLoading(true);
    
    const payload = {
      buckets : []
    }
    for (const bucket of bucketChanges) {
      const {
        metadataChanges: sessionMetadataChanges,
        lockChanges: sessionLockChanges,
        expiredFiles: sessionExpiredFiles,
      } = loadChangesFromSession(bucket);
      console.log('Bucket Name: ', bucket);
      console.log("Lock Changes: ", sessionLockChanges);
      const formattedExpiredFiles = sessionExpiredFiles.length > 0 ? (sessionExpiredFiles.map((file) => 
        {return {
          "filename" : file.name,
          "metadata" : file.metadata,
          "lockstatus" : {
            "temporary_hold" : file.temporary_hold,
            "hold_expiry" : file.expiration_date
          }
        }})) : [];
  
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
  
      payload.buckets.push({
        name : bucket,
        updates : combinedUpdates
      });
    }
    
    try {
      const response = await fetch(`http://localhost:8000/update-all-buckets`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("🚨 Lock File Generation Mismatch. Please refresh the webpage.");
    } catch (err) {
      alert(err.message);
    }
      setNewFiles([]);
      setMetadataChanges({});
      setLockChanges({});
      await fetchFiles();
      clearAllBucketSessions();
      setBucketChanges([]);
      alert("✅ All changes saved.");
      setLoading(false);
  };
  
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
      
      <div className="bg-gray-800 p-4 w-full h-64 overflow-y-auto space-y-2 space-x-2 flex">
        <div className="overflow-y-auto w-[20%]">
        <BucketSelector
          buckets={buckets}
          selectedBucket={bucketName}
          onSelect={setBucketName}
        />
        </div>
        <div className="overflow-y-auto w-[80%] space-y-2">
          { fileEntries.length === 0 ? (
          <p className="text-green-400">🪹 No files in this bucket are currently locked.</p>) : 
          fileEntries.map((details, index) => {
            const filename = details.name;
          
            return (
              <FileEntry
                key={index}
                filename={filename}
                details={details}
                metadataChanges={metadataChanges}
                lockChanges={lockChanges}
                onEditMetadata={handleEditMetadata}
                onToggleLock={handleToggleLock}
              />
            );
          })}
        </div>  
        
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
