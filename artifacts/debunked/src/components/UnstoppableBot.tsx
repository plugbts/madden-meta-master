import type { BotPiece } from "@/lib/madden-data";

export function UnstoppableBot({
  pieces,
  onClear,
  onRemove,
}: {
  pieces: BotPiece[];
  onClear: () => void;
  onRemove: (i: number) => void;
}) {
  const off = pieces.filter((p) => p.side === "OFF");
  const def = pieces.filter((p) => p.side === "DEF");

  function copyScript() {
    const text = pieces
      .map((p, i) => `${i + 1}. [${p.side}] ${p.label}\n   ${p.detail}`)
      .join("\n\n");
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div className="rounded-2xl border border-primary/40 bg-gradient-to-b from-primary/10 to-transparent p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl">The Unstoppable Bot</h2>
          <p className="text-sm text-muted-foreground">
            Your scripted answers — offense that destroys every coverage, defense that wrecks every formation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-mono">
            <span className="text-primary">{off.length}</span> OFF /{" "}
            <span className="text-destructive">{def.length}</span> DEF
          </div>
          {pieces.length > 0 && (
            <>
              <button
                onClick={copyScript}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:border-team-one hover:text-team-one"
              >
                Copy Script
              </button>
              <button
                onClick={onClear}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:border-destructive hover:text-destructive"
              >
                Clear Script
              </button>
            </>
          )}
        </div>
      </div>

      {pieces.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border/60 bg-background/40 p-10 text-center">
          <p className="font-display text-xl">No plays scripted yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add counters from the Offense Lab, Defense Lab, Blitz Lab, or Situational tabs to build your unstoppable script.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {pieces.map((p, i) => (
            <div
              key={i}
              className={`rounded-lg border p-4 ${
                p.side === "OFF"
                  ? "border-primary/40 bg-primary/5"
                  : "border-destructive/40 bg-destructive/5"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div
                    className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold tracking-wider ${
                      p.side === "OFF"
                        ? "bg-primary text-primary-foreground"
                        : "bg-destructive text-destructive-foreground"
                    }`}
                  >
                    {p.label}
                  </div>
                  <p className="mt-2 text-sm">{p.detail}</p>
                </div>
                <button
                  onClick={() => onRemove(i)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
