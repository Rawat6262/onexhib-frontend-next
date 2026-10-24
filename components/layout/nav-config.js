import {
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  CalendarRange,
  Globe2,
  History,
  Landmark,
  Layers,
  Newspaper,
  Package,
  PenSquare,
  Plus,
  KeyRound,
  Radio,
  CalendarClock,
  Shapes,
  Sparkles,
  Store,
  UserCircle,
  Users,
  Wrench,
} from "lucide-react";

import { PUBLIC_ROUTES } from "@/lib/seo";
import { exhibitionsScopePath } from "@/lib/routes";

/**
 * The header's menus, in one place, read by the desktop dropdowns (MegaNav)
 * and the mobile menu (AppHeader) so the two can never list different pages.
 *
 * `stat` names a field of /api/nav-summary shown as a count badge once the
 * menu has loaded; a missing number simply shows no badge. `live` marks the
 * badge green. Every href is a page that exists today.
 */
export const EXHIBITIONS_MENU = {
  key: "exhibitions",
  label: "Exhibitions",
  href: PUBLIC_ROUTES.exhibitions,
  // Pages that light the Exhibitions trigger as "you are here".
  match: [PUBLIC_ROUTES.exhibitions, PUBLIC_ROUTES.locations, PUBLIC_ROUTES.categories, PUBLIC_ROUTES.centres, "/exhibition/"],
  columns: [
    {
      title: "Browse by date",
      links: [
        { href: exhibitionsScopePath("upcoming"), label: "Upcoming", hint: "Coming up next", icon: CalendarDays, stat: "upcoming" },
        { href: exhibitionsScopePath("ongoing"), label: "Live now", hint: "Happening today", icon: Radio, stat: "live", live: true },
        { href: `${PUBLIC_ROUTES.exhibitions}/this-week`, label: "This week", hint: "Opening in the next 7 days", icon: CalendarRange, stat: "thisWeek" },
        { href: exhibitionsScopePath("previous"), label: "Past exhibitions", hint: "The archive", icon: History, stat: "past" },
        { href: `${PUBLIC_ROUTES.exhibitions}/monthly`, label: "Calendar", hint: "Month by month", icon: CalendarClock },
      ],
    },
    {
      title: "Explore",
      links: [
        { href: PUBLIC_ROUTES.locations, label: "By country", hint: "Shows by place", icon: Globe2, stat: "countries", statSuffix: " countries" },
        { href: PUBLIC_ROUTES.categories, label: "By industry", hint: "Furniture, auto, food and more", icon: Shapes },
        { href: PUBLIC_ROUTES.centres, label: "Exhibition centres", hint: "Venues with maps", icon: Landmark, tag: "New" },
        { href: PUBLIC_ROUTES.services, label: "Exhibition services", hint: "Stands, printing, logistics", icon: Wrench },
      ],
    },
  ],
};

export const DIRECTORY_MENU = {
  key: "directory",
  label: "Directory",
  href: PUBLIC_ROUTES.companies,
  match: [PUBLIC_ROUTES.companies, PUBLIC_ROUTES.products, PUBLIC_ROUTES.services, "/company/", "/product/", "/exhibition-service/"],
  cards: [
    {
      title: "Companies",
      href: PUBLIC_ROUTES.companies,
      icon: Building2,
      stat: "companies",
      statSuffix: " exhibitors",
      links: [
        { href: PUBLIC_ROUTES.companies, label: "All companies", hint: "Exhibitors at shows worldwide", icon: Store },
        { href: PUBLIC_ROUTES.exhibitions, label: "Exhibitors by show", hint: "Open a show to see who exhibits", icon: CalendarDays },
        { href: "/signup", label: "Add your company", hint: "Free company profile", icon: Plus },
      ],
    },
    {
      title: "Products",
      href: PUBLIC_ROUTES.products,
      icon: Package,
      stat: "products",
      statSuffix: " products",
      links: [
        { href: PUBLIC_ROUTES.products, label: "All products", hint: "Launched and shown at exhibitions", icon: Layers },
        { href: "/ai-search", label: "Find a product", hint: "Describe it, AI search finds it", icon: Sparkles },
        { href: "/signup", label: "Show your products", hint: "List them on your company page", icon: Plus },
      ],
    },
    {
      title: "Exhibition services",
      href: PUBLIC_ROUTES.services,
      icon: Wrench,
      stat: "serviceCategories",
      statSuffix: " categories",
      // The category links come from /api/nav-summary (`services`); this one
      // is always there.
      links: [{ href: PUBLIC_ROUTES.services, label: "All services", hint: "Every category and provider", icon: Briefcase }],
      dynamicLinks: "services",
    },
  ],
};

/** Signed-in only: every social endpoint needs a session. */
export const COMMUNITY_MENU = {
  key: "community",
  label: "Community",
  href: "/social",
  match: ["/social"],
  columns: [
    {
      title: "Community",
      links: [
        { href: "/social", label: "Feed", hint: "Posts from the industry", icon: Newspaper },
        { href: "/social/people", label: "People", hint: "Organisers and exhibitors", icon: Users },
      ],
    },
    {
      title: "You",
      links: [
        { href: "/social/my-posts", label: "My posts", hint: "What you shared", icon: PenSquare },
        { href: "/social/notifications", label: "Notifications", hint: "Replies and follows", icon: Bell },
        { href: "/social/profile/me", label: "My profile", hint: "How others see you", icon: UserCircle, profile: true },
      ],
    },
  ],
};

export const NEWS_LINK = { href: "/news", label: "News" };
export const AI_LINK = { href: "/ai-search", label: "AI Search" };

export const ORGANISER_LINKS = [
  { href: "/organiser", label: "List your exhibition", hint: "Free, takes a few minutes", icon: Plus },
  { href: "/organiser/request-access", label: "Request access", hint: "Edit a show already listed", icon: KeyRound },
];
