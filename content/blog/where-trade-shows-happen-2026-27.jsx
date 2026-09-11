import { A, B, H2, P, Quote, Table, UL } from "@/components/blog/prose";

export const meta = {
  slug: "where-trade-shows-happen-2026-27",
  title: "Where the world's trade shows actually happen",
  // No absolute count here on purpose. This string is the card blurb on /blog
  // AND the page's meta description, and /blog renders the LIVE upcoming total
  // in its hero - so a fixed number here contradicts the figure directly above
  // it the moment the catalogue moves (it read 2,134 at publication and 2,017
  // once 58 duplicate records were removed). The body keeps its 2,134 count
  // under a dated snapshot line, which is where a historical figure belongs.
  description:
    "Which countries, cities and venues host the most exhibitions in the 2026–27 season, counted from the upcoming events listed on OneXhib.",
  published: "2026-09-09",
  readingMinutes: 4,
  category: "Market Data",
  cover: "geography",
  tags: ["Industry data", "Planning"],
  featured: true,
};

export default function Post() {
  return (
    <>
      <P>
        If you are deciding where to exhibit next year, it helps to know where the events
        actually are. This is a straightforward count of the{" "}
        <B>2,134 upcoming and ongoing exhibitions</B> listed on OneXhib — no estimates, no
        projections, just what is on the calendar right now.
      </P>

      <Quote>
        All figures are a snapshot of OneXhib listings on 9 September 2026 and will shift
        as organisers publish new dates.
      </Quote>

      <H2>Germany still leads, but Poland is the surprise</H2>

      <Table
        caption="Upcoming exhibitions by country"
        head={["Country", "Upcoming exhibitions"]}
        rows={[
          ["Germany", "324"],
          ["Poland", "254"],
          ["China", "226"],
          ["India", "148"],
          ["France", "126"],
          ["Italy", "75"],
          ["Brazil", "75"],
          ["Indonesia", "70"],
          ["Malaysia", "62"],
          ["Canada", "58"],
        ]}
      />

      <P>
        Germany leading is no shock — Messe Frankfurt, Messe München and Koelnmesse have
        anchored the European calendar for decades. Poland at number two is the genuinely
        interesting entry, and the reason becomes obvious when you look at venues rather
        than countries.
      </P>

      <P>
        You can browse any of these directly:{" "}
        <A href="/exhibitions-in/germany">exhibitions in Germany</A>,{" "}
        <A href="/exhibitions-in/poland">Poland</A>,{" "}
        <A href="/exhibitions-in/china">China</A> and{" "}
        <A href="/exhibitions-in/india">India</A>.
      </P>

      <H2>One venue explains Poland&apos;s position</H2>

      <Table
        caption="Upcoming exhibitions by venue"
        head={["Venue", "Upcoming exhibitions"]}
        rows={[
          ["Ptak Warsaw Expo", "171"],
          ["Shanghai New International Expo Center", "57"],
          ["National Exhibition and Convention Center (NECC), Shanghai", "20"],
          ["Bangkok International Trade & Exhibition Centre (BITEC)", "18"],
          ["Messe München", "16"],
          ["São Paulo Expo", "15"],
          ["IFEMA Madrid", "14"],
          ["Bombay Exhibition Centre (NESCO)", "14"],
        ]}
      />

      <P>
        Ptak Warsaw Expo alone accounts for roughly two thirds of Poland&apos;s listings.
        It is the largest exhibition centre in Central and Eastern Europe, and it runs an
        unusually dense programme of sector fairs rather than a handful of giant annual
        events. If you are targeting the CEE market, one venue relationship covers a lot of
        ground.
      </P>

      <H2>Cities: Shanghai first, then a long tail</H2>

      <Table
        caption="Upcoming exhibitions by city"
        head={["City", "Upcoming exhibitions"]}
        rows={[
          ["Shanghai", "138"],
          ["Nadarzyn (Warsaw area)", "166"],
          ["Paris", "59"],
          ["São Paulo", "53"],
          ["New Delhi", "42"],
          ["Kuala Lumpur", "42"],
          ["Bangkok", "34"],
          ["Jakarta", "34"],
          ["Amsterdam", "33"],
        ]}
      />

      <P>
        Nadarzyn is where Ptak Warsaw Expo sits, just outside Warsaw — which is why it
        outranks cities many times its size. Treat it as &quot;Warsaw metropolitan
        area&quot; rather than a city in its own right.
      </P>

      <P>
        What stands out is how quickly the numbers fall away. After the top handful, no
        single city dominates. Southeast Asia in particular is spread across Kuala Lumpur,
        Bangkok and Jakarta rather than concentrated in one hub.
      </P>

      <H2>Which sectors have the most events</H2>

      <Table
        caption="Upcoming exhibitions by sector"
        head={["Sector", "Upcoming exhibitions"]}
        rows={[
          ["Technology", "125"],
          ["Manufacturing", "71"],
          ["Health & Healthcare", "76"],
          ["Agriculture", "53"],
          ["Textile", "38"],
          ["Education", "35"],
          ["Energy", "28"],
          ["Construction", "28"],
        ]}
      />

      <P>
        Technology is the broadest category, which partly reflects how organisers label
        their own events — a specialist electronics fair and a general innovation expo both
        end up tagged &quot;Technology&quot;. Read it as a floor, not a precise count.
      </P>

      <P>
        The larger sectors each have their own page of listings —{" "}
        <A href="/exhibitions-for/technology">technology exhibitions</A>,{" "}
        <A href="/exhibitions-for/manufacturing">manufacturing</A> and{" "}
        <A href="/exhibitions-for/health">health</A> are the three biggest — or see{" "}
        <A href="/exhibitions-for">all industry pages</A>.
      </P>

      <H2>What to do with this</H2>

      <P>A few practical readings:</P>

      <UL>
        <li>
          <B>If you want volume and proximity in Europe</B>, Germany and Poland between
          them hold 578 upcoming events — more than a quarter of everything listed.
        </li>
        <li>
          <B>If you are entering Asia</B>, China&apos;s 226 events are concentrated in
          Shanghai, while Southeast Asia&apos;s are spread across three countries. Those
          need different travel plans.
        </li>
        <li>
          <B>If your sector is niche</B>, the long tail matters more than the leaderboard.
          The <A href="/exhibitions-in">country and city pages</A> are a faster way to find
          the two or three events that actually fit than scanning a global list.
        </li>
      </UL>

      <P>
        Every number here comes from listings you can open and check yourself. If you spot
        an event that is missing or wrong, <A href="/contact">tell us</A> — the data is
        only as good as what organisers publish.
      </P>
    </>
  );
}
