// components/FileEntry.jsx
import React from "react";
import dayjs from "dayjs";


const calculateLockDuration = (holdExpiry) => {
  if (!holdExpiry) return "Indefinite";

  const now = dayjs();
  const expiry = dayjs(holdExpiry);

  // 👉 Treat anything 30 seconds or more into the future as indefinite
  if (expiry.diff(now, "second") <= 30) {
    return "Indefinite";
  }

  const diff = expiry.diff(now, "day");

  if (diff > 0) return `${diff} day(s) left`;
  if (diff === 0) return "Expires today";
  return `Expired ${Math.abs(diff)} day(s) ago`;
};
const FileEntry = ({
  filename,
  details,
  metadataChanges,
  lockChanges,
  onEditMetadata,
  onToggleLock,
}) => {
  const pendingMetadata = metadataChanges[filename];
  const metadata = pendingMetadata || details.metadata || {};
  const pendingLock = lockChanges[filename];
  const finalLockState = pendingLock?.temporary_hold ?? details.temporary_hold;
  const finalExpiry = pendingLock?.hold_expiry ?? details.expiration_date;
  const now = dayjs().add(30, "second");
  const expiryDate = finalExpiry ? dayjs(finalExpiry) : null;
  const isExpiryValid = expiryDate && expiryDate.isAfter(now);
  const isLocked = finalLockState === true || isExpiryValid;
  const lockDuration = isLocked ? calculateLockDuration(finalExpiry) : null;

  const isModified =
    metadataChanges.hasOwnProperty(filename) ||
    lockChanges.hasOwnProperty(filename);

  return (
    <div
      className={`bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 transition flex min-h-[40px] items-center ${
        isModified ? "border-l-4 border-yellow-400" : ""
      }`}
    >
      <div className="w-[30%] text-left truncate">{filename}</div>
      <div className="w-[20%] text-xs text-green-400">
        <div>Project: {metadata.project || "None"}</div>
        <div>Category: {metadata.category || "None"}</div>
      </div>

      {isLocked ? (
        <div className="w-[20%] text-left text-yellow-300 text-sm">
          🔒 Locked
          <div className="text-xs">{lockDuration}</div>
        </div>
      ) : (
        <div className="w-[20%]" />
      )}

      <div className="w-[30%] flex gap-2">
        <button
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs py-1 px-2 rounded"
          onClick={() => onEditMetadata(filename)}
        >
          Edit Metadata
        </button>
        <button
          className={`${
            isLocked
              ? "bg-red-600 hover:bg-red-500"
              : "bg-green-600 hover:bg-green-500"
          } text-white text-xs py-1 px-2 rounded`}
          onClick={() => onToggleLock(filename, isLocked)}
        >
          {isLocked ? "Unlock" : "Lock"}
        </button>
      </div>
    </div>
  );
};

export default FileEntry;
