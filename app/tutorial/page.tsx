"use client";

import Link from "next/link";
import { useState } from "react";

// 🚧 Doit rester synchronisé avec le flag SYNC_ENABLED du dashboard et de
// /documents. Tant qu'il est à false, tout ce qui concerne la banque dans
// ce guide est présenté comme "bientôt disponible" plutôt que comme actif.
const SYNC_ENABLED = false;

const INK = "#1a1208";
const CREAM = "#fbf1e3";
const ORANGE = "#e8590c";
const BROWN = "#b45309";
const MUTE = "#a89372";
const BORDER = "#efe3cd";
const FIELD_BORDER = "#e6d6bb";
const FIELD_BG = "#fdf8ef";
const GREEN = "#1f7a37";
const GREEN_BG = "#e3f3e4";
const BLUE_BG = "#e6f1fb";
const BLUE = "#185fa5";
const AMBER_BG = "#fbeccf";
const MUTE_BG = "#f1ece2";

const display = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";
const mono = "var(--font-mono), 'Space Mono', ui-monospace, monospace";
const body = "var(--font-manrope), 'Manrope', system-ui, sans-serif";

// ── Étapes de la section "Synchronisation bancaire" une fois activée ──
const synchroStepsLive = [
  "Depuis l'accueil, cliquez sur la tuile **Connexion bancaire** puis sur **Connecter** — vous serez redirigé vers une page sécurisée (Bridge) pour connecter votre compte bancaire. Vos identifiants bancaires ne sont jamais stockés par Loya.",
  "Une fois connecté, Loya analyse vos virements automatiquement chaque jour vers **9h en hiver et 10h en été** — pas besoin d'ouvrir l'application pour que ça fonctionne",
  "**Si le nom du locataire et le montant correspondent exactement** au virement reçu → le paiement est coché automatiquement, la quittance est générée et envoyée, sans aucune action de votre part",
  "**Si le libellé bancaire est ambigu** (le montant correspond mais pas le nom, par exemple parce que le virement passe par un tiers, un conjoint, ou une agence) → Loya fait analyser le virement par une IA, qui écarte immédiatement tout ce qui n'a manifestement rien à voir avec un loyer (remboursement, vente, salaire...). Si un doute raisonnable subsiste, le virement apparaît dans l'onglet **🔍 À valider** de la page **Vue globale**, avec le locataire probable et le raisonnement — c'est vous qui tranchez en un clic, l'IA ne décide jamais seule dans les cas ambigus.",
  "**Une fois que vous confirmez** un virement ambigu une première fois, Loya retient la structure du libellé pour ce locataire — les mois suivants, le même type de virement sera reconnu automatiquement, sans repasser par la validation manuelle",
  "**⚠️ Lors de votre première connexion bancaire ou à chaque nouveau locataire, pensez à jeter un œil à l'onglet 🔍 À valider de la page Vue globale — c'est là que les virements ambigus vous attendent tant qu'ils n'ont pas été confirmés au moins une fois. Une fois confirmés, ils sont reconnus tout seuls les mois suivants**",
  "Vous pouvez **déconnecter** votre banque à tout moment depuis la tuile Connexion bancaire sur l'accueil — vos données bancaires sont alors supprimées, pas seulement déliées",
];

// ── Version affichée tant que la synchro n'est pas lancée ──
const synchroStepsComingSoon = [
  "La connexion bancaire automatique n'est **pas encore disponible** sur Loya — elle arrive prochainement",
  "En attendant, tout fonctionne normalement en manuel : marquez chaque loyer comme **payé** depuis la fiche du locataire dès que vous recevez le virement",
  "La **quittance** est générée automatiquement dès qu'un loyer est marqué payé, et envoyée toute seule si vous avez activé l'automatisation correspondante dans l'onglet Automatisation du locataire",
  "Dès que la synchronisation sera activée, vous n'aurez plus besoin de cocher les paiements vous-même : ce guide sera mis à jour et vous serez prévenu",
];

