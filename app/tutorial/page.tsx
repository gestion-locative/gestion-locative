"use client";

import Link from "next/link";
import { useState } from "react";

const INK = "#1a1208";
const CREAM = "#fbf1e3";
const ORANGE = "#e8590c";
const BROWN = "#b45309";
const MUTE = "#a89372";
const BORDER = "#efe3cd";
const FIELD_BORDER = "#e6d6bb";
const GREEN = "#1f7a37";
const GREEN_BG = "#e3f3e4";
const BLUE_BG = "#e6f1fb";
const BLUE = "#185fa5";
const AMBER_BG = "#fbeccf";

const display = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";
const mono = "var(--font-mono), 'Space Mono', ui-monospace, monospace";
const body = "var(--font-manrope), 'Manrope', system-ui, sans-serif";

const sections = [
  {
    id: "profil",
    emoji: "👤",
    title: "1. Remplir votre profil",
    steps: [
      "Allez sur la page **Mon profil** depuis l'accueil",
      "Renseignez votre nom complet, adresse, code postal et ville — ces infos apparaîtront sur vos quittances",
      "Choisissez votre genre (homme/femme) pour adapter automatiquement la formulation des quittances",
      "Optionnel : ajoutez une image de votre signature — elle sera intégrée dans vos quittances PDF",
      "Personnalisez vos emails de relance, quittance et appel de loyer grâce aux variables {nom_locataire}, {loyer}, {mois}, {nom_proprietaire} — remplacées automatiquement à l'envoi",
      "Renseignez votre **IBAN** dans la section Appel de loyer — il sera inclus automatiquement dans les emails d'appel de loyer envoyés à vos locataires",
      "Cliquez sur **Enregistrer** (le bouton s'active dès qu'une modification est détectée)",
    ],
  },
  {
    id: "locataires",
    emoji: "👥",
    title: "2. Ajouter vos locataires",
    steps: [
      "Depuis l'accueil, cliquez sur **Mes locataires** puis sur **+ Ajouter un locataire**",
      "Renseignez le **nom**, l'**email** (utilisé pour les relances et quittances) et le **téléphone**",
      "Indiquez le **montant du loyer mensuel** — il apparaîtra sur les quittances PDF et dans vos statistiques",
      "Indiquez le **jour d'échéance** (ex: 5 pour le 5 de chaque mois) — Loya affiche automatiquement un badge 🔴 Retard Xj si le loyer n'est pas payé après cette date",
      "Optionnel : rattachez le locataire à un bien immobilier via le menu déroulant",
      "Une fois ajouté, **cliquez sur la carte du locataire** pour accéder à sa fiche complète avec 4 onglets : Infos & paiement, Automatisation, Historique et Documents",
    ],
  },
  {
    id: "relances",
    emoji: "🔔",
    title: "3. Envoyer des relances",
    steps: [
      "**Relance manuelle** : depuis l'onglet **Infos & paiement** d'un locataire, cliquez sur **Envoyer une relance** — disponible uniquement si le loyer n'est pas encore payé",
      "**Relance groupée** : depuis la page **Vue globale** (onglet Relances), voyez tous les locataires impayés et cliquez sur **Relancer tous** pour envoyer à tout le monde en une action",
      "**Relance automatique** : depuis l'onglet **Automatisation** d'un locataire, activez la relance auto et choisissez vos paliers (J, J+7, J+15...) — Loya envoie automatiquement sans intervention de votre part, tous les jours à **10h (heure française)**",
      "Si vous avez plusieurs locataires en retard, vous recevez aussi un **récapitulatif groupé par email**, envoyé vers **10h30**, pour ne pas avoir à ouvrir l'application pour le savoir",
      "La date de la dernière relance est visible dans l'onglet **Historique** de chaque fiche locataire",
    ],
  },
  {
    id: "quittances",
    emoji: "📄",
    title: "4. Gérer les quittances",
    steps: [
      "Les quittances sont générées **automatiquement** dès qu'un loyer est marqué payé",
      "Depuis l'onglet **Infos & paiement**, cliquez sur **Envoyer la quittance** pour l'envoyer manuellement au locataire — le bouton est grisé si le loyer n'est pas encore payé",
      "Retrouvez toutes les quittances dans l'onglet **Historique** de chaque fiche : télécharger le PDF, envoyer ou renvoyer par email",
      "Depuis la page **Vue globale** (onglet Quittances), retrouvez l'historique complet de toutes vos quittances avec des filtres par locataire et par mois",
    ],
  },
  {
    id: "appel-loyer",
    emoji: "📨",
    title: "5. Appel de loyer",
    steps: [
      "L'appel de loyer est un email envoyé **avant** l'échéance pour rappeler au locataire qu'il doit payer — il inclut le montant et votre IBAN",
      "**Envoi manuel** : depuis l'onglet **Infos & paiement** d'un locataire, cliquez sur **Envoyer un appel de loyer** — disponible à tout moment",
      "**Envoi automatique** : depuis l'onglet **Automatisation** d'un locataire, activez l'appel de loyer automatique — Loya envoie automatiquement le 1er de chaque mois, vers **8h-9h (heure française)**",
      "Personnalisez le message et l'objet de l'email depuis **Mon profil** → section Appel de loyer & IBAN",
      "La date du dernier appel envoyé est visible dans l'onglet **Historique** de la fiche locataire",
    ],
  },
  {
    id: "synchro",
    emoji: "🏦",
    title: "6. Synchronisation bancaire",
    steps: [
      "Depuis l'accueil, cliquez sur la tuile **Connexion bancaire** puis sur **Connecter** — vous serez redirigé vers une page sécurisée (Bridge) pour connecter votre compte bancaire. Vos identifiants bancaires ne sont jamais stockés par Loya.",
      "Une fois connecté, Loya analyse vos virements **automatiquement chaque jour vers 9h-10h (heure française)** — pas besoin d'ouvrir l'application pour que ça fonctionne",
      "**Si le nom du locataire et le montant correspondent exactement** au virement reçu → le paiement est coché automatiquement, la quittance est générée et envoyée, sans aucune action de votre part",
      "**Si le libellé bancaire est ambigu** (le montant correspond mais pas le nom, par exemple parce que le virement passe par un tiers, un conjoint, ou une agence) → Loya fait analyser le virement par une IA, qui écarte immédiatement tout ce qui n'a manifestement rien à voir avec un loyer (remboursement, vente, salaire...). Si un doute raisonnable subsiste, le virement apparaît dans l'onglet **🔍 À valider** de la page **Vue globale**, avec le locataire probable et le raisonnement — c'est vous qui tranchez en un clic, l'IA ne décide jamais seule dans les cas ambigus.",
      "**Une fois que vous confirmez** un virement ambigu une première fois, Loya retient la structure du libellé pour ce locataire — les mois suivants, le même type de virement sera reconnu automatiquement, sans repasser par la validation manuelle",
      "**Si le virement n'a manifestement rien à voir** avec un loyer (achat, remboursement, salaire...), il n'apparaît nulle part et n'encombre pas votre file d'attente",
      "Vous pouvez **déconnecter** votre banque à tout moment depuis la tuile Connexion bancaire sur l'accueil — vos données bancaires sont alors supprimées, pas seulement déliées",
    ],
  },
  {
    id: "paiements",
    emoji: "💰",
    title: "7. Suivre les paiements",
    steps: [
      "Depuis la fiche d'un locataire (onglet **Infos & paiement**), cliquez sur **Marquer comme payé ce mois** — une quittance PDF est générée automatiquement",
      "Le statut se **réinitialise automatiquement chaque 1er du mois** — vous n'avez rien à faire en début de mois",
      "Si vous oubliez un mois, allez dans l'onglet **Historique** de la fiche — vous pouvez corriger le statut de n'importe quel mois passé en cliquant dessus",
      "Les **statistiques** (montant encaissé, taux d'encaissement, retards) se mettent à jour en temps réel sur la page d'accueil",
      "Un **badge de retard** s'affiche automatiquement sur la liste des locataires dès que la date d'échéance est dépassée sans paiement",
    ],
  },
  {
    id: "vue-globale",
    emoji: "📋",
    title: "8. Vue globale — tout centralisé au même endroit",
    steps: [
      "Depuis l'accueil, cliquez sur la tuile **Vue globale** — cette page regroupe toutes vos communications locatives en un seul endroit, avec 5 onglets",
      "**🔔 Relances** : liste tous les locataires actuellement impayés, avec un bouton **Relancer tous** pour envoyer une relance groupée en un clic",
      "**📄 Quittances** : historique complet de toutes vos quittances (envoyées ou non), avec des filtres par locataire, par mois et par statut d'envoi",
      "**📨 Appels de loyer** : voyez qui a reçu son appel de loyer ce mois-ci, et renvoyez-en un manuellement si besoin",
      "**🔍 À valider** : c'est ici qu'apparaissent les virements bancaires ambigus détectés par l'IA (voir la section Synchronisation bancaire ci-dessus) — vous confirmez ou corrigez le locataire suggéré en un clic, et Loya s'en souvient pour les mois suivants",
      "**🏦 Synchronisations** : historique technique de chaque exécution de la synchro bancaire (nombre de transactions vérifiées, correspondances trouvées) — utile si vous voulez vérifier que tout fonctionne normalement",
    ],
  },
  {
    id: "documents",
    emoji: "📁",
    title: "9. Documents d'un locataire (bail, pièces d'identité...)",
    steps: [
      "⚠️ À ne pas confondre avec la page **Vue globale** ci-dessus : ici, il s'agit des documents propres à **un locataire en particulier**, pas d'une vue d'ensemble",
      "Depuis la fiche d'un locataire, allez dans l'onglet **Documents** pour centraliser tous les documents importants",
      "Choisissez le type : **Bail, État des lieux (entrée), État des lieux (sortie), Certificat d'assurance, Pièce d'identité, Justificatif de revenus, Pièce d'identité (garant), Justificatif de revenus (garant), Acte de cautionnement** ou Autre",
      "Cliquez sur **Ajouter un document**, sélectionnez votre fichier (PDF, JPG ou PNG) — stocké de façon sécurisée",
      "Cliquez sur **Voir** pour ouvrir un document dans votre navigateur, ou **Supprimer** pour le retirer",
    ],
  },
  {
    id: "biens",
    emoji: "🏠",
    title: "10. Gérer vos biens (optionnel)",
    steps: [
      "La gestion des biens est **optionnelle** — utile si vous possédez plusieurs logements pour savoir quels appartements sont vacants ou occupés",
      "Allez sur **Mes biens** depuis l'accueil, cliquez sur **+ Ajouter un bien** et renseignez l'adresse, la ville, le type et la surface",
      "Depuis la fiche d'un bien, rattachez ou retirez des locataires et consultez le loyer total et le statut de paiement de chaque locataire",
      "Un bien peut accueillir **plusieurs locataires** — pratique pour les colocations",
      "Le statut **Vacant / Occupé** se met à jour automatiquement selon les locataires rattachés",
    ],
  },
];

