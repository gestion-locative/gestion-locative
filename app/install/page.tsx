"use client";

import Link from "next/link";
import { useState } from "react";

/* ------------------------------------------------------------------
   Installer Loya — thème solaire, styles 100% en ligne (aucune
   dépendance Tailwind). Toute la logique est identique à l'original.
------------------------------------------------------------------- */

const INK = "#1a1208";
const CREAM = "#fbf1e3";
const BROWN = "#b45309";
const MUTE = "#a89372";
const BORDER = "#efe3cd";
const FIELD_BORDER = "#e6d6bb";
const ORANGE = "#e8590c";
const GREEN = "#1f7a37";

const display = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";
const mono = "var(--font-mono), 'Space Mono', ui-monospace, monospace";
const body = "var(--font-manrope), 'Manrope', system-ui, sans-serif";

const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 20,
  border: `1px solid ${BORDER}`,
  boxShadow: "0 18px 40px -30px rgba(120,53,15,0.4)",
  padding: 24,
};

export default function InstallPage() {
  const [selected, setSelected] = useState<"iphone" | "android" | null>(null);

  // étapes des deux plateformes
  const iphoneSteps = [
    { n: "1", title: "Ouvrez Safari", text: <>Loya doit être ouvert dans <strong style={{ color: INK }}>Safari</strong> — ça ne fonctionne pas avec Chrome sur iPhone pour cette fonctionnalité.</> },
    { n: "2", title: "Appuyez sur le bouton Partager", text: <>En bas de l'écran, appuyez sur l'icône <strong style={{ color: INK }}>carré avec une flèche qui pointe vers le haut</strong> ↑</>, glyph: "↑" },
    { n: "3", title: "Faites défiler et appuyez sur « Sur l'écran d'accueil »", text: <>Dans le menu qui s'ouvre, faites défiler vers le bas jusqu'à trouver <strong style={{ color: INK }}>« Sur l'écran d'accueil »</strong> et appuyez dessus.</> },
    { n: "4", title: "Nommez l'application et confirmez", text: <>Une fenêtre s'ouvre — vous pouvez renommer l'icône <strong style={{ color: INK }}>« Loya »</strong> puis appuyez sur <strong style={{ color: INK }}>Ajouter</strong> en haut à droite.</> },
    { n: "✓", title: "C'est fait !", text: <>L'icône Loya apparaît sur votre écran d'accueil. Appuyez dessus pour ouvrir l'application directement, sans retaper l'adresse.</>, done: true },
  ];

  const androidSteps = [
    { n: "1", title: "Ouvrez Chrome", text: <>Ouvrez Loya dans <strong style={{ color: INK }}>Google Chrome</strong> sur votre téléphone Android.</> },
    { n: "2", title: "Appuyez sur les trois points", text: <>En haut à droite de Chrome, appuyez sur les <strong style={{ color: INK }}>trois points ⋮</strong> pour ouvrir le menu.</>, glyph: "⋮" },
    { n: "3", title: "Appuyez sur « Ajouter à l'écran d'accueil »", text: <>Dans le menu, appuyez sur <strong style={{ color: INK }}>« Ajouter à l'écran d'accueil »</strong> ou <strong style={{ color: INK }}>« Installer l'application »</strong> selon votre version d'Android.</> },
    { n: "4", title: "Confirmez", text: <>Une fenêtre de confirmation apparaît — appuyez sur <strong style={{ color: INK }}>Ajouter</strong> ou <strong style={{ color: INK }}>Installer</strong>.</> },
    { n: "✓", title: "C'est fait !", text: <>L'icône Loya apparaît sur votre écran d'accueil. Appuyez dessus pour ouvrir l'application directement, sans retaper l'adresse.</>, done: true },
  ];

  function StepList({ steps }: { steps: any[] }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{
              width: 32, height: 32, flexShrink: 0, borderRadius: 999,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: display, fontWeight: 800, fontSize: 14,
              background: s.done ? "#e3f3e4" : CREAM,
              color: s.done ? GREEN : BROWN,
            }}>
              {s.n}
            </div>
            <div>
              <p style={{ fontFamily: display, fontWeight: 700, fontSize: 15, color: INK }}>{s.title}</p>
              <p style={{ fontSize: 14, color: "#5c4a2e", marginTop: 4, lineHeight: 1.55 }}>{s.text}</p>
              {s.glyph && (
                <div style={{ marginTop: 8, background: CREAM, border: `1px solid ${FIELD_BORDER}`, borderRadius: 12, padding: 12, textAlign: "center", fontSize: 24 }}>
                  {s.glyph}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function phoneButton(kind: "iphone" | "android", emoji: string, label: string, sub: string) {
    const active = selected === kind;
    return (
      <button
        onClick={() => setSelected(kind)}
        style={{
          padding: 24, borderRadius: 18, textAlign: "left", cursor: "pointer",
          fontFamily: body, transition: "all .15s",
          border: `2px solid ${active ? INK : FIELD_BORDER}`,
          background: active ? CREAM : "#fff",
        }}
      >
        <p style={{ fontSize: 30, marginBottom: 8 }}>{emoji}</p>
        <p style={{ fontFamily: display, fontWeight: 700, fontSize: 16, color: INK }}>{label}</p>
        <p style={{ fontSize: 12, color: MUTE, marginTop: 2 }}>{sub}</p>
      </button>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: CREAM, padding: 24, fontFamily: body, position: "relative", overflow: "hidden" }}>
      {/* SOLEIL décoratif */}
      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          right: -120,
          top: -140,
          width: 340,
          height: 340,
          borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #ffd166, #f9a826 60%, #f4801f)",
          opacity: 0.8,
        }}
      />

      <div style={{ position: "relative", maxWidth: 640, margin: "0 auto" }}>

        <Link
          href="/dashboard"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#fff", border: `2px solid ${FIELD_BORDER}`,
            padding: "9px 16px", borderRadius: 999,
            fontSize: 14, fontWeight: 700, color: INK, textDecoration: "none",
            marginBottom: 20,
          }}
        >
          ← Accueil
        </Link>

        <p style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: BROWN, marginBottom: 8 }}>
          Application mobile
        </p>
        <h1 style={{ fontFamily: display, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: INK, marginBottom: 4 }}>
          📱 Installer Loya
        </h1>
        <p style={{ fontSize: 14, color: "#7a684f", marginBottom: 28 }}>
          Ajoutez Loya sur l'écran d'accueil de votre téléphone pour y accéder en un seul tap, comme une vraie application.
        </p>

        {/* CHOIX DU TÉLÉPHONE */}
        <p style={{ fontSize: 14, fontWeight: 700, color: INK, marginBottom: 12 }}>Quel téléphone avez-vous ?</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
          {phoneButton("iphone", "🍎", "iPhone", "iOS · Safari")}
          {phoneButton("android", "🤖", "Android", "Chrome · Samsung")}
        </div>

        {/* INSTRUCTIONS IPHONE */}
        {selected === "iphone" && (
          <div style={card}>
            <h2 style={{ fontFamily: display, fontSize: 18, fontWeight: 700, color: INK, marginBottom: 24 }}>
              🍎 Instructions pour iPhone
            </h2>
            <StepList steps={iphoneSteps} />
          </div>
        )}

        {/* INSTRUCTIONS ANDROID */}
        {selected === "android" && (
          <div style={card}>
            <h2 style={{ fontFamily: display, fontSize: 18, fontWeight: 700, color: INK, marginBottom: 24 }}>
              🤖 Instructions pour Android
            </h2>
            <StepList steps={androidSteps} />
          </div>
        )}

        {/* SI RIEN DE SÉLECTIONNÉ */}
        {!selected && (
          <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, textAlign: "center" }}>
            <p style={{ color: MUTE, fontSize: 14 }}>Sélectionnez votre téléphone ci-dessus pour voir les instructions</p>
          </div>
        )}

      </div>
    </main>
  );
}
