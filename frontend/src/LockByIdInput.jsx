import { useState } from "react";

export default function LockByIdInput({ onSearchById }) {
  const [fileId, setFileId] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (fileId.trim() !== "") {
      onSearchById(fileId.trim());
      setFileId("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex items-center gap-2">
      <input
        type="text"
        value={fileId}
        onChange={(e) => setFileId(e.target.value)}
        placeholder="Enter File ID (e.g. 10025)"
        className="p-2 rounded-md bg-gray-700 text-white flex-1"
      />
      <button
        type="submit"
        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
      >
        Search ID
      </button>
    </form>
  );
}
