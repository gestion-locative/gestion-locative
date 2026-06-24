"use client";

import Link from "next/link";

/* ------------------------------------------------------------------
   Guide d'utilisation Loya — thème solaire, styles 100% en ligne.
   Tout le contenu (sections, résumé, sommaire, footer) est identique.
------------------------------------------------------------------- */

const INK = "#1a1208";
const CREAM = "#fbf1e3";
const BROWN = "#b45309";
const MUTE = "#a89372";
const BORDER = "#efe3cd";
const FIELD_BORDER = "#e6d6bb";

const display = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";
const mono = "var(--font-mono), 'Space Mono', ui-monospace, monospace";
const body = "var(--font-manrope), 'Manrope', system-ui, sans-serif";

const sections = [
  {
    id: "profil",
    emoji: "👤",
    title: "1. Remplir votre profil",
    color: "purple",
    steps: [
      "Allez sur la page **Mon profil** depuis l'accueil",
      "Renseignez votre nom complet, adresse, code postal et ville — ces infos apparaîtront sur vos quittances",
      "Choisissez votre genre (homme/femme) pour adapter automatiquement la formulation des quittances",
      "Optionnel : ajoutez une image de votre signature — elle sera intégrée dans vos quittances PDF",
      "Un modèle d'email professionnel est déjà configuré par défaut pour vos relances et quittances — vous pouvez le personnaliser à votre guise grâce aux variables {nom_locataire}, {loyer}, {mois}, {nom_proprietaire} qui seront automatiquement remplacées par les vraies valeurs à l'envoi",
      "Cliquez sur **Enregistrer** (le bouton se met en avant dès qu'une modification est détectée)",
    ],
  },
  {
    id: "locataires",
    emoji: "👥",
    title: "2. Ajouter vos locataires",
    color: "blue",
    steps: [
      "Depuis l'accueil, cliquez sur **Mes locataires** puis sur **+ Ajouter un locataire**",
      "Renseignez le **nom** (affiché partout dans l'appli), l'**email** (utilisé pour envoyer les relances et quittances automatiquement) et le **téléphone** (affiché sur la fiche pour vous permettre de le contacter rapidement en cas de besoin)",
      "Indiquez le **montant du loyer mensuel** — il apparaîtra sur les quittances PDF et sera comptabilisé dans vos statistiques mensuelles",
      "Indiquez le **jour du mois** auquel le loyer doit être payé (ex: 5 pour le 5 de chaque mois) — l'appli affichera automatiquement un badge 🔴 Retard Xj si le locataire n'a pas payé après cette date, et déclenchera les relances automatiques aux paliers configurés",
      "Optionnel : rattachez le locataire à un bien immobilier via le menu déroulant — utile si vous gérez plusieurs appartements et voulez savoir quel locataire occupe quel bien",
      "Une fois ajouté, cliquez sur **Voir le dossier** pour accéder à la fiche complète : suivi des paiements mois par mois, envoi de relances, téléchargement des quittances et gestion des documents (bail, état des lieux...)",
    ],
  },
  {
    id: "paiements",
    emoji: "💰",
    title: "3. Suivre les paiements",
    color: "amber",
    steps: [
      "Depuis la fiche d'un locataire, cliquez sur **Marquer comme payé ce mois** dès que le loyer est encaissé — une quittance PDF est générée automatiquement à ce moment-là",
      "Le statut de paiement se **réinitialise automatiquement chaque 1er du mois** — vous n'avez rien à faire manuellement en début de mois",
      "Si vous oubliez de marquer un mois, pas de panique : l'**historique des paiements** en bas de chaque fiche locataire liste tous les mois passés et vous permet de corriger le statut d'un mois en cliquant dessus",
      "Sur la page d'accueil, les **statistiques** (montant encaissé, taux d'encaissement, locataires en retard) se mettent à jour en temps réel dès qu'un paiement est enregistré",
      "Un **badge de retard** s'affiche automatiquement sur la liste des locataires (ex: 🔴 Retard 5j) dès que la date d'échéance est dépassée sans paiement",
    ],
  },
  {
    id: "relances",
    emoji: "🔔",
    title: "4. Envoyer des relances",
    color: "red",
    steps: [
      "**Relance manuelle depuis la fiche** : ouvrez la fiche d'un locataire et cliquez sur **Envoyer une relance** — l'email part immédiatement avec le texte que vous avez personnalisé dans votre profil",
      "**Relance groupée** : depuis la page **Relances & Quittances**, voyez d'un seul coup d'œil tous les locataires impayés et cliquez sur **Relancer tous** pour envoyer à tout le monde en une seule action",
      "**Relance automatique** : depuis le formulaire d'ajout ou de modification d'un locataire, activez la relance automatique et choisissez vos paliers (ex: J, J+7, J+15) — l'appli envoie automatiquement les emails aux bons jours sans que vous ayez à intervenir",
      "Les relances automatiques partent **chaque matin** pour les locataires concernés — la date de la dernière relance envoyée est visible sur chaque fiche locataire",
      "Sur chaque locataire dans la page Relances, vous voyez si une **relance automatique est activée** et à quels paliers, pour savoir ce qui est déjà pris en charge automatiquement",
    ],
  },
  {
    id: "quittances",
    emoji: "📄",
    title: "5. Gérer les quittances",
    color: "amber",
    steps: [
      "Les quittances sont générées **automatiquement** dès qu'un loyer est marqué payé — voir **Suivre les paiements**",
      "Pour chaque quittance : **Télécharger** pour ouvrir le PDF, **Envoyer** pour l'envoyer par email directement au locataire, ou **Supprimer** si besoin",
      "Elles contiennent automatiquement toutes les informations légales : vos coordonnées propriétaire, les infos du locataire, le montant, la période concernée et votre signature",
      "Depuis la page **Relances & Quittances** (onglet Quittances), retrouvez l'historique complet de toutes vos quittances classées du plus récent au plus ancien",
    ],
  },
  {
    id: "documents",
    emoji: "📁",
    title: "6. Gérer les documents",
    color: "blue",
    steps: [
      "Depuis la fiche d'un locataire, scrollez jusqu'à la section **Documents** — c'est ici que vous centralisez tous les documents importants liés à ce locataire",
      "Choisissez le type de document dans le menu déroulant : **Bail, État des lieux (entrée), État des lieux (sortie), Certificat d'assurance, Pièce d'identité, Justificatif de revenus** ou Autre",
      "Cliquez sur **Ajouter un document**, sélectionnez votre fichier (PDF, JPG ou PNG) — il est stocké de façon sécurisée et accessible à tout moment",
      "Cliquez sur **Voir** pour ouvrir un document directement dans votre navigateur, ou **Supprimer** pour le retirer définitivement",
    ],
  },
  {
    id: "biens",
    emoji: "🏠",
    title: "7. Gérer vos biens (optionnel)",
    color: "green",
    steps: [
      "La gestion des biens est **optionnelle** mais très utile si vous possédez plusieurs logements — elle vous permet de regrouper vos locataires par bien, de savoir quels logements sont vacants ou occupés, et de voir en un coup d'œil le loyer total généré par chaque bien",
      "Allez sur **Mes biens** depuis l'accueil, cliquez sur **+ Ajouter un bien** et renseignez l'adresse, la ville, le type (appartement, maison...) et la surface",
      "Depuis la fiche d'un bien, vous pouvez **rattacher** ou retirer des locataires, et voir en un coup d'œil le loyer total du bien et le statut de paiement de chaque locataire ce mois-ci",
      "Un bien peut accueillir **plusieurs locataires** — pratique si vous gérez des colocations",
      "Le statut **Vacant / Occupé** se met à jour automatiquement selon le nombre de locataires rattachés au bien",
    ],
  },
];

