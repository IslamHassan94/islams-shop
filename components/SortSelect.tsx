"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SORTS } from "@/lib/catalog-meta";

export default function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Sort</span>
      <select
        className="rounded-full border border-line bg-white px-3 py-2 text-sm"
        value={params.get("sort") ?? "featured"}
        data-testid="sort-select"
        onChange={(e) => {
          const next = new URLSearchParams(params);
          next.set("sort", e.target.value);
          next.delete("page");
          router.push(`${pathname}?${next.toString()}`);
        }}
      >
        {Object.entries(SORTS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
    </label>
  );
}
