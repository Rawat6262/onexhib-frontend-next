"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { logout } from "@/models/auth.model";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { useAuth } from "@/components/auth/AuthProvider";
import ProfilePopup from "@/components/popups/MenuPopup";

/**
 * The collapsible navy sidebar, shared by the organiser and admin areas.
 *
 * In the Vite app this markup was duplicated in SidebarMenu.jsx and
 * AdminMenuView.jsx (identical except for the menu items) and had to be rendered
 * by every page individually. Here it is rendered once by a route layout, so the
 * two copies collapse into this one component that takes `items` as a prop.
 *
 * The spacer div is a SIBLING of the fixed sidebar, never its wrapper — making it
 * a wrapper hides the whole menu on mobile, a bug this project has hit twice.
 *
 * @param {{label: string, href?: string, icon: React.ReactNode}[]} items
 */
export default function SidebarShell({ items, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOutLocal } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // The Vite sidebar hardcoded "Tim Cook / timcook@force.com"; show the real
  // signed-in profile, falling back only while the cache is still being read.
  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.company_name || "Account";
  const displayEmail = user?.email || "";

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      // Express clears the httpOnly uid cookie; this only drops the cached
      // non-sensitive profile the app keeps for display.
      signOutLocal();
      router.push("/login");
    }
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Spacer only — reserves flex space at md+ so content sits beside the sidebar.
          Hidden on mobile: the fixed sidebar below overlays the screen on its own
          and needs no flow space there. */}
      <div className={`hidden md:block h-screen shrink-0 transition-all duration-300 ${isOpen ? "w-[256px]" : "w-20"}`} />

      <aside
        className={`fixed top-0 left-0 h-screen bg-[#131C55] flex flex-col border-r-2 border-[#0E1B6B] transition-all duration-300 z-50 ${
          isOpen ? "w-[256px]" : "w-20"
        }`}
      >
        <div className="h-16 bg-[#0E1B6B] flex items-center justify-between px-4">
          {isOpen && (
            <Image src="/Untitled-2-01 1.png" alt="OneXhib" width={120} height={40} className="h-10 w-auto object-contain" />
          )}
          <div className="flex items-center gap-1">
            {isOpen && <ThemeToggle className="text-white hover:!bg-white/10" />}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? "Collapse menu" : "Expand menu"}
              className="text-white hover:opacity-80"
            >
              {isOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-3 px-4 py-6 overflow-y-auto">
          {items.map((item) => {
            const active = item.href && pathname.startsWith(item.href);
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => router.push(item.href)}
                title={item.label}
                className={`text-white text-lg flex items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-[#0E1B6B] ${
                  active ? "bg-[#0E1B6B]" : ""
                }`}
              >
                {item.icon}
                {isOpen && <span>{item.label}</span>}
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            className="text-white text-lg flex items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-[#0E1B6B]"
          >
            <LogOut size={20} />
            {isOpen && <span>Logout</span>}
          </button>
        </nav>

        <div
          className="flex items-center gap-3 px-4 py-4 bg-[#0E1B6B] cursor-pointer"
          onClick={() => setProfileOpen(true)}
        >
          <ProfilePopup open={profileOpen} onClose={() => setProfileOpen(false)} />
          <Image src="/Ellipse 14.png" alt="" width={40} height={40} className="w-10 h-10 rounded-full" />
          {isOpen && (
            <div className="text-white text-sm">
              <p className="font-bold truncate">{displayName}</p>
              <p className="opacity-80 truncate">{displayEmail}</p>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 min-w-0 pl-20 md:pl-0">{children}</div>
    </div>
  );
}