function renderStep(step: string) {
  // Gère le **texte en gras**
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

      <div style={{ position: "relative", maxWidth: 760, margin: "0 auto" }}>

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
          Prise en main
        </p>
        <h1 style={{ fontFamily: display, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: INK, marginBottom: 4 }}>
          📖 Guide d'utilisation
        </h1>
        <p style={{ fontSize: 14, color: "#7a684f", marginBottom: 28 }}>
          Tout ce qu'il faut savoir pour utiliser Loya efficacement.
        </p>

        {/* RÉSUMÉ RAPIDE */}
        <div style={{ background: "linear-gradient(160deg, #ffeccb, #ffdca8)", border: "1px solid #f3cd9a", borderRadius: 20, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontFamily: display, fontSize: 17, fontWeight: 700, color: INK, marginBottom: 2 }}>⚡ En bref — les 5 choses essentielles</h2>
          <p style={{ fontSize: 12.5, color: BROWN, marginBottom: 16 }}>Pour les flemmards qui ne liront pas le reste (on vous a vus 👀)</p>
          <ol style={{ display: "flex", flexDirection: "column", gap: 10, listStyle: "none", padding: 0, margin: 0 }}>
            {[
              <>Remplissez votre <strong style={{ color: INK }}>profil</strong> (nom, adresse, signature) — ces infos apparaîtront sur vos quittances</>,
              <>Ajoutez vos <strong style={{ color: INK }}>locataires</strong> avec leur email, loyer et date d'échéance</>,
              <>Marquez les loyers comme <strong style={{ color: INK }}>payés</strong> chaque mois — une quittance PDF est générée automatiquement</>,
              <>Envoyez des <strong style={{ color: INK }}>relances</strong> manuellement ou activez les relances automatiques par locataire</>,
              <>Retrouvez toutes vos <strong style={{ color: INK }}>quittances</strong> et relances dans la page Relances & Quittances</>,
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
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                style={{ fontSize: 14, color: "#5c4a2e", textDecoration: "none", display: "flex", alignItems: "center", gap: 8, fontWeight: 600, transition: "color .15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#2563eb"; e.currentTarget.style.textDecoration = "underline"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#5c4a2e"; e.currentTarget.style.textDecoration = "none"; }}
                >
                <span>{s.emoji}</span>
                <span>{s.title}</span>
            </a>
            ))}
          </div>
        </div>

        {/* SECTIONS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {sections.map((s) => (
            <div key={s.id} id={s.id} style={card}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, background: CREAM, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                  {s.emoji}
                </div>
                <h2 style={{ fontFamily: display, fontSize: 18, fontWeight: 700, color: INK }}>{s.title}</h2>
              </div>

              <ol style={{ display: "flex", flexDirection: "column", gap: 12, listStyle: "none", padding: 0, margin: 0 }}>
                {s.steps.map((step, i) => (
                  <li key={i} style={{ display: "flex", gap: 12, fontSize: 14, color: "#5c4a2e", lineHeight: 1.55 }}>
                    <span style={{
                      flexShrink: 0, width: 22, height: 22, background: CREAM, color: BROWN,
                      border: `1px solid ${FIELD_BORDER}`, borderRadius: 999,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700,
                    }}>
                      {i + 1}
                    </span>
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
          <p style={{ color: "rgba(251,241,227,0.75)", fontSize: 14, marginBottom: 20 }}>Commencez par remplir votre profil, puis ajoutez vos biens et locataires.</p>
          <Link
            href="/profile"
            style={{
              display: "inline-block", background: CREAM, color: INK,
              padding: "13px 26px", borderRadius: 999, fontSize: 15, fontWeight: 700, textDecoration: "none",
            }}
          >
            Commencer par mon profil →
          </Link>
        </div>

      </div>
    </main>
  );
}
