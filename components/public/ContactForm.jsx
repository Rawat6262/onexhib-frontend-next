"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { sendContactMessage } from "@/models/contact.model";

/**
 * "Send us a message" on /contact. Delivers to the team inbox through
 * POST /api/contact (see Onexhib_backend/Controller/contact.controller.js).
 *
 * - Topics mirror the backend's TOPICS keys; an unknown key falls back to
 *   "general" server-side, so the two lists cannot break each other.
 * - Limits mirror the backend's LIMITS so the visitor hears about a problem
 *   before sending, not after. The server still validates everything.
 * - A signed-in visitor gets their name and email filled in, but can edit them.
 * - `website` is a honeypot: visually hidden, skipped by keyboard and screen
 *   readers, and left empty by people. Bots that fill every field are dropped.
 */

const TOPICS = [
  { value: "general", label: "General question" },
  { value: "listing", label: "Listing an exhibition" },
  { value: "correction", label: "Correction to a listing" },
  { value: "account", label: "My account" },
  { value: "partnership", label: "Partnership or advertising" },
  { value: "other", label: "Something else" },
];

const MAX = { name: 100, email: 200, message: 2000 };
const MIN_MESSAGE = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY = { name: "", email: "", topic: "general", message: "", website: "" };

function validate(f) {
  const e = {};
  if (!f.name.trim()) e.name = "Please enter your name.";
  if (!EMAIL_RE.test(f.email.trim())) e.email = "Please enter a valid email address.";
  if (f.message.trim().length < MIN_MESSAGE) e.message = `Please write at least ${MIN_MESSAGE} characters.`;
  return e;
}

export default function ContactForm({ contactEmail }) {
  const { user, status } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Prefill once the session is known, without overwriting anything typed.
  useEffect(() => {
    if (status !== "authed" || !user) return;
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.company_name || "";
    setForm((f) => ({ ...f, name: f.name || name, email: f.email || user.email || "" }));
  }, [status, user]);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (sending) return;
    const found = validate(form);
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length) return;

    setSending(true);
    try {
      await sendContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        topic: form.topic,
        message: form.message.trim(),
        website: form.website,
      });
      setSent(true);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.errors) setErrors(data.errors);
      setFormError(
        data?.message || `Your message could not be sent. Please try again, or email us at ${contactEmail}.`
      );
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white px-6 py-12 text-center dark:border-emerald-500/20 dark:from-emerald-500/10 dark:to-gray-950" role="status">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
          <CheckCircle2 size={28} aria-hidden="true" />
        </span>
        <h3 className="mt-5 text-xl font-bold text-gray-900 dark:text-white">Message sent</h3>
        <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          Thanks, {form.name.trim().split(" ")[0] || "there"}. We&rsquo;ve received your message and will reply to{" "}
          <strong className="text-gray-900 dark:text-gray-100">{form.email.trim()}</strong>.
        </p>
        <button
          type="button"
          onClick={() => {
            setForm((f) => ({ ...EMPTY, name: f.name, email: f.email }));
            setSent(false);
          }}
          className="mt-6 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:border-[#2B3FB8] hover:text-[#2B3FB8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        >
          Send another message
        </button>
      </div>
    );
  }

  const left = MAX.message - form.message.length;

  return (
    <form
      onSubmit={submit}
      noValidate
      className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-xl shadow-indigo-900/[0.06] sm:p-8 dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/30"
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#2B3FB8] via-[#5B5BF0] to-[#8B5CF6]" />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="contact-name" label="Your name" error={errors.name}>
          <input
            id="contact-name"
            type="text"
            autoComplete="name"
            maxLength={MAX.name}
            value={form.name}
            onChange={set("name")}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
            className={input(errors.name)}
          />
        </Field>
        <Field id="contact-email" label="Email address" error={errors.email}>
          <input
            id="contact-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            maxLength={MAX.email}
            value={form.email}
            onChange={set("email")}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
            className={input(errors.email)}
          />
        </Field>
      </div>

      <div className="mt-5">
        <Field id="contact-topic" label="What is it about?">
          <select id="contact-topic" value={form.topic} onChange={set("topic")} className={`${input()} cursor-pointer`}>
            {TOPICS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-5">
        <Field id="contact-message" label="Message" error={errors.message}>
          <textarea
            id="contact-message"
            rows={6}
            maxLength={MAX.message}
            value={form.message}
            onChange={set("message")}
            placeholder="Ask a question, request a change to a listing, or tell us what you need…"
            aria-invalid={Boolean(errors.message)}
            aria-describedby={`contact-message-count${errors.message ? " contact-message-error" : ""}`}
            className={`${input(errors.message)} h-auto resize-y py-3 leading-relaxed`}
          />
        </Field>
        <p
          id="contact-message-count"
          className={`mt-1.5 text-right text-xs tabular-nums ${left < 100 ? "text-amber-600 dark:text-amber-400" : "text-gray-400 dark:text-gray-500"}`}
        >
          {form.message.length} / {MAX.message}
        </p>
      </div>

      {/* Honeypot - see the note at the top of the file. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={set("website")}
        />
      </div>

      {formError ? (
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {formError}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          Goes straight to <span className="font-semibold text-gray-700 dark:text-gray-300">{contactEmail}</span>. We
          reply by email.
        </p>
        <button
          type="submit"
          disabled={sending}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#131C55] to-[#2B3FB8] px-6 py-3 text-[15px] font-semibold text-white shadow-lg shadow-indigo-900/25 transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] disabled:opacity-60 motion-reduce:transition-none dark:from-blue-600 dark:to-indigo-500"
        >
          {sending ? <Loader2 size={17} aria-hidden="true" className="animate-spin" /> : <Send size={17} aria-hidden="true" />}
          {sending ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}

function Field({ id, label, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const input = (error) =>
  `w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:outline-none focus:ring-4 motion-reduce:transition-none dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-500 ${
    error
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/15 dark:border-red-500/60"
      : "border-gray-300 focus:border-[#2B3FB8] focus:ring-[#2B3FB8]/15 dark:border-gray-700 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
  }`;
