import type { CabinSummary } from "./types";

interface Props {
  cabins: CabinSummary[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function CabinSelector({ cabins, activeId, onSelect }: Props) {
  return (
    <select
      value={activeId}
      onChange={(e) => onSelect(e.target.value)}
      className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {cabins.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name} {c.role === "Owner" ? "· Eier" : ""}
        </option>
      ))}
    </select>
  );
}
