import React from "react";

const BucketSelector = ({ selectedBuckets, availableBuckets, toggleBucket}) => (
  <div className="mb-4 flex space-x-2 items-center">
    <label className="text-slate-400 text-sm">Select Bucket:</label>
    <select
    multiple
    value={selectedBuckets}
    onChange={(e) => {
        const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
        selected.forEach(bucket => toggleBucket(bucket));
    }}
    className="bg-slate-700 text-white px-3 py-2 rounded-lg"
    >
    {availableBuckets.map((bucket, idx) => (
        <option key={idx} value={bucket}>
        {bucket}
        </option>
    ))}
    </select>

  </div>
);

export default BucketSelector;
