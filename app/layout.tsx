import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = "https://1victorx.github.io/vinte-memorias-vitoria/";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const iconBase = basePath ? siteUrl : "http://localhost:3000/";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "20 memórias para Vitória",
  description:
    "Um presente de aniversário contado em vinte memórias, fotografias, músicas e pequenos segredos.",
  applicationName: "20 memórias para Vitória",
  authors: [{ name: "Victor" }],
  keywords: ["Vitória", "20 memórias", "aniversário", "presente", "amor"],
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "20 memórias para Vitória",
    title: "20 memórias para Vitória",
    description:
      "Um passeio por vinte capítulos de uma história feita de amor, flores e música.",
    images: [
      {
        url: `${siteUrl}og.png`,
        width: 1734,
        height: 907,
        alt: "20 memórias para Vitória — Victor e Vitória",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "20 memórias para Vitória",
    description:
      "Um passeio por vinte capítulos de uma história feita de amor, flores e música.",
    images: [`${siteUrl}og.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: `${iconBase}favicon.png`,
    shortcut: `${iconBase}favicon.png`,
    apple: `${iconBase}icon-192.png`,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fffafc",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
