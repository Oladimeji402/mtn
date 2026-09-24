"use client";

import * as React from "react";
import { Play, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FUND_WALLET_VIDEO_SRC } from "@/lib/constants";
import { screenPadClass } from "@/lib/utils";

/** Home-screen banner that opens the "how to fund your wallet" guide in a pop-up player. */
export function FundWalletVideo() {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={`pb-5 ${screenPadClass}`}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="relative flex h-44 w-full flex-col justify-end overflow-hidden rounded-2xl border-2 border-brand bg-gradient-to-br from-neutral-800 via-neutral-900 to-black p-5 text-left shadow-sm transition-transform active:scale-[0.99]"
          >
            <span className="absolute left-4 top-4 rounded-full bg-brand px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-brand-foreground">
              New • Watch
            </span>
            <span className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-[60%]">
              <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-brand/70 motion-reduce:animate-none" />
              <span className="relative flex size-full items-center justify-center rounded-full bg-white shadow-lg">
                <Play className="ml-0.5 size-6 fill-destructive text-destructive" />
              </span>
            </span>
            <span className="relative block text-lg font-bold leading-tight text-white">How to Fund Your Wallet</span>
            <span className="relative block text-xs text-white/80">Quick 30-second guide, tap to play</span>
          </button>
        </DialogTrigger>

        <DialogContent
          showCloseButton={false}
          className="max-w-[min(22rem,calc(100%-2rem))] gap-3 bg-transparent p-0 text-white ring-0"
        >
          <DialogTitle className="sr-only">How to fund your wallet</DialogTitle>
          <DialogDescription className="sr-only">A short video guide to adding money to your wallet.</DialogDescription>
          <DialogClose className="ml-auto flex size-10 items-center justify-center rounded-full bg-white text-foreground shadow-md">
            <X className="size-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <video
            src={FUND_WALLET_VIDEO_SRC}
            controls
            autoPlay
            playsInline
            className="max-h-[75dvh] w-full rounded-2xl bg-black"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
