import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gestion Locative",
  description: "Gérez vos locataires facilement",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: "10px",
              fontSize: "14px",
            },
            success: {
              style: {
                background: "#f0fdf4",
                border: "1px solid #86efac",
                color: "#166534",
              },
            },
            error: {
              style: {
                background: "#fef2f2",
                border: "1px solid #fca5a5",
                color: "#991b1b",
              },
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
