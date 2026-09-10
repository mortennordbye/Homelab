import type { Metadata, Viewport } from "next";
import { Fragment_Mono, Source_Serif_4 } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { CommandPalette } from "@/components/CommandPalette";
import { site } from "@/content/site";
import { getAllWork } from "@/lib/work";
import { services } from "@/content/services";

// Inline before-paint script: force the dark palette class on <html> before
// first paint. The site is dark-only; the legacy localStorage 'theme' key
// (set by the now-removed toggle) is ignored — anyone with 'light' stored
// from before still lands on dark.
const themeBoot = `document.documentElement.classList.add('dark');document.documentElement.dataset.theme='dark';`;

/*
 * Two faces, no sans — see `theme` and `fonts` in content/brand.ts. Source
 * Serif carries headings and body alike via its optical-size axis: display
 * classes in globals.css ask for a light cut at opsz 60, prose a sturdy 12.
 */
const body = Source_Serif_4({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});

const mono = Fragment_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
});

// No separate display face any more. globals.css maps --font-display-face onto
// --font-body, so headings and prose share the family and differ only by the
// optical size the display classes request.

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.firstName} ${site.lastName} — ${site.role}`,
    template: `%s — ${site.firstName} ${site.lastName}`,
  },
  description: site.description,
  applicationName: `${site.firstName} ${site.lastName}`,
  authors: [
    { name: `${site.firstName} ${site.lastName}`, url: site.url },
    { name: site.name, url: site.url },
  ],
  creator: `${site.firstName} ${site.lastName}`,
  publisher: `${site.firstName} ${site.lastName}`,
  keywords: [
    `${site.firstName} ${site.lastName}`,
    site.name,
    "Morten V. Nordbye",
    "Nordbye",
    ...site.keywords,
  ],
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: site.url,
    siteName: `${site.firstName} ${site.lastName}`,
    title: `${site.firstName} ${site.lastName} — ${site.role}`,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
  },
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon/favicon-32x32.png", sizes: "32x32" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16" },
    ],
    apple: "/favicon/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  robots: { index: true, follow: true },
  verification: {
    // Google Search Console site-ownership verification, carried over from the
    // previous portfolio so the existing Search Console property keeps working.
    google: "pW0Dln3ShXs7R0R610g7fo0jeDAkiSQfmzgLI_KJolE",
  },
};

export const viewport: Viewport = {
  // Dark only — the boot script forces .dark, so a light entry would paint
  // browser chrome that never matches the page.
  themeColor: "#0f1410",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${site.url}/#person`,
  name: `${site.firstName} ${site.lastName}`,
  alternateName: [site.name, "Morten V. Nordbye"],
  givenName: "Morten",
  additionalName: "Victor",
  familyName: site.lastName,
  jobTitle: site.role,
  description: site.description,
  url: site.url,
  image: `${site.url}/images/profile.webp`,
  email: `mailto:${site.email}`,
  nationality: { "@type": "Country", name: "Norway" },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Oslo",
    addressRegion: "Oslo",
    addressCountry: "NO",
  },
  worksFor: {
    "@type": "Organization",
    name: "Orange Business",
    url: "https://www.orange-business.com",
  },
  hasCredential: [
    {
      "@type": "EducationalOccupationalCredential",
      name: "Certified Kubernetes Administrator (CKA)",
      credentialCategory: "certification",
      recognizedBy: { "@type": "Organization", name: "The Linux Foundation" },
    },
    {
      "@type": "EducationalOccupationalCredential",
      name: "Microsoft Certified: DevOps Engineer Expert (AZ-400)",
      credentialCategory: "certification",
      recognizedBy: { "@type": "Organization", name: "Microsoft" },
    },
    {
      "@type": "EducationalOccupationalCredential",
      name: "Microsoft Certified: Azure Solutions Architect Expert (AZ-305)",
      credentialCategory: "certification",
      recognizedBy: { "@type": "Organization", name: "Microsoft" },
    },
    {
      "@type": "EducationalOccupationalCredential",
      name: "Microsoft Certified: Azure Administrator Associate (AZ-104)",
      credentialCategory: "certification",
      recognizedBy: { "@type": "Organization", name: "Microsoft" },
    },
  ],
  sameAs: site.socials.map((s) => s.href),
  knowsAbout: site.keywords,
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${site.url}/#website`,
  url: site.url,
  name: `${site.firstName} ${site.lastName} — ${site.role}`,
  inLanguage: "en-GB",
  publisher: { "@id": `${site.url}/#person` },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const workLite = getAllWork().map((w) => ({ slug: w.slug, title: w.title }));
  const servicesLite = services.map((s) => ({ slug: s.slug, title: s.title }));
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${body.variable} ${mono.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
        {/* Next's <Image priority> on the Hero portrait already emits a
            high-priority preload for /images/profile.webp — no explicit
            <link> needed here. Texture preloads were removed because the
            globe is mobile-gated + idle-deferred. */}
      </head>
      <body className="bg-bg text-fg min-h-screen flex flex-col">
        <Header />
        <main className="relative flex-1">{children}</main>
        <Footer />
        <ScrollToTop />
        <CommandPalette work={workLite} services={servicesLite} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {/* Cloudflare Web Analytics — token carried over from the previous
            portfolio so analytics continue on the same CF Analytics property. */}
        <Script
          src="https://static.cloudflareinsights.com/beacon.min.js"
          strategy="afterInteractive"
          data-cf-beacon='{"token": "2451029669d244fe95bc0fb7635a985b"}'
        />
      </body>
    </html>
  );
}
