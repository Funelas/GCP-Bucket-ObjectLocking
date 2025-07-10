import React, { useState } from "react";

const MetadataModal = ({ filename, metadata, onClose }) => {
  const initialRows = Object.entries(metadata || {});
  const [rows, setRows] = useState([...initialRows, ["", ""]]);

  const handleAddRow = () => {
    setRows([...rows, ["", ""]]);
  };

  const handleRemoveRow = (index) => {
    const updated = rows.filter((_, i) => i !== index);
    setRows(updated);
  };

  const handleInputChange = (index, col, value) => {
    const updated = [...rows];
    updated[index][col] = value;
    setRows(updated);
  };

  const handleSave = () => {
    const metadataObj = {};
    rows.forEach(([key, value]) => {
      if (key.trim() !== "") {
        metadataObj[key.trim()] = value.trim();
      }
    });
    console.log("📂 Final Metadata:", metadataObj);
    onClose(filename, metadataObj);
  };

  return (
    <div className="fixed inset-0 backdrop-blur-lg flex items-center justify-center z-50 transition-opacity duration-1000 ease-in-out">
      <div className="bg-gray-900 text-white rounded-lg p-6 w-[500px] max-w-full shadow-lg relative">
        <h2 className="text-lg font-semibold mb-4">
          📝 Edit Metadata: <span className="text-green-400">{filename}</span>
        </h2>

        {/* Headers */}
        <div className="grid grid-cols-3 gap-2 font-bold text-green-300 mb-2">
          <div>Key</div>
          <div>Value</div>
          <div></div>
        </div>

        {/* Input Rows */}
        <div className="max-h-[300px] overflow-y-auto mb-4 space-y-2">
          {rows.map(([key, value], idx) => (
            <div className="grid grid-cols-3 gap-2" key={idx}>
              <input
                type="text"
                value={key}
                onChange={(e) => handleInputChange(idx, 0, e.target.value)}
                className="bg-gray-800 text-white p-2 rounded border border-gray-600"
                placeholder="Enter key"
              />
              <input
                type="text"
                value={value}
                onChange={(e) => handleInputChange(idx, 1, e.target.value)}
                className="bg-gray-800 text-white p-2 rounded border border-gray-600"
                placeholder="Enter value"
              />
              <button
                className="text-red-400 hover:text-red-300 font-bold"
                onClick={() => handleRemoveRow(idx)}
                title="Remove"
              >
                &minus;
              </button>
            </div>
          ))}
        </div>

        {/* Add Row Button */}
        <button
          onClick={handleAddRow}
          className="w-full mb-4 bg-gray-700 hover:bg-gray-600 text-white py-1 rounded"
        >
          ➕ Add Row
        </button>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => onClose()}
            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default MetadataModal;
