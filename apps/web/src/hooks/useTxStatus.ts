"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { TRANSFER_STEPS } from "@stellarsend/shared/constants";

// Polls the transfer status until it reaches a terminal state.
export function useTxStatus(transferId: string) {
  return useQuery({
    queryKey: ["transfer", transferId],
    queryFn: () => api.transfers.get(transferId),
    enabled: Boolean(transferId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const terminal = status === "COMPLETED" || status === "FAILED" || status === "REFUNDED";
      return terminal ? false : 3000;
    },
  });
}

export { TRANSFER_STEPS };
