import React, { useState } from "react";

const LockByIdInput = ({ onAddMultiple, onFileAddMultiple, setObjectId, availableBuckets = [] }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showBucketDropdown, setShowBucketDropdown] = useState(false);
  const [selectedBuckets, setSelectedBuckets] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
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
      const res = await fetch("http://localhost:8000/search-objects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          buckets: selectedBuckets,
        }),
      });
  
      const allResults = await res.json();
  
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
    <div className="mb-4 flex items-center gap-2">
      {/* Input + Dropdown */}
      <div className="relative w-[400px]">
        <input
          type="text"
          className="bg-gray-700 text-white p-2 rounded w-full h-full"
          placeholder="Enter part of a filename"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          onClick={toggleBucketDropdown}
          className="absolute right-2 top-2 text-sm text-green-400 hover:underline"
        >
          {showBucketDropdown ? "▲" : "▼"}
        </button>

        {showBucketDropdown && (
              <div className="absolute top-full left-0 w-full bg-gray-800 border border-gray-600 rounded-b shadow-lg mt-1 max-h-40 overflow-y-auto z-10">
                {availableBuckets.map((bucket) => {
                  const checked = selectedBuckets.includes(bucket);
                  return (
                    <label
                      key={bucket}
                      className={`flex items-center px-3 py-1 text-sm cursor-pointer text-white ${
                        checked ? "bg-gray-700 text-green-300" : "hover:bg-gray-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleBucketToggle(bucket)}
                        className="accent-green-400 mr-2"
                      />
                      {bucket}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

        {/* Search Button */}
        <div className="flex items-center gap-2 ">
          <button
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded w-fit"
            onClick={handleSearch}
            disabled={loading}
          >
            🔍 Search
          </button>
        </div>
          {Object.keys(results).length > 0 && (
            <div className="relative bg-gray-800 p-4 rounded text-white">
              {/* Summary */}
              <p className="mb-2 text-green-300 font-medium">
                Found {Object.values(results).flat().length} object(s) across {Object.keys(results).length} bucket(s)
              </p>

              {/* Floating File List */}
              {showDetails && (
                <div className="absolute top-full left-0 w-full bg-gray-800 border border-gray-600 rounded-b shadow-lg mt-1 max-h-60 overflow-y-auto z-10">
                  <ul className="list-disc list-inside text-sm p-2">
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
                </div>
              )}

              {/* Buttons */}
              <div className="mt-3 flex gap-2">
                <button
                  className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded"
                  onClick={() => setShowDetails((prev) => !prev)}
                >
                  {showDetails ? "🔽 View Less" : "🔼 View More"}
                </button>

                <button
                  className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded"
                  onClick={handleAddAll}
                >
                  ➕ Add All
                </button>
              </div>
            </div>
          )}
    </div>
    
  );
};

export default LockByIdInput;
