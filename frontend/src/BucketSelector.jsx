import React from "react";

const BucketSelector = ({ buckets, selectedBucket, onSelect }) => {
  console.log("Buckets: ", buckets)
  return (
    <div className="p-4 bg-gray-800 text-green-400 rounded-xl shadow-lg">
      <h2 className="text-xl mb-2 font-semibold">Select a Bucket</h2>
      <div className="flex flex-col gap-2">
        {buckets.map((bucket) => (
          <label key={bucket} className="flex items-center gap-2">
            <input
              type="radio"
              name="bucket"
              value={bucket}
              checked={selectedBucket === bucket}
              onChange={() => onSelect(bucket)}
              className="accent-green-400"
            />
            <span>{bucket}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default BucketSelector;
