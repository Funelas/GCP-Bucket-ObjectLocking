import React, { useState } from "react";
import DatePicker from "react-datepicker";
import { FiCalendar, FiLock, FiClock } from "react-icons/fi";
import { FaInfinity } from "react-icons/fa";
import { format } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";

const MultiObjectEditModal = ({ filenames, onClose }) => {
  const [showCalendar, setShowCalendar] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isIndefinite, setIsIndefinite] = useState(false);

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setIsIndefinite(false);
    setShowCalendar(false);
  };

  const handleSave = () => {
    if (!selectedDate && !isIndefinite) {
      alert("Please select a date or choose Indefinite.");
      return;
    }

    const resultDate = isIndefinite ? null : format(selectedDate, "yyyy-MM-dd");
    
    onClose(filenames, resultDate, "lock"); // send all selected filenames
  };

  const getDaysFromNow = () => {
    if (!selectedDate) return null;
    const now = new Date();
    const diffTime = selectedDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysFromNow = getDaysFromNow();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300 p-4">
      <div className="bg-slate-900/95 rounded-2xl w-[500px] max-w-[90vw] shadow-2xl flex flex-col">
        <div className="flex-1 overflow-y-auto p-8">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <FiLock className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Batch Lock Objects</h2>
              <p className="text-slate-400 text-sm">Apply lock to {filenames.length} objects</p>
            </div>
          </div>

          {/* File List Preview */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6 max-h-48 overflow-y-auto text-sm text-slate-300 space-y-1">
            {filenames.map((f, idx) => (
              <div key={idx} className="truncate">📄 {f}</div>
            ))}
          </div>

          {/* Lock Options (same as before) */}
          <div className="space-y-4 mb-6">
            {/* Date Option */}
            <div className={`border-2 rounded-xl p-4 ${!isIndefinite ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-600/30 bg-slate-800/30'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <FiClock className={`w-5 h-5 ${!isIndefinite ? 'text-blue-400' : 'text-slate-500'}`} />
                  <div>
                    <p className={`font-semibold ${!isIndefinite ? 'text-white' : 'text-slate-400'}`}>Specific Date</p>
                    <p className="text-xs text-slate-500">Choose an exact expiration date</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  disabled={isIndefinite}
                  className={`p-2 rounded-lg ${!isIndefinite ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                >
                  <FiCalendar size={18} />
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={selectedDate && !isIndefinite ? format(selectedDate, "MMM dd, yyyy") : ""}
                  readOnly
                  disabled={isIndefinite}
                  className="w-full bg-slate-800 text-white p-3 rounded-lg border border-slate-600"
                  placeholder="Select a date from calendar"
                />
                {selectedDate && daysFromNow && !isIndefinite && (
                  <div className="absolute top-full mt-2 text-xs bg-blue-900/30 border border-blue-600/30 rounded-lg px-3 py-1 text-blue-300">
                    {daysFromNow} day{daysFromNow !== 1 ? "s" : ""} from now
                  </div>
                )}
              </div>

              {showCalendar && !isIndefinite && (
                <div className="mt-4 bg-slate-800 rounded-xl p-3">
                  <DatePicker
                    selected={selectedDate}
                    onChange={handleDateChange}
                    inline
                    minDate={new Date()}
                  />
                </div>
              )}
            </div>

            {/* Indefinite Option */}
            <div
              className={`border-2 rounded-xl p-4 cursor-pointer ${isIndefinite ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-600/30 bg-slate-800/30'}`}
              onClick={() => {
                setIsIndefinite(!isIndefinite);
                if (!isIndefinite) setSelectedDate(null);
              }}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isIndefinite ? 'border-amber-500 bg-amber-500' : 'border-slate-500'}`}>
                  {isIndefinite && <div className="w-2 h-2 bg-white rounded-full"></div>}
                </div>
                <FaInfinity className={`w-5 h-5 ${isIndefinite ? 'text-amber-400' : 'text-slate-500'}`} />
                <div>
                  <p className={`font-semibold ${isIndefinite ? 'text-white' : 'text-slate-400'}`}>Indefinite Lock</p>
                  <p className="text-xs text-slate-500">Prevent deletion until manually unlocked</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-slate-700/50 p-6 bg-slate-900/95 rounded-b-2xl flex justify-end space-x-3">
          <button
            onClick={() => onClose()}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedDate && !isIndefinite}
            className={`px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 ${
              (selectedDate || isIndefinite)
                ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg transform hover:scale-105'
                : 'bg-slate-600 text-slate-400 cursor-not-allowed'
            }`}
          >
            <FiLock className="w-4 h-4" />
            <span>Lock Objects</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiObjectEditModal;
