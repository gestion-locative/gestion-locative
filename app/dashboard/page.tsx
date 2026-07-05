"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LoyaIcon } from "@/components/LoyaLogo";
import toast from "react-hot-toast";

const INK = "#1a1208";
const CREAM = "#fbf1e3";
const ORANGE = "#e8590c";
const BROWN = "#b45309";
const MUTE = "#a89372";
const BORDER = "#efe3cd";

const display = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";
const mono = "var(--font-mono), 'Space Mono', ui-monospace, monospace";
const body = "var(--font-manrope), 'Manrope', system-ui, sans-serif";

const eyebrowStyle: React.CSSProperties = {
  fontFamily: mono,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: BROWN,
};

const cardStyle: React.CSSProperties = {
  display: "block",
  border: `1px solid ${BORDER}`,
  background: "#fff",
  borderRadius: 16,
  padding: 20,
  textDecoration: "none",
  minHeight: 180,
  boxSizing: "border-box",
};

const chipStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  background: CREAM,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 20,
};

const tileTitle: React.CSSProperties = {
  fontFamily: display,
  fontWeight: 700,
  fontSize: 17,
  color: INK,
  marginTop: 14,
};

const tileSub: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: MUTE,
  marginTop: 2,
};

function badge(bg: string, color: string): React.CSSProperties {
  return {
    borderRadius: 999,
    background: bg,
    padding: "2px 10px",
    fontSize: 12,
    fontWeight: 700,
    color,
    display: "inline-block",
  };
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [ownerName, setOwnerName] = useState("");
  const [bankConnected, setBankConnected] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [bankExpiringSoon, setBankExpiringSoon] = useState(false)
  const [bankExpired, setBankExpired] = useState(false)
  const [bankSyncBroken, setBankSyncBroken] = useState(false)
  const [stats, setStats] = useState({
    totalTenants: 0,
    paidCount: 0,
    pendingCount: 0,
    totalProperties: 0,
    vacantCount: 0,
    collectedAmount: 0,
    pendingAmount: 0,
    lateTenantsNames: [] as string[],
  });
  const [loading, setLoading] = useState(true);

  

  useEffect(() => {
    checkUser();
  }, []);


  useEffect(() => {
  const params = new URLSearchParams(window.location.search)
  const bankStatus = params.get('bank')
  const bridgeUuid = params.get('bridge_uuid')

  if (bankStatus === 'pending' && bridgeUuid && user) {
    confirmBankConnection(bridgeUuid)
  }
}, [user])

async function confirmBankConnection(bridgeUuid: string) {
  const response = await fetch('/api/bank/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: user.id, bridgeUuid })
  })
  const data = await response.json()
  if (data.confirmed) {
    setBankConnected(true)
    toast.success('Banque connectée avec succès !')
  }
  // Nettoyer l'URL
  window.history.replaceState({}, '', '/dashboard')
}



async function checkUser() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    setLoading(false);
    return;
  }
  setUser(data.user);
  await createDefaultProfileIfNeeded(data.user.id); // ← nouveau
  await fetchStats(data.user.id);
  await fetchOwnerName(data.user.id);
  setLoading(false);
}

