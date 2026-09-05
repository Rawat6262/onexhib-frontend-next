"use client";

// import axios from "axios";
// import React, { useState, useEffect } from "react";
// import { toast } from "sonner";

// const ProductPopupForm = ({ Close, data, exid, refreshProducts }) => {
//   const [productName, setProductName] = useState("");
//   const [price, setPrice] = useState("");
//   const [category, setCategory] = useState("");
//   const [productImage, setProductImage] = useState(null);
//   const [productVideo, setProductVideo] = useState(null);
//   const [details, setDetails] = useState("");
//   const [imagePreview, setImagePreview] = useState(null);
//   const [videoPreview, setVideoPreview] = useState(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   // Cleanup object URLs on unmount / change
//   useEffect(() => {
//     return () => {
//       if (imagePreview) URL.revokeObjectURL(imagePreview);
//       if (videoPreview) URL.revokeObjectURL(videoPreview);
//     };
//   }, [imagePreview, videoPreview]);

//   const handleImageChange = (e) => {
//     const file = e.target.files?.[0] ?? null;
//     if (!file) {
//       setProductImage(null);
//       setImagePreview(null);
//       return;
//     }
//     if (!file.type.startsWith("image/")) {
//       toast.error("Please select a valid image file.");
//       return;
//     }
//     setProductImage(file);
//     setImagePreview(URL.createObjectURL(file));
//   };

//   const handleVideoChange = (e) => {
//     const file = e.target.files?.[0] ?? null;
//     if (!file) {
//       setProductVideo(null);
//       setVideoPreview(null);
//       return;
//     }
//     if (!file.type.startsWith("video/")) {
//       toast.error("Please select a valid video file.");
//       return;
//     }
//     setProductVideo(file);
//     setVideoPreview(URL.createObjectURL(file));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!productName  || !category || !details) {
//       toast.error("Please fill in all required fields.");
//       return;
//     }

//     setIsSubmitting(true);
//     try {
//       const formData = new FormData();
//       formData.append("product_name", productName);
//       formData.append("price", price);
//       formData.append("category", category);
//       formData.append("details", details);
//       formData.append("createdBy", data);
//       formData.append("exhibitionid", exid);

//       if (productImage) formData.append("image", productImage);
//       if (productVideo) formData.append("video", productVideo);

//       const response = await axios.post("/api/product", formData, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });

//       if (response && response.status >= 200 && response.status < 300) {
//         toast.success("✅ Product added successfully!");
//         if (refreshProducts) await refreshProducts();
//         Close();
//       } else {
//         toast.error("❌ Failed to add product");
//       }
//     } catch (err) {
//       console.error(err);
//       toast.error("Error while adding product");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // Helper styles
//   const inputClass = "w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition duration-200";
//   const labelClass = "block text-sm font-semibold text-gray-700 mb-1.5";

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
//       {/* Main Container - 80% Width & Height */}
//       <div className="bg-white w-[90%] h-[90%] md:w-[80%] md:h-[80%] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
        
//         {/* Header */}
//         <div className="flex items-center justify-between px-8 py-5 border-b bg-white shrink-0">
//           <div>
//             <h2 className="text-2xl font-bold text-gray-800">Add New Product</h2>
//             <p className="text-sm text-gray-500">Enter product details and upload media</p>
//           </div>
//           <button
//             onClick={Close}
//             className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
//           >
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//             </svg>
//           </button>
//         </div>

//         {/* Form Body - Scrollable */}
//         <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
//           <div className="flex-1 overflow-y-auto p-8">
//             <div className="flex flex-col lg:flex-row gap-10 h-full">
              
//               {/* LEFT COLUMN: Text Fields */}
//               <div className="flex-1 space-y-6">
                
//                 {/* Name & Price */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                   <div>
//                     <label className={labelClass}>Product Name <span className="text-red-500">*</span></label>
//                     <input
//                       type="text"
//                       value={productName}
//                       onChange={(e) => setProductName(e.target.value)}
//                       placeholder="e.g. Wireless Headphones"
//                       className={inputClass}
//                       required
//                     />
//                   </div>
//                   <div>
//                     <label className={labelClass}>Price (₹) <span className="text-red-500">*</span></label>
//                     <input
//                       type="number"
//                       value={price}
//                       onChange={(e) => setPrice(e.target.value)}
//                       placeholder="0.00"
//                       className={inputClass}
                      
//                     />
//                   </div>
//                 </div>

//                 {/* Category */}
//                 <div>
//                   <label className={labelClass}>Category <span className="text-red-500">*</span></label>
//                   <input
//                     type="text"
//                     value={category}
//                     onChange={(e) => setCategory(e.target.value)}
//                     placeholder="e.g. Electronics"
//                     className={inputClass}
//                     required
//                   />
//                 </div>

//                 {/* Details */}
//                 <div className="flex-1 flex flex-col">
//                   <label className={labelClass}>Description <span className="text-red-500">*</span></label>
//                   <textarea
//                     value={details}
//                     onChange={(e) => setDetails(e.target.value)}
//                     placeholder="Describe your product..."
//                     className={`${inputClass} flex-1 min-h-[150px] resize-none`}
//                     required
//                   />
//                 </div>
//               </div>

//               {/* RIGHT COLUMN: Media Uploads */}
//               <div className="flex-1 space-y-6 lg:border-l lg:pl-10 border-gray-100 dark:border-gray-800">
                