const sections = [
  {
    id: "profil",
    emoji: "👤",
    title: "1. Remplir votre profil",
    steps: [
      "Allez sur la page **Mon profil** depuis l'accueil",
      "Renseignez votre nom complet, adresse, code postal et ville — ces infos apparaîtront sur vos quittances",
      "Choisissez votre genre (homme/femme) pour adapter automatiquement la formulation des quittances",
      "Optionnel: joutez une image de votre signature — elle sera intégrée dans vos quittances PDF",
      "Un modèle par défaut est déjà prêt pour vos emails de relance, quittance et appel de loyer — mais vous pouvez le **personnaliser** si vous le souhaitez, avec les variables {nom_locataire}, {loyer}, {mois}, {nom_proprietaire} remplacées automatiquement à l'envoi",
      "Optionnel: Renseignez votre **IBAN** dans la section Appel de loyer — il sera inclus automatiquement dans les emails d'appel de loyer envoyés à vos locataires",
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
      "Indiquez le **jour d'échéance** (ex: 5 pour le 5 de chaque mois) — c'est la date de référence pour tout le reste : Loya affiche un badge 🔴 **Retard Xj** si le loyer n'est pas payé après cette date, et c'est aussi à partir de ce jour que les relances automatiques (**J, J+7, J+15**...) se déclenchent si vous les avez activées",
      "Optionnel : rattachez le locataire à un bien immobilier via le menu déroulant",
      "Une fois ajouté, **cliquez sur la carte du locataire** pour accéder à sa fiche complète avec 4 onglets : Infos & paiement, Automatisation, Historique et Documents",
    ],
  },
  {
    id: "synchro",
    emoji: "🏦",
    title: "3. Synchronisation bancaire",
    comingSoon: !SYNC_ENABLED,
    steps: SYNC_ENABLED ? synchroStepsLive : synchroStepsComingSoon,
  },
  {
    id: "relances",
    emoji: "🔔",
    title: "4. Envoyer des relances",
    steps: [
      "**Relance manuelle** : depuis l'onglet **Infos & paiement** d'un locataire, cliquez sur **Envoyer une relance** — disponible uniquement si le loyer n'est pas encore payé",
      "**Relance groupée** : depuis la page **Vue globale** (onglet Relances), voyez tous les locataires impayés et cliquez sur **Relancer tous** pour envoyer à tout le monde en une action",
      "**Relance automatique** : depuis l'onglet **Automatisation** d'un locataire, activez la relance auto et choisissez vos paliers (**J, J+7, J+15**...) — Loya envoie automatiquement, tous les jours vers **10h en hiver et 11h en été**, sans intervention de votre part",
      "Si vous avez des locataires en retard, vous recevez aussi un **récapitulatif groupé par email** (au maximum un tous les 7 jours), envoyé vers **10h30 en hiver et 11h30 en été**, pour ne pas avoir à ouvrir l'application pour le savoir",
      "Personnalisez le message et l'objet de l'email depuis Mon profil → section Personnalisation des emails",
      "La date de la dernière relance est visible dans l'onglet **Historique** de chaque fiche locataire",
    ],
  },
  {
    id: "quittances",
    emoji: "📄",
    title: "5. Gérer les quittances",
    steps: [
      SYNC_ENABLED
        ? "Le PDF de la quittance est **toujours généré** dès qu'un loyer est marqué payé — manuellement ou via la synchronisation bancaire. L'envoi automatique par email au locataire dépend de l'option activée dans l'onglet **Automatisation** de sa fiche. Si vous utilisez la synchronisation bancaire, il n'y a **rien à faire : tout se fait automatiquement dès que le virement est détecté**"
        : "Le PDF de la quittance est **toujours généré** dès qu'un loyer est marqué payé. L'envoi automatique par email au locataire dépend de l'option activée dans l'onglet **Automatisation** de sa fiche",
      "Si vous n'avez pas activé l'envoi automatique, vous pouvez l'envoyer vous-même depuis l'onglet **Infos & paiement** en cliquant sur **Envoyer la quittance** — le bouton est grisé si le loyer n'est pas encore payé",
      "Retrouvez toutes les quittances dans l'onglet **Historique** de chaque fiche : télécharger le PDF, envoyer ou renvoyer par email",
      "Personnalisez le message et l'objet de l'email depuis Mon profil → section Personnalisation des emails",
      "Depuis la page **Vue globale** (onglet Quittances), retrouvez l'historique complet de toutes vos quittances avec des filtres par locataire et par mois",
    ],
  },
  {
    id: "appel-loyer",
    emoji: "📨",
    title: "6. Appel de loyer",
    steps: [
      "L'appel de loyer est un email envoyé avant l'échéance pour rappeler au locataire qu'il doit payer — il inclut le montant et, si vous l'avez renseigné dans votre profil, votre IBAN",
      "**Envoi manuel** : depuis l'onglet **Infos & paiement** d'un locataire, cliquez sur **Envoyer un appel de loyer** — disponible à tout moment",
      "**Envoi automatique** : depuis l'onglet **Automatisation** d'un locataire, activez l'appel de loyer automatique — Loya l'envoie automatiquement le **1er de chaque mois**, vers **8h en hiver et 9h en été**",
      "Personnalisez le message et l'objet de l'email depuis **Mon profil** → section IBAN",
      "La date du dernier appel envoyé est visible dans l'onglet **Historique** de la fiche locataire",
    ],
  },
  {
    id: "paiements",
    emoji: "💰",
    title: "7. Suivre les paiements",
    steps: [
      SYNC_ENABLED
        ? "Depuis la fiche d'un locataire (onglet Infos & paiement), cliquez sur Marquer comme payé ce mois — le PDF de la quittance est généré, et si vous avez activé l'automatisation correspondante la quittance est générée et envoyée automatiquement. Si vous utilisez la synchronisation bancaire, il n'y a même pas besoin de cliquer sur Marquer comme payé : tout se fait automatiquement dès que le virement est détecté"
        : "Depuis la fiche d'un locataire (onglet Infos & paiement), cliquez sur **Marquer comme payé ce mois** dès que vous recevez le loyer — le PDF de la quittance est généré, et si vous avez activé l'automatisation correspondante elle est envoyée automatiquement",
      "Le statut se **réinitialise automatiquement chaque 1er du mois** — vous n'avez rien à faire en début de mois",
      "Si vous oubliez de marquer un mois, ou si un locataire paie en retard, allez dans l'onglet **Historique** de la fiche — vous pouvez corriger le statut de n'importe quel mois passé en cliquant dessus, ce qui génère aussi la quittance correspondante",
      "Les **statistiques** (montant encaissé, taux d'encaissement, retards) se mettent à jour en temps réel sur la page d'accueil",
      "Un **badge de retard** s'affiche automatiquement sur la liste des locataires dès que la date d'échéance est dépassée sans paiement",
    ],
  },
  {
    id: "vue-globale",
    emoji: "📋",
    title: "8. Vue globale — tout centralisé au même endroit",
    steps: [
      SYNC_ENABLED
        ? "Depuis l'accueil, cliquez sur la tuile **Vue globale** — cette page regroupe toutes vos communications locatives en un seul endroit, avec 5 onglets"
        : "Depuis l'accueil, cliquez sur la tuile **Vue globale** — cette page regroupe toutes vos communications locatives en un seul endroit",
      "**🔔 Relances** : liste tous les locataires actuellement impayés, avec un bouton **Relancer tous** pour envoyer une relance groupée en un clic — c'est aussi cette liste qui déclenche le bandeau d'alerte sur votre tableau de bord",
      "**📄 Quittances** : historique complet de toutes vos quittances (envoyées ou non), avec des filtres par locataire, par mois et par statut d'envoi",
      "**📨 Appels de loyer** : voyez qui a reçu son appel de loyer ce mois-ci, et renvoyez-en un manuellement si besoin",
      ...(SYNC_ENABLED
        ? [
            "**🔍 À valider** : c'est ici qu'apparaissent les virements bancaires ambigus détectés par l'IA (voir la section Synchronisation bancaire ci-dessus) — vous confirmez ou corrigez le locataire suggéré en un clic, et Loya s'en souvient pour les mois suivants. Un bandeau sur le tableau de bord vous prévient dès qu'un virement y attend votre validation",
            "**🏦 Synchronisations** : historique technique de chaque exécution de la synchro bancaire (nombre de transactions vérifiées, correspondances trouvées) — utile si vous voulez vérifier que tout fonctionne normalement",
          ]
        : [
            "**🔍 À valider** et **🏦 Synchronisations** : ces deux onglets existent déjà mais sont marqués *à venir* — ils s'activeront automatiquement dès que la synchronisation bancaire sera disponible",
          ]),
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
    id: "export",
    emoji: "📊",
    title: "10. Export & Fiscalité",
    steps: [
      "Depuis l'accueil, cliquez sur la tuile **Export & Fiscalité**",
      "Choisissez l'**année fiscale** — seules les années où vous avez des paiements enregistrés apparaissent dans la liste",
      "Cliquez sur **Télécharger l'export (.xlsx)** pour obtenir un fichier Excel contenant, pour chaque paiement : nom du locataire, adresse du bien, montant du loyer, mois concerné, statut (payé/non payé), date de paiement et date d'envoi de la quittance. Chaque colonne est **filtrable** — pratique si vous gérez plusieurs biens et voulez isoler un bien en particulier, ou si vous voulez ne garder que les loyers effectivement encaissés avant de transmettre le fichier à votre comptable ou de faire votre déclaration de revenus fonciers vous-même",
      "**Locataires archivés** : dans l'onglet dédié, retrouvez vos anciens locataires avec le total encaissé sur toute leur période chez vous — leur historique reste inclus dans l'export Excel même après archivage",
      "Vous pouvez **désarchiver** un locataire à tout moment depuis cet onglet s'il revient",
    ],
  },
  {
    id: "biens",
    emoji: "🏠",
    title: "11. Gérer vos biens (optionnel)",
    steps: [
      "La gestion des biens est **optionnelle** — utile si vous possédez plusieurs logements pour savoir quels appartements sont vacants ou occupés",
      "Allez sur **Mes biens** depuis l'accueil, cliquez sur **+ Ajouter un bien** et renseignez l'adresse, la ville, le type et la surface",
      "Depuis la fiche d'un bien, rattachez ou retirez des locataires et consultez le loyer total et le statut de paiement de chaque locataire",
      "Un bien peut accueillir **plusieurs locataires** — pratique pour les colocations",
      "Le statut **Vacant / Occupé** se met à jour automatiquement selon les locataires rattachés",
    ],
  },
];

const configProfiles = [
  {
    id: "manuel",
    emoji: "🔧",
    title: "Manuel",
    subtitle: "Vous gardez le contrôle total",
    toggles: [
      { label: "Banque ❌", type: "off" },
      { label: "Relance auto ❌", type: "off" },
      { label: "Quittance auto ❌", type: "off" },
      { label: "Appel loyer auto ❌", type: "off" },
    ],
    daily: [
      "Vous cochez chaque loyer payé vous-même, dans la fiche du locataire",
      "Vous envoyez les relances et les appels de loyer à la main",
      "Vous envoyez chaque quittance manuellement",
    ],
    goodFor: "Idéal si vous avez peu de locataires et préférez tout vérifier vous-même",
  },
  {
    id: "semi",
    emoji: "⚖️",
    title: "Semi-automatique",
    subtitle: "Les emails partent seuls, vous cochez les paiements",
    toggles: [
      { label: "Banque ❌", type: "off" },
      { label: "Relance auto ✓", type: "on" },
      { label: "Quittance auto ✓", type: "on" },
      { label: "Appel loyer auto ✓", type: "on" },
    ],
    daily: [
      "L'appel de loyer et les relances partent automatiquement, sans que vous y pensiez",
      "Vous marquez chaque loyer comme payé quand vous le recevez",
      "La quittance part automatiquement dès que vous cochez le paiement",
    ],
    goodFor: SYNC_ENABLED
      ? "Idéal si vous ne voulez pas connecter votre banque mais voulez automatiser les emails"
      : "C'est la configuration la plus automatisée possible pour le moment — la banque arrive bientôt",
    highlight: !SYNC_ENABLED,
  },
  {
    id: "auto",
    emoji: "🚀",
    title: SYNC_ENABLED ? "Tout automatique" : "Tout automatique (bientôt disponible)",
    subtitle: "Banque connectée, zéro action au quotidien",
    comingSoon: !SYNC_ENABLED,
    toggles: [
      { label: SYNC_ENABLED ? "Banque ✓" : "Banque (bientôt)", type: SYNC_ENABLED ? "on" : "off" },
      { label: "Relance auto ✓", type: "on" },
      { label: "Quittance auto ✓", type: "on" },
      { label: "Appel loyer auto ✓", type: "on" },
    ],
    daily: [
      "Vos loyers sont détectés et cochés tout seuls, dès qu'ils arrivent sur votre compte",
      "Quittance générée et envoyée automatiquement — vos locataires la reçoivent sans que vous leviez le petit doigt",
      "Un locataire en retard ? La relance part sans vous, et s'annule automatiquement dès qu'il paie",
      "Seule exception : le premier mois, ou à l'arrivée d'un nouveau locataire, si un virement est considéré comme ambigu, il apparaît dans l'onglet 🔍 À valider dans Vue globale pour une confirmation manuelle",
    ],
    goodFor: "Idéal si vous voulez le moins d'actions possible au quotidien — en attendant, utilisez la configuration Semi-automatique",
    highlight: SYNC_ENABLED,
  },
];

const faqItems = [
  {
    q: "Un virement bancaire est ambigu (le nom ne correspond pas par exemple), que se passe-t-il ?",
    a: "Loya fait analyser le virement par une IA qui écarte ce qui n'a manifestement rien à voir avec un loyer. Si un doute raisonnable subsiste, il apparaît dans l'onglet 🔍 À valider — c'est vous qui tranchez en un clic, l'IA ne décide jamais seule.",
  },
  {
    q: "J'ai déjà confirmé ce type de virement le mois dernier, dois-je le refaire ?",
    a: "Non — une fois confirmé une première fois, Loya retient la structure du virement pour ce locataire et le reconnaît automatiquement les mois suivants.",
  },
  {
    q: "Un virement est détecté alors que j'avais déjà coché le loyer manuellement, est-ce que ça crée un doublon ?",
    a: "Aucun risque : si le loyer est déjà marqué payé, la détection bancaire ne fait rien de plus.",
  },
  {
    q: "La relance automatique était programmée le matin, mais le locataire paie entre-temps — la relance part quand même ?",
    a: "Non, si la banque détecte le paiement avant l'heure d'envoi de la relance, celle-ci est automatiquement annulée.",
  },
];

function tagStyle(type: string): React.CSSProperties {
  const base: React.CSSProperties = { fontSize: 11, padding: "2px 8px", borderRadius: 999, fontWeight: 600, display: "inline-block" };
  if (type === "on") return { ...base, background: GREEN_BG, color: GREEN };
  if (type === "bank") return { ...base, background: BLUE_BG, color: BLUE };
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

  const soonBadge: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: MUTE, background: MUTE_BG, padding: "1px 7px", borderRadius: 999, marginLeft: 6, display: "inline-block", verticalAlign: "middle" };

  // Les 6 étapes restent toujours les mêmes — seul un badge "à venir" s'ajoute
  // sur celles qui dépendent de la synchro bancaire tant qu'elle n'est pas active.
  const enBref = [
    <>Remplissez votre <strong style={{ color: INK }}>profil</strong> — nom, adresse et signature pour vos quittances. L'IBAN est facultatif, à ajouter seulement si vous voulez l'inclure dans vos appels de loyer</>,
    <>Ajoutez vos <strong style={{ color: INK }}>locataires</strong> — email, loyer et jour d'échéance</>,
    <>Cliquez sur la carte d'un locataire → onglet <strong style={{ color: INK }}>Automatisation</strong> → activez ce que vous voulez</>,
    <>Connectez votre <strong style={{ color: INK }}>banque</strong> depuis l'accueil pour détecter vos loyers reçus automatiquement {!SYNC_ENABLED && <span style={soonBadge}>à venir</span>} — ou marquez-les comme <strong style={{ color: INK }}>payés</strong> vous-même chaque mois. Dans les deux cas, les automatisations activées à l'étape précédente (quittance, relances...) se déclenchent toutes seules</>,
    <>⚠️Le premier mois, jetez un œil à l'onglet <strong style={{ color: INK }}>"À valider"</strong> {!SYNC_ENABLED && <span style={soonBadge}>à venir</span>} — les cas évidents sont validés automatiquement, mais certains virements ambigus vous seront proposés pour confirmation. Une fois confirmés, ils sont reconnus tout seuls les mois suivants</>,
    <>Sur l'accueil, deux bandeaux vous préviennent automatiquement quand une action est nécessaire : un si des <strong style={{ color: INK }}>locataires sont en retard</strong>, un autre si des <strong style={{ color: INK }}>virements bancaires attendent votre validation</strong> {!SYNC_ENABLED && <span style={soonBadge}>à venir</span>} — pas besoin d'aller chercher, Loya vous le signale</>,
  ];

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
              <h2 style={{ fontFamily: display, fontSize: 17, fontWeight: 700, color: INK, marginBottom: 2 }}>
                ⚡ En bref — Les {enBref.length} étapes essentielles à savoir pour démarrer
              </h2>
              <p style={{ fontSize: 12.5, color: BROWN, marginBottom: 16 }}>Pour ceux qui ne veulent pas se prendre la tête </p>
              <ol style={{ display: "flex", flexDirection: "column", gap: 10, listStyle: "none", padding: 0, margin: 0 }}>
                {enBref.map((txt, i) => (
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
                      <a key={s.id} href={`#${s.id}`} style={{ fontSize: 14, color: "#5c4a2e", textDecoration: "none", display: "flex", alignItems: "flex-start", gap: 8, fontWeight: 600 }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#2563eb"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "#5c4a2e"; }}
                      >
                        <span style={{ flexShrink: 0 }}>{s.emoji}</span>
                        <span>
                          {s.title}
                          {(s as any).comingSoon && (
                            <> <span style={{ fontSize: 10, fontWeight: 700, color: MUTE, background: MUTE_BG, padding: "1px 7px", borderRadius: 999, display: "inline-block" }}>à venir</span></>
                          )}
                        </span>
                      </a>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* SECTIONS */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {sections.map((s) => (
                <div key={s.id} id={s.id} style={{ ...card, ...((s as any).comingSoon ? { opacity: 0.85, background: "#fdfbf6" } : {}) }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                    <div style={{ width: 44, height: 44, background: CREAM, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{s.emoji}</div>
                    <h2 style={{ fontFamily: display, fontSize: 18, fontWeight: 700, color: INK }}>{s.title}</h2>
                    {(s as any).comingSoon && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: MUTE, background: MUTE_BG, padding: "3px 10px", borderRadius: 999 }}>🚧 à venir</span>
                    )}
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
                Chaque locataire a ses propres réglages dans l'onglet <strong style={{ color: INK }}>Automatisation</strong> de sa fiche. Voici 3 configurations types pour vous aider à choisir celle qui vous correspond
                {!SYNC_ENABLED && <> — la connexion bancaire arrivant bientôt, la configuration <strong style={{ color: INK }}>Semi-automatique</strong> est pour l'instant la plus poussée possible</>}.
              </p>
            </div>

            {/* CONFIGURATIONS */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
              {configProfiles.map((profile) => (
                <div key={profile.id} style={{ background: "#fff", borderRadius: 20, border: `2px solid ${profile.highlight ? ORANGE : BORDER}`, padding: 22, position: "relative", ...((profile as any).comingSoon ? { opacity: 0.8 } : {}) }}>
                  {profile.highlight && (
                    <span style={{ position: "absolute", top: -12, left: 20, background: ORANGE, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999 }}>
                      Recommandé
                    </span>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 44, height: 44, background: CREAM, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{profile.emoji}</div>
                    <div>
                      <h3 style={{ fontFamily: display, fontSize: 18, fontWeight: 700, color: INK, margin: 0 }}>{profile.title}</h3>
                      <p style={{ fontSize: 13, color: MUTE, margin: 0 }}>{profile.subtitle}</p>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                    {profile.toggles.map((t, i) => <span key={i} style={tagStyle(t.type)}>{t.label}</span>)}
                  </div>

                  <p style={{ fontSize: 12, fontWeight: 700, color: MUTE, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Au quotidien</p>
                  <ul style={{ display: "flex", flexDirection: "column", gap: 6, listStyle: "none", padding: 0, margin: "0 0 14px" }}>
                    {profile.daily.map((d, i) => (
                      <li key={i} style={{ display: "flex", gap: 8, fontSize: 14, color: "#5c4a2e", lineHeight: 1.45 }}>
                        <span style={{ flexShrink: 0 }}>•</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>

                  <p style={{ fontSize: 13, fontWeight: 600, color: BROWN, margin: 0 }}>💡 {profile.goodFor}</p>
                </div>
              ))}
            </div>

            {/* FAQ — cas particuliers */}
            <div style={card}>
              <h2 style={{ fontFamily: display, fontSize: 16, fontWeight: 700, color: INK, marginBottom: 4 }}>❓ Cas particuliers</h2>
              <p style={{ fontSize: 12.5, color: MUTE, marginBottom: 16 }}>
                {SYNC_ENABLED
                  ? "Des questions plus précises sur des situations rares"
                  : "Ces cas concernent la synchronisation bancaire, à venir prochainement — gardez cette section sous le coude pour quand elle sera activée"}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: SYNC_ENABLED ? 1 : 0.75 }}>
                {faqItems.map((item, i) => (
                  <details key={i} style={{ background: FIELD_BG, borderRadius: 12, border: `1px solid ${FIELD_BORDER}`, padding: "12px 16px" }}>
                    <summary style={{ fontSize: 14, fontWeight: 700, color: INK, cursor: "pointer" }}>{item.q}</summary>
                    <p style={{ fontSize: 13.5, color: "#5c4a2e", marginTop: 8, marginBottom: 0, lineHeight: 1.5 }}>{item.a}</p>
                  </details>
                ))}
              </div>
            </div>

            {/* FOOTER */}
            <div style={{ marginTop: 24, background: INK, borderRadius: 20, padding: 28, textAlign: "center" }}>
              <p style={{ fontFamily: display, color: CREAM, fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
                {SYNC_ENABLED ? "Prêt à tout automatiser ? 🚀" : "Prêt à automatiser vos emails ? 🚀"}
              </p>
              <p style={{ color: "rgba(251,241,227,0.75)", fontSize: 14, marginBottom: 20 }}>
                {SYNC_ENABLED
                  ? "Connectez votre banque et activez toutes les options pour un flow 100% autonome."
                  : "Activez les relances, quittances et appels de loyer automatiques dès maintenant — la banque suivra bientôt."}
              </p>
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
