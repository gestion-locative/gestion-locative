"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/app/components/Sidebar";
import KPICards from "@/app/components/KPICards";
import TenantList from "@/app/components/TenantList";

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<any[]>([]);
  const [payments, setPayments] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
      } else {
        fetchData(data.user.id);
      }
    });
  }, []);

  async function fetchData(userId: string) {
    const { data: tenantData } = await supabase
      .from("tenants")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const list = tenantData || [];
    setTenants(list);

    if (list.length > 0) {
      const monthKey = getCurrentMonthKey();
      const { data: paymentData } = await supabase
        .from("payments")
        .select("*")
        .in("tenant_id", list.map((t: any) => t.id))
        .eq("month", monthKey);

      const map: Record<string, any> = {};
      (paymentData || []).forEach((p: any) => {
        map[p.tenant_id] = p;
      });
      setPayments(map);
    }

    setLoading(false);
  }

  const paidCount = tenants.filter((t) => payments[t.id]?.is_paid).length;
  const collectedAmount = tenants
    .filter((t) => payments[t.id]?.is_paid)
    .reduce((sum, t) => sum + (Number(t.rent) || 0), 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="relative flex-1 overflow-auto lg:ml-[260px]">
        <div
          className="pointer-events-none fixed inset-0 lg:left-[260px]"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.08), transparent 70%), " +
              "radial-gradient(ellipse 50% 40% at 80% 100%, rgba(139,92,246,0.06), transparent 60%)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-6xl px-6 py-10 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Tableau de bord
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Vue d&apos;ensemble de votre gestion locative
            </p>
          </motion.div>

          {loading ? (
            <div className="mt-16 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
            </div>
          ) : (
            <>
              <div className="mt-8">
                <KPICards
                  data={{
                    totalTenants: tenants.length,
                    paidCount,
                    pendingCount: tenants.length - paidCount,
                    collectedAmount,
                  }}
                />
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="mt-10"
              >
                <h2 className="mb-4 text-lg font-semibold text-gray-900">
                  Locataires
                </h2>
                <TenantList tenants={tenants} payments={payments} />
              </motion.div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