const autoScenarios = [
  {
    group: "Sans synchronisation bancaire",
    items: [
      {
        scenario: "Tout désactivé — vous gérez tout manuellement",
        tags: [{ label: "Banque ❌", type: "off" }, { label: "Relance auto ❌", type: "off" }, { label: "Quittance auto ❌", type: "off" }, { label: "Appel loyer ❌", type: "off" }],
        results: [{ label: "Rien ne se passe", type: "gray" }],
      },
      {
        scenario: "Relance auto activée — email envoyé si loyer en retard",
        tags: [{ label: "Banque ❌", type: "off" }, { label: "Relance auto ✓", type: "on" }],
        results: [{ label: "Relance envoyée automatiquement ✓", type: "green" }, { label: "Paiement à cocher vous-même", type: "orange" }],
      },
      {
        scenario: "Appel de loyer auto — email avec IBAN le 1er du mois",
        tags: [{ label: "Banque ❌", type: "off" }, { label: "Appel loyer auto ✓", type: "on" }],
        results: [{ label: "Appel de loyer envoyé automatiquement ✓", type: "green" }, { label: "Paiement à cocher vous-même", type: "orange" }],
      },
      {
        scenario: "Quittance auto activée seule",
        tags: [{ label: "Banque ❌", type: "off" }, { label: "Quittance auto ✓", type: "on" }],
        results: [{ label: "Paiement à cocher vous-même", type: "orange" }, { label: "Quittance envoyée automatiquement dès que coché ✓", type: "green" }],
      },
      {
        scenario: "Tout activé sauf banque — flow complet sans banque",
        tags: [{ label: "Banque ❌", type: "off" }, { label: "Appel loyer ✓", type: "on" }, { label: "Relance auto ✓", type: "on" }, { label: "Quittance auto ✓", type: "on" }],
        results: [{ label: "Appel de loyer envoyé automatiquement ✓", type: "green" }, { label: "Relance envoyée automatiquement si retard ✓", type: "green" }, { label: "Paiement à cocher vous-même", type: "orange" }],
      },
    ],
  },
  {
    group: "Avec synchronisation bancaire",
    items: [
      {
        scenario: "Virement reconnu (nom + montant identiques) — tout se fait automatiquement",
        tags: [{ label: "Banque connectée ✓", type: "bank" }, { label: "Match exact ✓", type: "bank" }],
        results: [{ label: "Paiement coché automatiquement ✓", type: "green" }, { label: "Quittance envoyée automatiquement ✓", type: "green" }],
      },
      {
        scenario: "Virement ambigu (ex: montant correspond mais pas le nom) — l'IA filtre, vous confirmez",
        tags: [{ label: "Banque connectée ✓", type: "bank" }, { label: "Match ambigu 🔍", type: "bank" }],
        results: [{ label: "Suggestion créée dans « À valider »", type: "blue" }, { label: "Confirmation manuelle requise", type: "orange" }],
      },
      {
        scenario: "Même locataire, virement similaire le mois suivant — Loya a appris",
        tags: [{ label: "Banque connectée ✓", type: "bank" }, { label: "Déjà confirmé un mois précédent", type: "bank" }],
        results: [{ label: "Reconnu et coché automatiquement (appris) ✓", type: "green" }],
      },
      {
        scenario: "Virement détecté mais loyer déjà coché manuellement",
        tags: [{ label: "Banque connectée ✓", type: "bank" }, { label: "Déjà payé ✓", type: "on" }],
        results: [{ label: "Rien ne se passe (déjà traité)", type: "gray" }],
      },
      {
        scenario: "Banque détecte le paiement le matin — la relance du jour est annulée",
        tags: [{ label: "Banque connectée ✓", type: "bank" }, { label: "Relance auto ✓", type: "on" }],
        results: [{ label: "Paiement coché automatiquement ✓", type: "green" }, { label: "Relance annulée (déjà payé)", type: "gray" }],
      },
      {
        scenario: "Flow idéal — tout activé, zéro action requise au quotidien",
        tags: [{ label: "Banque connectée ✓", type: "bank" }, { label: "Appel loyer ✓", type: "on" }, { label: "Relance auto ✓", type: "on" }, { label: "Quittance auto ✓", type: "on" }],
        results: [{ label: "Appel de loyer envoyé automatiquement ✓", type: "green" }, { label: "Paiement coché automatiquement ✓", type: "green" }, { label: "Quittance envoyée automatiquement ✓", type: "green" }],
        highlight: true,
      },
      {
        scenario: "Virement n'ayant manifestement rien à voir avec un loyer (achat, remboursement, salaire...)",
        tags: [{ label: "Banque connectée ✓", type: "bank" }, { label: "Écarté par l'IA ❌", type: "off" }],
        results: [{ label: "Ignoré (sans rapport avec un loyer)", type: "gray" }],
      },
    ],
  },
];

