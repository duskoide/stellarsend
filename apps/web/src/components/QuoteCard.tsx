import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { Quote } from "@stellarsend/shared";

export function QuoteCard({ quote }: { quote: Quote }) {
  return (
    <Card className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">You send</span>
        <span className="font-medium">
          {formatCurrency(quote.sourceAmount, quote.sourceAsset)}
        </span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Fee</span>
        <span className="font-medium">
          {formatCurrency(quote.feeAmount, quote.sourceAsset)}
        </span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Exchange rate</span>
        <span className="font-medium">
          1 {quote.sourceAsset} = {quote.exchangeRate} {quote.destAsset}
        </span>
      </div>
      <div className="flex justify-between border-t border-border pt-3 text-base">
        <span className="font-semibold">Recipient gets</span>
        <span className="font-semibold text-primary">
          {formatCurrency(quote.destAmount, quote.destAsset)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Quote expires at {new Date(quote.expiresAt).toLocaleTimeString()}
      </p>
    </Card>
  );
}
