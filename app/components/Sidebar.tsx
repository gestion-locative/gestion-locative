"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Building2,
  CreditCard,
  FileText,
  Settings,
  Menu,
  X,
  Home,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Locataires", href: "/tenants", icon: Users },
  { label: "Biens", href: "/properties", icon: Building2 },
  { label: "Paiements", href: "/payments", icon: CreditCard },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Paramètres", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 rounded-xl bg-white/80 p-2.5 shadow-lg backdrop-blur-xl border border-white/30 cursor-pointer lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-[#164E63]" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {(mobileOpen || true) && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: mobileOpen ? 0 : undefined }}
            exit={{ x: -280 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed top-0 left-0 z-50 h-screen w-[260px] flex-col bg-white/70 backdrop-blur-2xl border-r border-white/30 shadow-xl ${
              mobileOpen ? "flex" : "hidden lg:flex"
            }`}
          >
            {/* Close button (mobile) */}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 cursor-pointer text-[#164E63]/60 hover:text-[#164E63] hover:bg-[#0891B2]/10 transition-colors duration-200 lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Logo */}
            <div className="flex items-center gap-3 px-6 pt-8 pb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0891B2] to-[#22D3EE] shadow-lg shadow-[#0891B2]/25">
                <Home className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-[#164E63] tracking-tight">
                  Gestion
                </h1>
                <p className="text-xs font-medium text-[#0891B2]">Locative</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="relative block"
                  >
                    <motion.div
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium cursor-pointer transition-colors duration-200 ${
                        isActive
                          ? "bg-[#0891B2]/10 text-[#0891B2]"
                          : "text-[#164E63]/70 hover:bg-[#0891B2]/5 hover:text-[#164E63]"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-[#0891B2]"
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        />
                      )}
                      <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? "text-[#0891B2]" : ""}`} />
                      <span>{item.label}</span>
                    </motion.div>
                  </Link>
                );
              })}
            </nav>

            {/* Bottom section */}
            <div className="px-4 pb-6">
              <div className="rounded-xl bg-gradient-to-br from-[#0891B2]/10 to-[#22D3EE]/10 border border-[#0891B2]/10 p-4">
                <p className="text-xs font-semibold text-[#164E63]">
                  Besoin d&apos;aide ?
                </p>
                <p className="mt-1 text-xs text-[#164E63]/60">
                  Consultez notre guide pour bien démarrer.
                </p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
