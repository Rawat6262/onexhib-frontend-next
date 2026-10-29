"use client";

import { City, Country, State } from "country-state-city";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { addExhibitionService } from "@/models/service.model";
import { SERVICE_CATEGORIES, serviceSubcategories } from "@/lib/service-taxonomy";
import ServiceDescriptionField from "@/components/popups/ServiceDescriptionField";

// --- Shared Label ---
const Label = ({ children, required, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1.5 tracking-wide">
    {children} {required && <span className="text-red-600 text-base">*</span>}
  </label>
);

// --- Input Field ---
const InputField = ({ id, label, value, onChange, placeholder, type = "text", required, onBlur, error }) => (
  <div className="w-full">
    <Label required={required} htmlFor={id}>{label}</Label>
    <input
      id={id}
      name={id}
      type={type}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      className={`w-full rounded-md border px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-[#2B3FB8] focus:ring-4 focus:ring-[#2B3FB8]/15 outline-none transition shadow-sm placeholder-gray-400 dark:placeholder-gray-500 ${
        error ? "border-red-500" : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
      }`}
    />
    {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
  </div>
);

// --- Dropdown ---
const Dropdown = ({ id, label, value, onChange, options, placeholder, required, onBlur, error }) => (
  <div className="w-full">
    <Label required={required} htmlFor={id}>{label}</Label>
    <select
      id={id}
      name={id}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      className={`w-full rounded-md border px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-[#2B3FB8] focus:ring-4 focus:ring-[#2B3FB8]/15 outline-none transition shadow-sm ${
        error ? "border-red-500" : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
      }`}
    >
      <option value="">{placeholder || "Select"}</option>
      {options.map((opt, i) => (
        <option key={i} value={opt.value || opt}>
          {opt.label || opt}
        </option>
      ))}
    </select>
    {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
  </div>
);

// --- File Field ---
const SimpleFileField = ({ id, label, onChange, accept = "image/*", error }) => (
  <div className="w-full">
    <Label htmlFor={id}>{label}</Label>
    <input
      id={id}
      name={id}
      type="file"
      onChange={onChange}
      accept={accept}
      className={`block w-full text-sm text-gray-500 dark:text-gray-400
        file:mr-4 file:py-2 file:px-4
        file:rounded-md file:border-0
        file:text-sm file:font-bold
        file:bg-blue-50 dark:file:bg-blue-950 file:text-blue-700 dark:file:text-blue-300
        hover:file:bg-blue-100 dark:hover:file:bg-blue-900
        cursor-pointer border ${error ? "border-red-500" : "border-gray-200 dark:border-gray-700"} rounded-md bg-white dark:bg-gray-800`}
    />
    {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
  </div>
);

/*
 * THE CATEGORY LIST IS IMPORTED, NEVER TYPED HERE.
 *
 * It used to be seven strings copied out of the backend enum, and the same seven
 * were copied into the edit form, the dashboard and the Excel modal. A category
 * misspelled in any one of those is a dropdown option the API rejects on submit,
 * with no way for the form to know. lib/service-taxonomy.js is pure data - no
 * server-only reach - so a Client Component can read the real taxonomy.
 */

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ExhibitionServicePopupForm = ({ onClose }) => {
  const [full_name, setFullName] = useState("");
  const [service_name, setServiceName] = useState("");
  const [service_subcategory, setServiceSubcategory] = useState("");
  const [mobile_number, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const markTouched = (id) => setTouched((s) => ({ ...s, [id]: true }));

  /*
   * The specialities under the chosen category, empty until one is chosen.
   *
   * CASCADING, exactly like state-after-country below it: "Chairs" is a real
   * subcategory but not of "Printing & Branding", and the backend rejects that pair
   * rather than storing a contradiction. Deriving the options from the category
   * means the form cannot offer the pair in the first place.
   */
  const subcategories = useMemo(
    () => (service_name ? serviceSubcategories(service_name) : []),
    [service_name]
  );

  // Country / State / City
  const countries = useMemo(
    () => Country.getAllCountries().map((c) => ({ value: c.isoCode, label: c.name })),
    []
  );
  const states = useMemo(
    () => country ? State.getStatesOfCountry(country).map((s) => ({ value: s.isoCode, label: s.name })) : [],
    [country]
  );
  const cities = useMemo(
    () => country && state ? City.getCitiesOfState(country, state).map((c) => ({ value: c.name, label: c.name })) : [],
    [country, state]
  );

  const handleImageChange = (e) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) { setImage(null); return; }
    if (!ALLOWED_IMAGE_TYPES.includes(f.type)) {
      setImage(null);
      setErrors((s) => ({ ...s, image: "Image must be JPG/PNG/WEBP." }));
      toast.error("Unsupported image type.");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setImage(null);
      setErrors((s) => ({ ...s, image: "Image exceeds 5MB." }));
      toast.error("Image too large. Max 5MB.");
      return;
    }
    setImage(f);
    setErrors((s) => ({ ...s, image: null }));
  };

  const validateAll = () => {
    const e = {};
    if (!full_name.trim()) e.full_name = "Full name is required.";
    if (!service_name) e.service_name = "Service type is required.";
    /*
     * Required ONLY once a category is chosen, because the dropdown does not
     * exist before then - flagging a field the provider cannot see yet is how a
     * form becomes unsubmittable for no visible reason. "General" is always an
     * available answer, so this never forces a claim nobody can make.
     */
    if (service_name && !service_subcategory) e.service_subcategory = "Speciality is required.";
    if (!mobile_number.trim()) e.mobile_number = "Mobile number is required.";
    else if (!/^\+?[\d\s\-()]{7,15}$/.test(mobile_number.trim())) e.mobile_number = "Enter a valid mobile number.";
    if (!address.trim()) e.address = "Address is required.";
    if (!country) e.country = "Country is required.";
    if (!state) e.state = "State is required.";
    if (!city) e.city = "City is required.";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const validationErrors = validateAll();
    setErrors(validationErrors);
    setTouched({ full_name: true, service_name: true, service_subcategory: true, mobile_number: true, address: true, country: true, state: true, city: true });

    if (Object.keys(validationErrors).length) {
      toast.error("Please fix the highlighted errors.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("full_name", full_name.trim());
      formData.append("service_name", service_name);
      /*
       * Sent even when empty, so the field is always present in the payload. The
       * backend treats an empty subcategory as "none", which is a valid state - and
       * on the edit form the same append is what lets a provider CLEAR a speciality
       * they no longer claim.
       */
      formData.append("service_subcategory", service_subcategory);
      formData.append("mobile_number", mobile_number.trim());
      formData.append("address", address.trim());
      // country-state-city needs ISO codes to filter the cascading dropdowns,
      // but the backend wants full names — resolve them right before sending.
      formData.append("country", countries.find((c) => c.value === country)?.label || country);
      formData.append("state", states.find((s) => s.value === state)?.label || state);
      formData.append("city", city);
      formData.append("description", description.trim());
      if (image) formData.append("serviceimage", image);

      await addExhibitionService(formData);

      toast.success("Service added successfully!");
      onClose?.();
    } catch (error) {
      console.error(error);
      toast.error("Failed to add service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ox-form fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-[90%] max-w-3xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="relative flex shrink-0 items-center justify-between border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white px-4 py-4 sm:px-8 sm:py-5 dark:border-gray-800 dark:from-white/[0.03] dark:to-transparent">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">Add New Service</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Fill in the service provider details below</p>
          </div>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full text-3xl leading-none text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-white" aria-label="Close">
            &times;
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto bg-gray-50/30 dark:bg-gray-950/30">
          <form id="service-form" onSubmit={handleSubmit} className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6" noValidate>

            {/* Left Column */}
            <div className="space-y-6">

              {/* Basic Info */}
              <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h3 className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#2B3FB8] dark:text-blue-300">Basic Information</h3>
                <InputField
                  id="full_name"
                  label="Full Name"
                  value={full_name}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  required
                  onBlur={() => markTouched("full_name")}
                  error={touched.full_name ? errors.full_name : null}
                />
                <Dropdown
                  id="service_name"
                  label="Service Type"
                  value={service_name}
                  /* Changing the category clears the speciality: one chosen under
                     the previous category is not valid under this one, and leaving
                     it set would submit a pair the API refuses. Same pattern as
                     country -> state -> city below. */
                  onChange={(e) => {
                    setServiceName(e.target.value);
                    setServiceSubcategory("");
                  }}
                  options={SERVICE_CATEGORIES}
                  placeholder="Select Service"
                  required
                  onBlur={() => markTouched("service_name")}
                  error={touched.service_name ? errors.service_name : null}
                />
                {/*
                  REQUIRED, and only shown once a category is chosen - the options
                  depend on it, and an empty speciality dropdown invites a click that
                  does nothing.

                  A provider who has not decided how to subdivide their work picks
                  "General", which is the first option in every category and is a
                  real answer rather than a blank. That is what makes requiring this
                  fair: there is always a correct choice available, so nobody is
                  forced to claim a speciality they do not have.
                */}
                {service_name && subcategories.length ? (
                  <Dropdown
                    id="service_subcategory"
                    label="Speciality"
                    value={service_subcategory}
                    onChange={(e) => setServiceSubcategory(e.target.value)}
                    options={subcategories}
                    placeholder="Select speciality"
                    required
                    onBlur={() => markTouched("service_subcategory")}
                    error={touched.service_subcategory ? errors.service_subcategory : null}
                  />
                ) : null}
                <InputField
                  id="mobile_number"
                  label="Mobile Number"
                  value={mobile_number}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  required
                  onBlur={() => markTouched("mobile_number")}
                  error={touched.mobile_number ? errors.mobile_number : null}
                />
              </div>

              {/* Image */}
              <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h3 className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#2B3FB8] dark:text-blue-300">Profile Image</h3>
                <SimpleFileField
                  id="image"
                  label="Upload Image (JPG / PNG / WEBP)"
                  onChange={handleImageChange}
                  accept="image/*"
                  error={errors.image}
                />
                {image && (
                  <div className="flex items-center gap-3 mt-2">
                    <img
                      src={URL.createObjectURL(image)}
                      alt="Preview"
                      className="h-16 w-16 rounded-lg object-cover border border-gray-300 dark:border-gray-700"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{image.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">

              {/* Location */}
              <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h3 className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#2B3FB8] dark:text-blue-300">Location</h3>
                <div className="grid grid-cols-1 gap-4">
                  <Dropdown
                    id="country"
                    label="Country"
                    value={country}
                    options={countries}
                    placeholder="Select Country"
                    required
                    onChange={(e) => { setCountry(e.target.value); setState(""); setCity(""); }}
                    onBlur={() => markTouched("country")}
                    error={touched.country ? errors.country : null}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Dropdown
                      id="state"
                      label="State"
                      value={state}
                      options={states}
                      placeholder="Select State"
                      required
                      onChange={(e) => { setState(e.target.value); setCity(""); }}
                      onBlur={() => markTouched("state")}
                      error={touched.state ? errors.state : null}
                    />
                    <Dropdown
                      id="city"
                      label="City"
                      value={city}
                      options={cities}
                      placeholder="Select City"
                      required
                      onChange={(e) => setCity(e.target.value)}
                      onBlur={() => markTouched("city")}
                      error={touched.city ? errors.city : null}
                    />
                  </div>
                  <div className="w-full">
                    <Label required htmlFor="address">Full Address</Label>
                    <textarea
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      onBlur={() => markTouched("address")}
                      placeholder="Street, Area, Zip Code"
                      rows={3}
                      className={`w-full rounded-md border px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-[#2B3FB8] focus:ring-4 focus:ring-[#2B3FB8]/15 outline-none transition shadow-sm resize-none placeholder-gray-400 dark:placeholder-gray-500 ${
                        touched.address && errors.address ? "border-red-500" : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                      }`}
                    />
                    {touched.address && errors.address && (
                      <p className="text-xs text-red-600 mt-1">{errors.address}</p>
                    )}
                  </div>
                  <ServiceDescriptionField value={description} onChange={setDescription} />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="col-span-full p-5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#2B3FB8] hover:text-[#2B3FB8] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-blue-400 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#131C55] to-[#2B3FB8] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/25 transition hover:brightness-110 disabled:opacity-70 disabled:cursor-not-allowed motion-reduce:transition-none dark:from-blue-600 dark:to-indigo-500"
              >
                {isSubmitting ? "Saving..." : "Save Service"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ExhibitionServicePopupForm;