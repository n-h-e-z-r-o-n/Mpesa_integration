import { DeveloperDocs } from "@/components/public/developer-docs";
import { PublicSiteFrame } from "@/components/public/public-site-frame";
import { operationCatalog } from "@/lib/gateway/catalog";
import { getGatewayConfig } from "@/lib/mpesa/config";

export default function DocsPage() {
  return (
    <PublicSiteFrame>
      <DeveloperDocs config={getGatewayConfig()} operations={operationCatalog} />
    </PublicSiteFrame>
  );
}
