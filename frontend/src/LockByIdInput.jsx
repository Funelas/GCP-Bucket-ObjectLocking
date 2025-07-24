import React, { useState } from "react";

const LockByIdInput = ({ onAddMultiple, onFileAddMultiple, setObjectId }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      alert("Please enter a search term.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/search-objects?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      console.log("Data: ", data);
      if (Array.isArray(data) && data.length > 0) {
        setResults(data);
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
    onAddMultiple(results); // Pass to parent
    onFileAddMultiple(results);
    setQuery("");
    setResults([]);
    setObjectId(query);
  };

  return (
    <div className="mb-4">
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

      {results.length > 0 && (
        <div className="bg-gray-800 p-4 rounded text-white max-h-60 overflow-y-auto">
          <p className="mb-2 text-green-300 font-medium">Found {results.length} object(s):</p>
          <ul className="mb-3 list-disc list-inside text-sm">
            {results.map((obj, index) => (
              <li key={index}>{obj}</li>
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
