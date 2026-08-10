"use client";

import Image from "next/image";
import {
  CSSProperties,
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  memo,
  useMemo,
  useRef,
  useState,
} from "react";
import { calendarMemories } from "../data/calendar-memories";
import { memories } from "../data/memories";
import { isPastLocalDate, localDateToIso, parseLocalIsoDate } from "../lib/local-date";
import {
  getLivingMemoriesClient,
  livingMemoriesConfigured,
  livingMemoryBucket,
  livingPhotoUrl,
  loadLivingMemories,
  sessionCanEdit,
  type LivingMemoryRecord,
} from "../lib/living-memories";
import GsapRomanticBackground from "./GsapRomanticBackground";

type WindowName = "music" | "memory" | "archive" | "response" | "date" | "newMemory";
type Point = { x: number; y: number };
type DragState = {
  name: WindowName;
  pointerId: number;
  originX: number;
  originY: number;
  rect: DOMRect;
  element: HTMLElement;
  point: Point;
};
type QuickPlayerDragState = {
  pointerId: number;
  originX: number;
  originY: number;
  rect: DOMRect;
  point: Point;
};
type DateStep = "calendar" | "roulette" | "confirm" | "details" | "record";
type DateIdea = {
  title: string;
  icon: string;
  outing: string;
  place: string;
  description: string;
};
type ScheduledEncounter = {
  date: string;
  kind: "lived" | "planned";
  outing: string;
  place: string;
  description: string;
};
type DisplayMemory = {
  key: string;
  number: number;
  date: string;
  title: string;
  preview: string;
  story: string;
  photos: string[];
  secret: string | null;
  songIndex: number | null;
  isLiving: boolean;
};
type LivingMemoryStatus = "unconfigured" | "loading" | "ready" | "error";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://1victorx.github.io/vinte-memorias-vitoria/";
const feedbackEndpoint = process.env.NEXT_PUBLIC_FEEDBACK_ENDPOINT ?? "";
const asset = (path: string) => `${basePath}${path}`;
const thumbnailAsset = (path: string) => {
  const filename = path.split("/").pop()?.replace(/\.[^.]+$/, ".webp");
  return asset(`/media/thumbs/${filename}`);
};
const displayPhoto = (path: string, thumbnail = false) =>
  /^https:\/\//i.test(path) ? path : thumbnail ? thumbnailAsset(path) : asset(path);
const formatLivingMemoryDate = (isoDate: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    .format(new Date(isoDate + "T12:00:00"));
const encounterStorageKey = "encontros-agendados-vitoria";
const rouletteStorageKey = "ideias-da-roleta-vitoria";
const customRouletteLimit = 8;
const dateIdeas: DateIdea[] = [
  {
    title: "Piquenique ao pôr do sol",
    icon: "☀",
    outing: "Parque ou praia",
    place: "Uma praia ou parque bonito",
    description: "Levar nossas comidas favoritas, flores e uma toalha para ver o pôr do sol juntinhos.",
  },
  {
    title: "Cinema escolhido no sorteio",
    icon: "★",
    outing: "Cinema",
    place: "O cinema que tiver a melhor sessão",
    description: "Escolher o filme na hora, dividir pipoca e transformar a sessão em mais uma memória nossa.",
  },
  {
    title: "Café e sobremesa nova",
    icon: "☕",
    outing: "Café ou confeitaria",
    place: "Uma cafeteria que ainda não conhecemos",
    description: "Provar uma sobremesa diferente, conversar sem pressa e avaliar juntos cada pedido.",
  },
  {
    title: "Um dia digno da Rapunzel",
    icon: "✿",
    outing: "Passeio surpresa",
    place: "Um lugar com flores, luzes ou uma vista bonita",
    description: "Um passeio inspirado em Rapunzel, com flores, fotos e uma surpresa romântica preparada com carinho.",
  },
  {
    title: "Maratona The Walking Dead",
    icon: "☠",
    outing: "Outro lugar",
    place: "Nossa sala de cinema particular",
    description: "Preparar lanches, escolher nossos episódios favoritos e fazer uma maratona confortável de The Walking Dead.",
  },
  {
    title: "Museu e caminhada sem roteiro",
    icon: "◇",
    outing: "Passeio surpresa",
    place: "Um museu e as ruas ao redor",
    description: "Conhecer uma exposição, tirar fotos e depois caminhar sem pressa até encontrarmos um lugar interessante.",
  },
  {
    title: "Jantar preparado a dois",
    icon: "♨",
    outing: "Outro lugar",
    place: "Nossa cozinha",
    description: "Escolher uma receita, cozinhar juntos e montar uma mesa bonita para o nosso jantar.",
  },
  {
    title: "Sorvete e passeio de mãos dadas",
    icon: "♡",
    outing: "Café ou confeitaria",
    place: "Uma sorveteria perto de um lugar gostoso para caminhar",
    description: "Escolher sabores um para o outro e passear de mãos dadas enquanto colocamos a conversa em dia.",
  },
];

function isCustomDateIdea(value: unknown): value is DateIdea {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DateIdea>;
  return (
    typeof candidate.title === "string" &&
    candidate.title.length >= 3 && candidate.title.length <= 70 &&
    candidate.icon === "✦" &&
    candidate.outing === "Outro lugar" &&
    typeof candidate.place === "string" &&
    candidate.place.length >= 2 && candidate.place.length <= 100 &&
    typeof candidate.description === "string" &&
    candidate.description.length >= 3 && candidate.description.length <= 280
  );
}

function readCustomDateIdeas(raw: string | null) {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCustomDateIdea).slice(0, customRouletteLimit);
  } catch {
    return [];
  }
}

function isScheduledEncounter(value: unknown): value is ScheduledEncounter {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ScheduledEncounter>;
  return (
    typeof candidate.date === "string" &&
    parseLocalIsoDate(candidate.date) !== null &&
    (candidate.kind === undefined || candidate.kind === "lived" || candidate.kind === "planned") &&
    typeof candidate.outing === "string" &&
    typeof candidate.place === "string" &&
    typeof candidate.description === "string"
  );
}

function readScheduledEncounters(raw: string | null) {
  const records: Record<string, ScheduledEncounter> = {};
  if (!raw) return records;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return records;
    Object.entries(parsed).forEach(([date, value]) => {
      if (isScheduledEncounter(value) && value.date === date) {
        records[date] = {
          ...value,
          kind: value.kind ?? (isPastLocalDate(value.date) ? "lived" : "planned"),
        };
      }
    });
  } catch {
    return records;
  }
  return records;
}

const welcomeMessages = [
  "Essa opção não vale ♡",
  "Tem certeza? O presente está incrível!",
  "Você sabe que quer dizer sim",
  "Não adianta fugir do presente!",
  "O amor já escolheu a outra opção",
  "Quase! Mas esse botão é mais rápido",
];

function distanceFromPointToRect(x: number, y: number, rect: DOMRect) {
  const dx = Math.max(rect.left - x, 0, x - rect.right);
  const dy = Math.max(rect.top - y, 0, y - rect.bottom);
  return Math.hypot(dx, dy);
}

function rectanglesOverlap(a: { left: number; top: number; right: number; bottom: number }, b: DOMRect, gap = 28) {
  return !(a.right + gap < b.left || a.left - gap > b.right || a.bottom + gap < b.top || a.top - gap > b.bottom);
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

const AudioProgress = memo(function AudioProgress({
  audioRef,
  className,
  label,
  trackKey,
}: {
  audioRef: { current: HTMLAudioElement | null };
  className: string;
  label: string;
  trackKey: string;
}) {
  const [timing, setTiming] = useState({ currentTime: 0, duration: 0 });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTiming = () => {
      const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const nextCurrentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      setTiming((current) => (
        current.currentTime === nextCurrentTime && current.duration === nextDuration
          ? current
          : { currentTime: nextCurrentTime, duration: nextDuration }
      ));
    };
    const resetTiming = () => setTiming({ currentTime: 0, duration: 0 });

    updateTiming();
    audio.addEventListener("timeupdate", updateTiming);
    audio.addEventListener("durationchange", updateTiming);
    audio.addEventListener("loadedmetadata", updateTiming);
    audio.addEventListener("emptied", resetTiming);
    return () => {
      audio.removeEventListener("timeupdate", updateTiming);
      audio.removeEventListener("durationchange", updateTiming);
      audio.removeEventListener("loadedmetadata", updateTiming);
      audio.removeEventListener("emptied", resetTiming);
    };
  }, [audioRef, trackKey]);

  const progress = timing.duration ? (timing.currentTime / timing.duration) * 100 : 0;
  return (
    <div className={className}>
      <span>{formatTime(timing.currentTime)}</span>
      <input
        type="range"
        min="0"
        max="100"
        value={progress}
        onChange={(event) => {
          const audio = audioRef.current;
          if (audio && timing.duration) audio.currentTime = (Number(event.target.value) / 100) * timing.duration;
        }}
        aria-label={label}
      />
      <span>{formatTime(timing.duration)}</span>
    </div>
  );
});

function WindowBar({
  title,
  onClose,
  maximized,
  onToggleMaximize,
  onDragStart,
  onDragMove,
  onDragEnd,
  onNudge,
}: {
  title: string;
  onClose: () => void;
  maximized: boolean;
  onToggleMaximize: () => void;
  onDragStart: (event: ReactPointerEvent<HTMLElement>) => void;
  onDragMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onDragEnd: (event: ReactPointerEvent<HTMLElement>) => void;
  onNudge: (x: number, y: number, bar: HTMLElement) => void;
}) {
  return (
    <header
      className="window-bar"
      tabIndex={0}
      aria-label={`Mover janela ${title}`}
      onDoubleClick={onToggleMaximize}
      onPointerDown={onDragStart}
      onPointerMove={onDragMove}
      onPointerUp={onDragEnd}
      onPointerCancel={onDragEnd}
      onKeyDown={(event) => {
        const distance = event.shiftKey ? 30 : 10;
        if (event.key === "ArrowLeft") onNudge(-distance, 0, event.currentTarget);
        else if (event.key === "ArrowRight") onNudge(distance, 0, event.currentTarget);
        else if (event.key === "ArrowUp") onNudge(0, -distance, event.currentTarget);
        else if (event.key === "ArrowDown") onNudge(0, distance, event.currentTarget);
        else return;
        event.preventDefault();
      }}
    >
      <span className="window-grip" aria-hidden="true" />
      <strong>{title}</strong>
      <span className="window-actions">
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onClick={onToggleMaximize}
          aria-label={`${maximized ? "Restaurar" : "Maximizar"} ${title}`}
          title={maximized ? "Restaurar janela" : "Maximizar janela"}
        >
          {maximized ? "❐" : "□"}
        </button>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onClick={onClose}
          aria-label={`Fechar ${title}`}
          title="Fechar janela"
        >
          ×
        </button>
      </span>
    </header>
  );
}