//                 {/* Image Upload */}
//                 <div>
//                   <label className={labelClass}>Product Image</label>
//                   <div className="relative group">
//                     <input
//                       type="file"
//                       accept="image/*"
//                       onChange={handleImageChange}
//                       className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
//                     />
//                     <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center text-center bg-gray-50 dark:bg-gray-800 group-hover:border-green-400 group-hover:bg-green-50 dark:group-hover:bg-green-950 transition-all min-h-[160px]">
//                       {imagePreview ? (
//                         <img
//                           src={imagePreview}
//                           alt="Preview"
//                           className="h-32 object-contain rounded-md shadow-sm"
//                         />
//                       ) : (
//                         <>
//                           <span className="text-4xl mb-2">📷</span>
//                           <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Click to upload image</span>
//                         </>
//                       )}
//                     </div>
//                   </div>
//                 </div>

//                 {/* Video Upload */}
//                 <div>
//                   <label className={labelClass}>Product Video</label>
//                   <div className="relative group">
//                     <input
//                       type="file"
//                       accept="video/*"
//                       onChange={handleVideoChange}
//                       className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
//                     />
//                     <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center text-center bg-gray-50 dark:bg-gray-800 group-hover:border-green-400 group-hover:bg-green-50 dark:group-hover:bg-green-950 transition-all min-h-[160px]">
//                       {videoPreview ? (
//                         <video
//                           src={videoPreview}
//                           controls
//                           className="h-32 rounded-md shadow-sm"
//                         />
//                       ) : (
//                         <>
//                           <span className="text-4xl mb-2">🎥</span>
//                           <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Click to upload video</span>
//                         </>
//                       )}
//                     </div>
//                   </div>
//                 </div>

//               </div>
//             </div>
//           </div>

//           {/* Footer */}
//           <div className="p-5 border-t bg-gray-50 flex justify-end gap-4 shrink-0">
//             <button
//               type="button"
//               onClick={Close}
//               disabled={isSubmitting}
//               className="px-6 py-2.5 rounded-lg font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 transition shadow-sm"
//             >
//               Cancel
//             </button>
//             <button
//               type="submit"
//               disabled={isSubmitting}
//               className="px-8 py-2.5 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
//             >
//               {isSubmitting && (
//                 <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                 </svg>
//               )}
//               {isSubmitting ? "Saving..." : "Save Product"}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default ProductPopupForm;


import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { createProduct } from "@/models/product.model";

const ProductPopupForm = ({ Close, data, exid, refreshProducts }) => {
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [productImage, setProductImage] = useState(null);
  const [productVideo, setProductVideo] = useState(null);
  const [details, setDetails] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cleanup object URLs on unmount / change
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    };
  }, [imagePreview, videoPreview]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setProductImage(null);
      setImagePreview(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }
    setProductImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setProductVideo(null);
      setVideoPreview(null);
      return;
    }
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a valid video file.");
      return;
    }
    setProductVideo(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productName || !category || !details) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("product_name", productName);
      formData.append("price", price);
      formData.append("category", category);
      formData.append("unit", unit);
      formData.append("details", details);
      formData.append("createdBy", data);
      formData.append("exhibitionid", exid);

      if (productImage) formData.append("image", productImage);
      if (productVideo) formData.append("video", productVideo);

      const response = await createProduct(formData);

      if (response && response.status >= 200 && response.status < 300) {
        toast.success("✅ Product added successfully!");
        if (refreshProducts) await refreshProducts();
        Close();
      } else {
        toast.error("❌ Failed to add product");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error while adding product");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper styles
  const inputClass = "w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-gray-800 dark:text-gray-100 focus:border-green-500 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900 outline-none transition duration-200";
  const labelClass = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* Main Container - 80% Width & Height */}
      <div className="bg-white dark:bg-gray-900 w-[90%] h-[90%] md:w-[80%] md:h-[80%] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Add New Product</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Enter product details and upload media</p>
          </div>
          <button
            onClick={Close}
            className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-8">
            <div className="flex flex-col lg:flex-row gap-10 h-full">
              
              {/* LEFT COLUMN: Text Fields */}
              <div className="flex-1 space-y-6">
                
                {/* Name & Price */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Product Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="e.g. Wireless Headphones"
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Price (₹) <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      className={inputClass}
                      
                    />
                  </div>
                </div>

                {/* Category & Unit */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Category <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Electronics"
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Unit <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="e.g. kg, piece, liter"
                      className={inputClass}
                      required
                    />
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col">
                  <label className={labelClass}>Description <span className="text-red-500">*</span></label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Describe your product..."
                    className={`${inputClass} flex-1 min-h-[150px] resize-none`}
                    required
                  />
                </div>
              </div>

              {/* RIGHT COLUMN: Media Uploads */}
              <div className="flex-1 space-y-6 lg:border-l lg:pl-10 border-gray-100 dark:border-gray-800">
                
                {/* Image Upload */}
                <div>
                  <label className={labelClass}>Product Image</label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center text-center bg-gray-50 dark:bg-gray-800 group-hover:border-green-400 group-hover:bg-green-50 dark:group-hover:bg-green-950 transition-all min-h-[160px]">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="h-32 object-contain rounded-md shadow-sm"
                        />
                      ) : (
                        <>
                          <span className="text-4xl mb-2">📷</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Click to upload image</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Video Upload */}
                <div>
                  <label className={labelClass}>Product Video</label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center text-center bg-gray-50 dark:bg-gray-800 group-hover:border-green-400 group-hover:bg-green-50 dark:group-hover:bg-green-950 transition-all min-h-[160px]">
                      {videoPreview ? (
                        <video
                          src={videoPreview}
                          controls
                          className="h-32 rounded-md shadow-sm"
                        />
                      ) : (
                        <>
                          <span className="text-4xl mb-2">🎥</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Click to upload video</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 shrink-0">
            <button
              type="button"
              onClick={Close}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-lg font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-2.5 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isSubmitting ? "Saving..." : "Save Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductPopupForm;