import AppHeader, { PUBLIC_NAV } from "@/components/layout/AppHeader";
import HeaderAuthControls, {
  HeaderAuthMobileLinks,
} from "@/components/layout/HeaderAuthControls";

/**
 * Public site header.
 *
 * All the chrome (logo, nav, theme toggle, mobile disclosure) lives in
 * AppHeader so the dashboard renders exactly the same bar rather than a
 * lookalike that drifts. This file supplies the right-hand controls, which are
 * now auth-aware: a signed-in visitor browsing the public catalogue keeps their
 * account menu and a link back to their dashboard, instead of being shown a
 * "Login" button that made it look like the session had ended.
 *
 * Still a Server Component, and the page stays statically prerendered - only
 * the controls themselves are a client island. See HeaderAuthControls.
 */
export default function PublicHeader() {
  return (
    <AppHeader
      nav={PUBLIC_NAV}
      right={<HeaderAuthControls />}
      mobileExtra={<HeaderAuthMobileLinks />}
    />
  );
}
