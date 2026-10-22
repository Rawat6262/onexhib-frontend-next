import { City, Country, State } from "country-state-city";

/**
 * Turn place NAMES (from an exhibition centre, i.e. from Google) into the
 * values the exhibition form's country / state / city dropdowns use:
 * country and state ISO codes and the city name, from the country-state-city
 * package.
 *
 * Google and that package do not always spell things the same way ("Türkiye"
 * vs "Turkey", "Czechia" vs "Czech Republic", "National Capital Territory of
 * Delhi" vs "Delhi"), so names are compared loosely and a few known aliases
 * are mapped. A city the package does not list (Google often answers with the
 * local town - "Sahnewal" for the Ludhiana exhibition centre) is returned with
 * `cityKnown: false`; the form then offers it as an extra option rather than
 * silently dropping it.
 */
const COUNTRY_ALIASES = {
  turkiye: "TR",
  czechia: "CZ",
  "south korea": "KR",
  "korea, republic of": "KR",
  "republic of korea": "KR",
  "united states of america": "US",
  usa: "US",
  "viet nam": "VN",
  "russian federation": "RU",
  uae: "AE",
  "hong kong sar china": "HK",
  "macao sar china": "MO",
};

export const normName = (s) =>
  String(s || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Words that decorate a state's name differently between sources.
const STATE_NOISE = /\b(state|province|region|prefecture|territory|union territory|national capital territory of|nct of|the|of)\b/g;
const stateKey = (s) => normName(s).replace(STATE_NOISE, " ").replace(/\s+/g, " ").trim();

export function matchCountry(name) {
  const n = normName(name);
  if (!n) return "";
  if (COUNTRY_ALIASES[n]) return COUNTRY_ALIASES[n];
  const all = Country.getAllCountries();
  const hit = all.find((c) => normName(c.name) === n) || all.find((c) => c.isoCode.toLowerCase() === n);
  return hit ? hit.isoCode : "";
}

export function matchState(countryIso, name) {
  if (!countryIso || !name) return "";
  const states = State.getStatesOfCountry(countryIso);
  const n = normName(name);
  const k = stateKey(name);
  const hit =
    states.find((s) => normName(s.name) === n) ||
    states.find((s) => stateKey(s.name) === k) ||
    states.find((s) => s.isoCode.toLowerCase() === n) ||
    (k.length > 3 ? states.find((s) => stateKey(s.name).includes(k) || k.includes(stateKey(s.name))) : null);
  return hit ? hit.isoCode : "";
}

export function matchCity(countryIso, stateIso, name) {
  if (!name) return { city: "", known: false };
  if (!countryIso || !stateIso) return { city: name, known: false };
  const n = normName(name);
  const hit = City.getCitiesOfState(countryIso, stateIso).find((c) => normName(c.name) === n);
  return hit ? { city: hit.name, known: true } : { city: name, known: false };
}

/** { country, state, city } names -> { countryIso, stateIso, city, cityKnown } */
export function matchLocation({ country, state, city } = {}) {
  const countryIso = matchCountry(country);
  const stateIso = matchState(countryIso, state);
  const { city: cityName, known } = matchCity(countryIso, stateIso, city);
  return { countryIso, stateIso, city: cityName, cityKnown: known };
}
