import React, { useState } from "react";
import DatePicker from "react-datepicker";
import { FiCalendar } from "react-icons/fi";
import { format } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";

const ObjectLockModal = ({ filename, onClose }) => {
  const [showCalendar, setShowCalendar] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isIndefinite, setIsIndefinite] = useState(false);

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setIsIndefinite(false); // Disable "indefinite" if a date is selected
    setShowCalendar(false); // Auto-close calendar (optional)
  };

  const handleSave = () => {
    if (!selectedDate && !isIndefinite) {
      alert("Please select a date or choose Indefinite.");
      return;
    }
  
    const resultDate = isIndefinite ? null : format(selectedDate, "yyyy-MM-dd");
  
    // 👇 Now send the updateType too
    onClose(filename, resultDate, "lock");
  };
  

  return (
    <div className="fixed inset-0 backdrop-blur-lg flex items-center justify-center z-50 transition-opacity duration-500 ease-in-out">
      <div className="bg-gray-900 text-white rounded-lg p-6 w-[400px] max-w-full shadow-lg relative">
        <h2 className="text-lg font-semibold mb-4">
          🔒 Lock Object: <span className="text-green-400">{filename}</span>
        </h2>

        <label className="block mb-1 text-green-300 font-medium">Select Lock Expiry Date</label>

        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={
              isIndefinite
                ? "Indefinite"
                : selectedDate
                ? format(selectedDate, "yyyy-MM-dd")
                : ""
            }
            readOnly
            className="bg-gray-800 text-white p-2 rounded border border-gray-600 w-full"
            placeholder="Pick a date or select Indefinite"
          />
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="text-white hover:text-green-400"
            title="Pick a date"
          >
            <FiCalendar size={24} />
          </button>
        </div>

        {showCalendar && !isIndefinite && (
          <div className="mt-2">
            <DatePicker
              selected={selectedDate}
              onChange={handleDateChange}
              inline
              minDate={new Date()}
            />
          </div>
        )}

        <div className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            id="indefinite"
            checked={isIndefinite}
            onChange={() => {
              setIsIndefinite(!isIndefinite);
              if (!isIndefinite) setSelectedDate(null);
            }}
          />
          <label htmlFor="indefinite" className="text-sm text-green-300">
            Set lock to <strong>Indefinite</strong> (no expiration)
          </label>
        </div>

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
