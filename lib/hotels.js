/**
 * Labels and formatting for hotels (Onexhib_backend/Model/Hotel.model.js).
 * Shared by the hotel dashboard, the admin review page and the public pages,
 * so the three never word an amenity or a rate differently.
 */
import {
  Accessibility,
  BedDouble,
  Briefcase,
  Bus,
  Car,
  Coffee,
  Dumbbell,
  PlugZap,
  Presentation,
  Shirt,
  Sparkles,
  Utensils,
  Waves,
  Wifi,
  Wine,
  PlaneLanding,
} from "lucide-react";

/** Same keys, same order as AMENITIES on the backend model. */
export const AMENITIES = [
  { key: "wifi", label: "Free Wi-Fi", icon: Wifi },
  { key: "breakfast", label: "Breakfast", icon: Coffee },
  { key: "parking", label: "Parking", icon: Car },
  { key: "airport_shuttle", label: "Airport shuttle", icon: PlaneLanding },
  { key: "venue_shuttle", label: "Shuttle to the venue", icon: Bus },
  { key: "restaurant", label: "Restaurant", icon: Utensils },
  { key: "bar", label: "Bar", icon: Wine },
  { key: "gym", label: "Gym", icon: Dumbbell },
  { key: "pool", label: "Pool", icon: Waves },
  { key: "spa", label: "Spa", icon: Sparkles },
  { key: "meeting_rooms", label: "Meeting rooms", icon: Presentation },
  { key: "business_centre", label: "Business centre", icon: Briefcase },
  { key: "room_service", label: "Room service", icon: BedDouble },
  { key: "laundry", label: "Laundry", icon: Shirt },
  { key: "ev_charging", label: "EV charging", icon: PlugZap },
  { key: "wheelchair_access", label: "Wheelchair access", icon: Accessibility },
];

const AMENITY_BY_KEY = Object.fromEntries(AMENITIES.map((a) => [a.key, a]));
export const amenityOf = (key) => AMENITY_BY_KEY[key] || null;

export const MAX_PHOTOS = 6;

export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "CNY", "JPY"];

/** "from ₹4,500 / night", or "" when the hotel gave no rate. */
export function formatRate(priceFrom, currency = "INR") {
  const n = Number(priceFrom);
  if (priceFrom === null || priceFrom === undefined || priceFrom === "" || !Number.isFinite(n)) return "";
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR", maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${currency || "INR"} ${Math.round(n).toLocaleString("en-IN")}`;
  }
}

/** "1.4 km" / "650 m" from a distance in km. */
export function formatKm(km) {
  const n = Number(km);
  if (!Number.isFinite(n)) return "";
  return n < 1 ? `${Math.max(50, Math.round((n * 1000) / 50) * 50)} m` : `${n.toFixed(1)} km`;
}

/** Review status, worded for the hotel's owner and for admins. */
export const STATUS = {
  pending: { label: "Waiting for review", tone: "amber" },
  approved: { label: "Live", tone: "emerald" },
  rejected: { label: "Needs changes", tone: "rose" },
};
