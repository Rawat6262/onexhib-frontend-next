import { ROLES } from "@/lib/auth";

/**
 * The four account types a person can choose for themselves, described in the
 * words a visitor would use rather than the backend enum.
 *
 * ADMIN is absent on purpose: it is never self-selectable (the backend refuses
 * it), so listing it would be an option that can only fail.
 *
 * `workspace` says whether the type has a dashboard of its own. Visitor and
 * Exhibitor do not, which is exactly why they land on /welcome rather than in
 * the organiser/services area.
 */
export const ACCOUNT_TYPES = [
  {
    value: ROLES.VISITOR,
    label: "Visitor",
    summary: "Discover exhibitions and plan which ones to attend.",
    perks: ["Browse and search every exhibition", "Explore companies and products", "Join the Community"],
    workspace: false,
  },
  {
    value: ROLES.EXHIBITOR,
    label: "Exhibitor",
    summary: "You take a stand at exhibitions to show your company.",
    perks: ["Your company profile and products", "List the shows you exhibit at, with your stand", "Messages from visitors to your inbox"],
    workspace: true,
  },
  {
    value: ROLES.ORGANISER,
    label: "Organiser",
    summary: "You run exhibitions or trade shows.",
    perks: ["List and manage your exhibitions", "An organiser dashboard", "Everything a visitor gets"],
    workspace: true,
  },
  {
    value: ROLES.EXHIBITION_SERVICE,
    label: "Service provider",
    summary: "You offer services to exhibitions — stands, logistics, AV and more.",
    perks: ["List your services in the directory", "A services dashboard", "Everything a visitor gets"],
    workspace: true,
  },
  {
    value: ROLES.HOTEL,
    label: "Hotel",
    summary: "You run a hotel near exhibition venues and want visitors to stay with you.",
    perks: ["List your hotels with photos and rates", "Shown beside nearby venues and their exhibitions", "Booking enquiries to your inbox"],
    workspace: true,
  },
];

export function accountTypeFor(role) {
  return ACCOUNT_TYPES.find((t) => t.value === role) || null;
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/**
 * How to say a role-change blocker (from GET /api/account/role/blockers or a
 * 409 from PUT /api/account/role) to the person, and where they can resolve it.
 * Unknown kinds still get a sentence, so a new backend blocker never shows blank.
 */
export function describeRoleBlocker({ kind, count }) {
  switch (kind) {
    case "exhibitions":
      return { text: `You've listed ${plural(count, "exhibition", "exhibitions")}.`, fix: "Delete them or ask us to transfer them to another organiser.", href: "/organiser", linkLabel: "Manage exhibitions" };
    case "exhibitionEditAccess":
      return { text: `You can edit ${plural(count, "exhibition", "exhibitions")} listed by someone else.`, fix: "Contact us to hand that access back.", href: "/contact", linkLabel: "Contact us" };
    case "pendingAccessRequests":
      return { text: `You have ${plural(count, "access request", "access requests")} waiting for review.`, fix: "Cancel them or wait for a decision.", href: "/organiser/request-access", linkLabel: "View requests" };
    case "company":
      return { text: "You have a company profile.", fix: "Contact us to remove it or transfer it to a colleague.", href: "/contact", linkLabel: "Contact us" };
    case "services":
      return { text: `You've listed ${plural(count, "service", "services")}.`, fix: "Delete them from your services dashboard first.", href: "/services", linkLabel: "Manage services" };
    case "hotels":
      return { text: `You've listed ${plural(count, "hotel", "hotels")}.`, fix: "Delete them from your hotel dashboard first.", href: "/hotel", linkLabel: "Manage hotels" };
    default:
      return { text: `You still have ${plural(count, "listing", "listings")} tied to your account type.`, fix: "Remove them first.", href: null, linkLabel: null };
  }
}
