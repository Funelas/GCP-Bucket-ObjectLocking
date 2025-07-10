import React, { useState } from "react";
import DatePicker from "react-datepicker";
import { FiCalendar } from "react-icons/fi";
import { format } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";

const ObjectLockModal = ({ filename, onClose }) => {
  const [showCalendar, setShowCalendar] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setShowCalendar(false); // optional: auto-close after pick
  };

  const handleSave = () => {
    if (!selectedDate) {
      alert("Please select a date.");
      return;
    }
    
    const formattedDate = format(selectedDate, "yyyy-MM-dd");
    console.log(typeof formattedDate);
    onClose(filename, null, formattedDate);
  };

  return (
    <div className="fixed inset-0 backdrop-blur-lg flex items-center justify-center z-50 transition-opacity duration-500 ease-in-out">
      <div className="bg-gray-900 text-white rounded-lg p-6 w-[400px] max-w-full shadow-lg relative">
        <h2 className="text-lg font-semibold mb-4">
          🔒 Lock Object: <span className="text-green-400">{filename}</span>
        </h2>

        <label className="block mb-1 text-green-300 font-medium">Select Lock Expiry Date</label>

        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
            readOnly
            className="bg-gray-800 text-white p-2 rounded border border-gray-600 w-full"
            placeholder="Pick a date"
          />
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="text-white hover:text-green-400"
            title="Pick a date"
          >
            <FiCalendar size={24} />
          </button>
        </div>

        {showCalendar && (
          <div className="mt-2">
            <DatePicker
              selected={selectedDate}
              onChange={handleDateChange}
              inline
              minDate={new Date()}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
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
            Lock
          </button>
        </div>
      </div>
    </div>
  );
};

export default ObjectLockModal;
