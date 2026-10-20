"use client";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";

const KEY = "sd-desktop-notice-dismissed";

export function DesktopNotice() {
  const t = useTranslations("shell");
  const [show, setShow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1279px)");
    const update = () => setShow(mq.matches && sessionStorage.getItem(KEY) !== "1");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  if (!show) return null;
  return (
    <div className="px-3 pt-2">
      <Banner
        tone="info"
        action={
          <Button size="sm" variant="ghost" onClick={() => (sessionStorage.setItem(KEY, "1"), setShow(false))}>
            {t("dismiss")}
          </Button>
        }
      >
        {t("desktopNotice")}
      </Banner>
    </div>
  );
}
