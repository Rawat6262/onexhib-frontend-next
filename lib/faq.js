/**
 * Homepage FAQ content.
 *
 * Single source of truth on purpose: components/public/Faq.jsx renders these
 * as visible text and components/seo/JsonLd.jsx emits the same array as
 * FAQPage structured data. Google requires the marked-up answer to match what
 * the user actually sees, and keeping one array makes drift impossible.
 *
 * Every answer below is checked against real application behaviour:
 *   - the catalogue really is worldwide (2,178 upcoming across ~40 countries)
 *   - search really does cover name, category, venue, city, state and country
 *     (getUpcomingExhibitionsSerach in exhibition.controller.js)
 *   - the listing hierarchy really is exhibition -> company -> product
 *     (company.createdBy references an exhibition, product.createdBy a company)
 *   - signup really is email + OTP verification
 *
 * Nothing here claims pricing, user numbers, ratings or partnerships, because
 * none of those exist in the product.
 */
export const FAQ = [
  {
    q: "What is OneXhib?",
    a: "OneXhib is an exhibition discovery platform. It brings together exhibitions and trade shows from around the world, the companies exhibiting at them, and the products those companies bring — so visitors, exhibitors and organisers can find each other in one place.",
  },
  {
    q: "What can I find on OneXhib?",
    a: "You can browse upcoming, ongoing and past exhibitions with their dates, venue, city and country. For exhibitions that have exhibitor listings, you can also see the companies taking part and the products they showcase, along with providers of exhibition services such as printing, fabrication and furniture rental.",
  },
  {
    q: "How do I find exhibitions?",
    a: "Open the exhibitions page to browse everything that is upcoming, or switch to ongoing and past events. You can narrow the list by city or country, and search by exhibition name, category, venue or location. No account is needed to browse.",
  },
  {
    q: "Are OneXhib exhibitions only in India?",
    a: "No. The catalogue is worldwide and currently covers exhibitions across roughly forty countries, with Indonesia, Germany and China among the largest. India is well represented too, and you can filter the exhibitions page to any single country or city.",
  },
  {
    q: "How can businesses list themselves on OneXhib?",
    a: "Create an account and sign in. Organisers add their exhibitions with dates, venue, category and description. Exhibiting companies are listed under an exhibition, and each company can add the products it is showcasing, so a listing builds up from the exhibition down to the individual product.",
  },
  {
    q: "What kinds of exhibition services are listed?",
    a: "Service providers can list under seven categories: printing, furniture rental, LED and TV rental, fabrication, protocol staff, catalog printing and corporate gifting. These are the services exhibitors typically need when preparing a stand.",
  },
  {
    q: "How do I create a OneXhib account?",
    a: "Choose Sign up, enter your details, and confirm the one-time password sent to your email address. Once verified you can sign in and start listing exhibitions, companies, products or services depending on your role.",
  },
];
