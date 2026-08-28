import type { Metadata } from "next";
import { Toaster } from "sonner";
import "@xyflow/react/dist/style.css";
import "./globals.css";

export const metadata: Metadata = { title: "AI Decision Flow", description: "Visual Inngest-powered AI workflow routing" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<Toaster theme="dark" richColors position="top-right" /></body></html>;
}
