"use client";

import { ErrorPanel } from "@/components/shared/error-panel";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorPanel digest={error.digest} onRetry={reset} homeHref="/dashboard" />;
}
