import { PlaceholderPage } from "@/components/public/placeholder-page";
import { PublicSiteFrame } from "@/components/public/public-site-frame";

export default function SignupPage() {
  return (
    <PublicSiteFrame>
      <PlaceholderPage
        label="Onboarding"
        title="Account creation is planned for the public Zadhron Payments platform."
        body="Self-serve developer and business onboarding is not available in this build yet. The route exists intentionally so the public product surface can evolve without pretending that registration already works."
      />
    </PublicSiteFrame>
  );
}
