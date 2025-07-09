import React from "react";
import dayjs from "dayjs"; // Optional: use to calculate date differences

const FilesList = ({ loading, files }) => {
  if (loading) {
    return <p className="text-green-400">Loading...</p>;
  }

  const fileEntries = Object.entries(files);

  if (fileEntries.length === 0) {
    return <p className="text-green-400">No files found.</p>;
  }

  const calculateLockDuration = (holdExpiry) => {
    if (!holdExpiry) return "Indefinite";

    const now = dayjs();
    const expiry = dayjs(holdExpiry);
    const diff = expiry.diff(now, "day");

    if (diff > 0) return `${diff} day(s) left`;
    if (diff === 0) return "Expires today";
    return `Expired ${Math.abs(diff)} day(s) ago`;
  };

  return (
    <>
      <h2 className="text-green-400 text-xl mb-3">📁 Files</h2>
      <div className="bg-gray-800 p-4 w-full h-64 overflow-y-auto shadow-md">
        <ul className="space-y-2">
          {fileEntries.map(([filename, details], index) => {
            const metadata = details.metadata || {};
            const { hold_expiry } = metadata;

            const isLocked = details.temporary_hold === true;
            const lockDuration = isLocked ? calculateLockDuration(hold_expiry) : null;

            return (
              <li
                key={index}
                className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 transition flex justify-around items-center"
              >
                <span>{filename}</span>
                {isLocked && (
                  <span className="text-sm text-yellow-300 text-right">
                    🔒 Locked <span className="block text-xs">{lockDuration}</span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
};

export default FilesList;
