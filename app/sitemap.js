import { SITE_URL } from "@/lib/seo";

// Serves /sitemap.xml. Deliberately lists only the pages that carry real,
// public content today. Exhibition/company/product listings join this file when
// public pages for them exist — an empty promise in a sitemap is worse than an
// omission.
export default function sitemap() {
  const lastModified = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/privacy-policy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/delete-account`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
