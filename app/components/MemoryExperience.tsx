"use client";

import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";
import { memories } from "../data/memories";

type WindowName = "music" | "memory" | "archive" | "letter" | "response";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://1victorx.github.io/vinte-memorias-vitoria/";
const feedbackEndpoint = process.env.NEXT_PUBLIC_FEEDBACK_ENDPOINT ?? "";
const asset = (path: string) => `${basePath}${path}`;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

function WindowBar({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <header className="window-bar">
      <span className="window-grip" aria-hidden="true" />
      <strong>{title}</strong>
      <button type="button" onClick={onClose} aria-label={`Fechar ${title}`}>×</button>
    </header>
  );
}

export default function MemoryExperience() {
  const [activeMemoryIndex, setActiveMemoryIndex] = useState(0);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [selectedSongIndex, setSelectedSongIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.72);
  const [secretOpen, setSecretOpen] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [clock, setClock] = useState("--:--");
  const [visible, setVisible] = useState<Record<WindowName, boolean>>({
    music: true, memory: true, archive: true, letter: false, response: false,
  });
  const [layers, setLayers] = useState<Record<WindowName, number>>({
    music: 12, memory: 14, archive: 13, letter: 15, response: 16,
  });
  const topLayer = useRef(20);
  const audioRef = useRef<HTMLAudioElement>(null);
  const autoplay = useRef(false);
  const activeMemory = memories[activeMemoryIndex];
  const selectedSong = memories[selectedSongIndex].song;
  const progress = duration ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    const update = () => setClock(new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date()));
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);


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
    topLayer.current += 1;
    setLayers((current) => ({ ...current, [name]: topLayer.current }));
  }

  function show(name: WindowName) {
    setVisible((current) => ({ ...current, [name]: true }));
    front(name);
  }

  function close(name: WindowName) {
    setVisible((current) => ({ ...current, [name]: false }));
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

  return (
    <>
      <div className="computer-only" role="status">
        <span aria-hidden="true">▣</span>
        <h1>Este presente foi feito para computador.</h1>
        <p>Abra o link em uma tela maior para explorar todas as janelas.</p>
      </div>

      <main className="desktop" aria-label="Área de trabalho das nossas memórias">
        <audio
          ref={audioRef}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onEnded={() => setPlaying(false)}
        />

        <header className="system-bar">
          <div className="system-brand"><span>✿</span><strong>VITÓRIA OS</strong><i>20 memórias para Amor</i></div>
          <div className="system-status"><span>DOM 10 AGO 2026</span><span>♡</span><time>{clock}</time></div>
        </header>

        <section className="wallpaper" aria-label="Janelas abertas">
          <div className="desktop-stamp" aria-hidden="true"><span>V + V</span><small>DESDE 2025</small></div>

          {visible.music && (
            <section className="os-window music-window" style={{ zIndex: layers.music }} onPointerDown={() => front("music")} aria-label="Seletor de músicas">
              <WindowBar title="MIXTAPES" onClose={() => close("music")} />
              <div className="window-toolbar"><span>ARQUIVO</span><span>20 FAIXAS</span><span>VOL {Math.round(volume * 100)}%</span></div>
              <div className="disc-grid">
                {memories.map((memory, index) => (
                  <button type="button" className={`disc-item${selectedSongIndex === index ? " is-selected" : ""}`} key={memory.id} onClick={() => chooseSong(index)} aria-label={`Tocar ${memory.song.title}, ${memory.song.artist}`}>
                    <span className={`compact-disc disc-${memory.theme}`} aria-hidden="true"><i /></span>
                    <strong>{memory.id.toString().padStart(2, "0")}—{memory.song.title}</strong>
                    <small>{memory.song.artist}</small>
                  </button>
                ))}
              </div>
              <div className="mini-player">
                <div className="now-playing">
                  <span className={`equalizer${playing ? " is-playing" : ""}`} aria-hidden="true"><i /><i /><i /><i /></span>
                  <div><small>{playing ? "TOCANDO AGORA" : "FAIXA SELECIONADA"}</small><strong>{selectedSong.title}</strong><span>{selectedSong.artist}</span></div>
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
            <article className="os-window memory-window" style={{ zIndex: layers.memory }} onPointerDown={() => front("memory")} aria-label={`Memória ${activeMemory.id}: ${activeMemory.title}`}>
              <WindowBar title={`MEMÓRIA_${activeMemory.id.toString().padStart(2, "0")}.TXT`} onClose={() => close("memory")} />
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
            <aside className="os-window archive-window" style={{ zIndex: layers.archive }} onPointerDown={() => front("archive")} aria-label="Arquivo das vinte memórias">
              <WindowBar title="FOTOS & TEXTOS" onClose={() => close("archive")} />
              <div className="archive-header"><span>ÍNDICE CRONOLÓGICO</span><strong>VITÓRIA ♡ VICTOR</strong></div>
              <ol className="archive-list">
                {memories.map((memory, index) => <li key={memory.id}><button type="button" className={activeMemoryIndex === index ? "is-active" : ""} onClick={() => selectMemory(index)}><span className="archive-thumb"><Image src={asset(memory.photos[0])} alt="" fill sizes="54px" unoptimized /></span><span><small>{memory.date}</small><strong>{memory.id.toString().padStart(2, "0")}. {memory.title}</strong></span></button></li>)}
              </ol>
            </aside>
          )}

          {visible.letter && (
            <section className="os-window letter-window" style={{ zIndex: layers.letter }} onPointerDown={() => front("letter")} aria-label="Carta para Vitória">
              <WindowBar title="CARTA_FINAL.DOC" onClose={() => close("letter")} />
              <div className="letter-layout">
                <figure className="letter-polaroid"><Image src={asset("/media/photos/memory-20-01.jpg")} alt="Vitória e Victor em uma lembrança juntos" fill sizes="280px" unoptimized /><figcaption>para sempre nós</figcaption></figure>
                <article className="letter-paper">
                  <span className="letter-date">10 de agosto de 2026</span>
                  <h2>Meu amor,</h2>
                  <p>Esta é a única parte do presente que ainda não poderia ser escrita por outra voz. A carta definitiva será colocada aqui pelo Victor, com cada palavra escolhida para você.</p>
                  <p>Por enquanto, fica esta certeza: cada detalhe deste lugar foi feito para lembrar o quanto a sua existência tornou a vida dele mais bonita.</p>
                  <p className="letter-signature">Com amor, <strong>Victor</strong></p>
                  <button type="button" onClick={() => show("response")}>RESPONDER AO VICTOR →</button>
                </article>
              </div>
            </section>
          )}

          {visible.response && (
            <section className="os-window response-window" style={{ zIndex: layers.response }} onPointerDown={() => front("response")} aria-label="Responder ao presente">
              <WindowBar title="CAIXA_DE_MENSAGEM" onClose={() => close("response")} />
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
        </section>

        <nav className="desktop-dock" aria-label="Aplicativos do presente">
          <button type="button" onClick={() => show("music")}><span aria-hidden="true">♫</span><strong>Músicas</strong></button>
          <button type="button" onClick={() => show("memory")}><span aria-hidden="true">▧</span><strong>Memória</strong></button>
          <button type="button" onClick={() => show("archive")}><span aria-hidden="true">▦</span><strong>Arquivo</strong></button>
          <button type="button" className="dock-heart" onClick={() => chooseSong(4)}><span aria-hidden="true">♡</span><strong>Nossa música</strong></button>
          <button type="button" onClick={() => show("letter")}><span aria-hidden="true">✉</span><strong>Carta</strong></button>
          <button type="button" onClick={() => show("response")}><span aria-hidden="true">✎</span><strong>Responder</strong></button>
        </nav>
      </main>
    </>
  );
}
