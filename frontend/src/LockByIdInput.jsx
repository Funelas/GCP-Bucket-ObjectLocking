import React, { useState } from "react";

const LockByIdInput = ({ onAddMultiple, onFileAddMultiple, setObjectId, availableBuckets = [] }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showBucketDropdown, setShowBucketDropdown] = useState(false);
  const [selectedBuckets, setSelectedBuckets] = useState([]);

  const toggleBucketDropdown = () => {
    setShowBucketDropdown((prev) => !prev);
  };

  const handleBucketToggle = (bucket) => {
    setSelectedBuckets((prev) =>
      prev.includes(bucket) ? prev.filter((b) => b !== bucket) : [...prev, bucket]
    );
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      alert("Please enter a search term.");
      return;
    }

    if (selectedBuckets.length === 0) {
      alert("Please select at least one bucket.");
      return;
    }

    setLoading(true);
    try {
      let allResults = {};

      for (const bucket of selectedBuckets) {
        const res = await fetch(`http://localhost:8000/search-objects?query=${encodeURIComponent(query)}&bucket=${bucket}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          allResults[bucket] = data;
        }
      }

      if (Object.keys(allResults).length > 0) {
        setResults(allResults);
      } else {
        alert("No matching objects found.");
        setResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      alert("Failed to search objects.");
    }
    setLoading(false);
  };

  const handleAddAll = () => {
    if (results.length === 0) return;
    onAddMultiple(results);
    onFileAddMultiple(results);
    setQuery("");
    setResults([]);
    setObjectId(query);
  };

  return (
    <div className="mb-4">
      <div className="mb-2">
        <button
          onClick={toggleBucketDropdown}
          className="text-green-400 underline text-sm mb-1"
        >
          {showBucketDropdown ? "Hide Buckets ▲" : "Show Buckets ▼"}
        </button>
        {showBucketDropdown && (
          <div className="bg-gray-800 p-3 rounded mt-1 max-h-40 overflow-y-auto text-sm text-white border border-gray-600">
            {availableBuckets.map((bucket) => (
              <label key={bucket} className="flex items-center space-x-2 mb-1">
                <input
                  type="checkbox"
                  checked={selectedBuckets.includes(bucket)}
                  onChange={() => handleBucketToggle(bucket)}
                  className="accent-green-400"
                />
                <span>{bucket}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          className="bg-gray-700 text-white p-2 rounded w-[400px]"
          placeholder="Enter part of a filename"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
          onClick={handleSearch}
          disabled={loading}
        >
          🔍 Search
        </button>
      </div>

      {Object.keys(results).length > 0 && (
  <div className="bg-gray-800 p-4 rounded text-white max-h-60 overflow-y-auto">
    <p className="mb-2 text-green-300 font-medium">
      Found {Object.values(results).flat().length} object(s) across {Object.keys(results).length} bucket(s):
    </p>
    <ul className="mb-3 list-disc list-inside text-sm">
      {Object.entries(results).map(([bucket, files]) => (
          <li key={bucket}>
            <span className="font-semibold text-yellow-400">{bucket}:</span>
            <ul className="list-disc ml-6 mt-1">
              {files.map((file, idx) => (
                <li key={idx}>{file}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <button
        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded"
        onClick={handleAddAll}
      >
        ➕ Add All
      </button>
    </div>
  )}

    </div>
  );
};

export default LockByIdInput;
