import confetti from "canvas-confetti";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import maBackgroundURL from "/ma-background.jpg";

type PaletteName = "event" | "classic";

const STORAGE_KEY = "corporate-lucky-draw";
const DEFAULT_ENTRANTS = [
  "Aisha Rahman",
  "Daniel Lim",
  "Farah Ibrahim",
  "Harith Ismail",
  "Jia Wei Tan",
  "Kavitha Nair",
  "Marcus Lee",
  "Nurul Huda",
  "Siti Amina",
  "Wei Ming Goh",
];
const PALETTES: Record<PaletteName, { label: string; colors: string[] }> = {
  event: {
    label: "Event colours",
    colors: ["#e53935", "#f4b400", "#087f5b", "#0062a3", "#f06d2f", "#9f2d68"],
  },
  classic: {
    label: "Classic colours",
    colors: ["#164e63", "#0f766e", "#b45309", "#be123c", "#4338ca", "#4d7c0f"],
  },
};

interface StoredDraw {
  title?: string;
  entrants?: string[];
  winners?: string[];
  palette?: PaletteName;
  background?: string | null;
}

function readStoredDraw(): StoredDraw {
  try {
    return JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "{}",
    ) as StoredDraw;
  } catch {
    return {};
  }
}

function normaliseEntrants(value: string): string[] {
  const seen = new Set<string>();
  return value.split("\n").reduce<string[]>((names, rawName) => {
    const name = rawName.trim();
    const key = name.toLocaleLowerCase();
    if (name && !seen.has(key)) {
      seen.add(key);
      names.push(name);
    }
    return names;
  }, []);
}

