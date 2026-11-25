import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VozAdmin — inteligencia para tu negocio",
  description: "Administra tu negocio conversando con PULSO, tu asistente operativo.",
  applicationName: "VozAdmin",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: "#101b19",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}