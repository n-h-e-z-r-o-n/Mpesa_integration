import type { ReactNode } from "react";

import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";

type Props = {
  children: ReactNode;
  hideSignIn?: boolean;
};

export function PublicSiteFrame({ children, hideSignIn = false }: Props) {
  return (
    <div className="min-h-screen bg-[#071019] text-white">
      <PublicHeader hideSignIn={hideSignIn} />
      {children}
      <PublicFooter />
    </div>
  );
}
