"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import PropTypes from "prop-types";
import { createCompany } from "@/models/company.model";

/* ─── STYLES ──────────────────────────────────────────────────────────── */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  .pf * { box-sizing: border-box; font-family: 'Inter', sans-serif; }

  .pf-overlay {
    position: fixed; inset: 0; z-index: 50;
    background: rgba(15, 23, 42, 0.55);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
  }

  .pf-dialog {
    background: #ffffff;
    width: 100%; max-width: 960px;
    height: 90vh;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
    display: flex; flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08);
  }

  /* ── Header ── */
  .pf-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    padding: 1.75rem 2rem 1.25rem;
    border-bottom: 1px solid #e9edf2;
    flex-shrink: 0;
  }
  .pf-header-title {
    font-size: 24px; font-weight: 700;
    color: #0f172a; letter-spacing: -0.03em; margin: 0;
  }
  .pf-header-sub {
    font-size: 13.5px; color: #64748b;
    margin: 5px 0 0; font-weight: 400;
  }
  .pf-close {
    width: 34px; height: 34px; border-radius: 8px;
    border: 1px solid #e2e8f0; background: transparent;
    cursor: pointer; color: #94a3b8; font-size: 20px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s; flex-shrink: 0; margin-top: 2px;
  }
  .pf-close:hover { background: #fef2f2; color: #ef4444; border-color: #fecaca; }

  /* ── Body ── */
  .pf-body {
    flex: 1; overflow-y: auto;
    padding: 1.75rem 2rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    align-content: start;
  }
  .pf-body::-webkit-scrollbar { width: 5px; }
  .pf-body::-webkit-scrollbar-track { background: #f8fafc; }
  .pf-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

  /* ── Cards ── */
  .pf-card {
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.5rem;
    display: flex; flex-direction: column; gap: 1.1rem;
    background: #ffffff;
  }
  .pf-card-full { grid-column: 1 / -1; }

  .pf-card-title {
    font-size: 11px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.1em;
    color: #1d4ed8; margin: 0 0 0.25rem;
  }

  /* ── Field ── */
  .pf-field { display: flex; flex-direction: column; gap: 6px; }
  .pf-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

  .pf-label {
    font-size: 13.5px; font-weight: 600; color: #1e293b;
    display: flex; align-items: center; gap: 4px;
  }
  .pf-req { color: #ef4444; font-size: 13px; }

  .pf-input, .pf-textarea {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 9px 13px;
    font-size: 13.5px; color: #1e293b;
    background: #ffffff;
    outline: none; transition: all 0.15s;
    width: 100%;
  }
  .pf-input::placeholder, .pf-textarea::placeholder { color: #94a3b8; }
  .pf-input:hover, .pf-textarea:hover { border-color: #93c5fd; }
  .pf-input:focus, .pf-textarea:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
  }
  .pf-textarea { resize: vertical; min-height: 90px; line-height: 1.6; }

  /* ── File upload ── */
  .pf-file-wrapper {
    position: relative;
    display: flex; align-items: center;
    border: 1px solid #cbd5e1; border-radius: 8px;
    overflow: hidden; background: #ffffff;
    transition: border-color 0.15s;
  }
  .pf-file-wrapper:hover { border-color: #93c5fd; }
  .pf-file-btn {
    padding: 8px 16px;
    background: #eff6ff; color: #1d4ed8;
    font-size: 13px; font-weight: 600;
    border-right: 1px solid #bfdbfe;
    white-space: nowrap; flex-shrink: 0;
    cursor: pointer;
  }
  .pf-file-name {
    padding: 8px 12px;
    font-size: 13px; color: #64748b;
    flex: 1; overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap;
  }
  .pf-file-wrapper input[type="file"] {
    position: absolute; inset: 0; opacity: 0; cursor: pointer;
  }

  /* Image preview */
  .pf-img-preview {
    width: 72px; height: 72px; border-radius: 8px;
    object-fit: cover; border: 1px solid #e2e8f0; margin-top: 4px;
  }

  /* ── Footer ── */
  .pf-footer {
    flex-shrink: 0; padding: 1.25rem 2rem;
    border-top: 1px solid #e9edf2;
    display: flex; align-items: center; justify-content: space-between;
    background: #f8fafc;
  }
  .pf-footer-hint { font-size: 12px; color: #94a3b8; }
  .pf-footer-actions { display: flex; gap: 10px; }

  .pf-btn {
    padding: 9px 24px; border-radius: 9px;
    font-family: 'Inter', sans-serif;
    font-size: 13.5px; font-weight: 600;
    cursor: pointer; transition: all 0.15s;
    border: none; outline: none;
  }
  .pf-btn-cancel {
    background: #ffffff; border: 1px solid #cbd5e1; color: #475569;
  }
  .pf-btn-cancel:hover { background: #f1f5f9; border-color: #94a3b8; }
  .pf-btn-submit {
    background: #1d4ed8; color: #ffffff;
    box-shadow: 0 2px 8px rgba(29,78,216,0.3);
  }
  .pf-btn-submit:hover:not(:disabled) {
    background: #1e40af;
    box-shadow: 0 4px 14px rgba(29,78,216,0.4);
    transform: translateY(-1px);
  }
  .pf-btn-submit:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

  .pf-error-msg {
    font-size: 12px; color: #dc2626; margin-top: 4px;
  }

  @media (max-width: 640px) {
    .pf-body { grid-template-columns: 1fr; }
    .pf-card-full { grid-column: 1; }
    .pf-field-row { grid-template-columns: 1fr; }
  }

  /* ── Dark mode ── (.dark on <html>, toggled by next-themes) */
  .dark .pf-dialog { background: #111827; border-color: #374151; }
  .dark .pf-header { border-bottom-color: #1f2937; }
  .dark .pf-header-title { color: #f3f4f6; }
  .dark .pf-header-sub { color: #9ca3af; }
  .dark .pf-close { border-color: #374151; color: #6b7280; }
  .dark .pf-close:hover { background: #450a0a; color: #f87171; border-color: #7f1d1d; }
  .dark .pf-body::-webkit-scrollbar-track { background: #1f2937; }
  .dark .pf-body::-webkit-scrollbar-thumb { background: #4b5563; }
  .dark .pf-card { border-color: #374151; background: #1f2937; }
  .dark .pf-card-title { color: #60a5fa; }
  .dark .pf-label { color: #e5e7eb; }
  .dark .pf-input, .dark .pf-textarea {
    border-color: #4b5563; color: #f3f4f6; background: #111827;
  }
  .dark .pf-input::placeholder, .dark .pf-textarea::placeholder { color: #6b7280; }
  .dark .pf-input:hover, .dark .pf-textarea:hover { border-color: #60a5fa; }
  .dark .pf-file-wrapper { border-color: #4b5563; background: #111827; }
  .dark .pf-file-wrapper:hover { border-color: #60a5fa; }
  .dark .pf-file-btn { background: #1e3a8a; color: #93c5fd; border-right-color: #1e40af; }
  .dark .pf-file-name { color: #9ca3af; }
  .dark .pf-img-preview { border-color: #374151; }
  .dark .pf-footer { border-top-color: #1f2937; background: #1f2937; }
  .dark .pf-footer-hint { color: #6b7280; }
  .dark .pf-btn-cancel { background: #111827; border-color: #4b5563; color: #cbd5e1; }
  .dark .pf-btn-cancel:hover { background: #1f2937; border-color: #6b7280; }
`;

/* ─── CONSTANTS ───────────────────────────────────────────────────────── */
const ALLOWED_BROCHURE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"];
const MAX_BROCHURE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const websiteRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}/i;
const phoneRegex = /^\+?[0-9\s\-()]{7,}$/; // Flexible: allows + prefix, spaces, dashes, parens

/* ─── HELPERS ─────────────────────────────────────────────────────────── */
const Field = ({ label, required, error, children }) => (
  <div className="pf-field">
    <label className="pf-label">
      {label}
      {required && <span className="pf-req">*</span>}
    </label>
    {children}
    {error && <span className="pf-error-msg">{error}</span>}
  </div>
);

const TextInput = ({ 
  value, 
  onChange, 
  type = "text", 
  maxLength,
  minLength, 
  placeholder,
  error 
}) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    maxLength={maxLength}
    minLength={minLength}
    placeholder={placeholder}
    className={`pf-input ${error ? 'error' : ''}`}
    style={error ? { borderColor: '#dc2626' } : {}}
  />
);

/* ─── MAIN ────────────────────────────────────────────────────────────── */
const CompanyPopupForm = ({ Close, data, onCompanyAdded }) => {
  const [form, setForm] = useState({
    company_name: "",
    company_email: "",
    company_nature: "",
    company_phone_number: "",  // String (stored as-is, no conversion needed)
    company_address: "",
    pincode: "",               // String (6 digits)
    about_company: "",
    company_website: "",
    stall_no: "",
    hall_no: "",
  });

  const [brochure, setBrochure] = useState(null);
  const [companyImage, setCompanyImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [createdBy, setCreatedBy] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track validation errors per field
  const [errors, setErrors] = useState({});

  // Track preview URL for cleanup
  const previewUrlRef = useRef(null);

  useEffect(() => {
    // Extract createdBy from data (could be object with _id or raw ID string)
    if (data) {
      setCreatedBy(data?._id ?? data);
    }
  }, [data]);

  // Revoke object URL on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const updateField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    // Clear error for this field when user starts typing
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: null }));
    }
  };

  const handleBrochureChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_BROCHURE_TYPES.includes(file.type)) {
      toast.error("Unsupported brochure file type. Use PDF, DOC, JPG, or PNG.");
      return;
    }

    if (file.size > MAX_BROCHURE_SIZE) {
      toast.error("Brochure must be under 5 MB");
      return;
    }

    setBrochure(file);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Only JPG or PNG allowed for company image");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image must be under 3 MB");
      return;
    }

    setCompanyImage(file);

    // Revoke old preview URL before creating new one
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setPreview(url);
  };

  const validate = () => {
    const newErrors = {};
    const t = (v) => v?.trim() ?? "";

    // Required: company_name
    if (!t(form.company_name)) {
      newErrors.company_name = "Company name is required";
    }

    // Required: company_nature
    if (!t(form.company_nature)) {
      newErrors.company_nature = "Nature of business is required";
    }

    // Optional but validate if provided: company_email
    if (t(form.company_email) && !emailRegex.test(t(form.company_email))) {
      newErrors.company_email = "Invalid email address";
    }

    // Optional but validate if provided: company_phone_number
    if (t(form.company_phone_number)) {
      const cleaned = t(form.company_phone_number).replace(/[\s\-()]/g, "");
      if (!phoneRegex.test(t(form.company_phone_number))) {
        newErrors.company_phone_number = "Invalid phone number";
      }
    }

    // Required: pincode (6 digits, stored as string)
    if (!t(form.pincode)) {
      newErrors.pincode = "Pincode is required";
    } 

    // Required: company_address
    if (!t(form.company_address)) {
      newErrors.company_address = "Address is required";
    }

    // Required: about_company
    if (!t(form.about_company)) {
      newErrors.about_company = "About company is required";
    }

    // Optional but validate if provided: company_website
    if (t(form.company_website) && !websiteRegex.test(t(form.company_website))) {
      newErrors.company_website = "Enter a valid website URL";
    }

    // createdBy must exist (session validation)
    if (!createdBy) {
      newErrors.createdBy = "Session error: CreatedBy is missing. Please reload.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validate before submitting
    if (!validate()) {
      toast.error("Please fix the errors above");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();

      // Append all form fields (trim strings)
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, typeof value === "string" ? value.trim() : value);
      });

      // Append createdBy as string (ObjectId from User model)
      formData.append("createdBy", createdBy.toString());

      // Only append files if they exist (backend guards with null check)
      if (brochure) {
        formData.append("brochure", brochure);
      }

      if (companyImage) {
        // Key must match backend multer field name: company_image_url
        formData.append("company_image_url", companyImage);
      }

      const response = await createCompany(formData);

      toast.success("Company added successfully!");
      
      // Call parent callback
      onCompanyAdded?.(response.data.company);
      
      // Close dialog
      Close();
    } catch (err) {
      // Backend returns detailed error with validationErrors or message
      const backendMsg = err?.response?.data?.message;
      const validationErrs = err?.response?.data?.validationErrors;

      if (validationErrs) {
        // Populate field-specific errors from backend
        setErrors(validationErrs);
        toast.error("Please fix validation errors");
      } else {
        const msg = backendMsg || "Failed to add company. Please try again.";
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="pf pf-overlay">
        <div className="pf-dialog">

          {/* Header */}
          <div className="pf-header">
            <div>
              <h2 className="pf-header-title">Add New Company</h2>
              <p className="pf-header-sub">Please fill in the details below</p>
            </div>
            <button
              className="pf-close"
              onClick={Close}
              type="button"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="pf-body">

            {/* BASIC INFORMATION */}
            <div className="pf-card">
              <p className="pf-card-title">Basic Information</p>

              <Field
                label="Company Name"
                required
                error={errors.company_name}
              >
                <TextInput
                  value={form.company_name}
                  onChange={updateField("company_name")}
                  placeholder="e.g. Acme Technologies"
                  error={errors.company_name}
                />
              </Field>

              <Field
                label="Nature of Business"
                required
                error={errors.company_nature}
              >
                <TextInput
                  value={form.company_nature}
                  onChange={updateField("company_nature")}
                  placeholder="e.g. Manufacturing"
                  error={errors.company_nature}
                />
              </Field>

              <div className="pf-field-row">
                <Field
                  label="Email Address"
                  error={errors.company_email}
                >
                  <TextInput
                    type="email"
                    value={form.company_email}
                    onChange={updateField("company_email")}
                    placeholder="contact@company.com"
                    error={errors.company_email}
                  />
                </Field>

                {/* Phone: stored as String, accepts +91XXXXXXXXXX or plain digits */}
                <Field
                  label="Phone Number"
                  error={errors.company_phone_number}
                >
                  <TextInput
                    value={form.company_phone_number}
                    maxLength={13}
                    placeholder="+91 98765 43210"
                    onChange={(e) => {
                      // Allow digits, +, spaces, dashes, parentheses
                      const raw = e.target.value;
                      updateField("company_phone_number")({
                        target: { value: raw },
                      });
                    }}
                    error={errors.company_phone_number}
                  />
                </Field>
              </div>
            </div>

            {/* EXHIBITION ALLOCATION */}
            <div className="pf-card">
              <p className="pf-card-title">Exhibition Allocation</p>

              <div className="pf-field-row">
                <Field label="Hall Number">
                  <TextInput
                    value={form.hall_no}
                    onChange={updateField("hall_no")}
                    placeholder="e.g. Hall A"
                  />
                </Field>
                <Field label="Stall Number">
                  <TextInput
                    value={form.stall_no}
                    onChange={updateField("stall_no")}
                    placeholder="e.g. A-204"
                  />
                </Field>
              </div>

              <Field
                label="Company Website"
                error={errors.company_website}
              >
                <TextInput
                  value={form.company_website}
                  onChange={updateField("company_website")}
                  placeholder="https://company.com"
                  error={errors.company_website}
                />
              </Field>
            </div>

            {/* LOCATION */}
            <div className="pf-card">
              <p className="pf-card-title">Location</p>

              <Field
                label="Company Address"
                required
                error={errors.company_address}
              >
                <TextInput
                  value={form.company_address}
                  onChange={updateField("company_address")}
                  placeholder="123 Industrial Area, Phase II"
                  error={errors.company_address}
                />
              </Field>

              {/* Pincode: String (6 digits) */}
              <Field
                label="Pincode"
                required
                error={errors.pincode}
              >
                <TextInput
                  value={form.pincode}
                  maxLength={6}
                  minLength={4}
                  placeholder="160001"
                 onChange={(e) => {
                      // Allow digits, +, spaces, dashes, parentheses
                      const raw = e.target.value;
                      updateField("pincode")({
                        target: { value: raw },
                      });
                    }}
                  error={errors.pincode}
                />
              </Field>
            </div>

            {/* DOCUMENTS */}
            <div className="pf-card">
              <p className="pf-card-title">Documents</p>

              <Field label="Company Brochure (PDF / DOC / Image)">
                <div className="pf-file-wrapper">
                  <span className="pf-file-btn">Choose file</span>
                  <span className="pf-file-name">
                    {brochure ? brochure.name : "No file chosen"}
                  </span>
                  <input
                    type="file"
                    onChange={handleBrochureChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                </div>
              </Field>

              <Field label="Company Image (JPG / PNG)">
                {preview && (
                  <img
                    src={preview}
                    alt="Company preview"
                    className="pf-img-preview"
                  />
                )}
                <div className="pf-file-wrapper">
                  <span className="pf-file-btn">Choose file</span>
                  <span className="pf-file-name">
                    {companyImage ? companyImage.name : "No file chosen"}
                  </span>
                  <input
                    type="file"
                    name="company_image_url"
                    onChange={handleImageChange}
                    accept=".jpg,.jpeg,.png"
                  />
                </div>
              </Field>
            </div>

            {/* COMPANY OVERVIEW — full width */}
            <div className="pf-card pf-card-full">
              <p className="pf-card-title">Company Overview</p>
              <Field
                label="About the Company"
                required
                error={errors.about_company}
              >
                <textarea
                  className="pf-textarea"
                  style={errors.about_company ? { borderColor: '#dc2626' } : {}}
                  rows={4}
                  placeholder="Brief description of the company's products or services..."
                  value={form.about_company}
                  onChange={updateField("about_company")}
                />
              </Field>
            </div>

          </div>

          {/* Footer */}
          <div className="pf-footer">
            <span className="pf-footer-hint">
              Fields marked <span style={{ color: "#ef4444" }}>*</span> are required
            </span>
            <div className="pf-footer-actions">
              <button
                type="button"
                className="pf-btn pf-btn-cancel"
                onClick={Close}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="pf-btn pf-btn-submit"
                disabled={isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? "Saving..." : "Save Company"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

CompanyPopupForm.propTypes = {
  Close: PropTypes.func.isRequired,
  data: PropTypes.any,
  onCompanyAdded: PropTypes.func,
};

export default CompanyPopupForm;