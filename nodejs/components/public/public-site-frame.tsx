import type { ReactNode } from "react";

import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";

type Props = {
  children: ReactNode;
  header?: {
    actions?: Array<{
      href: string;
      label: string;
      variant: "primary" | "secondary";
    }>;
    brandHref?: string;
    navigation?: Array<{
      href: string;
      label: string;
    }>;
  };
  hideSignIn?: boolean;
};

export function PublicSiteFrame({ children, header, hideSignIn = false }: Props) {
  return (
    <div className="min-h-screen bg-[#071019] text-white">
      <PublicHeader
        actions={header?.actions}
        brandHref={header?.brandHref}
        hideSignIn={hideSignIn}
        navigation={header?.navigation}
      />
      {children}
      <PublicFooter />
    </div>
  );
}
