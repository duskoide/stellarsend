"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { QuoteRequest } from "@stellarsend/shared";

export function useQuote() {
  return useMutation({
    mutationFn: (body: QuoteRequest) => api.quote.create(body),
  });
}
