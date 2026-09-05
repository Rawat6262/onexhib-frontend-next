"use client";

import { City, Country, State } from "country-state-city";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import Select from 'react-select';
import { createExhibition } from "@/models/exhibition.model";

// --- 1. Refined Label Component (Bold & Visible) ---
const Label = ({ children, required, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1.5 tracking-wide">
    {children} {required && <span className="text-red-600 text-base">*</span>}
  </label>
);

// --- 2. Reusable Input Components ---
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
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : undefined}
      className={`w-full rounded-md border px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition shadow-sm placeholder-gray-400 dark:placeholder-gray-500 ${
        error ? "border-red-500" : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
      }`}
    />
    {error && <p id={`${id}-error`} className="text-xs text-red-600 mt-1">{error}</p>}
  </div>
);

const TextAreaField = ({ id, label, value, onChange, placeholder, rows = 3, required, onBlur, error }) => (
  <div className="w-full">
    <Label required={required} htmlFor={id}>{label}</Label>
    <textarea
      id={id}
      name={id}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      rows={rows}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : undefined}
      className={`w-full rounded-md border px-3 py-2 text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition shadow-sm resize-none placeholder-gray-400 ${
        error ? "border-red-500" : "border-gray-300 bg-white"
      }`}
    />
    {error && <p id={`${id}-error`} className="text-xs text-red-600 mt-1">{error}</p>}
  </div>
);

// SIMPLE File Input (Clean & Professional)
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

// ---------------- Validation helpers ----------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const URL_RE = /^(https?:\/\/)[^\s$.?#].[^\s]*$/i; // simple URL validator - expects protocol
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_LAYOUT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ExhibitionPopupForm = ({ onClose }) => {
  // --- State Variables ---
  const [exhibition_name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [venue, setVenue] = useState("");
  const [exhibition_address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [Exhibitor_Profile, setexhibitor] = useState("");
  const [vistor_Profile, setvistor] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [about_exhibition, setAbout] = useState("");
  const [speakers, setSpeakers] = useState("");
  const [session, setSession] = useState("");


  const [sponsor, setSponsor] = useState("");
  const [partners, setPartners] = useState("");
  const [Support, setSupport] = useState(""); // Support state

  const [privacy_policy, setPrivacy] = useState("");
  const [terms_of_service, setTerms] = useState("");
  const [countrys, setcountrys] = useState("");
  const [state, setstate] = useState("");
  const [city, setcity] = useState("");
  const [about_organiser, setaboutorganiser] = useState("");
  const [why_Exhibit, setWhyExhibit] = useState("");
  const [why_visit, setWhyVisit] = useState("");

  const [exhibition_image, setImage] = useState(null);
  const [layout, setLayout] = useState(null);
  const [brochure, setBrochure] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // errors & touched for inline validation
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // helper: mark field touched
  const markTouched = (id) => setTouched((s) => ({ ...s, [id]: true }));

  // file change handlers with validation
  const handleImageChange = (e) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setImage(null);
      setErrors((s) => ({ ...s, exhibition_image: null }));
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(f.type)) {
      setImage(null);
      setErrors((s) => ({ ...s, exhibition_image: "Image must be JPG/PNG/WEBP." }));
      toast.error("Unsupported image type. Allowed: JPG, PNG, WEBP.");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setImage(null);
      setErrors((s) => ({ ...s, exhibition_image: "Image exceeds 5MB." }));
      toast.error("Image too large. Max 5MB allowed.");
      return;
    }
    setImage(f);
    setErrors((s) => ({ ...s, exhibition_image: null }));
  };

  const handleLayoutChange = (e) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setLayout(null);
      setErrors((s) => ({ ...s, layout: null }));
      return;
    }
    if (!ALLOWED_LAYOUT_TYPES.includes(f.type)) {
      setLayout(null);
      setErrors((s) => ({ ...s, layout: "Layout must be PDF or image (JPG/PNG/WEBP)." }));
      toast.error("Unsupported layout file type. Allowed: PDF, JPG, PNG, WEBP.");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setLayout(null);
      setErrors((s) => ({ ...s, layout: "Layout file exceeds 5MB." }));
      toast.error("Layout too large. Max 5MB allowed.");
      return;
    }
    setLayout(f);
    setErrors((s) => ({ ...s, layout: null }));
  };

  const handleBrochureChange = (e) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) { setBrochure(null); return; }
    if (!ALLOWED_LAYOUT_TYPES.includes(f.type)) {
      setBrochure(null);
      toast.error("Brochure must be PDF or image (JPG/PNG/WEBP).");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setBrochure(null);
      toast.error("Brochure too large. Max 5MB allowed.");
      return;
    }
    setBrochure(f);
  };
