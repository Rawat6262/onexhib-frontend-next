"use client";

import React, { useEffect, useState } from "react";
import { getExhibitionById } from "@/models/exhibition.model";

export default function ExhibitionPopup({ onClose, exhibitionId }) {
  const [exhibition, setExhibition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch exhibition details
  const fetchExhibition = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await getExhibitionById(exhibitionId);
      setExhibition(data);
    } catch (err) {
      console.error("Error fetching exhibition:", err.message);
      setError("Failed to load exhibition details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (exhibitionId) {
      fetchExhibition();
    }
  }, [exhibitionId]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 px-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md p-6 rounded-2xl shadow-lg relative animate-fadeIn">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          ✕
        </button>

        {/* Header with Logo */}
        <div className="flex flex-col items-center mb-6">

          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {exhibition?.exhibition_name || "Exhibition"}
          </h2>
        </div>

        {/* Loading State */}
        {loading && (
          <p className="text-center text-gray-500 dark:text-gray-400">Loading exhibition...</p>
        )}

        {/* Error State */}
        {error && !loading && (
          <p className="text-center text-red-500">{error}</p>
        )}

        {/* Exhibition Details */}
        {!loading && exhibition && (
          <>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>
                <span className="font-medium text-gray-900 dark:text-gray-100">📍 Address:</span>{" "}
                {exhibition.exhibition_address}
              </p>
              <p>
                <span className="font-medium text-gray-900 dark:text-gray-100">🏷 Category:</span>{" "}
                {exhibition.category}
              </p>
              <p>
                <span className="font-medium text-gray-900 dark:text-gray-100">🏢 Venue:</span>{" "}
                {exhibition.venue}
              </p>
              <p>
                <span className="font-medium text-gray-900 dark:text-gray-100">📅 Start Date:</span>{" "}
                { exhibition.starting_date}
              </p>
              <p>
                <span className="font-medium text-gray-900 dark:text-gray-100">⏳ End Date:</span>{" "}
                {exhibition.ending_date}
              </p>
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
