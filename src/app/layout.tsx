import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "CallPilot AI - Your AI Assistant for Every Missed Call",
  description: "Never lose a customer to a missed call. CallPilot AI automatically follows up with customers, understands their intent, collects structured details, evaluates conditional workflows, and automates Google Calendar bookings.",
  keywords: "voice ai, missed call assistant, automated booking, google calendar tool, ai receptionist, customer intake, multilingual hindi ai",
  openGraph: {
    title: "CallPilot AI - Missed Call Voice Assistant",
    description: "Automate customer intake, appointments, and logistics workflows seamlessly on every missed call.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased light">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