// country state city
// let [form,setform]=useState({
//   state: '',
//     city: '',
//     address: '',
// })
 const countries = useMemo(
    () =>
      Country.getAllCountries().map((c) => ({
        value: c.isoCode,
        label: c.name,

      })),
    []
  );

  const states = useMemo(
    () =>
      countrys
        ? State.getStatesOfCountry(countrys).map((s) => ({
            value: s.isoCode,
            label: s.name,
          }))
        : [],
    [countrys]
  );

  const cities = useMemo(
    () =>
      countrys && state
        ? City.getCitiesOfState(countrys, state).map((c) => ({
            value: c.name,
            label: c.name,
          }))
        : [],
    [countrys,state]
  );
  // const SelectField = ({ label, options, value, onChange }) => (
  // <div>
  //   <label className="block mb-1 font-semibold">{label}</label>
  //   <Select
  //     options={options}
  //     value={options.find((o) => o.value === value) || null}
  //     onChange={onChange}
  //     isClearable
  //   />
  // </div>
// );
const Dropdown = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  onBlur,
  error,
  options
}) => (
  <div className="w-full">
    <Label required={required} htmlFor={id}>{label}</Label>

    {options ? (
      <select
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full rounded-md border px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition shadow-sm ${
          error ? "border-red-500" : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
        }`}
      >
        <option value="">{placeholder || "Select option"}</option>

        {options?.map((option, index) => (
          <option key={index} value={option.value || option}>
            {option.label || option}
          </option>
        ))}
      </select>
    ) : (
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full rounded-md border px-3 py-2 text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition shadow-sm placeholder-gray-400 ${
          error ? "border-red-500" : "border-gray-300 bg-white"
        }`}
      />
    )}

    {error && (
      <p id={`${id}-error`} className="text-xs text-red-600 mt-1">
        {error}
      </p>
    )}
  </div>
);
  // full-form validation, returns errors object
  const validateAll = () => {
    const e = {};

    if (!exhibition_name.trim()) e.exhibition_name = "Exhibition name is required.";
    if (!category.trim()) e.category = "Category is required.";
    if (!venue.trim()) e.venue = "Venue is required.";
    if (!exhibition_address.trim()) e.exhibition_address = "Address is required.";

    if (!email.trim()) e.email = "Contact email is required.";
    else if (!EMAIL_RE.test(email.trim())) e.email = "Enter a valid email address.";
     if (!countrys.trim()) e.countrys = 'Country is required.';
    if (!state.trim()) e.state = 'State is required.';
    if (!city.trim()) e.city = 'City is required.';
    // dates
    if (!startDate) e.startDate = "Start date is required.";
    if (!endDate) e.endDate = "End date is required.";
    if (startDate && endDate) {
      const s = new Date(startDate);
      const en = new Date(endDate);
      if (s > en) e.endDate = "End date must be same or after start date.";
    }

    if (!about_exhibition.trim()) e.about_exhibition = "Description is required.";

    // optional URLs, if present validate
    if (privacy_policy.trim() && !URL_RE.test(privacy_policy.trim())) e.privacy_policy = "Enter a valid URL (include http/https).";
    if (terms_of_service.trim() && !URL_RE.test(terms_of_service.trim())) e.terms_of_service = "Enter a valid URL (include http/https).";

    // file errors previously set in handlers; also ensure not oversized/invalid
    // merge any existing file errors
    if(!exhibition_image) e.exhibition_image='Exhibition_image is Required';
    if (errors.exhibition_image) e.exhibition_image = errors.exhibition_image;
    if (errors.layout) e.layout = errors.layout;

    return e;
  };

  // Submit Handler
  const handleExhibition = async (ev) => {
    ev.preventDefault();

    // let native browser run constraint validation first
    const formEl = document.getElementById("exhibition-form");
    if (formEl && !formEl.checkValidity()) {
      // show native UI
      formEl.reportValidity();
      return;
    }

    // run custom validation
    const validationErrors = validateAll();
    setErrors(validationErrors);
    // mark all touched so inline errors show
    setTouched({
      exhibition_name: true,
      category: true,
      venue: true,
      exhibition_address: true,
      email: true,
      startDate: true,
      endDate: true,
      about_exhibition: true,
      countrys: true,
      state: true,
      city: true,
      // privacy_policy: true,
      // terms_of_service: true,
      exhibition_image:true,
      // layout:true
    
    });

    if (Object.keys(validationErrors).length) {
      toast.error("Please fix the highlighted errors.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("exhibition_name", exhibition_name.trim());
      formData.append("category", category.trim());
      formData.append("venue", venue.trim());
      formData.append("exhibition_address", exhibition_address.trim());
      formData.append("email", email.trim());
      formData.append("starting_date", startDate);
      formData.append("ending_date", endDate);
      formData.append("about_exhibition", about_exhibition.trim());
      formData.append("speakers", speakers.trim());
      formData.append("session", session.trim());
      formData.append("sponsor", sponsor.trim());
      formData.append("partners", partners.trim());
      formData.append("exhibitor_profile", Exhibitor_Profile.trim());
      formData.append("vistor", vistor_Profile.trim());
      formData.append("Support", Support.trim());
      formData.append("privacy_policy", privacy_policy.trim());
      formData.append("terms_of_service", terms_of_service.trim());
      // country-state-city needs ISO codes to filter the cascading dropdowns,
      // but the backend wants full names — resolve them right before sending.
      const countryName = countries.find((c) => c.value === countrys)?.label || countrys;
      const stateName = states.find((s) => s.value === state)?.label || state;
      formData.append("country", countryName.trim());
      formData.append("state", stateName.trim());
      formData.append("city",city.trim());
      formData.append("about_organiser",about_organiser.trim());
      formData.append("why_Exhibit", why_Exhibit.trim());
      formData.append("why_visit", why_visit.trim());

      if (exhibition_image) formData.append("exhibition_image", exhibition_image);
      if (layout) formData.append("layout", layout);
      if (brochure) formData.append("Exhibition_Brochure", brochure);

      await createExhibition(formData);
      
      toast.success("Exhibition saved successfully!");
      onClose?.();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save exhibition.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm">
      {/* 90% Width and Height Container */}
      <div className="bg-white dark:bg-gray-900 w-[90%] h-[90%] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn">

        {/* Header */}
        <div className="flex justify-between items-center px-4 sm:px-8 py-4 sm:py-5 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Add New Exhibition</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Please fill in the details below</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-red-600 text-4xl leading-none transition-colors"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50/30 dark:bg-gray-950/30">
          <form id="exhibition-form" onSubmit={handleExhibition} className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6" noValidate>

            {/* === Left Column === */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-900 p-5 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
                <h3 className="text-blue-700 dark:text-blue-400 font-bold uppercase text-xs tracking-wider mb-2">Basic Information</h3>
                <InputField
                  id="exhibition_name"
                  label="Exhibition Name"
                  value={exhibition_name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Global Tech Summit"
                  required
                  onBlur={() => markTouched("exhibition_name")}
                  error={touched.exhibition_name ? errors.exhibition_name : null}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField
                    id="category"
                    label="Category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Technology"
                    required
                    onBlur={() => markTouched("category")}
                    error={touched.category ? errors.category : null}
                  />
                  <InputField
                    id="email"
                    type="email"
                    label="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@domain.com"
                    required
                    onBlur={() => markTouched("email")}
                    error={touched.email ? errors.email : null}
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 p-5 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
                <h3 className="text-blue-700 dark:text-blue-400 font-bold uppercase text-xs tracking-wider mb-2">Location</h3>
               <div className="grid md:grid-cols-3 gap-6">
         {console.log(countries)}
 <Dropdown
  id="countrys"
  label="Country"
  placeholder="Select Country"
  options={countries}
  value={countrys}
  required
  onChange={(e) => {
    const value = e.target.value;
    // let v2=  countries.filter((v)=>{
    //   if(value==v.value){
    //     return v.label
    //   }
    // })
    // console.log(v2[0].label)
    // let newv = v2[0].label;
    setcountrys(value);
    setstate(""); // reset state
    setcity("");  // reset city
  }}
  error={touched.countrys ? errors.countrys : null}
/>
         <Dropdown
  id="state"
  label="State"
  placeholder="Select State"
  options={states}
  value={state}
  required
  onChange={(e) => {
    const value = e.target.value;
    //  let v2=  states.filter((v)=>{
    //   if(value==v.value){
    //     return v.label
    //   }
    // })
    setstate(value);
    setcity(""); // reset city
  }}
  error={touched.state ? errors.state : null}
/>
          <Dropdown
  id="city"
  label="City"
  placeholder="Select City"
  options={cities}
  value={city}
  required
  onChange={(e) => setcity(e.target.value)}
  error={touched.city ? errors.city : null}
/>
          {/* <SelectField label="State" options={states} value={state} onChange={(e) => setstate(e.target.value)} />
          <SelectField label="City" options={cities} value={city} onChange={(e) => setcity(e.target.value)} /> */}
        </div>
                <InputField
                  id="venue"
                  label="Venue Name"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. Grand Convention Center"
                  required
                  onBlur={() => markTouched("venue")}
                  error={touched.venue ? errors.venue : null}
                />

                <TextAreaField
                  id="exhibition_address"
                  label="Full Address"
                  value={exhibition_address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  placeholder="Street, City, Zip Code"
                  required
                  onBlur={() => markTouched("exhibition_address")}
                  error={touched.exhibition_address ? errors.exhibition_address : null}
                />
              </div>


              <div className="bg-white dark:bg-gray-900 p-5 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
                <h3 className="text-blue-700 dark:text-blue-400 font-bold uppercase text-xs tracking-wider mb-2">Schedule Details</h3>
                <TextAreaField
                  id="speakers"
                  label="Speakers"
                  value={speakers}
                  onChange={(e) => setSpeakers(e.target.value)}
                  rows={3}
                  placeholder="List key speakers..."
                />
                <TextAreaField
                  id="about_organiser"
                  label="about_organiser"
                  value={about_organiser}
                  onChange={(e) => setaboutorganiser(e.target.value)}
                  rows={3}
                  placeholder="About_Organiser"
                />

                <TextAreaField
                  id="session"
                  label="Session Agenda"
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  rows={3}
                  placeholder="Brief schedule of events..."
                />
              </div>
            </div>

            {/* === Right Column === */}
            <div className="space-y-6">

              <div className="bg-white dark:bg-gray-900 p-5 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
                <h3 className="text-blue-700 dark:text-blue-400 font-bold uppercase text-xs tracking-wider mb-2">Dates & Media</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField
                    id="startDate"
                    type="date"
                    label="Start Date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    onBlur={() => markTouched("startDate")}
                    error={touched.startDate ? errors.startDate : null}
                  />
                  <InputField
                    id="endDate"
                    type="date"
                    label="End Date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    onBlur={() => markTouched("endDate")}
                    error={touched.endDate ? errors.endDate : null}
                  />
                </div>

                <div className="space-y-4 pt-2">
                  <SimpleFileField
                    id="exhibition_image"
                    label="Cover Image"
                    onChange={handleImageChange}
                    accept="image/*"
                    error={touched.exhibition_image ? errors.exhibition_image : null}
                  />
                  <SimpleFileField
                    id="layout"
                    label="Layout File (PDF/Image)"
                    accept=".pdf,image/*"
                    onChange={handleLayoutChange}
                  />
                  <SimpleFileField
                    id="Exhibition_Brochure"
                    label="Exhibition Brochure (PDF/Image) — Optional"
                    accept=".pdf,image/*"
                    onChange={handleBrochureChange}
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 p-5 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
                <h3 className="text-blue-700 dark:text-blue-400 font-bold uppercase text-xs tracking-wider mb-2">Additional Info</h3>
                <TextAreaField
                  id="about_exhibition"
                  label="About Exhibition"
                  value={about_exhibition}
                  onChange={(e) => setAbout(e.target.value)}
                  rows={3}
                  placeholder="Description..."
                  required
                  onBlur={() => markTouched("about_exhibition")}
                  error={touched.about_exhibition ? errors.about_exhibition : null}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextAreaField
                    id="sponsor"
                    label="Sponsors"
                    value={sponsor}
                    onChange={(e) => setSponsor(e.target.value)}
                    rows={2}
                  />
                  <TextAreaField
                    id="partners"
                    label="Partners"
                    value={partners}
                    onChange={(e) => setPartners(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 p-5 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
                <h3 className="text-blue-700 dark:text-blue-400 font-bold uppercase text-xs tracking-wider mb-2">Contact & Legal</h3>
                <InputField
                  id="Support"
                  label="Support Contact"
                  value={Support}
                  onChange={(e) => setSupport(e.target.value)}
                  placeholder="Phone or Helpdesk Email"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField
                    id="privacy_policy"
                    label="Privacy Policy URL"
                    value={privacy_policy}
                    onChange={(e) => setPrivacy(e.target.value)}
                    placeholder="https://..."
                    onBlur={() => markTouched("privacy_policy")}
                    error={touched.privacy_policy ? errors.privacy_policy : null}
                  />
                  <InputField
                    id="terms_of_service"
                    label="Terms URL"
                    value={terms_of_service}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="https://..."
                    onBlur={() => markTouched("terms_of_service")}
                    error={touched.terms_of_service ? errors.terms_of_service : null}
                  />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 p-5 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
                <h3 className="text-blue-700 dark:text-blue-400 font-bold uppercase text-xs tracking-wider mb-2">Exhibitor & vistor</h3>
                <TextAreaField
                  id="Exhibitor_Profile"
                  label="Exhibitor_Profile"
                  value={Exhibitor_Profile}
                  onChange={(e) => setexhibitor(e.target.value)}
                  placeholder="Exhibitor_Profile"
                />

                <div className="grid grid-cols-1 gap-4">
                  <TextAreaField
                    id="Vistor"
                    label="Vistor_Profile"
                    value={vistor_Profile}
                    onChange={(e) => setvistor(e.target.value)}
                    placeholder="Vistor_Profile"
                  />
                  <TextAreaField
                    id="why_Exhibit"
                    label="Why Exhibit"
                    value={why_Exhibit}
                    onChange={(e) => setWhyExhibit(e.target.value)}
                    placeholder="Why should exhibitors participate?"
                    rows={3}
                  />
                  <TextAreaField
                    id="why_visit"
                    label="Why Visit"
                    value={why_visit}
                    onChange={(e) => setWhyVisit(e.target.value)}
                    placeholder="Why should visitors attend?"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Footer (inside form so native validation + custom validation run) */}
            <div className="col-span-full p-4 sm:p-5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition shadow-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-md disabled:opacity-70"
              >
                {isSubmitting ? "Saving..." : "Save Exhibition"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ExhibitionPopupForm;
