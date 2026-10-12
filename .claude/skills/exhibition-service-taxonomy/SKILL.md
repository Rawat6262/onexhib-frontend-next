---
name: exhibition-service-taxonomy
description: The service-provider taxonomy for OneXhib - 34 categories, 218 subcategories, split across the frontend and the Onexhib_backend repo. Use this skill whenever the work touches service categories or subcategories in any way: adding, renaming, merging or removing one; editing service_name or service_subcategory; changing the add/edit service forms, the Excel import, the /exhibition-services hub or its category pages; or running the taxonomy migration or backfill scripts. Also use it when a service category page 404s, a provider "disappears" from the directory, counts look wrong, or a write is rejected with "is not a subcategory of" - the cause is almost always one of the rules here. Read it BEFORE editing the taxonomy, because several of these rules are invisible in the code and expensive to rediscover (frozen URL slugs, the two overlap invariants, and the order in which code and data must be changed).
---

# Exhibition service taxonomy

The taxonomy behind `/exhibition-services`: which categories a provider can list
under, and the specialities beneath each. **34 categories, 218 subcategories** (184
specialities plus `General` in all 34).

It lives in two repositories that deploy separately, which is the source of most of
the care below.

## Where everything is

| Thing | File |
|---|---|
| **The data** (names, membership, legacy map) | `Onexhib_backend/data/taxonomy/SERVICE-TAXONOMY.json` |
| The only backend reader | `Onexhib_backend/Service/serviceTaxonomy.js` |
| Schema (enum + per-category validator) | `Onexhib_backend/Model/Service.model.js` |
| Write paths (create, update, Excel) | `Onexhib_backend/Controller/exhibitionService.controller.js` |
| **URL slugs + display order** | `lib/service-taxonomy.js` (frontend) |
| Grouping and facets | `lib/services.js` |
| Public projection | `lib/public-api.js` → `toPublicService` |
| Hub / category page / filters | `app/(public)/exhibition-services/`, `components/public/ServiceDirectory.jsx` |
| Full written rationale | `Onexhib_backend/data/taxonomy/SERVICE-TAXONOMY.md` |

**Split of authority.** The backend JSON owns category names, subcategory membership
and the legacy translations. The frontend owns URL slugs and display copy. The two
lists are duplicated on purpose; there is no cross-repository test, because they
deploy independently. **Edit both, in the same change.**

## The rules that are invisible in the code

### 1. Never derive a URL slug from a category label

Six slugs are live, indexed URLs and must never move. Their labels have already been
improved once, and the slugs deliberately did not follow:

```
/exhibition-services/fabrication        -> "Stall Design & Fabrication"
/exhibition-services/printing           -> "Printing & Branding"
/exhibition-services/led-tv-rental      -> "Audio Visual Services"
/exhibition-services/protocol-staff     -> "Protocol & Event Staff"
/exhibition-services/corporate-gifting  -> "Corporate Gifting & Merchandise"
/exhibition-services/furniture-rental   -> "Furniture Rental"
```

`led-tv-rental` titled "Audio Visual Services" looks wrong and is correct: that URL
ranks for "LED screen rental for trade shows", the highest-value query in the tier.
`existing: true` in `lib/service-taxonomy.js` marks exactly these six. Renaming a
category is free; moving its slug costs accumulated ranking. Same lesson as
`lib/categories.js`.

A slug that genuinely must retire goes in `RETIRED_CATEGORY_SLUGS` and becomes a
**301** (`statusCode: 301`, never `permanent: true` — that emits 308; see
`lib/duplicate-redirects.mjs`).

### 2. Two overlap invariants, enforced by tests in both repos

- **No subcategory may name something that is also a category.** Otherwise the same
  vendor is filable in two places, which splits the pool and leaves both pages
  incomplete. This is safe to enforce because a provider may hold **several
  listings, one per category** (`getServiceSiblings`) — a freight company that also
  warehouses files two listings.
- **No subcategory name may appear under two categories** — except `General`. Two
  chips reading "Local Transport" on different pages cannot be told apart.

`General` is the single designated exception, named explicitly in the tests so a
*second* shared name still fails.

### 3. `General` is what makes the required field fair

`service_subcategory` is **required**. It is satisfiable because every category
carries `General`, meaning *"no narrower speciality claimed"*.

It exists because 871 of 1,003 live listings had no speciality and one could not be
derived — measured, not assumed: 13% of business names gave a single hint, 86% gave
none, 0 of 186 for Furniture Rental. **Do not derive specialities from business
names.** Writing "LED Wall" onto a shop because its name contains "LED" publishes a
guess about someone's business to the exhibitors deciding whether to hire them.

`General` is also the **server-side default**: a write that omits the field gets it
rather than a 400, which is what keeps the mobile app and every saved provider
spreadsheet working. Required is enforced in the forms and *guaranteed* in the data.

