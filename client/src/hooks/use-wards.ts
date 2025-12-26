import { useQuery } from "@tanstack/react-query";
import type { Ward } from "@shared/schema";

export function useWards() {
  return useQuery<Ward[]>({
    queryKey: ['/api/wards'],
    queryFn: async () => {
      const res = await fetch('/api/wards', { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch wards");
      return res.json();
    },
  });
}
