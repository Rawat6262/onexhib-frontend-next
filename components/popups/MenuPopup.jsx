"use client";

import React from "react";

// Simple Profile Popup
// Props:
// - open (bool)
// - onClose (fn)

export default function ProfilePopup({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Popup box */}
      <div className="relative bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 w-[92vw] sm:w-[80vw] h-[90vh] rounded-2xl shadow-2xl p-4 sm:p-6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Profile</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ✕
          </button>
        </div>

        {/* Simple Content */}
        <div className="flex flex-col gap-4 text-lg">
          <div>
            <label className="font-medium">First Name</label>
            <input
              className="block w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 mt-1"
              placeholder="Enter first name"
            />
          </div>

          <div>
            <label className="font-medium">Last Name</label>
            <input
              className="block w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 mt-1"
              placeholder="Enter last name"
            />
          </div>

          <div>
            <label className="font-medium">Settings</label>
            <input
              className="block w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 mt-1"
              placeholder="Enter setting info"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
