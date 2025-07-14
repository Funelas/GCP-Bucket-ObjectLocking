import React, { useState } from "react";
import ObjectLockModal from "./ObjectLockModal.jsx";
const LockByUrlInput = ({ onAdd, onFileAdd }) => {
    const [url, setUrl] = useState("");
    const [filename, setFilename] = useState(null);
  
    const handleExtractFilename = (inputUrl) => {
      try {
        const parsed = new URL(inputUrl);
        if (parsed.hostname !== "storage.cloud.google.com") return null;
  
        const parts = parsed.pathname.split("/").filter(Boolean);
        if (parts.length < 2) return null;
  
        return decodeURIComponent(parts.slice(1).join("/")); // get full object name
      } catch {
        return null;
      }
    };
  
    const handleAddClick = () => {
      const extracted = handleExtractFilename(url);
      console.log(extracted);
      if (!extracted) {
        alert("❌ Invalid URL");
        return;
      }
      onAdd(extracted);
      onFileAdd(extracted);
      setUrl("")
    };
  
  
    return (
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          className="bg-gray-700 text-white p-2 rounded w-[400px]"
          placeholder="Enter GCS object URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded"
          onClick={handleAddClick}
        >
          ➕ Add
        </button>
      </div>
    );
  };
  
  export default LockByUrlInput;