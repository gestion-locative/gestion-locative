"use client";

import Link from "next/link";
import { useState } from "react";

export default function InstallPage() {
  const [selected, setSelected] = useState<"iphone" | "android" | null>(null);

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-2xl mx-auto">

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-100 transition mb-6"
        >
          ← Accueil
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">📱 Installer Loya</h1>
        <p className="text-sm text-gray-500 mb-8">
          Ajoutez Loya sur l'écran d'accueil de votre téléphone pour y accéder en un seul tap, comme une vraie application.
        </p>

        {/* CHOIX DU TÉLÉPHONE */}
        <p className="text-sm font-medium text-gray-700 mb-3">Quel téléphone avez-vous ?</p>
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setSelected("iphone")}
            className={`p-6 rounded-xl border-2 transition-all text-left ${
              selected === "iphone"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <p className="text-3xl mb-2"></p>
            <p className="font-semibold text-gray-900">iPhone</p>
            <p className="text-xs text-gray-400 mt-1">iOS · Safari</p>
          </button>

          <button
            onClick={() => setSelected("android")}
            className={`p-6 rounded-xl border-2 transition-all text-left ${
              selected === "android"
                ? "border-green-500 bg-green-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <p className="text-3xl mb-2">🤖</p>
            <p className="font-semibold text-gray-900">Android</p>
            <p className="text-xs text-gray-400 mt-1">Chrome · Samsung</p>
          </button>
        </div>

        {/* INSTRUCTIONS IPHONE */}
        {selected === "iphone" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
               Instructions pour iPhone
            </h2>

            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">1</div>
                <div>
                  <p className="font-medium text-gray-900">Ouvrez Safari</p>
                  <p className="text-sm text-gray-500 mt-1">Loya doit être ouvert dans <strong>Safari</strong> — ça ne fonctionne pas avec Chrome sur iPhone pour cette fonctionnalité.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">2</div>
                <div>
                  <p className="font-medium text-gray-900">Appuyez sur le bouton Partager</p>
                  <p className="text-sm text-gray-500 mt-1">En bas de l'écran, appuyez sur l'icône <strong>carré avec une flèche qui pointe vers le haut</strong> ↑</p>
                  <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3 text-center text-2xl">
                    ↑
                  </div>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">3</div>
                <div>
                  <p className="font-medium text-gray-900">Faites défiler et appuyez sur "Sur l'écran d'accueil"</p>
                  <p className="text-sm text-gray-500 mt-1">Dans le menu qui s'ouvre, faites défiler vers le bas jusqu'à trouver <strong>"Sur l'écran d'accueil"</strong> et appuyez dessus.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">4</div>
                <div>
                  <p className="font-medium text-gray-900">Nommez l'application et confirmez</p>
                  <p className="text-sm text-gray-500 mt-1">Une fenêtre s'ouvre — vous pouvez renommer l'icône <strong>"Loya"</strong> puis appuyez sur <strong>Ajouter</strong> en haut à droite.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">✓</div>
                <div>
                  <p className="font-medium text-gray-900">C'est fait !</p>
                  <p className="text-sm text-gray-500 mt-1">L'icône Loya apparaît sur votre écran d'accueil. Appuyez dessus pour ouvrir l'application directement, sans retaper l'adresse.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INSTRUCTIONS ANDROID */}
        {selected === "android" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              🤖 Instructions pour Android
            </h2>

            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">1</div>
                <div>
                  <p className="font-medium text-gray-900">Ouvrez Chrome</p>
                  <p className="text-sm text-gray-500 mt-1">Ouvrez Loya dans <strong>Google Chrome</strong> sur votre téléphone Android.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">2</div>
                <div>
                  <p className="font-medium text-gray-900">Appuyez sur les trois points</p>
                  <p className="text-sm text-gray-500 mt-1">En haut à droite de Chrome, appuyez sur les <strong>trois points ⋮</strong> pour ouvrir le menu.</p>
                  <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3 text-center text-2xl">
                    ⋮
                  </div>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">3</div>
                <div>
                  <p className="font-medium text-gray-900">Appuyez sur "Ajouter à l'écran d'accueil"</p>
                  <p className="text-sm text-gray-500 mt-1">Dans le menu, appuyez sur <strong>"Ajouter à l'écran d'accueil"</strong> ou <strong>"Installer l'application"</strong> selon votre version d'Android.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">4</div>
                <div>
                  <p className="font-medium text-gray-900">Confirmez</p>
                  <p className="text-sm text-gray-500 mt-1">Une fenêtre de confirmation apparaît — appuyez sur <strong>Ajouter</strong> ou <strong>Installer</strong>.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">✓</div>
                <div>
                  <p className="font-medium text-gray-900">C'est fait !</p>
                  <p className="text-sm text-gray-500 mt-1">L'icône Loya apparaît sur votre écran d'accueil. Appuyez dessus pour ouvrir l'application directement, sans retaper l'adresse.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SI RIEN DE SÉLECTIONNÉ */}
        {!selected && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
            <p className="text-gray-400 text-sm">Sélectionnez votre téléphone ci-dessus pour voir les instructions</p>
          </div>
        )}

      </div>
    </main>
  );
}