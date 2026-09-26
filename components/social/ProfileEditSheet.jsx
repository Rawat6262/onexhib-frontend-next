"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { updateSocialProfile } from "@/models/social.model";
import {
  BIO_MAX,
  HEADLINE_MAX,
  buildProfileEditPayload,
  validateProfileEdit,
  describeRequestError,
} from "@/lib/social/profile";

/**
 * Edit your own bio and headline.
 *
 * TWO FIELDS, BECAUSE THAT IS ALL THE ENDPOINT ACCEPTS. PUT /api/social/profile
 * has EDITABLE_FIELDS = ['bio', 'headline']. Name, company, designation, city,
 * country and website belong to the Signup account and are not editable here;
 * avatarUrl and coverUrl have no endpoint that sets them at all. Offering any of
 * them would be a form that silently discards what the user typed.
 *
 * The body is built by buildProfileEditPayload, a whitelist rather than a spread
 * of form state — otherwise followerCount, postCount and `user` would be posted
 * too. The server ignores unknown keys, but sending them invites the next person
 * to assume one of them is editable.
 *
 * NOT OPTIMISTIC, AND NOT CLOSED EARLY. The response returns the full
 * authoritative profile in the same shape as GET, so the parent adopts that rather
 * than guessing. On failure the sheet stays open with the text intact — a profile
 * edit is not something to make a person retype.
 *
 * Uses the Sheet primitive that already exists (Radix dialog underneath, so focus
 * trap and Escape come free) and works at phone width without a separate layout.
 */
export default function ProfileEditSheet({ open, onOpenChange, profile, onSaved }) {
  const [form, setForm] = useState({
    headline: profile.headline || "",
    bio: profile.bio || "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const setField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return; // a second submit while the first is in flight

    const { valid, errors: found } = validateProfileEdit(form);
    if (!valid) {
      setErrors(found);
      return;
    }

    setSaving(true);
    try {
      const { data } = await updateSocialProfile(buildProfileEditPayload(form));
      // Authoritative: the same shape GET returns, so no second fetch is needed.
      if (data && data.profile) onSaved(data.profile);
      toast.success("Profile updated.");
      onOpenChange(false);
    } catch (error) {
      const status = error?.response?.status;
      const message = describeRequestError(error, "Could not save your profile.");
      // A 400 is about a field, so show it next to the form rather than only as a
      // toast that disappears while the user is still looking at the input.
      if (status === 400) setErrors({ form: message });
      else toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const headlineOver = form.headline.length > HEADLINE_MAX;
  const bioOver = form.bio.length > BIO_MAX;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <SheetHeader>
            <SheetTitle>Edit profile</SheetTitle>
            <SheetDescription>
              Your headline and bio appear on your Community profile. Your name and
              company come from your account.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-4">
            <div>
              <label
                htmlFor="social-headline"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Headline
              </label>
              <input
                id="social-headline"
                type="text"
                value={form.headline}
                onChange={setField("headline")}
                maxLength={HEADLINE_MAX * 2}
                aria-invalid={headlineOver || Boolean(errors.headline) ? true : undefined}
                aria-describedby="social-headline-hint"
                className="mt-1.5 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:bg-gray-950"
              />
              {/* The counter IS the hint, so the limit and the error are associated
                  with the field through one id. */}
              <p
                id="social-headline-hint"
                className={`mt-1 text-xs ${headlineOver ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-500"}`}
              >
                {errors.headline || `${form.headline.length} / ${HEADLINE_MAX}`}
              </p>
            </div>

            <div>
              <label
                htmlFor="social-bio"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Bio
              </label>
              <textarea
                id="social-bio"
                rows={6}
                value={form.bio}
                onChange={setField("bio")}
                maxLength={BIO_MAX * 2}
                aria-invalid={bioOver || Boolean(errors.bio) ? true : undefined}
                aria-describedby="social-bio-hint"
                className="mt-1.5 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:bg-gray-950"
              />
              <p
                id="social-bio-hint"
                className={`mt-1 text-xs ${bioOver ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-500"}`}
              >
                {errors.bio || `${form.bio.length} / ${BIO_MAX}`}
              </p>
            </div>

            {errors.form ? (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {errors.form}
              </p>
            ) : null}
          </div>

          <SheetFooter>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl bg-[#131C55] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0E1B6B] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:bg-blue-500 dark:text-gray-950 dark:hover:bg-blue-400"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:border-gray-700 dark:text-gray-200"
            >
              Cancel
            </button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
