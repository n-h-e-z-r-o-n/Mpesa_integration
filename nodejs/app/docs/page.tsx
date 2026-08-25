import { PlaceholderPage } from "@/components/public/placeholder-page";
import { PublicSiteFrame } from "@/components/public/public-site-frame";

export default function DocsPage() {
  return (
    <PublicSiteFrame>
      <PlaceholderPage
        label="Documentation"
        title="Developer documentation is being prepared for the broader public platform."
        body="The current gateway already exposes authenticated payment operations and an internal console. A dedicated public documentation surface will be introduced as Zadhron Payments expands beyond its current operational deployment."
      />
    </PublicSiteFrame>
  );
}
