"use client";

import * as React from "react";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFavoriteNumbers } from "@/hooks/use-favorite-numbers";
import { cn } from "@/lib/utils";

export function PhoneFavorites({
  phoneNumber,
  onSelect,
}: {
  phoneNumber: string;
  onSelect: (phoneNumber: string) => void;
}) {
  const { favorites, addFavorite, removeFavorite } = useFavoriteNumbers();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [draftPhone, setDraftPhone] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  function openDialog() {
    setName("");
    setDraftPhone(phoneNumber);
    setError(null);
    setOpen(true);
  }

  function handleSave() {
    const digits = draftPhone.replace(/\s/g, "");
    if (!/^0\d{10}$/.test(digits)) {
      setError("Enter a valid 11-digit Nigerian phone number");
      return;
    }
    if (!name.trim()) {
      setError("Give this number a name");
      return;
    }
    addFavorite(name.trim(), digits);
    setOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={openDialog}
        className="flex min-h-8 items-center gap-1.5 rounded-full border border-dashed px-3 text-xs font-medium text-muted-foreground hover:border-solid hover:text-foreground"
      >
        <Star className="size-3.5" />
        Add Favourite
      </button>

      {favorites.map((f) => (
        <span
          key={f.id}
          className={cn(
            "flex min-h-8 items-center gap-1.5 rounded-full border bg-secondary/60 pl-3 pr-1.5 text-xs font-medium",
          )}
        >
          <button
            type="button"
            onClick={() => onSelect(f.phoneNumber)}
            className="hover:text-brand-foreground"
          >
            {f.name}
          </button>
          <button
            type="button"
            onClick={() => removeFavorite(f.id)}
            aria-label={`Remove ${f.name} from favourites`}
            className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Favorite</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="favorite-name">Name</Label>
              <Input
                id="favorite-name"
                placeholder="Name (e.g. My MTN)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="favorite-phone">Phone Number</Label>
              <Input
                id="favorite-phone"
                type="tel"
                inputMode="numeric"
                placeholder="080X XXX XXXX"
                value={draftPhone}
                onChange={(e) => setDraftPhone(e.target.value)}
              />
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Star className="size-4" />
              Add to Favourites
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
