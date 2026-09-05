"use client";

import { useState, useMemo, useEffect } from "react";
import Select from "react-select";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { signup } from "@/models/auth.model";
import AuthCard from "@/components/auth/AuthCard";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&^_-]{8,}$/;

export default function SignupForm() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    company_name: "",
    designation: "",
    website: "",
    mobile_number: "",
    country: "",
    state: "",
    city: "",
    address: "",
    role: "",
  });

  // country-state-city ships the entire world dataset (~2.3 MB). Importing it at
  // module scope put all of that in this page's first-load bundle even though it
  // is only needed once someone reaches the location dropdowns. Loading it after
  // mount keeps the form interactive immediately; the three selects populate a
  // moment later.
  const [csc, setCsc] = useState(null);
  useEffect(() => {
    let alive = true;
    import("country-state-city").then((mod) => {
      if (alive) setCsc(mod);
    });
    return () => {
      alive = false;
    };
  }, []);

  const [errors, setErrors] = useState({});
  const [, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  const designationOptions = [
    { value: "ORGANISER", label: "ORGANISER" },
    { value: "EXHIBITION_SERVICE", label: "EXHIBITION_SERVICE" },
  ];

  const countries = useMemo(
    () => (csc ? csc.Country.getAllCountries().map((c) => ({ value: c.isoCode, label: c.name })) : []),
    [csc]
  );

  const states = useMemo(
    () =>
      csc && form.country
        ? csc.State.getStatesOfCountry(form.country).map((s) => ({ value: s.isoCode, label: s.name }))
        : [],
    [csc, form.country]
  );

  const cities = useMemo(
    () =>
      csc && form.country && form.state
        ? csc.City.getCitiesOfState(form.country, form.state).map((c) => ({ value: c.name, label: c.name }))
        : [],
    [csc, form.country, form.state]
  );

  const markTouched = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

  const handleSelect = (option, field) => {
    setForm((prev) => ({
      ...prev,
      [field]: option ? option.value : "",
      ...(field === "country" ? { state: "", city: "" } : {}),
      ...(field === "state" ? { city: "" } : {}),
    }));
    markTouched(field);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "mobile_number") {
      const digits = value.replace(/\D/g, "").slice(0, 10);
      setForm((prev) => ({ ...prev, mobile_number: digits }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validateAll = (values) => {
    const e = {};
    if (!values.first_name.trim()) e.first_name = "First name is required.";
    if (!values.last_name.trim()) e.last_name = "Last name is required.";

    if (!values.email.trim()) e.email = "Email is required.";
    else if (!EMAIL_RE.test(values.email)) e.email = "Invalid email address.";

    if (!values.password) e.password = "Password is required.";
    else if (!PASSWORD_RE.test(values.password))
      e.password = "Password must be 8+ characters with letters and numbers.";

    if (!values.mobile_number) e.mobile_number = "Mobile number is required.";
    else if (values.mobile_number.length !== 10)
      e.mobile_number = "Mobile number must be 10 digits.";

    if (!values.designation) e.designation = "Designation is required.";

    if (!values.country) e.country = "Country is required.";
    if (!values.state) e.state = "State is required.";
    if (!values.city) e.city = "City is required.";
    if (!values.address.trim()) e.address = "Address is required.";

    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateAll(form);
    setErrors(validationErrors);
    setTouched({
      first_name: true,
      last_name: true,
      email: true,
      password: true,
      mobile_number: true,
      designation: true,
      country: true,
      state: true,
      city: true,
      address: true,
    });

    if (Object.keys(validationErrors).length) {
      toast.error("Fix the errors before submitting");
      return;
    }

    try {
      setIsSubmitting(true);

      // country-state-city needs ISO codes to filter the cascading dropdowns,
      // but the backend wants full names — resolve them right before sending.
      const countryName = countries.find((c) => c.value === form.country)?.label || form.country;
      const stateName = states.find((s) => s.value === form.state)?.label || form.state;

      // role mirrors designation so the backend receives it correctly
      const payload = { ...form, country: countryName, state: stateName, role: form.designation };

      const { data } = await signup(payload, { withCredentials: true });

      if (data.success) {
        toast.success("OTP sent to your email!");
        // React Router's location.state has no App Router equivalent; the email
        // travels as a query param instead.
        router.push(`/verify-otp?email=${encodeURIComponent(form.email)}`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard wide formProps={{ onSubmit: handleSubmit }}>
      <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100">
        Create your OneXhib account
      </h1>

      {/* PERSONAL */}
      <div className="grid md:grid-cols-2 gap-6">
        <InputField label="First Name" name="first_name" value={form.first_name} onChange={handleChange} error={errors.first_name} />
        <InputField label="Last Name" name="last_name" value={form.last_name} onChange={handleChange} error={errors.last_name} />
        <InputField label="Email" type="email" name="email" value={form.email} onChange={handleChange} error={errors.email} />
        <InputField label="Password" type="password" name="password" value={form.password} onChange={handleChange} error={errors.password} />
      </div>

      {/* COMPANY */}
      <div className="grid md:grid-cols-2 gap-6">
        <InputField label="Company Name (Optional)" name="company_name" value={form.company_name} onChange={handleChange} />

        <div>
          <SelectField
            label="Designation"
            options={designationOptions}
            value={form.designation}
            onChange={(val) => {
              const v = val ? val.value : "";
              setForm((p) => ({ ...p, designation: v, role: v }));
              markTouched("designation");
            }}
          />
          {errors.designation && <p className="text-red-500 text-xs mt-1">{errors.designation}</p>}
        </div>

        <InputField label="Website (Optional)" name="website" value={form.website} onChange={handleChange} />
        <InputField label="Mobile Number" name="mobile_number" value={form.mobile_number} onChange={handleChange} error={errors.mobile_number} />
      </div>

      {/* LOCATION */}
      <div className="grid md:grid-cols-3 gap-6">
        <div>
          <SelectField label="Country" options={countries} value={form.country} onChange={(v) => handleSelect(v, "country")} />
          {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country}</p>}
        </div>
        <div>
          <SelectField label="State" options={states} value={form.state} onChange={(v) => handleSelect(v, "state")} />
          {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
        </div>
        <div>
          <SelectField label="City" options={cities} value={form.city} onChange={(v) => handleSelect(v, "city")} />
          {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
        </div>
      </div>

      <div>
        <textarea
          className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg p-3"
          placeholder="Address"
          name="address"
          value={form.address}
          onChange={handleChange}
        />
        {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
      </div>

      <button
        disabled={isSubmitting}
        className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-60"
      >
        {isSubmitting ? "Submitting..." : "Submit"}
      </button>
    </AuthCard>
  );
}

const InputField = ({ label, error, ...props }) => (
  <div>
    <label className="block mb-1 font-semibold text-gray-800 dark:text-gray-200">{label}</label>
    <input
      {...props}
      className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2"
    />
    {error && <p className="text-red-500 text-xs">{error}</p>}
  </div>
);

// react-select renders its own inline-styled DOM, so Tailwind's dark: variant
// can't reach it — its colors have to be set explicitly per theme instead.
const selectStyles = (isDark) => ({
  control: (base, state) => ({
    ...base,
    backgroundColor: isDark ? "#1f2937" : "#fff",
    borderColor: state.isFocused ? "#6366f1" : isDark ? "#374151" : "#d1d5db",
    boxShadow: "none",
  }),
  singleValue: (base) => ({ ...base, color: isDark ? "#f3f4f6" : "#111827" }),
  input: (base) => ({ ...base, color: isDark ? "#f3f4f6" : "#111827" }),
  placeholder: (base) => ({ ...base, color: isDark ? "#6b7280" : "#9ca3af" }),
  menu: (base) => ({ ...base, backgroundColor: isDark ? "#1f2937" : "#fff" }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? (isDark ? "#374151" : "#eef2ff") : "transparent",
    color: isDark ? "#f3f4f6" : "#111827",
  }),
});

// instanceId keeps react-select's generated ids stable between server and
// client, which otherwise causes a hydration mismatch in the App Router.
const SelectField = ({ label, options, value, onChange }) => {
  const { resolvedTheme } = useTheme();
  return (
    <div>
      <label className="block mb-1 font-semibold text-gray-800 dark:text-gray-200">{label}</label>
      <Select
        instanceId={`select-${label}`}
        options={options}
        value={options.find((o) => o.value === value) || null}
        onChange={onChange}
        isClearable
        styles={selectStyles(resolvedTheme === "dark")}
      />
    </div>
  );
};
