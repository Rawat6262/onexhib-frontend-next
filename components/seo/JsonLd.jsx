/**
 * Renders a JSON-LD @graph into the page.
 *
 * Generic on purpose: every public page builds its own graph from the node
 * builders in lib/jsonld.js and hands it here, so there is exactly one place
 * that writes a <script type="application/ld+json"> tag.
 */
export default function JsonLd({ graph }) {
  if (!graph?.["@graph"]?.length) return null;

  return (
    <script
      type="application/ld+json"
      // Serialised from objects this codebase builds, never from user input.
      // The </script> escape guards against a record whose name or description
      // contains markup breaking out of the script element.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(graph).replace(/</g, "\u003c"),
      }}
    />
  );
}
