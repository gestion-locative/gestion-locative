"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { MapPin, ChevronRight } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  email: string;
  rent: number | null;
  rent_due_day: number | null;
  property_address: string | null;
}

interface Payment {
  is_paid: boolean;
}

type StatusType = "paid" | "late" | "warning" | "pending";

function getStatus(
  tenant: Tenant,
  payment: Payment | undefined
): { type: StatusType; label: string } {
  if (payment?.is_paid) return { type: "paid", label: "Payé" };

  if (!tenant.rent_due_day) return { type: "pending", label: "En attente" };

  const today = new Date();
  const dueDate = new Date(today.getFullYear(), today.getMonth(), tenant.rent_due_day);
  dueDate.setHours(0, 0, 0, 0);
  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (dueDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return { type: "late", label: `Retard ${Math.abs(diffDays)}j` };
  if (diffDays <= 3) return { type: "warning", label: diffDays === 0 ? "Échéance auj." : `Dans ${diffDays}j` };
  return { type: "pending", label: "En attente" };
}

const statusBarColor: Record<StatusType, string> = {
  paid: "bg-emerald-500",
  late: "bg-red-500",
  warning: "bg-amber-500",
  pending: "bg-gray-300",
};

const statusBadge: Record<StatusType, string> = {
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  late: "bg-red-50 text-red-700 border-red-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  pending: "bg-gray-50 text-gray-600 border-gray-200",
};

const rowVariants = {
  hidden: { opacity: 0, x: -32 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.3 + i * 0.06, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

export default function TenantList({
  tenants,
  payments,
}: {
  tenants: Tenant[];
  payments: Record<string, Payment>;
}) {
  if (tenants.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
        <p className="text-gray-400">Aucun locataire pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tenants.map((tenant, i) => {
        const status = getStatus(tenant, payments[tenant.id]);

        return (
          <motion.div
            key={tenant.id}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={rowVariants}
          >
            <Link href={`/tenants/${tenant.id}`} className="block">
              <div className="group relative flex items-stretch overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
                <div className={`w-1.5 shrink-0 ${statusBarColor[status.type]}`} />

                <div className="flex flex-1 items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600">
                        {tenant.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {tenant.name}
                        </p>
                        <p className="truncate text-xs text-gray-400">{tenant.email}</p>
                      </div>
                    </div>
                    {tenant.property_address && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{tenant.property_address}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${statusBadge[status.type]}`}
                    >
                      {status.label}
                    </span>

                    {tenant.rent != null && (
                      <span className="text-sm font-bold text-gray-900 tabular-nums">
                        {Number(tenant.rent).toLocaleString("fr-FR")} €
                      </span>
                    )}

                    <ChevronRight className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-indigo-500" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
