import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mostrador — Sistema de Gestión Comercial",
  description: "Facturación, control de stock y cuenta corriente comercial",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen bg-[#f5f6f2] text-brand-950">
        {children}
      </body>
    </html>
  );
}
