import { DeveloperDocs } from "@/components/public/developer-docs";
import { PublicSiteFrame } from "@/components/public/public-site-frame";
import { operationCatalog } from "@/lib/gateway/catalog";
import { getGatewayConfig } from "@/lib/mpesa/config";

export default function DocsPage() {
  return (
    <PublicSiteFrame
      header={{
        brandHref: "/docs",
        navigation: [
          { href: "/docs#introduction", label: "Documentation" },
          { href: "/docs#api-reference-requests", label: "API Reference" },
          { href: "/docs#changelog", label: "Changelog" },
        ],
        actions: [
          { href: "/app/dashboard", label: "Dashboard", variant: "secondary" },
          { href: "/login", label: "Log in", variant: "primary" },
        ],
      }}
    >
      <DeveloperDocs config={getGatewayConfig()} operations={operationCatalog} />
    </PublicSiteFrame>
  );
}
