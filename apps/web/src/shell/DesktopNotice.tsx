"use client";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";

const KEY = "sd-desktop-notice-dismissed";

/**
 * "Best on a desktop" notice (R31). Whether it shows is decided by a CSS media query, so the
 * first paint is already right on every screen width and nothing shifts after hydration.
 */
export function DesktopNotice() {
  const t = useTranslations("shell");
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY) === "1") setDismissed(true);
    } catch {
      /* storage unavailable: keep showing it */
    }
  }, []);
  if (dismissed) return null;
  const dismiss = () => {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* storage unavailable: hide it for this page only */
    }
    setDismissed(true);
  };
  return (
    <div data-testid="desktop-notice" className="px-3 pt-2 min-[1280px]:hidden">
      <Banner
        tone="info"
        action={
          <Button size="sm" variant="ghost" onClick={dismiss}>
            {t("dismiss")}
          </Button>
        }
      >
        {t("desktopNotice")}
      </Banner>
    </div>
  );
}