async function createDefaultProfileIfNeeded(userId: string) {
  const { data } = await supabase
    .from("owner_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  

  if (!data) {
    // Aucun profil → on en crée un avec les valeurs par défaut
    await supabase.from("owner_profiles").insert({
      user_id: userId,
      full_name: "",
      address: "",
      postal_code: "",
      city: "",
      gender: "homme",
      reminder_subject: "Rappel de paiement de loyer",
      reminder_body: `Bonjour {nom_locataire},\n\nNous vous informons que le paiement de votre loyer de {loyer}€ est actuellement en attente. Nous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.\n\nPour toute question, n'hésitez pas à nous contacter.\n\nCordialement,\n{nom_proprietaire}`,
      receipt_subject: "Quittance de loyer — {mois}",
      receipt_body: `Bonjour {nom_locataire},\n\nNous vous remercions pour le règlement de votre loyer. Vous trouverez ci-joint votre quittance de loyer pour la période concernée.\n\nNous restons à votre disposition pour toute question.\n\nCordialement,\n{nom_proprietaire}`,
    });
  }
}

  async function fetchOwnerName(userId: string) {
  const { data } = await supabase
    .from("owner_profiles")
    .select("first_name, bridge_user_uuid, last_bank_sync_at, bridge_connected_at, bank_sync_error_count")
    .eq("user_id", userId)
    .maybeSingle()

  if (data?.first_name && data.first_name.trim() !== "") {
    setOwnerName(data.first_name)
  }
  if (data?.bridge_user_uuid) {
    setBankConnected(true)
  }

  if (data?.bridge_connected_at) {
    const connectedAt = new Date(data.bridge_connected_at)
    const expiryDate = new Date(connectedAt)
    expiryDate.setDate(expiryDate.getDate() + 90)
    const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

    // Deux états distincts : "bientôt expirée" (proactif) et "déjà expirée" (réactif).
    // Le second est plus urgent : la synchro a probablement déjà cessé de fonctionner.
    if (daysLeft > 0 && daysLeft <= 15) setBankExpiringSoon(true)
    if (daysLeft <= 0) setBankExpired(true)
  }

  // Signal réel de rupture : la synchro échoue depuis plusieurs tentatives.
  // Plus fiable qu'une estimation de date, ça vient directement du cron de synchro.
  if ((data?.bank_sync_error_count || 0) >= 2) {
    setBankSyncBroken(true)
  }

  if (data?.last_bank_sync_at) {
    setLastSync(data.last_bank_sync_at)
  }
}

  async function fetchStats(userId: string) {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const today = now.getDate();

    const { data: tenants } = await supabase.from("tenants").select("*").eq("user_id", userId);
    const { data: properties } = await supabase.from("properties").select("*").eq("user_id", userId);
    const { data: payments } = await supabase
      .from("payments").select("*")
      .in("tenant_id", (tenants || []).map((t) => t.id))
      .eq("month", monthKey);

    const paymentMap: Record<string, any> = {};
    (payments || []).forEach((p) => { paymentMap[p.tenant_id] = p; });

    const paidTenants = (tenants || []).filter((t) => paymentMap[t.id]?.is_paid);
    const pendingTenants = (tenants || []).filter((t) => !paymentMap[t.id]?.is_paid);
    const collectedAmount = paidTenants.reduce((sum, t) => sum + (Number(t.rent) || 0), 0);
    const pendingAmount = pendingTenants.reduce((sum, t) => sum + (Number(t.rent) || 0), 0);
    const lateTenants = (tenants || []).filter((t) => {
      if (!t.rent_due_day || paymentMap[t.id]?.is_paid) return false;
      return today > Number(t.rent_due_day);
    });

    setStats({
      totalTenants: (tenants || []).length,
      paidCount: paidTenants.length,
      pendingCount: pendingTenants.length,
      totalProperties: (properties || []).length,
      vacantCount: (properties || []).filter((p) => p.is_vacant).length,
      collectedAmount,
      pendingAmount,
      lateTenantsNames: lateTenants.map((t) => t.name),
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  /* ---------- CHARGEMENT ---------- */
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: CREAM, fontFamily: body }}>
        <p style={{ fontFamily: mono, fontSize: 14, color: MUTE }}>Chargement…</p>
      </div>
    );
  }

  /* ---------- NON CONNECTÉ : landing ---------- */
  if (!user) {
    return (
      <main style={{
        position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", overflow: "hidden",
        background: CREAM, padding: "48px 24px", textAlign: "center", fontFamily: body,
      }}>
        <div style={{
          pointerEvents: "none", position: "absolute", right: -96, top: -112,
          width: 380, height: 380, borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #ffd166, #f9a826 60%, #f4801f)",
          opacity: 0.9,
        }} />
        <div style={{ position: "relative", maxWidth: 560, margin: "0 auto" }}>
          <div style={{ marginBottom: 28, display: "flex", justifyContent: "center" }}>
            <LoyaIcon size={64} />
          </div>
          <p style={{ ...eyebrowStyle, marginBottom: 16 }}>Gestion locative · sans effort</p>
          <h1 style={{
            fontFamily: display, fontWeight: 800, fontSize: "clamp(32px, 6vw, 48px)",
            lineHeight: 1.05, letterSpacing: "-0.025em", color: INK, marginBottom: 20,
          }}>
            Envoyez vos relances et quittances <span style={{ color: ORANGE }}>en un clic</span>, ou laissez
            l&apos;appli le faire <em style={{ fontStyle: "italic", color: ORANGE }}>automatiquement</em>.
          </h1>
          <p style={{ fontSize: 20, fontWeight: 800, color: INK, marginBottom: 8 }}>
            Simple à prendre en main, <span style={{ color: ORANGE }}>puissant</span> au quotidien.
          </p>
          <p style={{ fontSize: 15, fontWeight: 600, color: BROWN, marginBottom: 40 }}>
            Vous, vous pouvez retourner bronzer. 🌞
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/login" style={{
              background: INK, color: CREAM, padding: "16px 36px",
              borderRadius: 999, fontWeight: 700, fontSize: 16, textDecoration: "none",
            }}>
              Se connecter
            </Link>
            <Link href="/login" style={{
              background: "transparent", color: INK, padding: "16px 36px",
              borderRadius: 999, fontWeight: 700, fontSize: 16,
              textDecoration: "none", border: `2px solid ${INK}`,
            }}>
              Créer un compte
            </Link>
          </div>
        </div>
      </main>
    );
  }

  async function connectBank() {
  if (!user) return
  const response = await fetch('/api/bank/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: user.id })
  })
  const data = await response.json()
  if (data.connect_url) {
    window.location.href = data.connect_url
  }
}