export default function App() {
  const [stored] = useState(readStoredDraw);
  const [eventTitle, setEventTitle] = useState(
    stored.title ?? "Malaysia Day Lucky Draw",
  );
  const [entrants, setEntrants] = useState(stored.entrants ?? DEFAULT_ENTRANTS);
  const [entrantText, setEntrantText] = useState(
    (stored.entrants ?? DEFAULT_ENTRANTS).join("\n"),
  );
  const [winners, setWinners] = useState(stored.winners ?? []);
  const [palette, setPalette] = useState<PaletteName>(
    stored.palette ?? "event",
  );
  const [background, setBackground] = useState<string | null>(
    stored.background ?? null,
  );
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [announcedWinner, setAnnouncedWinner] = useState<string | null>(null);
  const spinTimeout = useRef<number | null>(null);
  const eligibleEntrants = entrants.filter(
    (entrant) => !winners.includes(entrant),
  );
  const activePalette = PALETTES[palette];
  const segmentAngle = eligibleEntrants.length
    ? 360 / eligibleEntrants.length
    : 360;
  const wheelBackground = eligibleEntrants.length
    ? `conic-gradient(from -${segmentAngle / 2}deg, ${eligibleEntrants.map((_, index) => `${activePalette.colors[index % activePalette.colors.length]} ${index * segmentAngle}deg ${(index + 1) * segmentAngle}deg`).join(", ")})`
    : "conic-gradient(#d8d8d8 0deg 360deg)";

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        title: eventTitle,
        entrants,
        winners,
        palette,
        background,
      }),
    );
  }, [background, entrants, eventTitle, palette, winners]);
  useEffect(
    () => () => {
      if (spinTimeout.current !== null)
        window.clearTimeout(spinTimeout.current);
    },
    [],
  );

  function handleEntrantsChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const value = event.target.value;
    setEntrantText(value);
    setEntrants(normaliseEntrants(value));
  }
  function handleBackgroundChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      setBackground(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
    event.target.value = "";
  }
  function spinWheel() {
    if (isSpinning || !eligibleEntrants.length) return;
    const winnerIndex = Math.floor(Math.random() * eligibleEntrants.length);
    const winner = eligibleEntrants[winnerIndex];
    const currentPosition = ((rotation % 360) + 360) % 360;
    const correction =
      (360 - ((currentPosition + winnerIndex * segmentAngle) % 360)) % 360;
    setIsSpinning(true);
    setAnnouncedWinner(null);
    setRotation(rotation + 1800 + correction);
    spinTimeout.current = window.setTimeout(() => {
      setWinners((currentWinners) => [...currentWinners, winner]);
      setAnnouncedWinner(winner);
      setIsSpinning(false);
      confetti({
        particleCount: 180,
        spread: 90,
        origin: { y: 0.6 },
        colors: activePalette.colors,
      });
    }, 4200);
  }
  function undoLastWinner() {
    if (!isSpinning) {
      setWinners((currentWinners) => currentWinners.slice(0, -1));
      setAnnouncedWinner(null);
    }
  }
  function resetDraw() {
    if (
      !isSpinning &&
      window.confirm("Reset winner history and return everyone to the wheel?")
    ) {
      setWinners([]);
      setAnnouncedWinner(null);
    }
  }

  return (
    <main
      className={`app-shell palette-${palette}`}
      style={
        {
          "--event-background": `url(${background ?? maBackgroundURL})`,
        } as CSSProperties
      }
    >
      <section className="event-stage" aria-label="Lucky draw stage">
        <div className="stage-header">
          <div className="event-mark">2026</div>
          <div>
            <h1>{eventTitle || "Lucky Draw"}</h1>
          </div>
          <div
            className="eligible-counter"
            aria-label={`${eligibleEntrants.length} eligible entrants`}
          >
            <strong>{eligibleEntrants.length}</strong>
            <span>eligible</span>
          </div>
        </div>
        <div className="wheel-stage">
          <div className="wheel-pointer" aria-hidden="true" />
          <div className="wheel-shadow" aria-hidden="true" />
          <div
            className={`wheel ${isSpinning ? "is-spinning" : ""}`}
            style={
              {
                "--wheel-rotation": `${rotation}deg`,
                "--wheel-background": wheelBackground,
              } as CSSProperties
            }
            aria-label={
              eligibleEntrants.length
                ? "Lucky draw wheel"
                : "No eligible entrants"
            }
          >
            {eligibleEntrants.map((entrant, index) => (
              <span
                className="wheel-label"
                key={entrant}
                style={
                  {
                    "--label-angle": `${index * segmentAngle}deg`,
                  } as CSSProperties
                }
              >
                {entrant} 
              </span>
            ))}
            {!eligibleEntrants.length && (
              <span className="empty-wheel-label">Add entrants</span>
            )}
            <div className="wheel-hub">
              <button
                className="spin-button"
                type="button"
                onClick={spinWheel}
                disabled={isSpinning || !eligibleEntrants.length}
              >
                <span>{isSpinning ? "Drawing..." : "Spin"}</span>
                <small>{isSpinning ? "Please wait" : "for a winner"}</small>
              </button>
            </div>
          </div>
        </div>
        <p className="stage-status" aria-live="polite">
          {isSpinning
            ? "The draw is in motion..."
            : eligibleEntrants.length
              ? "One winner will be selected at random."
              : entrants.length
                ? "Every entrant has already won."
                : "Add at least one entrant to begin."}
        </p>
      </section>
      <aside className="organizer-panel" aria-label="Organizer controls">
        <div className="panel-heading">
          <p className="eyebrow">Organizer desk</p>
          <h2>Draw settings</h2>
        </div>
        <label className="field-label" htmlFor="event-title">
          Event title
        </label>
        <input
          id="event-title"
          className="text-field"
          value={eventTitle}
          onChange={(event) => setEventTitle(event.target.value)}
          disabled={isSpinning}
        />
        <div className="field-row">
          <label className="field-label" htmlFor="entrants">
            Entrants
          </label>
          <span className="field-meta">{entrants.length} unique</span>
        </div>
        <textarea
          id="entrants"
          className="entrant-editor"
          value={entrantText}
          onChange={handleEntrantsChange}
          placeholder="One name per line"
          disabled={isSpinning}
        />
        <p className="helper-text">
          One name per line. Duplicate names are included once.
        </p>
        <fieldset className="palette-picker" disabled={isSpinning}>
          <legend className="field-label">Colour scheme</legend>
          {(Object.keys(PALETTES) as PaletteName[]).map((paletteName) => (
            <label className="palette-option" key={paletteName}>
              <input
                type="radio"
                name="palette"
                checked={palette === paletteName}
                onChange={() => setPalette(paletteName)}
              />
              <span
                className="palette-swatch"
                style={{
                  background: `linear-gradient(90deg, ${PALETTES[paletteName].colors.join(", ")})`,
                }}
              />
              <span>{PALETTES[paletteName].label}</span>
            </label>
          ))}
        </fieldset>
        <div className="background-controls">
          <div>
            <p className="field-label">Event poster</p>
            <p className="helper-text">Use your own event artwork.</p>
          </div>
          <label className="upload-button" title="Upload event poster">
            Replace
            <input
              type="file"
              accept="image/*"
              onChange={handleBackgroundChange}
              disabled={isSpinning}
            />
          </label>
          {background && (
            <button
              className="text-action"
              type="button"
              onClick={() => setBackground(null)}
              disabled={isSpinning}
            >
              Use default
            </button>
          )}
        </div>
        <section className="history" aria-labelledby="winner-history">
          <div className="field-row">
            <h3 id="winner-history">Winner history</h3>
            <span className="field-meta">{winners.length} drawn</span>
          </div>
          {winners.length ? (
            <ol>
              {winners.map((winner, index) => (
                <li key={`${winner}-${index}`}>
                  <span>{index + 1}</span>
                  {winner}
                </li>
              ))}
            </ol>
          ) : (
            <p className="empty-history">Winners will appear here.</p>
          )}
          <div className="history-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={undoLastWinner}
              disabled={isSpinning || !winners.length}
            >
              Undo last
            </button>
            <button
              className="text-action danger"
              type="button"
              onClick={resetDraw}
              disabled={isSpinning || !winners.length}
            >
              Reset draw
            </button>
          </div>
        </section>
      </aside>
      {announcedWinner && (
        <div
          className="winner-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="winner-name"
        >
          <div className="winner-card">
            <p className="eyebrow">Congratulations</p>
            <p className="winner-label">This draw's winner</p>
            <h2 id="winner-name">{announcedWinner}</h2>
            <button
              className="winner-close"
              type="button"
              onClick={() => setAnnouncedWinner(null)}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