function tagStyle(type: string): React.CSSProperties {
  const base: React.CSSProperties = { fontSize: 11, padding: "2px 8px", borderRadius: 999, fontWeight: 600, display: "inline-block" };
  if (type === "on") return { ...base, background: GREEN_BG, color: GREEN };
  if (type === "bank") return { ...base, background: BLUE_BG, color: BLUE };
  return { ...base, background: "#f5f0e8", color: MUTE, border: `1px solid ${FIELD_BORDER}` };
}

function pillStyle(type: string): React.CSSProperties {
  const base: React.CSSProperties = { fontSize: 12, padding: "3px 10px", borderRadius: 999, fontWeight: 600, whiteSpace: "nowrap" as const };
  if (type === "green") return { ...base, background: GREEN_BG, color: GREEN };
  if (type === "orange") return { ...base, background: AMBER_BG, color: BROWN };
  if (type === "blue") return { ...base, background: BLUE_BG, color: BLUE };
  return { ...base, background: "#f5f0e8", color: MUTE, border: `1px solid ${FIELD_BORDER}` };
}

function renderStep(step: string) {
  const parts = step.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} style={{ color: INK, fontWeight: 700 }}>{part}</strong> : part
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 20,
  border: `1px solid ${BORDER}`,
  boxShadow: "0 18px 40px -30px rgba(120,53,15,0.4)",
  padding: 24,
};

