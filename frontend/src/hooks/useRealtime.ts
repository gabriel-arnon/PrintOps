import { useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function useRealtime() {

  const queryClient = useQueryClient();

  useEffect(() => {

    const ws = new WebSocket(
      "ws://localhost:8000/ws"
    );

        
    ws.onopen = () => {

    console.log(
        "Realtime connected"
    );

    toast.success(
        "Realtime connected"
    );

    };
 


    ws.onmessage = (event) => {

      const data = JSON.parse(
        event.data
      );

  
    if (data.type === "printer_offline") {

    toast.error(

        data.message,

        {

        description: "Incident detected",

        duration: 10000,

        }

    );

    }

    if (data.type === "printer_recovered") {

    toast.success(

        data.message,

        {

        description: "Printer recovered",

        duration: 6000,

        }

    );

    }
     


      console.log(
        "Realtime event",
        data
      );

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

        queryKey: ["system-health"],

      });

    };

    ws.onclose = () => {

      console.log(
        "Realtime disconnected"
      );

    };

    return () => {

      ws.close();

    };

  }, [queryClient]);

}
 
