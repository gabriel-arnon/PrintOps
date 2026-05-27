import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { initializeSoundAlerts, playOfflineAlert, playRecoveryAlert } from "@/lib/sound-alerts";

type RealtimeEvent = {
  type?: string;
  message?: string;
};

export function useRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    initializeSoundAlerts();

    const ws = new WebSocket("ws://192.168.5.65:8000/ws");

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

      queryClient.invalidateQueries({
        queryKey: ["timeline"],
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
    };

    return () => {
      ws.close();
    };
  }, [queryClient]);
}