async function copyContactEmail() {
  try {
    await navigator.clipboard.writeText("contact@loyafr.com")
    toast.success("Adresse copiée : contact@loyafr.com — collez-la dans votre appli mail")
  } catch {
    toast.error("Impossible de copier automatiquement. Notez : contact@loyafr.com")
  }
}

async function disconnectBank() {
  if (!user) return
  await fetch('/api/bank/disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: user.id })
  })
  setBankConnected(false)
  setBankExpired(false)
  setBankExpiringSoon(false)
  setBankSyncBroken(false)
}

  /* ---------- CONNECTÉ : dashboard ---------- */
  const collectRate =
    stats.totalTenants === 0 ? "—" : Math.round((stats.paidCount / stats.totalTenants) * 100) + "%";

  // Un seul indicateur qui regroupe les deux signaux d'alerte : une date d'expiration
  // dépassée, ou des échecs de synchro répétés détectés par le cron.
  const bankBroken = bankExpired || bankSyncBroken;
  const needsReconnect = bankBroken || bankExpiringSoon;

  const tiles = [
    { href: "/profile", icon: "👤", title: "Mon profil", sub: "Infos · Signature · Emails" },
    { href: "/tenants", icon: "👥", title: "Mes locataires", sub: `${stats.totalTenants} locataire${stats.totalTenants > 1 ? "s" : ""}`, tenants: true },
    { href: "/documents", icon: "📋", title: "Vue globale", sub: "Relances · Quittances · Appels· Synchro" },
    {href: "#", icon: "🏦", title: "Connexion bancaire", sub: "Synchroniser votre banque", bank: true },
    { href: "/properties", icon: "🏠", title: "Mes biens", sub: `${stats.totalProperties} bien${stats.totalProperties > 1 ? "s" : ""}`, vacant: true },
    { href: "/export", icon: "📊", title: "Export & Fiscalité", sub: "Télécharger vos données" },
    { href: "/tutorial", icon: "📖", title: "Guide d'utilisation", sub: "Découvrir toutes les fonctionnalités" },
    { href: "/install", icon: "📱", title: "Installer Loya", sub: "Ajouter sur votre écran d'accueil" },
    { href: "#", icon: "💬", title: "Besoin d'aide ?", sub: "contact@loyafr.com", contact: true },
  ];
  return (
    <main style={{ minHeight: "100vh", background: CREAM, padding: "20px 16px", fontFamily: body }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>

        {/* HEADER */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, marginBottom: 28, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <LoyaIcon size={44} />
            <div>
              <h1 style={{ fontFamily: display, fontWeight: 800, fontSize: "clamp(20px, 5vw, 26px)", letterSpacing: "-0.02em", color: INK }}>
                Bonjour {ownerName ? ownerName : ""} 👋
              </h1>
              <p style={{ fontSize: 13, fontWeight: 500, color: "#7a684f", marginTop: 2 }}>Bienvenue sur Loya</p>
            </div>
          </div>
          <button
            onClick={signOut}
            style={{
              flexShrink: 0,
              border: "2px solid #e6d6bb",
              background: "none",
              borderRadius: 999,
              padding: "9px 18px",
              fontSize: 14,
              fontWeight: 700,
              color: "#7a684f",
              fontFamily: body,
              cursor: "pointer",
            }}
          >
            Se déconnecter
          </button>
        </div>

        {/* ALERTE CONNEXION BANCAIRE CASSÉE */}
        {bankConnected && bankBroken && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            border: "1px solid #e53e3e", background: "#fff5f5",
            borderRadius: 16, padding: 16, marginBottom: 24,
          }}>
            <span style={{ fontSize: 18 }}>🏦</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#c53030" }}>
                Votre connexion bancaire a besoin d'être renouvelée
              </p>
              <p style={{ fontSize: 12, fontWeight: 500, color: "#e53e3e", marginTop: 2, marginBottom: 10 }}>
                Loya ne peut plus synchroniser vos virements de loyer ni générer vos quittances automatiquement tant que ce n'est pas fait.
              </p>
              <button
                onClick={connectBank}
                style={{
                  background: INK,
                  color: CREAM,
                  border: "none",
                  borderRadius: 999,
                  padding: "8px 18px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: body,
                }}
              >
                Renouveler ma connexion →
              </button>
            </div>
          </div>
        )}

        {/* ALERTE RETARDS */}
        {stats.lateTenantsNames.length > 0 && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            border: "1px solid #e53e3e", background: "#fff5f5",
            borderRadius: 16, padding: 16, marginBottom: 24,
          }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#c53030" }}>
                {stats.lateTenantsNames.length} locataire{stats.lateTenantsNames.length > 1 ? "s" : ""} en retard de paiement
              </p>
              <p style={{ fontSize: 12, fontWeight: 500, color: "#e53e3e", marginTop: 2 }}>
                {stats.lateTenantsNames.join(" · ")}
              </p>
            </div>
          </div>
        )}

        {/* TUILES */}
        <p style={{ ...eyebrowStyle, marginBottom: 12 }}>Raccourcis</p>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 14,
          marginBottom: 36,
          alignItems: "stretch",
        }}>

        {tiles.map((t) => (
        (t as any).contact ? (
          <button
            key="contact"
            onClick={copyContactEmail}
            style={{ ...cardStyle, cursor: "pointer", textAlign: "left", fontFamily: body }}
          >
            <div style={chipStyle}>{t.icon}</div>
            <p style={tileTitle}>{t.title}</p>
            <p style={{ ...tileSub, wordBreak: "break-all" }}>{t.sub}</p>
            <span style={{ fontSize: 11, color: BROWN, marginTop: 8, display: "inline-block", fontWeight: 600 }}>
              📋 Cliquer pour copier
            </span>
          </button>
        ) :
        t.bank ? (
        <div key="bank" style={{ ...cardStyle }}>
          <div style={chipStyle}>🏦</div>
          <p style={tileTitle}>Connexion bancaire</p>
          {bankConnected ? (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8}}>
            {needsReconnect ? (
              <>
                <span style={{ ...badge("#fcece6", "#b3361f"), display: "inline-block", width: "fit-content" }}>
                  {bankBroken ? "⚠️ Connexion à renouveler" : "⚠️ Expire bientôt"}
                </span>
                <button
                  onClick={connectBank}
                  style={{
                    background: ORANGE,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 999,
                    padding: '7px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: body,
                    width: 'fit-content',
                  }}
                >
                  Renouveler ma connexion
                </button>
              </>
            ) : (
              <span style={{ ...badge("#e3f3e4", "#1f7a37"), display: "inline-block", width: "fit-content" }}>✓ Banque connectée</span>
            )}
            <button onClick={disconnectBank} style={{ background: 'none', border: 'none', color: MUTE, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: body, textDecoration: 'underline', padding: 0, textAlign: 'left' }}>
              Déconnecter
            </button>
          </div>
        ) : (
          <button
            onClick={connectBank}
            style={{
              marginTop: 10,
              background: ORANGE,
              color: '#fff',
              border: 'none',
              borderRadius: 999,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: body,
            }}
          >
            Connecter
          </button>
        )}
        </div>
      ) : (
          <Link
            key={t.href}
            href={t.href}
            style={cardStyle}
            {...(t.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            <div style={chipStyle}>{t.icon}</div>
            <p style={tileTitle}>{t.title}</p>
            <p style={tileSub}>{t.sub}</p>

            {t.tenants && (
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                {stats.paidCount > 0 && (
                  <span style={badge("#e3f3e4", "#1f7a37")}>{stats.paidCount} payé{stats.paidCount > 1 ? "s" : ""}</span>
                )}
                {stats.pendingCount > 0 && (
                  <span style={badge("#fcece6", "#b3361f")}>{stats.pendingCount} en attente</span>
                )}
              </div>
            )}

            {t.vacant && stats.vacantCount > 0 && (
              <span style={{ ...badge("#fbeccf", BROWN), marginTop: 10 }}>
                {stats.vacantCount} vacant{stats.vacantCount > 1 ? "s" : ""}
              </span>
            )}
          </Link>
        )
      ))}
        </div>

        {/* STATISTIQUES */}
        <div style={{ borderTop: "1px solid #e6d6bb", paddingTop: 24 }}>
          <p style={{ ...eyebrowStyle, color: MUTE, marginBottom: 16 }}>Statistiques du mois</p>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 18,
          }}>
            <Stat label="Encaissé" value={`${stats.collectedAmount.toLocaleString("fr-FR")} €`} />
            <Stat label="En attente" value={`${stats.pendingAmount.toLocaleString("fr-FR")} €`} />
            <Stat label="En retard" value={`${stats.lateTenantsNames.length} loc.`} />
            <Stat label="Taux d'encaissement" value={collectRate} />
          </div>
        </div>

      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 600, color: MUTE, marginBottom: 3 }}>{label}</p>
      <p style={{ fontFamily: display, fontWeight: 700, fontSize: 17, color: "#5c4a2e" }}>{value}</p>
    </div>
  );
}
