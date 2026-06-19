import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-10 text-center">

      <h1 className="text-4xl font-bold mb-4">
        🏠 Gestion locative automatisée
      </h1>

      <p className="text-gray-600 mb-8 max-w-md">
        Gère tes locataires, relances de loyers et quittances automatiquement.
      </p>

      <Link
        href="/tenants"
        className="bg-blue-600 text-white px-6 py-3 rounded-lg"
      >
        Accéder à l’application
      </Link>

    </main>
  );
}
