/**
 * The validation stamp — the one place red is spent (spec §4).
 * Its MEANING is carried by `text`, never by its colour: SETTLED, TERVERIFIKASI
 * and GAGAL all stamp in the same official red and the word disambiguates.
 * That satisfies "never colour alone" by construction.
 */
export function Stamp({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="inline-flex -rotate-3 flex-col items-center gap-px rounded-md border-[2.5px] border-stamp px-2.5 py-1.5 text-stamp">
      <span className="font-mono text-xs font-semibold tracking-[0.1em]">{text}</span>
      {sub && <span className="font-mono text-[7.5px] tracking-[0.07em]">{sub}</span>}
    </div>
  );
}