export default function TutorialPage() {
  const [activeTab, setActiveTab] = useState<"guide" | "auto">("guide");

  return (
    <main style={{ minHeight: "100vh", background: CREAM, padding: 24, fontFamily: body, position: "relative", overflow: "hidden" }}>
      <div style={{ pointerEvents: "none", position: "absolute", right: -120, top: -140, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #ffd166, #f9a826 60%, #f4801f)", opacity: 0.8 }} />

      <div style={{ position: "relative", maxWidth: 760, margin: "0 auto" }}>

        <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: `2px solid ${FIELD_BORDER}`, padding: "9px 16px", borderRadius: 999, fontSize: 14, fontWeight: 700, color: INK, textDecoration: "none", marginBottom: 20 }}>
          ← Accueil
        </Link>

        <p style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: BROWN, marginBottom: 8 }}>Prise en main</p>
        <h1 style={{ fontFamily: display, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: INK, marginBottom: 4 }}>📖 Guide d'utilisation</h1>
        <p style={{ fontSize: 14, color: "#7a684f", marginBottom: 24 }}>Tout ce qu'il faut savoir pour utiliser Loya efficacement.</p>

        {/* ONGLETS */}
        <div style={{ display: "flex", gap: 24, marginBottom: 28, borderBottom: `2px solid ${FIELD_BORDER}` }}>
          {[
            { key: "guide", label: "📖 Guide complet" },
            { key: "auto", label: "⚡ Automatisation" },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as "guide" | "auto")} style={{ padding: "12px 2px", marginBottom: -2, fontSize: 14, fontWeight: 700, fontFamily: body, background: "none", border: "none", cursor: "pointer", borderBottom: `3px solid ${activeTab === tab.key ? ORANGE : "transparent"}`, color: activeTab === tab.key ? INK : MUTE }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ───────── ONGLET GUIDE ───────── */}
        {activeTab === "guide" && (
          <div>
            {/* RÉSUMÉ RAPIDE */}
            <div style={{ background: "linear-gradient(160deg, #ffeccb, #ffdca8)", border: "1px solid #f3cd9a", borderRadius: 20, padding: 24, marginBottom: 24 }}>
              <h2 style={{ fontFamily: display, fontSize: 17, fontWeight: 700, color: INK, marginBottom: 2 }}>⚡ En bref — Les 5 étapes essentielles pour démarrer</h2>
              <p style={{ fontSize: 12.5, color: BROWN, marginBottom: 16 }}>Pour ceux qui ne veulent pas se prendre la tête </p>
              <ol style={{ display: "flex", flexDirection: "column", gap: 10, listStyle: "none", padding: 0, margin: 0 }}>
                {[
                  <>Remplissez votre <strong style={{ color: INK }}>profil</strong> — nom, adresse, IBAN et signature pour vos quittances</>,
                  <>Ajoutez vos <strong style={{ color: INK }}>locataires</strong> — email, loyer et jour d'échéance</>,
                  <>Cliquez sur la carte d'un locataire → onglet <strong style={{ color: INK }}>Automatisation</strong> → activez ce que vous voulez</>,
                  <>Marquez les loyers comme <strong style={{ color: INK }}>payés</strong> — la quittance part automatiquement</>,
                  <>Connectez votre <strong style={{ color: INK }}>banque</strong> depuis l'accueil pour ne plus rien faire du tout</>,
                ].map((txt, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#5c4a2e", lineHeight: 1.5 }}>
                    <span style={{ fontFamily: display, fontWeight: 800, color: BROWN, flexShrink: 0 }}>{i + 1}.</span>
                    <span>{txt}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* SOMMAIRE */}
            <div style={{ ...card, marginBottom: 28 }}>
              <h2 style={{ fontFamily: display, fontSize: 15, fontWeight: 700, color: INK, marginBottom: 16 }}>Sommaire</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[sections.slice(0, 6), sections.slice(6)].map((col, ci) => (
                  <div key={ci} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {col.map((s) => (
                      <a key={s.id} href={`#${s.id}`} style={{ fontSize: 14, color: "#5c4a2e", textDecoration: "none", display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#2563eb"; e.currentTarget.style.textDecoration = "underline"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "#5c4a2e"; e.currentTarget.style.textDecoration = "none"; }}
                      >
                        <span>{s.emoji}</span><span>{s.title}</span>
                      </a>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* SECTIONS */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {sections.map((s) => (
                <div key={s.id} id={s.id} style={card}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 44, height: 44, background: CREAM, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{s.emoji}</div>
                    <h2 style={{ fontFamily: display, fontSize: 18, fontWeight: 700, color: INK }}>{s.title}</h2>
                  </div>
                  <ol style={{ display: "flex", flexDirection: "column", gap: 12, listStyle: "none", padding: 0, margin: 0 }}>
                    {s.steps.map((step, i) => (
                      <li key={i} style={{ display: "flex", gap: 12, fontSize: 14, color: "#5c4a2e", lineHeight: 1.55 }}>
                        <span style={{ flexShrink: 0, width: 22, height: 22, background: CREAM, color: BROWN, border: `1px solid ${FIELD_BORDER}`, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                        <span>{renderStep(step)}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>

            {/* FOOTER */}
            <div style={{ marginTop: 28, background: INK, borderRadius: 20, padding: 28, textAlign: "center" }}>
              <p style={{ fontFamily: display, color: CREAM, fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Vous êtes prêt à utiliser Loya ! 🎉</p>
              <p style={{ color: "rgba(251,241,227,0.75)", fontSize: 14, marginBottom: 20 }}>Commencez par remplir votre profil, puis ajoutez vos locataires.</p>
              <Link href="/profile" style={{ display: "inline-block", background: CREAM, color: INK, padding: "13px 26px", borderRadius: 999, fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
                Commencer par mon profil →
              </Link>
            </div>
          </div>
        )}

        {/* ───────── ONGLET AUTOMATISATION ───────── */}
        {activeTab === "auto" && (
          <div>
            <div style={{ background: "linear-gradient(160deg, #ffeccb, #ffdca8)", border: "1px solid #f3cd9a", borderRadius: 20, padding: 24, marginBottom: 24 }}>
              <h2 style={{ fontFamily: display, fontSize: 17, fontWeight: 700, color: INK, marginBottom: 8 }}>⚡ Comment fonctionne l'automatisation ?</h2>
              <p style={{ fontSize: 14, color: "#5c4a2e", lineHeight: 1.6, margin: 0 }}>
                Chaque locataire a ses propres réglages dans l'onglet <strong style={{ color: INK }}>Automatisation</strong> de sa fiche. Selon ce que vous activez, Loya agit automatiquement. Voici toutes les combinaisons possibles.
              </p>
            </div>

            {/* LÉGENDE */}
            <div style={{ ...card, marginBottom: 24, padding: "16px 20px" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: MUTE, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Conditions (ce que vous avez activé)</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                <span style={tagStyle("on")}>Activé ✓</span>
                <span style={tagStyle("off")}>Désactivé ❌</span>
                <span style={tagStyle("bank")}>Banque connectée / cas bancaire</span>
              </div>
              <p style={{ fontSize: 12, fontWeight: 700, color: MUTE, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Résultats (ce qui se passe)</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={pillStyle("green")}>Fait automatiquement, rien à faire</span>
                <span style={pillStyle("blue")}>Suggestion créée, en attente de votre validation</span>
                <span style={pillStyle("orange")}>Une action de votre part est nécessaire</span>
                <span style={pillStyle("gray")}>Rien ne se passe</span>
              </div>
            </div>

            {/* SCÉNARIOS */}
            {autoScenarios.map((group) => (
              <div key={group.group} style={{ marginBottom: 28 }}>
                <p style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: BROWN, marginBottom: 12 }}>{group.group}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {group.items.map((item, i) => (
                    <div key={i} style={{ background: "#fff", borderRadius: 16, border: `1px solid ${(item as any).highlight ? ORANGE : BORDER}`, padding: "14px 18px", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: INK }}>
                          {(item as any).highlight && <span style={{ background: ORANGE, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, marginRight: 8 }}>Recommandé</span>}
                          {item.scenario}
                        </span>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {item.tags.map((tag, j) => <span key={j} style={tagStyle(tag.type)}>{tag.label}</span>)}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                        {item.results.map((r, j) => <span key={j} style={pillStyle(r.type)}>{r.label}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* FOOTER */}
            <div style={{ marginTop: 8, background: INK, borderRadius: 20, padding: 28, textAlign: "center" }}>
              <p style={{ fontFamily: display, color: CREAM, fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Prêt à tout automatiser ? 🚀</p>
              <p style={{ color: "rgba(251,241,227,0.75)", fontSize: 14, marginBottom: 20 }}>Connectez votre banque et activez toutes les options pour un flow 100% autonome.</p>
              <Link href="/tenants" style={{ display: "inline-block", background: CREAM, color: INK, padding: "13px 26px", borderRadius: 999, fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
                Configurer mes locataires →
              </Link>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
