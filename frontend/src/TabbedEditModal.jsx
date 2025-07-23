import React, { useState } from "react";
import { FiLock, FiEdit } from "react-icons/fi";
import ObjectLockModal from "./ObjectLockModal.jsx";
import MetadataModal from "./MetadataModal.jsx";
const TabbedEditModal = ({ filenames = [], onClose }) => {
    const [activeFileIndex, setActiveFileIndex] = useState(0);
    const [activeTab, setActiveTab] = useState("lock");
  
    const [lockValues, setLockValues] = useState({});
    const [metadataValues, setMetadataValues] = useState({});
  
    const activeFile = filenames[activeFileIndex];
  
    const handleLockClose = (filename, value) => {
      setLockValues((prev) => ({ ...prev, [filename]: value }));
    };
  
    const handleMetadataClose = (filename, value) => {
      setMetadataValues((prev) => ({ ...prev, [filename]: value }));
    };
  
    const handleFinalSave = () => {
      const payload = filenames.reduce((acc, file) => {
        acc[file.name] = {
          metadata: metadataValues[file.name] || {},
          lock: lockValues[file.name] || null,
        };
        return acc;
      }, {});
      onClose(filenames, payload);
    };
  
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-[700px] max-w-[95vw] shadow-xl ">
  
          {/* File Tabs */}
          <div className="flex overflow-x-auto border-b border-slate-700 bg-slate-800">
            {filenames.map((file, i) => (
              <button
                key={file.name}
                onClick={() => setActiveFileIndex(i)}
                className={`px-4 py-2 text-sm font-semibold ${
                  i === activeFileIndex ? "text-emerald-400 border-b-2 border-emerald-500" : "text-slate-400"
                }`}
              >
                {file.name}
              </button>
            ))}
          </div>
  
          {/* Lock / Metadata Tabs */}
          <div className="flex border-b border-slate-700 bg-slate-800">
            <button
              className={`flex-1 px-4 py-3 font-semibold flex items-center justify-center gap-2 ${
                activeTab === "lock"
                  ? "bg-slate-900 text-red-400 border-b-2 border-red-500"
                  : "hover:bg-slate-700 text-slate-400"
              }`}
              onClick={() => setActiveTab("lock")}
            >
              <FiLock /> Lock Duration
            </button>
  
            <button
              className={`flex-1 px-4 py-3 font-semibold flex items-center justify-center gap-2 ${
                activeTab === "metadata"
                  ? "bg-slate-900 text-blue-400 border-b-2 border-blue-500"
                  : "hover:bg-slate-700 text-slate-400"
              }`}
              onClick={() => setActiveTab("metadata")}
            >
              <FiEdit /> Edit Metadata
            </button>
          </div>
  
          {/* Tab Content */}
          <div className="relative max-h-[75vh] overflow-y-auto">
            {activeTab === "lock" && (
              <ObjectLockModal
                filename={activeFile.name}
                onClose={handleLockClose}
                embedded
              />
            )}
            {activeTab === "metadata" && (
              <MetadataModal
                filename={activeFile.name}
                metadata={activeFile.metadata || {}}
                onClose={handleMetadataClose}
                embedded
              />
            )}
          </div>
  
          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-700 bg-slate-800">
            <button
              onClick={() => onClose(null)}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleFinalSave}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-semibold"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  };

export default TabbedEditModal