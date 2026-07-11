// Standalone quote preview page (spec §4: app/(sender)/quote/page.tsx).
// The primary flow embeds the quote directly in /send; this route is kept
// for a shareable/deep-linkable quote preview if needed later.

import { Card, CardTitle } from "@/components/ui/card";

export default function QuotePreviewPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card className="w-full space-y-2">
        <CardTitle>Quote preview</CardTitle>
        <p className="text-sm text-muted-foreground">
          Quotes are generated inline on the Send page. This route is a
          placeholder for a future shareable quote link.
        </p>
      </Card>
    </main>
  );
}