Where it goes, and why it differs per surface:
- **first** in the dashboard dropdowns — the default a provider should see
- **last** in category-page chips and section headings — it is the catch-all and
  usually the biggest group; first would bury the real specialities
- **absent** from the hub's "what this covers" line — it describes nothing

### 4. The legacy translation layer stays until the mobile app is updated

Seven pre-migration category names (`Printing`, `Fabrication`, `Protocol Staff`,
`LED / TV Rental`, `Catalog Printing`, `Corporate Gifting`, `Furniture Rental`) are
**translated, not accepted**: absent from the enum, mapped forward by
`canonicalise()` (backend) and `canonicalServiceCategory()` (frontend).

They are dead weight against the database now, and still load-bearing: old mobile
builds and saved spreadsheets keep sending them. Removing the layer needs a check on
what clients are live, not a grep.

### 5. Deploy the code BEFORE migrating the data

This one was learned the hard way. The translation layer protects *new code against
old data*. **Nothing protects old code against new data.** Migrating first left
production serving the old bundle against renamed categories: the hub showed no
counts for five categories, 817 providers became unreachable, and provider edits
through the old dashboard silently wrote legacy names back (2 rows drifted and needed
a re-run).

Order: **ship both repos → verify live → then migrate.**

## Adding or changing a category

1. `Onexhib_backend/data/taxonomy/SERVICE-TAXONOMY.json` — the entry, with `General`
   first in its subcategory list. Nothing else in the backend needs touching: the
   enum, validator, controller and importer all derive from it.
2. `lib/service-taxonomy.js` — the same entry with its **frozen slug** (new category
   → new slug is fine; existing → never change it).
3. `app/(public)/exhibition-services/page.jsx` — a `CATEGORY_DETAIL` entry: a
   `lucide-react` icon and one sentence describing the category, making no claim
   about inventory. **Verify the icon name exists** in the installed version before
   building — several plausible names do not.
4. Update the counts in the tests (they are asserted exactly, on purpose) and in
   `SERVICE-TAXONOMY.md`.
5. Run the checks below.

**Renaming** a category is a data question, not just a string: decide what happens to
rows holding the old name, and record it in the `legacy` block.

An empty category needs no redirect and no cleanup — it has no page at all
(`getServiceCategory` returns null, the hub renders it as plain text, `sitemap.js`
filters on `count`).

## Migrations: dry run, apply, verify

Both scripts are **dry-run by default** and **idempotent** — re-running is a no-op,
not a second translation.

```bash
# in Onexhib_backend
node scripts/migrateServiceTaxonomy.js            # report; writes nothing
node scripts/migrateServiceTaxonomy.js --apply
node scripts/migrateServiceTaxonomy.js --verify   # exits 1 if any legacy name remains

node scripts/backfillServiceSubcategory.js        # report
node scripts/backfillServiceSubcategory.js --apply
node scripts/backfillServiceSubcategory.js --verify
```

Run the **category migration first**: the backfill refuses rows whose category is not
in the taxonomy rather than guessing (that is how the 2 drifted rows were found).

Before any `--apply` against live data, snapshot the affected rows (id + current
value) to `data/taxonomy/` — the house pattern, see `APPROVED-MAPPING.json` and the
note in `README.md` about nearly losing the artifact behind 1,839 writes.

Never `--apply` without the user's explicit approval of the dry-run output.

## Checks before calling it done

```bash
# backend
npm run test:service-taxonomy     # taxonomy, invariants, migration guards
npm run test:service-excel        # the importer's contract
npm test                          # full suite

# frontend
npm run test:seo                  # includes tests/services-scope.test.mjs
npm run lint
npx next build                    # prerenders the category pages against live data
```

The frontend suite asserts exact category and subcategory counts, the frozen slugs,
both invariants, and the required-field behaviour in both forms. When a count
assertion fails after an intentional change, **update it to the new contract** — do
not weaken the assertion.

To verify against real data rather than fixtures, the build output is the fastest
signal: it prerenders one page per category that has providers, so the list of
prerendered paths is the live grouping.

## Symptoms and their usual cause

| Symptom | Look at |
|---|---|
| A category page 404s | It has no providers — by design. Check `count` in `getServiceDirectory` |
| Providers vanished from the directory | Old frontend against migrated data, or a category name that no longer matches. Check rule 5 |
| "is not a subcategory of" on a write | The pair is invalid; the message names the valid values for that category |
| A chip or heading reads the same on two pages | Invariant 2 was broken |
| Counts on the hub disagree with a page | They shouldn't — both come from one walk. Suspect a stale ISR cache (hub 300s, category pages 3600s) |
| The mobile app's writes fail | The translation layer or the `General` default was removed; see rules 3 and 4 |
