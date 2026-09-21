"use client";

import * as React from "react";
import { Download, Mail, MessageCircle, Phone, Share } from "lucide-react";
import { toast } from "sonner";
import { useInstallApp } from "@/hooks/use-install-app";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@/lib/constants";
import { cn, screenPadClass } from "@/lib/utils";

const whatsappNumber = `234${SUPPORT_PHONE.slice(1)}`;

const tileClass = "flex flex-col items-center gap-2 rounded-xl py-1 transition-colors active:bg-secondary/60";
const iconWrapClass = "flex size-12 items-center justify-center rounded-2xl";

/** Get App (PWA install) plus one-tap WhatsApp/Email/Call to the client's real contact details. */
export function ContactActions() {
  const { canPrompt, isIos, isStandalone, install } = useInstallApp();

  async function handleGetApp() {
    if (isStandalone) {
      toast.info("You're already using the installed app.");
      return;
    }
    if (canPrompt) {
      await install();
      return;
    }
    if (isIos) {
      toast.info('Tap the Share button, then "Add to Home Screen".');
      return;
    }
    toast.info('Open your browser menu and choose "Install app" or "Add to Home Screen".');
  }

  return (
    <nav aria-label="Get the app and contact us" className={cn("grid grid-cols-4 gap-2 pb-5 lg:hidden", screenPadClass)}>
      <button type="button" onClick={handleGetApp} className={tileClass}>
        <span className={cn(iconWrapClass, "bg-brand/15 text-brand-foreground")}>
          {isIos && !canPrompt ? <Share className="size-5" /> : <Download className="size-5" />}
        </span>
        <span className="text-xs font-medium text-muted-foreground">Get App</span>
      </button>

      <a
        href={`https://wa.me/${whatsappNumber}`}
        target="_blank"
        rel="noopener noreferrer"
        className={tileClass}
      >
        <span className={cn(iconWrapClass, "bg-success/10 text-success")}>
          <MessageCircle className="size-5" />
        </span>
        <span className="text-xs font-medium text-muted-foreground">WhatsApp</span>
      </a>

      <a href={`mailto:${SUPPORT_EMAIL}`} className={tileClass}>
        <span className={cn(iconWrapClass, "bg-info/10 text-info")}>
          <Mail className="size-5" />
        </span>
        <span className="text-xs font-medium text-muted-foreground">Email</span>
      </a>

      <a href={`tel:+${whatsappNumber}`} className={tileClass}>
        <span className={cn(iconWrapClass, "bg-warning/10 text-warning")}>
          <Phone className="size-5" />
        </span>
        <span className="text-xs font-medium text-muted-foreground">Call</span>
      </a>
    </nav>
  );
}
