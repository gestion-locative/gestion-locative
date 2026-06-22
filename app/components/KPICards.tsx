"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, CreditCard, Clock, TrendingUp } from "lucide-react";

interface KPIData {
  totalTenants: number;
  paidCount: number;
  pendingCount: number;
  collectedAmount: number;
}

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }

    const start = performance.now();
    let raf: number;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

export default function KPICards({ data }: { data: KPIData }) {
  const tenants = useCountUp(data.totalTenants);
  const paid = useCountUp(data.paidCount);
  const pending = useCountUp(data.pendingCount);
  const collected = useCountUp(data.collectedAmount, 1600);

  const cards = [
    {
      label: "Locataires",
      value: tenants.toString(),
      icon: Users,
      accent: "bg-indigo-50 text-indigo-600",
      iconBg: "bg-indigo-100",
    },
    {
      label: "Loyers encaissés",
      value: paid.toString(),
      icon: CreditCard,
      accent: "bg-emerald-50 text-emerald-600",
      iconBg: "bg-emerald-100",
    },
    {
      label: "En attente",
      value: pending.toString(),
      icon: Clock,
      accent: "bg-amber-50 text-amber-600",
      iconBg: "bg-amber-100",
    },
    {
      label: "Montant encaissé",
      value: `${collected.toLocaleString("fr-FR")} €`,
      icon: TrendingUp,
      accent: "bg-violet-50 text-violet-600",
      iconBg: "bg-violet-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{card.label}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                  {card.value}
                </p>
              </div>
              <div className={`rounded-xl p-2.5 ${card.iconBg}`}>
                <Icon className={`h-5 w-5 ${card.accent.split(" ")[1]}`} />
              </div>
            </div>
            <div
              className={`absolute bottom-0 left-0 h-1 w-full ${card.accent.split(" ")[0]}`}
              style={{ opacity: 0.6 }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
