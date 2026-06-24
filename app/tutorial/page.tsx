"use client";

import Link from "next/link";

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
      "Cliquez sur **Enregistrer** (le bouton devient bleu dès qu'une modification est détectée)",
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

const colorMap: Record<string, string> = {
  purple: "bg-purple-50 border-purple-200 text-purple-700",
  green: "bg-green-50 border-green-200 text-green-700",
  blue: "bg-blue-50 border-blue-200 text-blue-700",
  amber: "bg-amber-50 border-amber-200 text-amber-700",
  red: "bg-red-50 border-red-200 text-red-700",
};

const iconColorMap: Record<string, string> = {
  purple: "bg-purple-100",
  green: "bg-green-100",
  blue: "bg-blue-100",
  amber: "bg-amber-100",
  red: "bg-red-100",
};

function renderStep(step: string) {
  // Gère le **texte en gras**
  const parts = step.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

export default function TutorialPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-3xl mx-auto">

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-100 transition mb-6"
        >
          ← Accueil
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">📖 Guide d'utilisation</h1>
        <p className="text-gray-500 text-sm mb-8">
          Tout ce qu'il faut savoir pour utiliser Loya efficacement.
        </p>

        {/* RÉSUMÉ RAPIDE */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
            <h2 className="text-sm font-semibold text-blue-700 mb-1">⚡ En bref — les 5 choses essentielles</h2>
            <p className="text-xs text-blue-400 mb-3">Pour les flemmards qui ne liront pas le reste (on vous a vus 👀)</p>
            <ol className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-blue-700">
                <span className="font-bold flex-shrink-0">1.</span>
                <span>Remplissez votre <strong>profil</strong> (nom, adresse, signature) — ces infos apparaîtront sur vos quittances</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-blue-700">
                <span className="font-bold flex-shrink-0">2.</span>
                <span>Ajoutez vos <strong>locataires</strong> avec leur email, loyer et date d'échéance</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-blue-700">
                <span className="font-bold flex-shrink-0">3.</span>
                <span>Marquez les loyers comme <strong>payés</strong> chaque mois — une quittance PDF est générée automatiquement</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-blue-700">
                <span className="font-bold flex-shrink-0">4.</span>
                <span>Envoyez des <strong>relances</strong> manuellement ou activez les relances automatiques par locataire</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-blue-700">
                <span className="font-bold flex-shrink-0">5.</span>
                <span>Retrouvez toutes vos <strong>quittances</strong> et relances dans la page Relances & Quittances</span>
                </li>
            </ol>
            </div>

        {/* SOMMAIRE */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Sommaire</h2>
            <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-2">
                {sections.slice(0, 4).map((s) => (
                    <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="text-sm text-gray-600 hover:text-blue-600 hover:underline flex items-center gap-2"
                    >
                    <span>{s.emoji}</span>
                    <span>{s.title}</span>
                    </a>
                ))}
                </div>
                <div className="flex flex-col gap-2">
                {sections.slice(4).map((s) => (
                    <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="text-sm text-gray-600 hover:text-blue-600 hover:underline flex items-center gap-2"
                    >
                    <span>{s.emoji}</span>
                    <span>{s.title}</span>
                    </a>
                ))}
                </div>
            </div>
            </div>

        {/* SECTIONS */}
        <div className="space-y-6">
          {sections.map((s) => (
            <div
              key={s.id}
              id={s.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 ${iconColorMap[s.color]} rounded-lg flex items-center justify-center text-xl`}>
                  {s.emoji}
                </div>
                <h2 className="text-lg font-semibold text-gray-900">{s.title}</h2>
              </div>

              <ol className="space-y-3">
                {s.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-600">
                    <span className={`flex-shrink-0 w-5 h-5 ${colorMap[s.color]} border rounded-full flex items-center justify-center text-xs font-medium`}>
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
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <p className="text-blue-700 font-medium mb-2">Vous êtes prêt à utiliser Loya ! 🎉</p>
          <p className="text-blue-600 text-sm mb-4">Commencez par remplir votre profil, puis ajoutez vos biens et locataires.</p>
          <Link
            href="/profile"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
          >
            Commencer par mon profil →
          </Link>
        </div>

      </div>
    </main>
  );
}