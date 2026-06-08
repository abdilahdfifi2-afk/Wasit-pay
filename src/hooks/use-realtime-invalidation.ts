import { useEffect } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type RealtimeTable = {
  table: string;
  filter?: string;
};

export function useRealtimeInvalidation({
  channelName,
  tables,
  queryKeys,
  enabled = true,
}: {
  channelName: string;
  tables: RealtimeTable[];
  queryKeys: QueryKey[];
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const tablesKey = JSON.stringify(tables);
  const queryKeysKey = JSON.stringify(queryKeys);

  useEffect(() => {
    if (!enabled || tables.length === 0 || queryKeys.length === 0) return;

    const channel = supabase.channel(channelName);
    tables.forEach(({ table, filter }) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, ...(filter ? { filter } : {}) },
        () => {
          queryKeys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
        },
      );
    });

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, enabled, queryClient, tablesKey, queryKeysKey]);
}