export default function MemoryExperience() {
  const [welcomeVisible, setWelcomeVisible] = useState(true);
  const [welcomeLeaving, setWelcomeLeaving] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("Só existe uma resposta certa...");
  const [noPosition, setNoPosition] = useState<Point | null>(null);
  const [activeMemoryIndex, setActiveMemoryIndex] = useState(0);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [selectedSongIndex, setSelectedSongIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.72);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [secretOpen, setSecretOpen] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [dateRequestSaved, setDateRequestSaved] = useState(false);
  const [dateStep, setDateStep] = useState<DateStep>("calendar");
  const [rouletteIndex, setRouletteIndex] = useState(0);
  const [rouletteRotation, setRouletteRotation] = useState(0);
  const [rouletteSpinning, setRouletteSpinning] = useState(false);
  const [rouletteHasResult, setRouletteHasResult] = useState(false);
  const [rouletteSuggestion, setRouletteSuggestion] = useState<DateIdea | null>(null);
  const [customDateIdeas, setCustomDateIdeas] = useState<DateIdea[]>([]);
  const [rouletteAdding, setRouletteAdding] = useState(false);
  const [rouletteMessage, setRouletteMessage] = useState("");
  const [todayIso, setTodayIso] = useState("");
  const [scheduledEncounters, setScheduledEncounters] = useState<Record<string, ScheduledEncounter>>({});
  const [recordDate, setRecordDate] = useState("");
  const [dateError, setDateError] = useState("");
  const [dateSaving, setDateSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [calendarPreviewDate, setCalendarPreviewDate] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState({ year: 2026, month: 7 });
  const [clock, setClock] = useState("--:--");
  const [quickPlayerPosition, setQuickPlayerPosition] = useState<Point | null>(null);
  const [quickPlayerVisible, setQuickPlayerVisible] = useState(false);
  const [livingMemories, setLivingMemories] = useState<LivingMemoryRecord[]>([]);
  const [livingStatus, setLivingStatus] = useState<LivingMemoryStatus>(
    livingMemoriesConfigured ? "loading" : "unconfigured",
  );
  const [editorEmail, setEditorEmail] = useState("");
  const [signedInEmail, setSignedInEmail] = useState("");
  const [canEditMemories, setCanEditMemories] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [livingError, setLivingError] = useState("");
  const [memorySaving, setMemorySaving] = useState(false);
  const [selectedUploadNames, setSelectedUploadNames] = useState<string[]>([]);
  const [visible, setVisible] = useState<Record<WindowName, boolean>>({
    music: false, memory: false, archive: false, response: false, date: false, newMemory: false,
  });
  const [layers, setLayers] = useState<Record<WindowName, number>>({
    music: 12, memory: 14, archive: 13, response: 16, date: 17, newMemory: 18,
  });
  const [positions, setPositions] = useState<Record<WindowName, Point | null>>({
    music: null,
    memory: null,
    archive: null,
    response: null,
    date: null,
    newMemory: null,
  });
  const [maximized, setMaximized] = useState<Record<WindowName, boolean>>({
    music: false,
    memory: false,
    archive: false,
    response: false,
    date: false,
    newMemory: false,
  });
  const welcomeRef = useRef<HTMLElement>(null);
  const welcomeCopyRef = useRef<HTMLDivElement>(null);
  const yesButtonRef = useRef<HTMLButtonElement>(null);
  const noButtonRef = useRef<HTMLButtonElement>(null);
  const lastEscapeTime = useRef(Number.NEGATIVE_INFINITY);
  const escapeCount = useRef(0);
  const welcomeTimer = useRef<number | null>(null);
  const rouletteTimer = useRef<number | null>(null);
  const desktopRef = useRef<HTMLElement>(null);
  const ambienceRef = useRef<HTMLDivElement>(null);
  const mousePetalCount = useRef(0);
  const dragState = useRef<DragState | null>(null);
  const quickPlayerRef = useRef<HTMLElement>(null);
  const quickPlayerDrag = useRef<QuickPlayerDragState | null>(null);
  const recordCloseButton = useRef<HTMLButtonElement>(null);
  const dateSavingRef = useRef(false);
  const memorySavingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const autoplay = useRef(false);
  const lastAudibleVolume = useRef(0.72);
  const onlineDisplayMemories: DisplayMemory[] = useMemo(() => livingMemories.map((memory, index) => ({
    key: "living-" + memory.id,
    number: memories.length + index + 1,
    date: formatLivingMemoryDate(memory.memory_date),
    title: memory.title,
    preview: memory.preview,
    story: memory.story,
    photos: memory.photo_paths.map((path) => {
      const client = getLivingMemoriesClient();
      return client ? livingPhotoUrl(client, path) : "";
    }).filter(Boolean),
    secret: memory.secret,
    songIndex: null,
    isLiving: true,
  })), [livingMemories]);
  const allMemories: DisplayMemory[] = useMemo(() => [
    ...memories.map((memory, index) => ({
      key: "original-" + memory.id,
      number: memory.id,
      date: memory.date,
      title: memory.title,
      preview: memory.preview,
      story: memory.story,
      photos: memory.photos,
      secret: memory.secret,
      songIndex: index,
      isLiving: false,
    })),
    ...onlineDisplayMemories,
  ], [onlineDisplayMemories]);
  const allDateIdeas = useMemo(() => [...dateIdeas, ...customDateIdeas], [customDateIdeas]);
  const activeMemory = allMemories[Math.min(activeMemoryIndex, allMemories.length - 1)];
  const selectedSong = memories[selectedSongIndex].song;
  const daysInCalendarMonth = new Date(calendarMonth.year, calendarMonth.month + 1, 0).getDate();
  const firstCalendarWeekday = new Date(calendarMonth.year, calendarMonth.month, 1).getDay();
  const calendarTitle = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(calendarMonth.year, calendarMonth.month, 1));
  const selectedDateLabel = selectedDate
    ? new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${selectedDate}T12:00:00`))
    : "";
  const calendarPreviewMemory = calendarPreviewDate ? calendarMemories[calendarPreviewDate] : undefined;
  const calendarPreviewLabel = calendarPreviewDate
    ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${calendarPreviewDate}T12:00:00`))
    : "";
  const recordCalendarMemory = recordDate ? calendarMemories[recordDate] : undefined;
  const recordScheduledEncounter = recordDate ? scheduledEncounters[recordDate] : undefined;
  const recordDateLabel = recordDate
    ? new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(parseLocalIsoDate(recordDate) ?? new Date())
    : "";

  useEffect(() => () => {
    if (welcomeTimer.current) window.clearTimeout(welcomeTimer.current);
    if (rouletteTimer.current) window.clearTimeout(rouletteTimer.current);
  }, []);

  useEffect(() => {
    const client = getLivingMemoriesClient();
    if (!client) return;

    let active = true;
    const syncMemories = async () => {
      try {
        const records = await loadLivingMemories(client);
        if (!active) return;
        setLivingMemories(records);
        setLivingStatus("ready");
        setLivingError("");
      } catch {
        if (!active) return;
        setLivingStatus("error");
        setLivingError("Não foi possível carregar os novos capítulos agora.");
      }
    };
    const syncEditor = async (session: Awaited<ReturnType<typeof client.auth.getSession>>["data"]["session"]) => {
      if (!active) return;
      setSignedInEmail(session?.user.email ?? "");
      if (!session) {
        setCanEditMemories(false);
        return;
      }
      try {
        const allowed = await sessionCanEdit(client, session);
        if (!active) return;
        setCanEditMemories(allowed);
        if (!allowed) setAuthMessage("Este e-mail entrou, mas ainda não está autorizado a editar o álbum.");
      } catch {
        if (!active) return;
        setCanEditMemories(false);
        setAuthMessage("Não foi possível confirmar a permissão deste e-mail.");
      }
    };

    void syncMemories();
    void client.auth.getSession().then(({ data }) => syncEditor(data.session));
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      void syncEditor(session);
    });
    const liveChannel = client
      .channel("living-memories-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "living_memories" }, () => {
        void syncMemories();
      })
      .subscribe();

    return () => {
      active = false;
      listener.subscription.unsubscribe();
      void client.removeChannel(liveChannel);
    };
  }, []);

  useEffect(() => {
    const refreshToday = () => setTodayIso(localDateToIso(new Date()));
    refreshToday();
    const timer = window.setInterval(refreshToday, 30_000);
    const storageFrame = window.requestAnimationFrame(() => {
      setScheduledEncounters(readScheduledEncounters(localStorage.getItem(encounterStorageKey)));
      setCustomDateIdeas(readCustomDateIdeas(localStorage.getItem(rouletteStorageKey)));
    });
    return () => {
      window.clearInterval(timer);
      window.cancelAnimationFrame(storageFrame);
    };
  }, []);

  useEffect(() => {
    if (dateStep !== "record") return;
    recordCloseButton.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setDateStep("calendar");
      const dateToFocus = recordDate;
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLButtonElement>(`.calendar-day[data-date="${dateToFocus}"]`)?.focus();
      });
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [dateStep, recordDate]);

  useEffect(() => {
    const update = () => setClock(new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date()));
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const desktop = desktopRef.current;
    const ambience = ambienceRef.current;
    if (!desktop || !ambience || welcomeVisible || welcomeLeaving) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    let frame = 0;
    let latestX = window.innerWidth / 2;
    let latestY = window.innerHeight / 2;
    let lastPetalX = latestX;
    let lastPetalY = latestY;
    let lastPetalAt = 0;
    let litSurface: HTMLElement | null = null;

    const paintPointer = () => {
      frame = 0;
      const normalizedX = latestX / window.innerWidth - 0.5;
      const normalizedY = latestY / window.innerHeight - 0.5;
      desktop.style.setProperty("--mouse-x", `${latestX}px`);
      desktop.style.setProperty("--mouse-y", `${latestY}px`);
      desktop.style.setProperty("--mouse-shift-x", `${normalizedX * 17}px`);
      desktop.style.setProperty("--mouse-shift-y", `${normalizedY * 13}px`);
      desktop.style.setProperty("--mouse-shift-x-reverse", `${normalizedX * -13}px`);
      desktop.style.setProperty("--mouse-shift-y-reverse", `${normalizedY * -10}px`);
    };

    const leaveSurface = () => {
      litSurface?.classList.remove("is-mouse-lit");
      litSurface = null;
    };

    const followPointer = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      latestX = event.clientX;
      latestY = event.clientY;
      if (!frame) frame = window.requestAnimationFrame(paintPointer);

      const target = event.target instanceof Element ? event.target : null;
      const nextSurface = target?.closest<HTMLElement>(".os-window, .desktop-quick-player") ?? null;
      if (nextSurface !== litSurface) {
        leaveSurface();
        litSurface = nextSurface;
        litSurface?.classList.add("is-mouse-lit");
      }
      if (litSurface) {
        const rect = litSurface.getBoundingClientRect();
        litSurface.style.setProperty("--surface-mouse-x", `${latestX - rect.left}px`);
        litSurface.style.setProperty("--surface-mouse-y", `${latestY - rect.top}px`);
      }

      const now = performance.now();
      const travelled = Math.hypot(latestX - lastPetalX, latestY - lastPetalY);
      if (travelled < 52 || now - lastPetalAt < 100) return;

      lastPetalX = latestX;
      lastPetalY = latestY;
      lastPetalAt = now;
      const petal = document.createElement("i");
      const variant = mousePetalCount.current % 3;
      mousePetalCount.current += 1;
      petal.className = `cursor-petal cursor-petal--${variant + 1}`;
      petal.style.left = `${latestX}px`;
      petal.style.top = `${latestY}px`;
      petal.style.setProperty("--petal-drift", `${Math.round(Math.random() * 34 - 17)}px`);
      petal.style.setProperty("--petal-turn", `${Math.round(Math.random() * 90 - 45)}deg`);
      ambience.appendChild(petal);
      petal.addEventListener("animationend", () => petal.remove(), { once: true });
      ambience.querySelectorAll(".cursor-petal").forEach((item, index, items) => {
        if (index < items.length - 8) item.remove();
      });
    };

    const resetPointer = () => {
      desktop.classList.remove("has-mouse");
      leaveSurface();
    };
    const activatePointer = () => desktop.classList.add("has-mouse");

    desktop.addEventListener("pointerenter", activatePointer);
    desktop.addEventListener("pointermove", followPointer, { passive: true });
    desktop.addEventListener("pointerleave", resetPointer);
    return () => {
      desktop.removeEventListener("pointerenter", activatePointer);
      desktop.removeEventListener("pointermove", followPointer);
      desktop.removeEventListener("pointerleave", resetPointer);
      if (frame) window.cancelAnimationFrame(frame);
      leaveSurface();
      ambience.querySelectorAll(".cursor-petal").forEach((petal) => petal.remove());
    };
  }, [welcomeLeaving, welcomeVisible]);


  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.src = asset(selectedSong.file);
    audio.load();
    if (autoplay.current) audio.play().catch(() => setPlaying(false));
  }, [selectedSong.file]);

  useEffect(() => {
    if (!visible.memory || activeMemory.photos.length < 2) return;
    const photoCount = activeMemory.photos.length;
    const adjacentIndexes = [
      (activePhotoIndex - 1 + photoCount) % photoCount,
      (activePhotoIndex + 1) % photoCount,
    ];

    for (const index of new Set(adjacentIndexes)) {
      const preload = new window.Image();
      preload.decoding = "async";
      preload.src = displayPhoto(activeMemory.photos[index]);
    }
  }, [activeMemory.key, activeMemory.photos, activePhotoIndex, visible.memory]);

  useEffect(() => {
    if (volume > 0) lastAudibleVolume.current = volume;
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  function front(name: WindowName) {
    setLayers((current) => {
      const highestLayer = Math.max(...Object.values(current));
      if (current[name] === highestLayer) return current;
      return { ...current, [name]: highestLayer + 1 };
    });
  }

  function windowStyle(name: WindowName) {
    if (maximized[name]) {
      return {
        zIndex: layers[name],
        position: "fixed" as const,
        left: 6,
        top: 36,
        right: 6,
        bottom: 6,
        width: "auto",
        height: "auto",
        transform: "none",
      };
    }
    const point = positions[name];
    if (!point) return { zIndex: layers[name] };
    return {
      zIndex: layers[name],
      position: "fixed" as const,
      left: point.x,
      top: point.y,
      right: "auto",
      transform: "none",
    };
  }

  function clampWindowPosition(left: number, top: number, rect: DOMRect) {
    const visibleTitleWidth = Math.min(140, rect.width);
    const minLeft = visibleTitleWidth - rect.width;
    const maxLeft = window.innerWidth - visibleTitleWidth;
    const minTop = 30;
    const maxTop = window.innerHeight - 48;
    return {
      x: Math.max(minLeft, Math.min(maxLeft, left)),
      y: Math.max(minTop, Math.min(maxTop, top)),
    };
  }

  function moveWindow(name: WindowName, left: number, top: number, rect: DOMRect) {
    const point = clampWindowPosition(left, top, rect);
    setPositions((current) => ({ ...current, [name]: point }));
  }

  function startDrag(name: WindowName, event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0 || maximized[name]) return;
    event.preventDefault();
    const windowElement = event.currentTarget.closest(".os-window");
    if (!(windowElement instanceof HTMLElement)) return;
    const rect = windowElement.getBoundingClientRect();
    dragState.current = {
      name,
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      rect,
      element: windowElement,
      point: { x: rect.left, y: rect.top },
    };
    windowElement.classList.add("is-dragging");
    windowElement.style.position = "fixed";
    windowElement.style.left = `${rect.left}px`;
    windowElement.style.top = `${rect.top}px`;
    windowElement.style.right = "auto";
    windowElement.style.bottom = "auto";
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function dragWindow(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = clampWindowPosition(
      drag.rect.left + event.clientX - drag.originX,
      drag.rect.top + event.clientY - drag.originY,
      drag.rect,
    );
    drag.point = point;
    drag.element.style.transform = `translate3d(${point.x - drag.rect.left}px, ${point.y - drag.rect.top}px, 0)`;
  }

  function endDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragState.current = null;
    drag.element.style.left = `${drag.point.x}px`;
    drag.element.style.top = `${drag.point.y}px`;
    drag.element.style.transform = "none";
    drag.element.classList.remove("is-dragging");
    setPositions((current) => ({ ...current, [drag.name]: drag.point }));
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function nudgeWindow(name: WindowName, x: number, y: number, bar: HTMLElement) {
    if (maximized[name]) return;
    const windowElement = bar.closest(".os-window");
    if (!(windowElement instanceof HTMLElement)) return;
    const rect = windowElement.getBoundingClientRect();
    front(name);
    moveWindow(name, rect.left + x, rect.top + y, rect);
  }

  function clampQuickPlayer(left: number, top: number, rect: DOMRect) {
    const margin = 8;
    return {
      x: Math.max(margin, Math.min(window.innerWidth - rect.width - margin, left)),
      y: Math.max(36, Math.min(window.innerHeight - rect.height - margin, top)),
    };
  }

  function positionQuickPlayer(point: Point) {
    const player = quickPlayerRef.current;
    if (!player) return;
    player.style.position = "fixed";
    player.style.left = `${point.x}px`;
    player.style.top = `${point.y}px`;
    player.style.right = "auto";
    player.style.bottom = "auto";
  }

  function startQuickPlayerDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !quickPlayerRef.current) return;
    event.preventDefault();
    const rect = quickPlayerRef.current.getBoundingClientRect();
    const point = clampQuickPlayer(rect.left, rect.top, rect);
    quickPlayerDrag.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      rect,
      point,
    };
    positionQuickPlayer(point);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function dragQuickPlayer(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = quickPlayerDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = clampQuickPlayer(
      drag.rect.left + event.clientX - drag.originX,
      drag.rect.top + event.clientY - drag.originY,
      drag.rect,
    );
    drag.point = point;
    positionQuickPlayer(point);
  }

  function endQuickPlayerDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = quickPlayerDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    quickPlayerDrag.current = null;
    setQuickPlayerPosition(drag.point);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function nudgeQuickPlayer(x: number, y: number) {
    const player = quickPlayerRef.current;
    if (!player) return;
    const rect = player.getBoundingClientRect();
    const point = clampQuickPlayer(rect.left + x, rect.top + y, rect);
    positionQuickPlayer(point);
    setQuickPlayerPosition(point);
  }

  function resetQuickPlayerPosition() {
    setQuickPlayerPosition(null);
    const player = quickPlayerRef.current;
    if (!player) return;
    player.style.removeProperty("position");
    player.style.removeProperty("left");
    player.style.removeProperty("top");
    player.style.removeProperty("right");
    player.style.removeProperty("bottom");
  }

  async function refreshLivingMemories() {
    const client = getLivingMemoriesClient();
    if (!client) return;
    try {
      const records = await loadLivingMemories(client);
      setLivingMemories(records);
      setLivingStatus("ready");
      setLivingError("");
    } catch {
      setLivingStatus("error");
      setLivingError("A conexão com o nosso álbum online falhou. Tente novamente.");
    }
  }

  async function requestMemoryLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = getLivingMemoriesClient();
    const email = editorEmail.trim().toLowerCase();
    if (!client || !/^\S+@\S+\.\S+$/.test(email)) {
      setAuthMessage("Digite um e-mail válido para receber o acesso.");
      return;
    }
    setAuthBusy(true);
    setAuthMessage("");
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: siteUrl },
    });
    setAuthBusy(false);
    setAuthMessage(
      error
        ? "Não foi possível enviar o link agora. Confira o e-mail e tente novamente."
        : "Link enviado! Abra o e-mail neste computador para liberar a escrita.",
    );
  }

  async function signOutMemoryEditor() {
    const client = getLivingMemoriesClient();
    if (!client) return;
    setAuthBusy(true);
    await client.auth.signOut();
    setCanEditMemories(false);
    setSignedInEmail("");
    setAuthMessage("Acesso encerrado com segurança.");
    setAuthBusy(false);
  }

  async function saveLivingMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (memorySavingRef.current) return;
    const client = getLivingMemoriesClient();
    if (!client || !canEditMemories) {
      setLivingError("Entre com um e-mail autorizado antes de guardar uma memória.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const memoryDate = String(formData.get("memory_date") ?? "");
    const title = String(formData.get("title") ?? "").trim();
    const preview = String(formData.get("preview") ?? "").trim();
    const story = String(formData.get("story") ?? "").trim();
    const secret = String(formData.get("secret") ?? "").trim();
    const files = formData.getAll("photos").filter((item): item is File => item instanceof File && item.size > 0);
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

    if (!parseLocalIsoDate(memoryDate) || title.length < 2 || title.length > 100 || preview.length < 3 || preview.length > 180 || story.length < 10 || story.length > 5000) {
      setLivingError("Revise a data e os textos. O relato precisa ter pelo menos 10 caracteres.");
      return;
    }
    if (secret.length > 300) {
      setLivingError("A mensagem escondida pode ter no máximo 300 caracteres.");
      return;
    }
    if (files.length < 1 || files.length > 6) {
      setLivingError("Escolha de uma a seis fotografias para este capítulo.");
      return;
    }
    if (files.some((file) => !allowedTypes.has(file.type) || file.size > 8 * 1024 * 1024)) {
      setLivingError("Use apenas JPG, PNG ou WebP, com no máximo 8 MB por fotografia.");
      return;
    }

    const { data: sessionData } = await client.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setCanEditMemories(false);
      setLivingError("Seu acesso expirou. Entre novamente pelo link enviado ao e-mail.");
      return;
    }

    memorySavingRef.current = true;
    setMemorySaving(true);
    setLivingError("");
    const memoryId = crypto.randomUUID();
    const uploadedPaths: string[] = [];
    const extensions: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };

    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const path = userId + "/" + memoryId + "/" + String(index + 1).padStart(2, "0") + "." + extensions[file.type];
        const { error } = await client.storage.from(livingMemoryBucket).upload(path, file, {
          cacheControl: "31536000",
          contentType: file.type,
          upsert: false,
        });
        if (error) throw error;
        uploadedPaths.push(path);
      }

      const { error } = await client.from("living_memories").insert({
        id: memoryId,
        memory_date: memoryDate,
        title,
        preview,
        story,
        secret: secret || null,
        photo_paths: uploadedPaths,
      });
      if (error) throw error;

      await refreshLivingMemories();
      form.reset();
      setSelectedUploadNames([]);
      setAuthMessage("Memória guardada online! Ela já apareceu no arquivo do presente. ♡");
      selectMemory(memories.length + livingMemories.length);
    } catch {
      if (uploadedPaths.length) {
        await client.storage.from(livingMemoryBucket).remove(uploadedPaths);
      }
      setLivingError("Não foi possível guardar esta memória. Nada foi publicado; tente novamente.");
    } finally {
      memorySavingRef.current = false;
      setMemorySaving(false);
    }
  }

  function show(name: WindowName) {
    setVisible((current) => ({ ...current, [name]: true }));
    front(name);
  }

  function close(name: WindowName) {
    setVisible((current) => ({ ...current, [name]: false }));
  }

  function toggleWindow(name: WindowName) {
    if (visible[name]) {
      close(name);
      return;
    }
    show(name);
  }

  function toggleMusicWindow() {
    if (visible.music) {
      close("music");
      return;
    }
    setQuickPlayerVisible(true);
    show("music");
  }

  function toggleDateWindow() {
    if (visible.date) {
      close("date");
      return;
    }
    setDateStep("calendar");
    setDateError("");
    show("date");
  }

  function toggleMaximize(name: WindowName) {
    front(name);
    setMaximized((current) => ({ ...current, [name]: !current[name] }));
  }

  function selectMemory(index: number) {
    setActiveMemoryIndex(index);
    setActivePhotoIndex(0);
    setSecretOpen(false);
    show("memory");
  }

  function moveMemory(direction: -1 | 1) {
    selectMemory((activeMemoryIndex + direction + allMemories.length) % allMemories.length);
  }

  function movePhoto(direction: -1 | 1) {
    setActivePhotoIndex((current) => (current + direction + activeMemory.photos.length) % activeMemory.photos.length);
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      autoplay.current = true;
      await audio.play().catch(() => setPlaying(false));
    } else {
      autoplay.current = false;
      audio.pause();
    }
  }

  function chooseSong(index: number) {
    autoplay.current = true;
    setSelectedSongIndex(index);
    show("music");
  }

  function chooseSongFromQuickPlayer(index: number) {
    const normalizedIndex = (index + memories.length) % memories.length;
    autoplay.current = true;
    setQuickPlayerVisible(true);
    if (normalizedIndex === selectedSongIndex) {
      audioRef.current?.play().catch(() => setPlaying(false));
      return;
    }
    setSelectedSongIndex(normalizedIndex);
  }

  function randomSongIndex() {
    if (memories.length < 2) return selectedSongIndex;
    const randomOffset = 1 + Math.floor(Math.random() * (memories.length - 1));
    return (selectedSongIndex + randomOffset) % memories.length;
  }

  function moveQuickPlayerSong(direction: -1 | 1) {
    chooseSongFromQuickPlayer(shuffleEnabled ? randomSongIndex() : selectedSongIndex + direction);
  }

  function finishSong() {
    if (!shuffleEnabled) {
      setPlaying(false);
      return;
    }
    autoplay.current = true;
    setSelectedSongIndex(randomSongIndex());
  }

  function toggleMute() {
    setVolume((current) => current > 0 ? 0 : Math.max(lastAudibleVolume.current, 0.35));
  }

  function saveMessageLocally(event: FormEvent<HTMLFormElement>) {
    if (feedbackEndpoint) return;
    event.preventDefault();
    const message = String(new FormData(event.currentTarget).get("Mensagem") ?? "").trim();
    if (!message) return;
    localStorage.setItem("mensagem-para-victor", message);
    setSavedMessage(true);
    event.currentTarget.reset();
  }

  function openDateRoulette() {
    setDateError("");
    setRouletteMessage("");
    setDateStep("roulette");
  }

  function addCustomDateIdea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (customDateIdeas.length >= customRouletteLimit) {
      setRouletteMessage(`A roleta já recebeu o limite de ${customRouletteLimit} ideias novas.`);
      return;
    }
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("Nome da ideia") ?? "").trim();
    const place = String(formData.get("Local da ideia") ?? "").trim();
    const description = String(formData.get("Descrição da ideia") ?? "").trim();
    if (title.length < 3 || title.length > 70 || place.length < 2 || place.length > 100 || description.length < 3 || description.length > 280) {
      setRouletteMessage("Revise o nome, o local e a descrição antes de adicionar a ideia.");
      return;
    }
    if (allDateIdeas.some((idea) => idea.title.localeCompare(title, "pt-BR", { sensitivity: "base" }) === 0)) {
      setRouletteMessage("Essa ideia já está na roleta. Escolha um nome diferente.");
      return;
    }
    const newIdea: DateIdea = { title, icon: "✦", outing: "Outro lugar", place, description };
    const nextIdeas = [...customDateIdeas, newIdea];
    try {
      localStorage.setItem(rouletteStorageKey, JSON.stringify(nextIdeas));
      setCustomDateIdeas(nextIdeas);
      setRouletteMessage(`“${title}” foi adicionada à roleta!`);
      setRouletteAdding(false);
      setRouletteHasResult(false);
      form.reset();
    } catch {
      setRouletteMessage("Não foi possível guardar essa ideia neste computador.");
    }
  }

  function removeCustomDateIdea(index: number) {
    if (rouletteSpinning) return;
    const idea = customDateIdeas[index];
    if (!idea || !window.confirm(`Remover “${idea.title}” da roleta?`)) return;
    const nextIdeas = customDateIdeas.filter((_, ideaIndex) => ideaIndex !== index);
    try {
      localStorage.setItem(rouletteStorageKey, JSON.stringify(nextIdeas));
      setCustomDateIdeas(nextIdeas);
      setRouletteIndex(0);
      setRouletteRotation(0);
      setRouletteHasResult(false);
      setRouletteMessage("Ideia removida da roleta.");
    } catch {
      setRouletteMessage("Não foi possível remover essa ideia agora.");
    }
  }

  function spinDateRoulette() {
    if (rouletteSpinning) return;
    const nextIndex = allDateIdeas.length < 2
      ? 0
      : (rouletteIndex + 1 + Math.floor(Math.random() * (allDateIdeas.length - 1))) % allDateIdeas.length;
    const segmentAngle = 360 / allDateIdeas.length;
    const currentMod = ((rouletteRotation % 360) + 360) % 360;
    const targetMod = (360 - nextIndex * segmentAngle) % 360;
    const finalRotation = rouletteRotation + 360 * 8 + ((targetMod - currentMod + 360) % 360);

    if (rouletteTimer.current) window.clearTimeout(rouletteTimer.current);
    setRouletteHasResult(false);
    setRouletteSpinning(true);
    setRouletteIndex(nextIndex);
    setRouletteRotation(finalRotation);
    rouletteTimer.current = window.setTimeout(() => {
      setRouletteSpinning(false);
      setRouletteHasResult(true);
      rouletteTimer.current = null;
    }, 4700);
  }

  function useRouletteIdea() {
    const now = new Date();
    setRouletteSuggestion(allDateIdeas[rouletteIndex]);
    setCalendarMonth({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedDate("");
    setDateError("");
    setDateStep("calendar");
  }

  function changeCalendarMonth(offset: number) {
    setCalendarPreviewDate(null);
    setDateError("");
    setCalendarMonth((current) => {
      const next = new Date(current.year, current.month + offset, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  function openDateRecord(isoDate: string) {
    setRecordDate(isoDate);
    setCalendarPreviewDate(null);
    setDateError("");
    setDateStep("record");
  }

  function returnToCalendar(dateToFocus: string) {
    setDateError("");
    setDateStep("calendar");
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`.calendar-day[data-date="${dateToFocus}"]`)?.focus();
    });
  }

  function closeDateRecord() {
    returnToCalendar(recordDate);
  }

  function chooseDate(day: number) {
    const month = String(calendarMonth.month + 1).padStart(2, "0");
    const isoDate = `${calendarMonth.year}-${month}-${String(day).padStart(2, "0")}`;
    if (calendarMemories[isoDate] || scheduledEncounters[isoDate]) {
      openDateRecord(isoDate);
      return;
    }
    if (!parseLocalIsoDate(isoDate)) {
      setDateError("Essa data não é válida. Escolha outro dia no calendário.");
      return;
    }
    setSelectedDate(isoDate);
    setDateRequestSaved(false);
    setDateError("");
    setCalendarPreviewDate(null);
    setDateStep("confirm");
  }

  function saveDateRequestLocally(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dateSavingRef.current) return;
    const parsedDate = parseLocalIsoDate(selectedDate);
    if (!parsedDate) {
      setDateError("A data escolhida é inválida. Volte ao calendário e escolha outra data.");
      return;
    }

    if (calendarMemories[selectedDate] || scheduledEncounters[selectedDate]) {
      setDateError("Já existe um encontro registrado nessa data. Consulte os detalhes no calendário.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const outing = String(formData.get("Tipo de passeio") ?? "").trim();
    const place = String(formData.get("Local desejado") ?? "").trim();
    const description = String(formData.get("Descrição do local") ?? "").trim();
    const allowedOutings = new Set(["Restaurante", "Cinema", "Parque ou praia", "Café ou confeitaria", "Passeio surpresa", "Outro lugar"]);
    if (!allowedOutings.has(outing) || place.length < 2 || place.length > 120 || description.length < 3 || description.length > 1000) {
      setDateError("Revise o tipo de passeio, o local e a descrição antes de enviar.");
      return;
    }

    dateSavingRef.current = true;
    setDateSaving(true);
    setDateError("");
    const encounter: ScheduledEncounter = {
      date: selectedDate,
      kind: isPastLocalDate(selectedDate) ? "lived" : "planned",
      outing,
      place,
      description,
    };
    const nextEncounters = { ...scheduledEncounters, [selectedDate]: encounter };
    try {
      localStorage.setItem(encounterStorageKey, JSON.stringify(nextEncounters));
      localStorage.setItem("pedido-de-encontro-para-victor", JSON.stringify(encounter));
      setScheduledEncounters(nextEncounters);
      setDateRequestSaved(true);
      setRecordDate(selectedDate);
      if (feedbackEndpoint) {
        form.submit();
        return;
      }
      setDateStep("record");
    } catch {
      dateSavingRef.current = false;
      setDateSaving(false);
      setDateError("Não foi possível guardar o encontro neste computador. Tente novamente.");
    } finally {
      if (!feedbackEndpoint) {
        dateSavingRef.current = false;
        setDateSaving(false);
      }
    }
  }

  const escapeNoButton = useCallback((pointerX: number, pointerY: number) => {
    if (!welcomeVisible || welcomeLeaving || !noButtonRef.current) return;
    const now = performance.now();
    if (now - lastEscapeTime.current < 18) return;
    lastEscapeTime.current = now;

    const buttonRect = noButtonRef.current.getBoundingClientRect();
    const buttonWidth = buttonRect.width || 146;
    const buttonHeight = buttonRect.height || 48;
    const margin = 64;
    const exclusions = [welcomeRef.current?.querySelector(".welcome-card")?.getBoundingClientRect(), welcomeCopyRef.current?.getBoundingClientRect(), welcomeRef.current?.querySelector(".welcome-message")?.getBoundingClientRect(), yesButtonRef.current?.getBoundingClientRect()].filter((rect): rect is DOMRect => Boolean(rect));
    let nextX = margin;
    let nextY = margin;

    let bestDistance = 0;
    for (let attempt = 0; attempt < 140; attempt += 1) {
      const candidateX = margin + Math.random() * Math.max(1, window.innerWidth - buttonWidth - margin * 2);
      const candidateY = margin + Math.random() * Math.max(1, window.innerHeight - buttonHeight - margin * 2);
      const candidate = { left: candidateX, top: candidateY, right: candidateX + buttonWidth, bottom: candidateY + buttonHeight };
      const cursorDistance = distanceFromPointToRect(pointerX, pointerY, new DOMRect(candidateX, candidateY, buttonWidth, buttonHeight));
      const isSafe = exclusions.every((rect) => !rectanglesOverlap(candidate, rect, 44));
      if (isSafe && cursorDistance > bestDistance) {
        nextX = candidateX;
        nextY = candidateY;
        bestDistance = cursorDistance;
      }
    }

    escapeCount.current += 1;
    setWelcomeMessage(welcomeMessages[(escapeCount.current - 1) % welcomeMessages.length]);
    setNoPosition({ x: nextX, y: nextY });
  }, [welcomeLeaving, welcomeVisible]);

  useEffect(() => {
    if (!welcomeVisible || welcomeLeaving) return;
    const guardNoButton = (event: PointerEvent | MouseEvent) => {
      const noButton = noButtonRef.current;
      if (noButton && distanceFromPointToRect(event.clientX, event.clientY, noButton.getBoundingClientRect()) < 280) {
        escapeNoButton(event.clientX, event.clientY);
      }
    };
    window.addEventListener("pointermove", guardNoButton, true);
    window.addEventListener("mousemove", guardNoButton, true);
    return () => {
      window.removeEventListener("pointermove", guardNoButton, true);
      window.removeEventListener("mousemove", guardNoButton, true);
    };
  }, [escapeNoButton, welcomeLeaving, welcomeVisible]);

  function trackWelcomePointer(event: { clientX: number; clientY: number }) {
    const screen = welcomeRef.current;
    if (screen) {
      const horizontal = (event.clientX / window.innerWidth - 0.5) * 16;
      const vertical = (event.clientY / window.innerHeight - 0.5) * 10;
      screen.style.setProperty("--welcome-x", `${horizontal}px`);
      screen.style.setProperty("--welcome-y", `${vertical}px`);
    }
    const noButton = noButtonRef.current;
    if (noButton && distanceFromPointToRect(event.clientX, event.clientY, noButton.getBoundingClientRect()) < 260) {
      escapeNoButton(event.clientX, event.clientY);
    }
  }

  function finishWelcomeTransition() {
    if (welcomeTimer.current) window.clearTimeout(welcomeTimer.current);
    welcomeTimer.current = null;
    setWelcomeVisible(false);
  }

  function enterGift() {
    if (welcomeLeaving) return;
    setWelcomeLeaving(true);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.requestAnimationFrame(finishWelcomeTransition);
      return;
    }
    welcomeTimer.current = window.setTimeout(finishWelcomeTransition, 520);
  }

  return (
    <>
      {welcomeVisible && (
        <section
          ref={welcomeRef}
          className={`welcome-screen${welcomeLeaving ? " is-leaving" : ""}`}
          onPointerMoveCapture={trackWelcomePointer}
          onMouseMoveCapture={trackWelcomePointer}
          onTransitionEnd={(event) => {
            if (welcomeLeaving && event.target === event.currentTarget && event.propertyName === "opacity") finishWelcomeTransition();
          }}
          aria-label="Boas-vindas ao presente"
        >
          <Image
            className="welcome-background"
            src={asset("/media/photos/welcome-flowers.webp")}
            alt="Jardim de flores cor-de-rosa iluminado pelo sol"
            fill
            priority
            unoptimized
          />
          <div className="welcome-card">
            <div className="welcome-content">
              <div className="welcome-copy" ref={welcomeCopyRef}>
                <span className="welcome-kicker">UM PRESENTE FEITO SÓ PARA VOCÊ</span>
                <h1>Você está pronta para ver o seu presente?</h1>
              </div>
              <p className="welcome-message" aria-live="polite">{welcomeMessage}</p>
              <button ref={yesButtonRef} type="button" className="welcome-yes" onClick={enterGift}>Sim</button>
            </div>
          </div>
          <button
            ref={noButtonRef}
            type="button"
            className="welcome-no"
            style={noPosition ? { left: noPosition.x, top: noPosition.y } : undefined}
            tabIndex={-1}
            aria-disabled="true"
            onPointerEnter={(event) => escapeNoButton(event.clientX, event.clientY)}
            onPointerMove={(event) => escapeNoButton(event.clientX, event.clientY)}
            onMouseEnter={(event) => escapeNoButton(event.clientX, event.clientY)}
            onMouseMove={(event) => escapeNoButton(event.clientX, event.clientY)}
            onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); escapeNoButton(event.clientX, event.clientY); }}
            onClick={(event) => { event.preventDefault(); escapeNoButton(event.clientX, event.clientY); }}
            onFocus={(event) => { event.currentTarget.blur(); escapeNoButton(window.innerWidth / 2, window.innerHeight / 2); }}
            onKeyDown={(event) => event.preventDefault()}
            onContextMenu={(event) => event.preventDefault()}
            draggable={false}
          >
            Não
          </button>
        </section>
      )}

      <div className="computer-only" role="status">
        <span aria-hidden="true">▣</span>
        <h1>Este presente foi feito para computador.</h1>
        <p>Abra o link em uma tela maior para explorar todas as janelas.</p>
      </div>

      <main ref={desktopRef} className={`desktop${welcomeVisible ? " is-waiting" : " is-revealed"}`} inert={welcomeVisible ? true : undefined} aria-hidden={welcomeVisible} data-interactive={clock !== "--:--"} aria-label="Área de trabalho das nossas memórias">
        <audio
          ref={audioRef}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={finishSong}
        />

        <div ref={ambienceRef} className="mouse-ambience" aria-hidden="true">
          <span className="mouse-glow" />
          <span className="mouse-spark mouse-spark--one">✦</span>
          <span className="mouse-spark mouse-spark--two">♡</span>
        </div>

        <header className="system-bar">
          <div className="system-brand"><span>✿</span><i>20 memórias com o meu amor!</i></div>
          <div className="system-status"><span>DOM 10 AGO 2026</span><span>♡</span><time>{clock}</time></div>
        </header>

        <section className="wallpaper" aria-label="Janelas abertas">
          <GsapRomanticBackground active={!welcomeVisible} />
          <div className="desktop-stamp" aria-hidden="true"><span>V + V</span><small>DESDE 2025</small></div>

          {quickPlayerVisible && <aside
            ref={quickPlayerRef}
            className="desktop-quick-player"
            style={quickPlayerPosition ? { position: "fixed", left: quickPlayerPosition.x, top: quickPlayerPosition.y, right: "auto", bottom: "auto" } : undefined}
            aria-label="Tocador rápido de músicas"
          >
            <button type="button" className="quick-player-close" onClick={() => setQuickPlayerVisible(false)} aria-label="Fechar tocador rápido" title="Fechar player">×</button>
            <button
              type="button"
              className="quick-player-drag-handle"
              aria-label="Mover tocador rápido de músicas"
              title="Arraste para mover; clique duas vezes para restaurar"
              onPointerDown={startQuickPlayerDrag}
              onPointerMove={dragQuickPlayer}
              onPointerUp={endQuickPlayerDrag}
              onPointerCancel={endQuickPlayerDrag}
              onDoubleClick={resetQuickPlayerPosition}
              onKeyDown={(event) => {
                const distance = event.shiftKey ? 30 : 10;
                if (event.key === "ArrowLeft") nudgeQuickPlayer(-distance, 0);
                else if (event.key === "ArrowRight") nudgeQuickPlayer(distance, 0);
                else if (event.key === "ArrowUp") nudgeQuickPlayer(0, -distance);
                else if (event.key === "ArrowDown") nudgeQuickPlayer(0, distance);
                else return;
                event.preventDefault();
              }}
            >
              <span aria-hidden="true">⋮⋮</span> MOVER
            </button>
            <span className={`quick-player-disc${playing ? " is-spinning" : ""}`} aria-hidden="true">
              <Image src={thumbnailAsset(memories[selectedSongIndex].photos[0])} alt="" fill sizes="54px" unoptimized />
              <i />
            </span>
            <button type="button" className="quick-player-track" onClick={() => show("music")} aria-label="Abrir lista de músicas">
              <small>{playing ? "TOCANDO AGORA" : "FAIXA PRONTA"}</small>
              <strong>{selectedSong.title}</strong>
              <span>{selectedSong.artist}</span>
            </button>
            <div className="quick-player-controls">
              <button type="button" onClick={() => moveQuickPlayerSong(-1)} aria-label="Música anterior">‹</button>
              <button type="button" onClick={togglePlayback} aria-label={playing ? "Pausar música" : "Tocar música"}>{playing ? "Ⅱ" : "▶"}</button>
              <button type="button" onClick={() => moveQuickPlayerSong(1)} aria-label="Próxima música">›</button>
            </div>
            <AudioProgress audioRef={audioRef} className="quick-player-progress" label="Posição da música no tocador rápido" trackKey={selectedSong.file} />
            <div className="quick-player-options">
              <button type="button" className="quick-volume-button" onClick={toggleMute} aria-label={volume > 0 ? "Silenciar música" : "Ativar som"} title={volume > 0 ? "Silenciar" : "Ativar som"}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4zm11.4.6a4 4 0 0 1 0 4.8M17.8 7a7 7 0 0 1 0 10" /></svg>
              </button>
              <span className="quick-volume-label">VOLUME</span>
              <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} aria-label="Volume do tocador rápido" />
              <output aria-live="polite">{Math.round(volume * 100)}%</output>
              <button type="button" className={`quick-shuffle-button${shuffleEnabled ? " is-active" : ""}`} onClick={() => setShuffleEnabled((current) => !current)} aria-label={shuffleEnabled ? "Desativar músicas aleatórias" : "Ativar músicas aleatórias"} aria-pressed={shuffleEnabled} title="Modo aleatório">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3.2c4.5 0 5 10 9.8 10h3m-3-3 3 3-3 3M4 17h3.2c1.8 0 3-1.6 4-3.5M14 7.8A4.7 4.7 0 0 1 17 7h3m-3-3 3 3-3 3" /></svg>
                <span>{shuffleEnabled ? "ALEATÓRIO: ON" : "ALEATÓRIO"}</span>
              </button>
            </div>
          </aside>}

          {visible.music && (
            <section className={`os-window music-window${maximized.music ? " is-maximized" : ""}`} style={windowStyle("music")} onPointerDown={() => front("music")} aria-label="Seletor de músicas">
              <WindowBar title="MIXTAPES" onClose={() => close("music")} maximized={maximized.music} onToggleMaximize={() => toggleMaximize("music")} onDragStart={(event) => startDrag("music", event)} onDragMove={dragWindow} onDragEnd={endDrag} onNudge={(x, y, bar) => nudgeWindow("music", x, y, bar)} />
              <div className="window-toolbar"><span>ARQUIVO</span><span>20 FAIXAS</span><span>VOL {Math.round(volume * 100)}%</span></div>
              <div className={`disc-grid${playing ? " is-playing" : ""}`}>
                {memories.map((memory, index) => (
                  <button type="button" className={`disc-item${selectedSongIndex === index ? " is-selected" : ""}`} key={memory.id} onClick={() => chooseSong(index)} aria-label={`Tocar ${memory.song.title}, ${memory.song.artist}`}>
                    <span className={`compact-disc disc-${memory.theme}`} aria-hidden="true"><Image src={thumbnailAsset(memory.photos[0])} alt="" fill sizes="45px" unoptimized /><i /></span>
                    <strong>{memory.id.toString().padStart(2, "0")}—{memory.song.title}</strong>
                    <small>{memory.song.artist}</small>
                  </button>
                ))}
              </div>
              <div className="mini-player">
                <div className="player-showcase">
                  <div className="now-playing">
                    <span className={`equalizer${playing ? " is-playing" : ""}`} aria-hidden="true"><i /><i /><i /><i /></span>
                    <div><small>{playing ? "TOCANDO AGORA" : "FAIXA SELECIONADA"}</small><strong>{selectedSong.title}</strong><span>{selectedSong.artist}</span></div>
                  </div>
                  <span className={`large-disc${playing ? " is-spinning" : ""}`} aria-hidden="true">
                    <Image src={thumbnailAsset(memories[selectedSongIndex].photos[0])} alt="" fill sizes="150px" unoptimized />
                    <i />
                  </span>
                </div>
                <AudioProgress audioRef={audioRef} className="player-progress" label="Posição da música" trackKey={selectedSong.file} />
                <div className="player-controls">
                  <button type="button" onClick={togglePlayback}>{playing ? "Ⅱ PAUSAR" : "▶ TOCAR"}</button>
                  <label>VOL <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => setVolume(Number(event.target.value))} aria-label="Volume" /></label>
                </div>
              </div>
            </section>
          )}

          {visible.memory && (
            <article className={`os-window memory-window${maximized.memory ? " is-maximized" : ""}`} style={windowStyle("memory")} onPointerDown={() => front("memory")} aria-label={`Memória ${activeMemory.number}: ${activeMemory.title}`}>
              <WindowBar title={`MEMÓRIA_${activeMemory.number.toString().padStart(2, "0")}.TXT`} onClose={() => close("memory")} maximized={maximized.memory} onToggleMaximize={() => toggleMaximize("memory")} onDragStart={(event) => startDrag("memory", event)} onDragMove={dragWindow} onDragEnd={endDrag} onNudge={(x, y, bar) => nudgeWindow("memory", x, y, bar)} />
              <div className="memory-toolbar"><button type="button" onClick={() => moveMemory(-1)}>← ANTERIOR</button><span>{activeMemory.number.toString().padStart(2, "0")} / {allMemories.length}</span><button type="button" onClick={() => moveMemory(1)}>PRÓXIMA →</button></div>
              <div className="memory-workspace">
                <section className="memory-document">
                  <p className="file-label">NOSSO_ARQUIVO / {activeMemory.date}</p>
                  <h1>{activeMemory.title}</h1>
                  <p className="memory-lead">{activeMemory.preview}</p>
                  {activeMemory.songIndex !== null && <button type="button" className="track-link" onClick={() => chooseSong(activeMemory.songIndex ?? 0)}>♫ ouvir a trilha desta memória</button>}
                  {activeMemory.secret && (
                    <div className={`secret-file${secretOpen ? " is-open" : ""}`}>
                      <button type="button" onClick={() => setSecretOpen((current) => !current)} aria-expanded={secretOpen}>{secretOpen ? "FECHAR SEGREDO.TXT" : "ABRIR SEGREDO.TXT"}</button>
                      {secretOpen && <p>{activeMemory.secret}</p>}
                    </div>
                  )}
                </section>
                <section className="photo-viewer" aria-label="Fotografias da memória">
                  <div className="photo-frame">
                    <Image key={`${activeMemory.key}-${activePhotoIndex}`} src={displayPhoto(activeMemory.photos[activePhotoIndex])} alt={`${activeMemory.title}, fotografia ${activePhotoIndex + 1}`} fill priority sizes="620px" unoptimized />
                    {activeMemory.photos.length > 1 && <><button type="button" className="photo-arrow photo-arrow--left" onClick={() => movePhoto(-1)} aria-label="Fotografia anterior">‹</button><button type="button" className="photo-arrow photo-arrow--right" onClick={() => movePhoto(1)} aria-label="Próxima fotografia">›</button></>}
                    <span className="photo-counter">FOTO {activePhotoIndex + 1}/{activeMemory.photos.length}</span>
                  </div>
                  <div className="photo-strip">
                    {activeMemory.photos.map((photo, index) => <button type="button" key={photo} className={activePhotoIndex === index ? "is-active" : ""} onClick={() => setActivePhotoIndex(index)} aria-label={`Abrir fotografia ${index + 1}`}><Image src={displayPhoto(photo, true)} alt="" fill sizes="70px" unoptimized /></button>)}
                  </div>
                </section>
              </div>
            </article>
          )}

          {visible.archive && (
            <aside className={`os-window archive-window${maximized.archive ? " is-maximized" : ""}`} style={windowStyle("archive")} onPointerDown={() => front("archive")} aria-label="Arquivo das nossas memórias">
              <WindowBar title="FOTOS & TEXTOS" onClose={() => close("archive")} maximized={maximized.archive} onToggleMaximize={() => toggleMaximize("archive")} onDragStart={(event) => startDrag("archive", event)} onDragMove={dragWindow} onDragEnd={endDrag} onNudge={(x, y, bar) => nudgeWindow("archive", x, y, bar)} />
              <div className="archive-header"><span>ÍNDICE CRONOLÓGICO</span><strong>VITÓRIA ♡ VICTOR</strong></div>
              <ol className="archive-list">
                {allMemories.map((memory, index) => <li key={memory.key}><button type="button" className={activeMemoryIndex === index ? "is-active" : ""} onClick={() => selectMemory(index)}><span className="archive-thumb"><Image src={displayPhoto(memory.photos[0], true)} alt="" fill sizes="54px" unoptimized /></span><span><small>{memory.date}{memory.isLiving ? " · NOVO CAPÍTULO" : ""}</small><strong>{memory.number.toString().padStart(2, "0")}. {memory.title}</strong></span></button></li>)}
              </ol>
            </aside>
          )}

          {visible.newMemory && (
            <section className={`os-window new-memory-window${maximized.newMemory ? " is-maximized" : ""}`} style={windowStyle("newMemory")} onPointerDown={() => front("newMemory")} aria-label="Adicionar uma nova memória">
              <WindowBar title="CONTINUAR_NOSSA_HISTÓRIA.EXE" onClose={() => close("newMemory")} maximized={maximized.newMemory} onToggleMaximize={() => toggleMaximize("newMemory")} onDragStart={(event) => startDrag("newMemory", event)} onDragMove={dragWindow} onDragEnd={endDrag} onNudge={(x, y, bar) => nudgeWindow("newMemory", x, y, bar)} />
              <div className="new-memory-content">
                <header className="new-memory-intro">
                  <span>O ÁLBUM CONTINUA VIVO</span>
                  <h2>Guardar um novo capítulo</h2>
                  <p>As memórias adicionadas aqui ficam online e aparecem no arquivo para vocês dois, em qualquer computador.</p>
                  <div className={`cloud-status cloud-status--${livingStatus}`} role="status">
                    <i aria-hidden="true">{livingStatus === "ready" ? "●" : livingStatus === "loading" ? "◌" : "!"}</i>
                    {livingStatus === "ready" && "Álbum online conectado"}
                    {livingStatus === "loading" && "Conectando ao álbum online..."}
                    {livingStatus === "error" && "Álbum online temporariamente indisponível"}
                    {livingStatus === "unconfigured" && "Armazenamento online aguardando configuração"}
                  </div>
                </header>

                {!livingMemoriesConfigured ? (
                  <section className="memory-setup-note">
                    <strong>FALTA CONECTAR O ARMAZENAMENTO GRATUITO</strong>
                    <p>A interface está pronta. Assim que o Supabase for configurado, o login e o formulário serão liberados automaticamente.</p>
                  </section>
                ) : !canEditMemories ? (
                  <form className="memory-login" onSubmit={requestMemoryLogin}>
                    <label htmlFor="memory-editor-email">E-MAIL AUTORIZADO
                      <input id="memory-editor-email" type="email" value={editorEmail} onChange={(event) => setEditorEmail(event.target.value)} autoComplete="email" maxLength={254} placeholder="seuemail@exemplo.com" required disabled={authBusy} />
                    </label>
                    <button type="submit" disabled={authBusy}>{authBusy ? "ENVIANDO LINK..." : "RECEBER LINK DE ACESSO ♡"}</button>
                    {signedInEmail && <p className="signed-email">Conectado como {signedInEmail}, sem permissão de edição.</p>}
                    {authMessage && <p className="memory-form-message" role="status">{authMessage}</p>}
                  </form>
                ) : (
                  <form className="new-memory-form" onSubmit={saveLivingMemory} aria-busy={memorySaving}>
                    <div className="memory-editor-bar">
                      <span>EDITANDO COMO <strong>{signedInEmail}</strong></span>
                      <button type="button" onClick={signOutMemoryEditor} disabled={authBusy || memorySaving}>SAIR</button>
                    </div>
                    <div className="new-memory-grid">
                      <label>DATA DA MEMÓRIA
                        <input type="date" name="memory_date" required disabled={memorySaving} />
                      </label>
                      <label>TÍTULO DO CAPÍTULO
                        <input name="title" minLength={2} maxLength={100} placeholder="Ex.: A tarde em que..." required disabled={memorySaving} />
                      </label>
                      <label className="memory-form-wide">FRASE DE ABERTURA
                        <input name="preview" minLength={3} maxLength={180} placeholder="Uma frase curta que resume esse momento" required disabled={memorySaving} />
                      </label>
                      <label className="memory-form-wide">CONTE A MEMÓRIA
                        <textarea name="story" minLength={10} maxLength={5000} placeholder="Escreva o que aconteceu e por que esse dia merece ficar guardado..." required disabled={memorySaving} />
                      </label>
                      <label className="memory-form-wide">MENSAGEM ESCONDIDA <small>opcional</small>
                        <input name="secret" maxLength={300} placeholder="Uma frase só para quem abrir o segredo.txt" disabled={memorySaving} />
                      </label>
                      <label className="memory-form-wide memory-photo-picker">FOTOGRAFIAS <small>1 a 6 · JPG, PNG ou WebP · até 8 MB cada</small>
                        <input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple required disabled={memorySaving} onChange={(event) => {
                          const files = Array.from(event.currentTarget.files ?? []);
                          setSelectedUploadNames(files.slice(0, 6).map((file) => file.name));
                        }} />
                        <span>{selectedUploadNames.length ? selectedUploadNames.join(" · ") : "CLIQUE PARA ESCOLHER AS FOTOS"}</span>
                      </label>
                    </div>
                    {livingError && <p className="memory-form-error" role="alert">{livingError}</p>}
                    {authMessage && <p className="memory-form-message" role="status">{authMessage}</p>}
                    <button type="submit" className="memory-save-button" disabled={memorySaving}>{memorySaving ? "GUARDANDO FOTOS E TEXTO..." : "GUARDAR NO NOSSO ÁLBUM ♡"}</button>
                  </form>
                )}
              </div>
            </section>
          )}

          {visible.response && (
            <section className={`os-window response-window${maximized.response ? " is-maximized" : ""}`} style={windowStyle("response")} onPointerDown={() => front("response")} aria-label="Responder ao presente">
              <WindowBar title="CAIXA_DE_MENSAGEM" onClose={() => close("response")} maximized={maximized.response} onToggleMaximize={() => toggleMaximize("response")} onDragStart={(event) => startDrag("response", event)} onDragMove={dragWindow} onDragEnd={endDrag} onNudge={(x, y, bar) => nudgeWindow("response", x, y, bar)} />
              <form action={feedbackEndpoint || undefined} method="POST" onSubmit={saveMessageLocally}>
                <input type="hidden" name="_subject" value="Vitória respondeu ao presente de 20 memórias" />
                <input type="hidden" name="_template" value="table" />
                <input type="hidden" name="_next" value={`${siteUrl}#obrigado`} />
                <label htmlFor="desktop-message">PARA: VICTOR <span>ASSUNTO: O QUE EU SENTI</span></label>
                <textarea id="desktop-message" name="Mensagem" minLength={3} maxLength={2000} placeholder="Pode escrever tudo o que estiver sentindo..." required />
                <button type="submit">ENVIAR MENSAGEM ♡</button>
                {savedMessage && <p className="message-saved" role="status">Mensagem guardada neste computador.</p>}
              </form>
            </section>
          )}

          {visible.date && (
            <section className={`os-window date-window${maximized.date ? " is-maximized" : ""}`} style={windowStyle("date")} onPointerDown={() => front("date")} aria-label="Escolher uma data para nosso encontro">
              <WindowBar title="NOSSO_ENCONTRO.CAL" onClose={() => close("date")} maximized={maximized.date} onToggleMaximize={() => toggleMaximize("date")} onDragStart={(event) => startDrag("date", event)} onDragMove={dragWindow} onDragEnd={endDrag} onNudge={(x, y, bar) => nudgeWindow("date", x, y, bar)} />
              <div className="date-planner">
                {(dateStep === "calendar" || dateStep === "roulette") && (
                  <nav className="date-view-switch" aria-label="Escolher entre calendário e roleta de encontros">
                    <button type="button" aria-pressed={dateStep === "calendar"} onClick={() => { setDateError(""); setDateStep("calendar"); }}>
                      <span aria-hidden="true">▦</span> CALENDÁRIO
                    </button>
                    <button type="button" aria-pressed={dateStep === "roulette"} onClick={openDateRoulette}>
                      <span aria-hidden="true">✦</span> ROLETA DE ENCONTROS
                    </button>
                  </nav>
                )}
                {dateStep === "calendar" && (
                  <section className="calendar-step" aria-labelledby="calendar-heading">
                    <div className="date-intro"><span>NOSSO CALENDÁRIO</span><h2 id="calendar-heading">Quando nós saímos — ou vamos sair?</h2><p>Escolha uma data livre: em dias passados você registra o que já vivemos; hoje e no futuro, marca o nosso próximo encontro.</p></div>
                    {rouletteSuggestion && (
                      <aside className="roulette-calendar-note" aria-live="polite">
                        <span aria-hidden="true">{rouletteSuggestion.icon}</span>
                        <p><small>A ROLETA ESCOLHEU</small><strong>{rouletteSuggestion.title}</strong>Agora escolha uma data para esse encontro.</p>
                        <button type="button" onClick={() => setRouletteSuggestion(null)} aria-label="Remover sugestão da roleta">×</button>
                      </aside>
                    )}
                    <div className="calendar-toolbar">
                      <button type="button" onClick={() => changeCalendarMonth(-1)} aria-label="Mês anterior">←</button>
                      <strong>{calendarTitle}</strong>
                      <button type="button" onClick={() => changeCalendarMonth(1)} aria-label="Próximo mês">→</button>
                    </div>
                    <div className="calendar-legend" aria-label="Legenda do calendário">
                      <span><i className="legend-lived" aria-hidden="true">✿</i> encontro vivido</span>
                      <span><i className="legend-planned" aria-hidden="true">●</i> encontro agendado</span>
                      <span><i className="legend-today" aria-hidden="true" /> hoje</span>
                    </div>
                    <div className="calendar-weekdays" aria-hidden="true"><span>DOM</span><span>SEG</span><span>TER</span><span>QUA</span><span>QUI</span><span>SEX</span><span>SÁB</span></div>
                    <div className="calendar-grid" role="grid" aria-label={`Calendário de ${calendarTitle}`}>
                      {Array.from({ length: firstCalendarWeekday }, (_, index) => <span className="calendar-empty" key={`empty-${index}`} />)}
                      {Array.from({ length: daysInCalendarMonth }, (_, index) => {
                        const day = index + 1;
                        const isoDate = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const calendarMemory = calendarMemories[isoDate];
                        const scheduledEncounter = scheduledEncounters[isoDate];
                        const isPast = Boolean(todayIso && isoDate < todayIso);
                        const isToday = isoDate === todayIso;
                        const isSelected = selectedDate === isoDate;
                        const scheduledIsLived = scheduledEncounter?.kind === "lived";
                        const classes = [
                          "calendar-day",
                          calendarMemory ? "has-memory is-completed" : "",
                          scheduledEncounter ? (scheduledIsLived ? "has-memory is-completed" : "has-scheduled is-future-meeting") : "",
                          isPast ? "is-past" : "",
                          isToday ? "is-today" : "",
                          isSelected ? "is-selected" : "",

                        ].filter(Boolean).join(" ");
                        const title = calendarMemory?.description ?? (scheduledEncounter ? `${scheduledEncounter.outing}: ${scheduledEncounter.place}` : undefined);
                        const ariaLabel = calendarMemory
                          ? `Encontro realizado em ${day} de ${calendarTitle}: ${calendarMemory.description}. Abrir detalhes.`
                          : scheduledEncounter
                            ? `${scheduledIsLived ? "Encontro vivido" : "Encontro agendado"} em ${day} de ${calendarTitle}: ${scheduledEncounter.outing}, ${scheduledEncounter.place}. Abrir detalhes.`
                            : `Escolher dia ${day} de ${calendarTitle}${isPast ? ", para registrar um encontro vivido" : isToday ? ", hoje" : ", para marcar um encontro"}.`;
                        return (
                          <button
                            type="button"
                            className={classes}
                            data-day={day}
                            data-date={isoDate}
                            data-memory-date={calendarMemory ? isoDate : undefined}
                            data-scheduled-date={scheduledEncounter ? isoDate : undefined}
                            key={day}
                            title={title}
                            onMouseEnter={() => calendarMemory && setCalendarPreviewDate(isoDate)}
                            onMouseLeave={() => setCalendarPreviewDate((current) => current === isoDate ? null : current)}
                            onFocus={() => calendarMemory && setCalendarPreviewDate(isoDate)}
                            onBlur={() => setCalendarPreviewDate((current) => current === isoDate ? null : current)}
                            onClick={() => chooseDate(day)}
                            aria-label={ariaLabel}
                            aria-current={isToday ? "date" : undefined}
                            aria-pressed={isSelected}
                          >
                            <span>{day}</span><small aria-hidden="true">{calendarMemory || scheduledIsLived ? "✿" : scheduledEncounter ? "●" : "♡"}</small>
                          </button>
                        );
                      })}
                    </div>
                    {dateError && <p className="date-error" role="alert">{dateError}</p>}
                    {calendarPreviewMemory && (
                      <aside className="calendar-memory-preview" aria-live="polite">
                        <span>LEMBRANÇA DE {calendarPreviewLabel}</span>
                        <p>{calendarPreviewMemory.description}</p>
                        <small>Clique no dia para consultar os detalhes dessa lembrança.</small>
                      </aside>
                    )}
                  </section>
                )}

                {dateStep === "roulette" && (
                  <section className="roulette-step" aria-labelledby="roulette-heading">
                    <div className="roulette-copy">
                      <span>DEIXA O DESTINO ESCOLHER</span>
                      <h2 id="roulette-heading">Qual será o nosso próximo encontro?</h2>
                      <p>Gire a roleta e descubra uma ideia preparada para nós dois. <strong>{allDateIdeas.length} ideias disponíveis.</strong></p>
                    </div>
                    <div className="roulette-stage">
                      <span className="roulette-pointer" aria-hidden="true">♥</span>
                      <div
                        className={`roulette-wheel${rouletteSpinning ? " is-spinning" : ""}`}
                        style={{ "--roulette-rotation": `${rouletteRotation}deg`, "--roulette-segment-angle": `${360 / allDateIdeas.length}deg`, "--roulette-start-angle": `${-180 / allDateIdeas.length}deg` } as CSSProperties}
                        aria-hidden="true"
                      >
                        {allDateIdeas.map((idea, index) => (
                          <span
                            className="roulette-idea"
                            style={{ "--idea-angle": `${index * (360 / allDateIdeas.length)}deg` } as CSSProperties}
                            key={`${idea.title}-${index}`}
                          >
                            <i>{idea.icon}</i>
                          </span>
                        ))}
                      </div>
                      <button type="button" className="roulette-spin" onClick={spinDateRoulette} disabled={rouletteSpinning}>
                        {rouletteSpinning ? "..." : "GIRAR"}<span aria-hidden="true">♡</span>
                      </button>
                    </div>
                    <div className={`roulette-result${rouletteHasResult ? " has-result" : ""}`} aria-live="polite" aria-atomic="true">
                      {rouletteSpinning ? (
                        <p>A roleta está escolhendo um encontro bonito para vocês...</p>
                      ) : rouletteHasResult ? (
                        <><span>{allDateIdeas[rouletteIndex].icon}</span><div><small>A ROLETA ESCOLHEU</small><h3>{allDateIdeas[rouletteIndex].title}</h3><p>{allDateIdeas[rouletteIndex].description}</p></div></>
                      ) : (
                        <p>Clique em <strong>GIRAR</strong> e deixe o acaso preparar o próximo capítulo.</p>
                      )}
                    </div>
                    <div className="roulette-actions">
                      <button type="button" className="secondary" onClick={spinDateRoulette} disabled={rouletteSpinning}>{rouletteHasResult ? "GIRAR DE NOVO" : "SORTEAR UMA IDEIA"}</button>
                      {rouletteHasResult && <button type="button" onClick={useRouletteIdea}>ESCOLHER UMA DATA ♡</button>}
                      <button
                        type="button"
                        className="roulette-add-toggle"
                        aria-expanded={rouletteAdding}
                        onClick={() => { setRouletteAdding((current) => !current); setRouletteMessage(""); }}
                        disabled={rouletteSpinning || (!rouletteAdding && customDateIdeas.length >= customRouletteLimit)}
                      >
                        {customDateIdeas.length >= customRouletteLimit ? "LIMITE ATINGIDO" : rouletteAdding ? "FECHAR CADASTRO" : "＋ ADICIONAR IDEIA"}
                      </button>
                    </div>
                    {rouletteMessage && <p className="roulette-message" role="status">{rouletteMessage}</p>}
                    {rouletteAdding && (
                      <form className="roulette-add-form" onSubmit={addCustomDateIdea}>
                        <header><span aria-hidden="true">✦</span><div><strong>Adicionar uma ideia à roleta</strong><small>Ela ficará guardada neste computador.</small></div></header>
                        <div className="roulette-add-grid">
                          <label htmlFor="roulette-new-title">NOME DA IDEIA<input id="roulette-new-title" name="Nome da ideia" minLength={3} maxLength={70} placeholder="Ex.: Noite de jogos e pizza" required /></label>
                          <label htmlFor="roulette-new-place">ONDE SERIA?<input id="roulette-new-place" name="Local da ideia" minLength={2} maxLength={100} placeholder="Ex.: Em casa ou no nosso lugar favorito" required /></label>
                          <label className="roulette-add-description" htmlFor="roulette-new-description">COMO SERIA ESSE ENCONTRO?<textarea id="roulette-new-description" name="Descrição da ideia" minLength={3} maxLength={280} placeholder="Conte os detalhes da ideia..." required /></label>
                        </div>
                        <button type="submit">COLOCAR NA ROLETA ♡</button>
                      </form>
                    )}
                    {customDateIdeas.length > 0 && (
                      <section className="roulette-custom-list" aria-label="Ideias adicionadas à roleta">
                        <header><strong>SUAS IDEIAS</strong><span>{customDateIdeas.length}/{customRouletteLimit}</span></header>
                        <ul>{customDateIdeas.map((idea, index) => <li key={`${idea.title}-${index}`}><span>✦</span><strong>{idea.title}</strong><button type="button" onClick={() => removeCustomDateIdea(index)} disabled={rouletteSpinning} aria-label={`Remover ${idea.title} da roleta`}>×</button></li>)}</ul>
                      </section>
                    )}
                  </section>
                )}

                {dateStep === "confirm" && (
                  <section className="date-confirm" aria-labelledby="date-confirm-title">
                    <span className="date-heart" aria-hidden="true">♡</span>
                    <p>VOCÊ ESCOLHEU</p>
                    <strong>{selectedDateLabel}</strong>
                    <h2 id="date-confirm-title">{isPastLocalDate(selectedDate) ? "Quer guardar o que aconteceu nesse dia?" : "Tem certeza dessa data?"}</h2>
                    {dateError && <p className="date-error" role="alert">{dateError}</p>}
                    <div className="date-actions"><button type="button" className="secondary" onClick={() => returnToCalendar(selectedDate)}>ESCOLHER OUTRA</button><button type="button" onClick={() => { setDateError(""); setDateStep("details"); }}>SIM, TENHO CERTEZA ♡</button></div>
                  </section>
                )}

                {dateStep === "details" && (
                  <form className="date-details" action={feedbackEndpoint || undefined} method="POST" onSubmit={saveDateRequestLocally} aria-busy={dateSaving}>
                    <input type="hidden" name="_subject" value={isPastLocalDate(selectedDate) ? "Vitória registrou um encontro que vocês viveram ♡" : "Vitória escolheu uma data para sair com você ♡"} />
                    <input type="hidden" name="_template" value="table" />
                    <input type="hidden" name="_next" value={`${siteUrl}#encontro-enviado`} />
                    <input type="hidden" name="Data escolhida" value={selectedDateLabel} />
                    <input type="hidden" name="Data ISO" value={selectedDate} />
                    <input type="hidden" name="Ideia sorteada" value={isPastLocalDate(selectedDate) ? "" : rouletteSuggestion?.title ?? ""} />
                    <header><span>{isPastLocalDate(selectedDate) ? "ENCONTRO VIVIDO" : "ENCONTRO ESCOLHIDO"}</span><h2>{selectedDateLabel}</h2><button type="button" onClick={() => returnToCalendar(selectedDate)}>TROCAR DATA</button></header>
                    <label htmlFor="outing-type">{isPastLocalDate(selectedDate) ? "QUE TIPO DE ENCONTRO FOI?" : "ONDE VOCÊ QUER IR?"}<select id="outing-type" name="Tipo de passeio" defaultValue={isPastLocalDate(selectedDate) ? "" : rouletteSuggestion?.outing ?? ""} required disabled={dateSaving}><option value="" disabled>{isPastLocalDate(selectedDate) ? "Escolha o que fizemos..." : "Escolha uma ideia..."}</option><option>Restaurante</option><option>Cinema</option><option>Parque ou praia</option><option>Café ou confeitaria</option><option>Passeio surpresa</option><option>Outro lugar</option></select></label>
                    <label htmlFor="outing-place">{isPastLocalDate(selectedDate) ? "ONDE NÓS FOMOS?" : "QUAL É O LOCAL?"}<input id="outing-place" name="Local desejado" minLength={2} maxLength={120} defaultValue={isPastLocalDate(selectedDate) ? "" : rouletteSuggestion?.place ?? ""} placeholder="Ex.: o nome do restaurante ou lugar" required disabled={dateSaving} /></label>
                    <label className="date-description" htmlFor="outing-description">{isPastLocalDate(selectedDate) ? "CONTE O QUE ACONTECEU" : "DESCREVA O LOCAL E O QUE VOCÊ IMAGINOU"}<textarea id="outing-description" name="Descrição do local" minLength={3} maxLength={1000} defaultValue={isPastLocalDate(selectedDate) ? "" : rouletteSuggestion?.description ?? ""} placeholder={isPastLocalDate(selectedDate) ? "Conte o que fizemos e o que tornou esse dia especial..." : "Conte onde fica, o que gostaria de fazer e qualquer detalhe importante..."} required disabled={dateSaving} /></label>
                    {dateError && <p className="date-error" role="alert">{dateError}</p>}
                    <button type="submit" className="date-submit" disabled={dateSaving}>{dateSaving ? "ENVIANDO..." : isPastLocalDate(selectedDate) ? "GUARDAR ESTA LEMBRANÇA ♡" : "ENVIAR NOSSO ENCONTRO PARA O VICTOR ♡"}</button>
                  </form>
                )}

                {dateStep === "record" && (
                  <section className="date-record" aria-labelledby="date-record-title">
                    <header>
                      <div><span>{recordCalendarMemory || recordScheduledEncounter?.kind === "lived" ? "ENCONTRO VIVIDO" : "ENCONTRO AGENDADO"}</span><h2 id="date-record-title">{recordDateLabel}</h2></div>
                      <button ref={recordCloseButton} type="button" onClick={closeDateRecord} aria-label="Fechar detalhes do encontro">×</button>
                    </header>
                    {recordCalendarMemory ? (
                      <article className="date-record-copy"><span aria-hidden="true">✿</span><p>{recordCalendarMemory.description || "Ainda não há uma descrição cadastrada para esta lembrança."}</p></article>
                    ) : recordScheduledEncounter ? (
                      <dl>
                        <div><dt>PASSEIO</dt><dd>{recordScheduledEncounter.outing}</dd></div>
                        <div><dt>LOCAL</dt><dd>{recordScheduledEncounter.place}</dd></div>
                        <div><dt>COMO VOCÊ IMAGINOU</dt><dd>{recordScheduledEncounter.description || "Nenhuma descrição foi cadastrada."}</dd></div>
                      </dl>
                    ) : (
                      <p className="date-error" role="status">Este encontro não está mais disponível.</p>
                    )}
                    {dateRequestSaved && recordScheduledEncounter && <p className="date-saved" role="status">{recordScheduledEncounter.kind === "lived" ? "Lembrança guardada neste computador." : "Pedido guardado neste computador."}</p>}
                    <button type="button" className="date-record-back" onClick={closeDateRecord}>VOLTAR AO CALENDÁRIO</button>
                  </section>
                )}
              </div>
            </section>
          )}
        </section>

        <nav className="desktop-dock" aria-label="Aplicativos do presente">
          <button type="button" aria-pressed={visible.music} onClick={toggleMusicWindow}><span aria-hidden="true">♫</span><strong>Músicas</strong></button>
          <button type="button" aria-pressed={visible.memory} onClick={() => toggleWindow("memory")}><span aria-hidden="true">▧</span><strong>Memória</strong></button>
          <button type="button" aria-pressed={visible.archive} onClick={() => toggleWindow("archive")}><span aria-hidden="true">▦</span><strong>Arquivo</strong></button>
          <button type="button" className="dock-heart" onClick={() => chooseSongFromQuickPlayer(4)}><span aria-hidden="true">♡</span><strong>Nossa música</strong></button>
          <button type="button" className="dock-date" aria-pressed={visible.date} onClick={toggleDateWindow}><span aria-hidden="true">17</span><strong>Encontro</strong></button>
          <button type="button" className="dock-new-memory" aria-pressed={visible.newMemory} onClick={() => toggleWindow("newMemory")}><span aria-hidden="true">＋</span><strong>Nova memória</strong></button>
          <button type="button" aria-pressed={visible.response} onClick={() => toggleWindow("response")}><span aria-hidden="true">✎</span><strong>Responder</strong></button>
        </nav>
      </main>
    </>
  );
}
