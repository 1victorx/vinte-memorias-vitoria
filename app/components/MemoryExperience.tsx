"use client";

import Image from "next/image";
import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { calendarMemories } from "../data/calendar-memories";
import { memories } from "../data/memories";
import { isPastLocalDate, localDateToIso, parseLocalIsoDate } from "../lib/local-date";

type WindowName = "music" | "memory" | "archive" | "response" | "date";
type Point = { x: number; y: number };
type DragState = {
  name: WindowName;
  pointerId: number;
  originX: number;
  originY: number;
  rect: DOMRect;
};
type DateStep = "calendar" | "confirm" | "details" | "record";
type ScheduledEncounter = {
  date: string;
  kind: "lived" | "planned";
  outing: string;
  place: string;
  description: string;
};

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://1victorx.github.io/vinte-memorias-vitoria/";
const feedbackEndpoint = process.env.NEXT_PUBLIC_FEEDBACK_ENDPOINT ?? "";
const asset = (path: string) => `${basePath}${path}`;
const encounterStorageKey = "encontros-agendados-vitoria";

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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.72);
  const [secretOpen, setSecretOpen] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [dateRequestSaved, setDateRequestSaved] = useState(false);
  const [dateStep, setDateStep] = useState<DateStep>("calendar");
  const [todayIso, setTodayIso] = useState("");
  const [scheduledEncounters, setScheduledEncounters] = useState<Record<string, ScheduledEncounter>>({});
  const [recordDate, setRecordDate] = useState("");
  const [dateError, setDateError] = useState("");
  const [dateSaving, setDateSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [calendarPreviewDate, setCalendarPreviewDate] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState({ year: 2026, month: 7 });
  const [clock, setClock] = useState("--:--");
  const [visible, setVisible] = useState<Record<WindowName, boolean>>({
    music: false, memory: false, archive: false, response: false, date: false,
  });
  const [layers, setLayers] = useState<Record<WindowName, number>>({
    music: 12, memory: 14, archive: 13, response: 16, date: 17,
  });
  const [positions, setPositions] = useState<Record<WindowName, Point | null>>({
    music: null,
    memory: null,
    archive: null,
    response: null,
    date: null,
  });
  const [maximized, setMaximized] = useState<Record<WindowName, boolean>>({
    music: false,
    memory: false,
    archive: false,
    response: false,
    date: false,
  });
  const welcomeRef = useRef<HTMLElement>(null);
  const welcomeCopyRef = useRef<HTMLDivElement>(null);
  const yesButtonRef = useRef<HTMLButtonElement>(null);
  const noButtonRef = useRef<HTMLButtonElement>(null);
  const lastEscapeTime = useRef(Number.NEGATIVE_INFINITY);
  const escapeCount = useRef(0);
  const welcomeTimer = useRef<number | null>(null);
  const desktopRef = useRef<HTMLElement>(null);
  const ambienceRef = useRef<HTMLDivElement>(null);
  const mousePetalCount = useRef(0);
  const dragState = useRef<DragState | null>(null);
  const recordCloseButton = useRef<HTMLButtonElement>(null);
  const dateSavingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const autoplay = useRef(false);
  const activeMemory = memories[activeMemoryIndex];
  const selectedSong = memories[selectedSongIndex].song;
  const progress = duration ? (currentTime / duration) * 100 : 0;
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
  }, []);

  useEffect(() => {
    const refreshToday = () => setTodayIso(localDateToIso(new Date()));
    refreshToday();
    const timer = window.setInterval(refreshToday, 30_000);
    const storageFrame = window.requestAnimationFrame(() => {
      setScheduledEncounters(readScheduledEncounters(localStorage.getItem(encounterStorageKey)));
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
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (reducedMotion.matches || !finePointer.matches) return;

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
      if (travelled < 58 || now - lastPetalAt < 85) return;

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
        if (index < items.length - 14) item.remove();
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
    setCurrentTime(0);
    setDuration(0);
    if (autoplay.current) audio.play().catch(() => setPlaying(false));
  }, [selectedSong.file]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  function front(name: WindowName) {
    setLayers((current) => {
      const nextLayer = Math.max(...Object.values(current)) + 1;
      return { ...current, [name]: nextLayer };
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

  function moveWindow(name: WindowName, left: number, top: number, rect: DOMRect) {
    const visibleTitleWidth = Math.min(140, rect.width);
    const minLeft = visibleTitleWidth - rect.width;
    const maxLeft = window.innerWidth - visibleTitleWidth;
    const minTop = 30;
    const maxTop = window.innerHeight - 48;
    setPositions((current) => ({
      ...current,
      [name]: {
        x: Math.max(minLeft, Math.min(maxLeft, left)),
        y: Math.max(minTop, Math.min(maxTop, top)),
      },
    }));
  }

  function startDrag(name: WindowName, event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0 || maximized[name]) return;
    event.preventDefault();
    const windowElement = event.currentTarget.closest(".os-window");
    if (!(windowElement instanceof HTMLElement)) return;
    front(name);
    dragState.current = {
      name,
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      rect: windowElement.getBoundingClientRect(),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function dragWindow(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    moveWindow(
      drag.name,
      drag.rect.left + event.clientX - drag.originX,
      drag.rect.top + event.clientY - drag.originY,
      drag.rect,
    );
  }

  function endDrag(event: ReactPointerEvent<HTMLElement>) {
    if (dragState.current?.pointerId !== event.pointerId) return;
    dragState.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function nudgeWindow(name: WindowName, x: number, y: number, bar: HTMLElement) {
    if (maximized[name]) return;
    const windowElement = bar.closest(".os-window");
    if (!(windowElement instanceof HTMLElement)) return;
    const rect = windowElement.getBoundingClientRect();
    front(name);
    moveWindow(name, rect.left + x, rect.top + y, rect);
  }


  function show(name: WindowName) {
    setVisible((current) => ({ ...current, [name]: true }));
    front(name);
  }

  function close(name: WindowName) {
    setVisible((current) => ({ ...current, [name]: false }));
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
    selectMemory((activeMemoryIndex + direction + memories.length) % memories.length);
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
    autoplay.current = true;
    setSelectedSongIndex((index + memories.length) % memories.length);
  }

  function seek(value: number) {
    if (audioRef.current && duration) audioRef.current.currentTime = (value / 100) * duration;
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
    const guardNoButton = (event: PointerEvent) => {
      const noButton = noButtonRef.current;
      if (noButton && distanceFromPointToRect(event.clientX, event.clientY, noButton.getBoundingClientRect()) < 280) {
        escapeNoButton(event.clientX, event.clientY);
      }
    };
    window.addEventListener("pointermove", guardNoButton, true);
    return () => window.removeEventListener("pointermove", guardNoButton, true);
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
                <p>Tem mar, flores, música e vinte pedacinhos da nossa história esperando por você.</p>
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
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onEnded={() => setPlaying(false)}
        />

        <div ref={ambienceRef} className="mouse-ambience" aria-hidden="true">
          <span className="mouse-glow" />
          <span className="mouse-spark mouse-spark--one">✦</span>
          <span className="mouse-spark mouse-spark--two">♡</span>
        </div>

        <header className="system-bar">
          <div className="system-brand"><span>✿</span><strong>VITÓRIA OS</strong><i>20 memórias para Amor</i></div>
          <div className="system-status"><span>DOM 10 AGO 2026</span><span>♡</span><time>{clock}</time></div>
        </header>

        <section className="wallpaper" aria-label="Janelas abertas">
          <div className="desktop-stamp" aria-hidden="true"><span>V + V</span><small>DESDE 2025</small></div>

          <aside className="desktop-quick-player" aria-label="Tocador rápido de músicas">
            <span className={`quick-player-disc${playing ? " is-spinning" : ""}`} aria-hidden="true">
              <Image src={asset(memories[selectedSongIndex].photos[0])} alt="" fill sizes="54px" unoptimized />
              <i />
            </span>
            <button type="button" className="quick-player-track" onClick={() => show("music")} aria-label="Abrir lista de músicas">
              <small>{playing ? "TOCANDO AGORA" : "FAIXA PRONTA"}</small>
              <strong>{selectedSong.title}</strong>
              <span>{selectedSong.artist}</span>
            </button>
            <div className="quick-player-controls">
              <button type="button" onClick={() => chooseSongFromQuickPlayer(selectedSongIndex - 1)} aria-label="Música anterior">‹</button>
              <button type="button" onClick={togglePlayback} aria-label={playing ? "Pausar música" : "Tocar música"}>{playing ? "Ⅱ" : "▶"}</button>
              <button type="button" onClick={() => chooseSongFromQuickPlayer(selectedSongIndex + 1)} aria-label="Próxima música">›</button>
            </div>
            <input type="range" min="0" max="100" value={progress} onChange={(event) => seek(Number(event.target.value))} aria-label="Posição da música no tocador rápido" />
          </aside>

          {visible.music && (
            <section className={`os-window music-window${maximized.music ? " is-maximized" : ""}`} style={windowStyle("music")} onPointerDown={() => front("music")} aria-label="Seletor de músicas">
              <WindowBar title="MIXTAPES" onClose={() => close("music")} maximized={maximized.music} onToggleMaximize={() => toggleMaximize("music")} onDragStart={(event) => startDrag("music", event)} onDragMove={dragWindow} onDragEnd={endDrag} onNudge={(x, y, bar) => nudgeWindow("music", x, y, bar)} />
              <div className="window-toolbar"><span>ARQUIVO</span><span>20 FAIXAS</span><span>VOL {Math.round(volume * 100)}%</span></div>
              <div className={`disc-grid${playing ? " is-playing" : ""}`}>
                {memories.map((memory, index) => (
                  <button type="button" className={`disc-item${selectedSongIndex === index ? " is-selected" : ""}`} key={memory.id} onClick={() => chooseSong(index)} aria-label={`Tocar ${memory.song.title}, ${memory.song.artist}`}>
                    <span className={`compact-disc disc-${memory.theme}`} aria-hidden="true"><Image src={asset(memory.photos[0])} alt="" fill sizes="45px" unoptimized /><i /></span>
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
                    <Image src={asset(memories[selectedSongIndex].photos[0])} alt="" fill sizes="150px" unoptimized />
                    <i />
                  </span>
                </div>
                <div className="player-progress"><span>{formatTime(currentTime)}</span><input type="range" min="0" max="100" value={progress} onChange={(event) => seek(Number(event.target.value))} aria-label="Posição da música" /><span>{formatTime(duration)}</span></div>
                <div className="player-controls">
                  <button type="button" onClick={togglePlayback}>{playing ? "Ⅱ PAUSAR" : "▶ TOCAR"}</button>
                  <label>VOL <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => setVolume(Number(event.target.value))} aria-label="Volume" /></label>
                </div>
              </div>
            </section>
          )}

          {visible.memory && (
            <article className={`os-window memory-window${maximized.memory ? " is-maximized" : ""}`} style={windowStyle("memory")} onPointerDown={() => front("memory")} aria-label={`Memória ${activeMemory.id}: ${activeMemory.title}`}>
              <WindowBar title={`MEMÓRIA_${activeMemory.id.toString().padStart(2, "0")}.TXT`} onClose={() => close("memory")} maximized={maximized.memory} onToggleMaximize={() => toggleMaximize("memory")} onDragStart={(event) => startDrag("memory", event)} onDragMove={dragWindow} onDragEnd={endDrag} onNudge={(x, y, bar) => nudgeWindow("memory", x, y, bar)} />
              <div className="memory-toolbar"><button type="button" onClick={() => moveMemory(-1)}>← ANTERIOR</button><span>{activeMemory.id.toString().padStart(2, "0")} / 20</span><button type="button" onClick={() => moveMemory(1)}>PRÓXIMA →</button></div>
              <div className="memory-workspace">
                <section className="memory-document">
                  <p className="file-label">NOSSO_ARQUIVO / {activeMemory.date}</p>
                  <h1>{activeMemory.title}</h1>
                  <p className="memory-lead">{activeMemory.preview}</p>
                  <p>{activeMemory.story}</p>
                  <p className="pending-copy">Este espaço receberá as palavras definitivas do Victor.</p>
                  <button type="button" className="track-link" onClick={() => chooseSong(activeMemoryIndex)}>♫ ouvir a trilha desta memória</button>
                  <div className={`secret-file${secretOpen ? " is-open" : ""}`}>
                    <button type="button" onClick={() => setSecretOpen((current) => !current)} aria-expanded={secretOpen}>{secretOpen ? "FECHAR SEGREDO.TXT" : "ABRIR SEGREDO.TXT"}</button>
                    {secretOpen && <p>{activeMemory.secret}</p>}
                  </div>
                </section>
                <section className="photo-viewer" aria-label="Fotografias da memória">
                  <div className="photo-frame">
                    <Image src={asset(activeMemory.photos[activePhotoIndex])} alt={`${activeMemory.title}, fotografia ${activePhotoIndex + 1}`} fill priority sizes="620px" unoptimized />
                    {activeMemory.photos.length > 1 && <><button type="button" className="photo-arrow photo-arrow--left" onClick={() => movePhoto(-1)} aria-label="Fotografia anterior">‹</button><button type="button" className="photo-arrow photo-arrow--right" onClick={() => movePhoto(1)} aria-label="Próxima fotografia">›</button></>}
                    <span className="photo-counter">FOTO {activePhotoIndex + 1}/{activeMemory.photos.length}</span>
                  </div>
                  <div className="photo-strip">
                    {activeMemory.photos.map((photo, index) => <button type="button" key={photo} className={activePhotoIndex === index ? "is-active" : ""} onClick={() => setActivePhotoIndex(index)} aria-label={`Abrir fotografia ${index + 1}`}><Image src={asset(photo)} alt="" fill sizes="70px" unoptimized /></button>)}
                  </div>
                </section>
              </div>
            </article>
          )}

          {visible.archive && (
            <aside className={`os-window archive-window${maximized.archive ? " is-maximized" : ""}`} style={windowStyle("archive")} onPointerDown={() => front("archive")} aria-label="Arquivo das vinte memórias">
              <WindowBar title="FOTOS & TEXTOS" onClose={() => close("archive")} maximized={maximized.archive} onToggleMaximize={() => toggleMaximize("archive")} onDragStart={(event) => startDrag("archive", event)} onDragMove={dragWindow} onDragEnd={endDrag} onNudge={(x, y, bar) => nudgeWindow("archive", x, y, bar)} />
              <div className="archive-header"><span>ÍNDICE CRONOLÓGICO</span><strong>VITÓRIA ♡ VICTOR</strong></div>
              <ol className="archive-list">
                {memories.map((memory, index) => <li key={memory.id}><button type="button" className={activeMemoryIndex === index ? "is-active" : ""} onClick={() => selectMemory(index)}><span className="archive-thumb"><Image src={asset(memory.photos[0])} alt="" fill sizes="54px" unoptimized /></span><span><small>{memory.date}</small><strong>{memory.id.toString().padStart(2, "0")}. {memory.title}</strong></span></button></li>)}
              </ol>
            </aside>
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
                {dateStep === "calendar" && (
                  <section className="calendar-step" aria-labelledby="calendar-heading">
                    <div className="date-intro"><span>NOSSO CALENDÁRIO</span><h2 id="calendar-heading">Quando nós saímos — ou vamos sair?</h2><p>Escolha uma data livre: em dias passados você registra o que já vivemos; hoje e no futuro, marca o nosso próximo encontro.</p></div>
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
                    <header><span>{isPastLocalDate(selectedDate) ? "ENCONTRO VIVIDO" : "ENCONTRO ESCOLHIDO"}</span><h2>{selectedDateLabel}</h2><button type="button" onClick={() => returnToCalendar(selectedDate)}>TROCAR DATA</button></header>
                    <label htmlFor="outing-type">{isPastLocalDate(selectedDate) ? "QUE TIPO DE ENCONTRO FOI?" : "ONDE VOCÊ QUER IR?"}<select id="outing-type" name="Tipo de passeio" defaultValue="" required disabled={dateSaving}><option value="" disabled>{isPastLocalDate(selectedDate) ? "Escolha o que fizemos..." : "Escolha uma ideia..."}</option><option>Restaurante</option><option>Cinema</option><option>Parque ou praia</option><option>Café ou confeitaria</option><option>Passeio surpresa</option><option>Outro lugar</option></select></label>
                    <label htmlFor="outing-place">{isPastLocalDate(selectedDate) ? "ONDE NÓS FOMOS?" : "QUAL É O LOCAL?"}<input id="outing-place" name="Local desejado" minLength={2} maxLength={120} placeholder="Ex.: o nome do restaurante ou lugar" required disabled={dateSaving} /></label>
                    <label className="date-description" htmlFor="outing-description">{isPastLocalDate(selectedDate) ? "CONTE O QUE ACONTECEU" : "DESCREVA O LOCAL E O QUE VOCÊ IMAGINOU"}<textarea id="outing-description" name="Descrição do local" minLength={3} maxLength={1000} placeholder={isPastLocalDate(selectedDate) ? "Conte o que fizemos e o que tornou esse dia especial..." : "Conte onde fica, o que gostaria de fazer e qualquer detalhe importante..."} required disabled={dateSaving} /></label>
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
          <button type="button" onClick={() => show("music")}><span aria-hidden="true">♫</span><strong>Músicas</strong></button>
          <button type="button" onClick={() => show("memory")}><span aria-hidden="true">▧</span><strong>Memória</strong></button>
          <button type="button" onClick={() => show("archive")}><span aria-hidden="true">▦</span><strong>Arquivo</strong></button>
          <button type="button" className="dock-heart" onClick={() => chooseSong(4)}><span aria-hidden="true">♡</span><strong>Nossa música</strong></button>

          <button type="button" onClick={() => show("response")}><span aria-hidden="true">✎</span><strong>Responder</strong></button>
          <button type="button" className="dock-date" onClick={() => { setDateStep("calendar"); setDateError(""); show("date"); }}><span aria-hidden="true">17</span><strong>Encontro</strong></button>
        </nav>
      </main>
    </>
  );
}
