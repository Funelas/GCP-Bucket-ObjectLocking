import React, { useState } from "react";
const LockByUrlInput = ({ onAdd, onFileAdd, bucketName }) => {
    const [url, setUrl] = useState("");
  
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
  
    const handleAddClick = async () => {
      const extracted = handleExtractFilename(url);
      if (!extracted) {
        alert("❌ Invalid URL");
        return;
      }
    
      // Check with backend if blob exists
      try {
        const res = await fetch(`http://localhost:8000/check-object-exists?filename=${encodeURIComponent(extracted)}&bucket=${bucketName}`);
        const data = await res.json();
    
        if (!data.exists) {
          alert("❌ Object does not exist in the bucket.");
          return;
        }
    
        onAdd(extracted);
        onFileAdd(extracted);
        setUrl("");
      } catch (err) {
        console.error("Error checking object:", err);
        alert("⚠️ Could not verify the object.");
      }
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