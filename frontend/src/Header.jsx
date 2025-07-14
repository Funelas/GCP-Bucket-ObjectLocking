import React from "react";
import LockByUrlInput from "./LockByUrlInput.jsx";
const Header = ({ searchInput, setSearchInput, onSearchSubmit }) => {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      onSearchSubmit(); // 🔍 trigger only on Enter
    }
  };

  return (
    <header className="p-4 bg-gray-800">
      <div className="flex flex-col items-center">
        <h1 className="font-[Raleway] text-3xl text-green-400 mb-4">
          📦 GCS File Browser
        </h1>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="🔍 Search by name or metadata..."
          className="w-full max-w-md p-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
    </header>
  );
};

export default Header;
