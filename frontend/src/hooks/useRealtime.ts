import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  makeRealtimeTimelineEvent,
  mergeEventCollections,
  TIMELINE_EVENT_LIMIT,
} from "@/lib/event-stream";
import { initializeSoundAlerts, playOfflineAlert, playRecoveryAlert } from "@/lib/sound-alerts";
import type { EventSeverity, TimelineEvent } from "@/lib/api";

type RealtimeEvent = {
  type?: string;
  message?: string;
  printer?: string;
  severity?: EventSeverity;
};

function getRealtimeUrl(): string {
  const base = ((import.meta.env.VITE_API_URL as string | undefined) ?? "")
    .trim()
    .replace(/\/+$/, "");
  if (!base) return "ws://localhost:8000/ws";
  const wsBase = base.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
  if (/\/ws$/.test(wsBase)) return wsBase;
  return `${wsBase}/ws`;
}

export function useRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    initializeSoundAlerts();

    let ws: WebSocket | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | undefined;
    let closed = false;

    const connect = () => {
      if (closed) return;

      ws = new WebSocket(getRealtimeUrl());

      ws.onopen = () => {
        console.log("Realtime connected");

        toast.success("Realtime connected");
      };

      ws.onmessage = (event) => {
        let data: RealtimeEvent;

        try {
          data = JSON.parse(event.data) as RealtimeEvent;
        } catch {
          return;
        }

        const message = data.message ?? "Realtime event received";

        if (data.type === "printer_offline") {
          playOfflineAlert();

          toast.error(message, {
            description: "Incident detected",
            duration: 10000,
          });
        }

        if (data.type === "printer_recovered") {
          playRecoveryAlert();

          toast.success(message, {
            description: "Printer recovered",
            duration: 6000,
          });
        }

        console.log("Realtime event", data);

        queryClient.setQueryData<TimelineEvent[]>(["timeline"], (current) => {
          const realtimeEvent = makeRealtimeTimelineEvent(data);
          return mergeEventCollections(current, [realtimeEvent], TIMELINE_EVENT_LIMIT);
        });

        queryClient.invalidateQueries({
          queryKey: ["active-incidents"],
        });

        queryClient.invalidateQueries({
          queryKey: ["incident-summary"],
        });

        queryClient.invalidateQueries({
          queryKey: ["dashboard"],
        });

        queryClient.invalidateQueries({
          queryKey: ["printer"],
        });

        queryClient.invalidateQueries({
          queryKey: ["system-health"],
        });
      };

      ws.onclose = () => {
        console.log("Realtime disconnected");
        if (!closed) {
          retryTimeout = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      ws?.close();
    };
  }, [queryClient]);
}
