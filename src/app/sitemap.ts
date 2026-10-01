import type { MetadataRoute } from "next";
import { LEGAL_UPDATED_ISO, SITE_URL } from "@/lib/legal";

// Las páginas públicas (las mismas que permite robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/ayuda`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/terminos`, lastModified: LEGAL_UPDATED_ISO, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacidad`, lastModified: LEGAL_UPDATED_ISO, changeFrequency: "yearly", priority: 0.3 },
  ];
}
