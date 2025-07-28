import React from "react";

const LoadingOverlay = ({ message = "Processing..." }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-green-400 border-dashed rounded-full animate-spin"></div>
        <p className="text-white mt-4 text-lg font-semibold">{message}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
