"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { memories, specialSong } from "../data/memories";

type View = "welcome" | "hub" | "memory" | "final";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://1victorx.github.io/vinte-memorias-vitoria/";
const feedbackEndpoint = process.env.NEXT_PUBLIC_FEEDBACK_ENDPOINT ?? "";

function asset(path: string) {
  return `${basePath}${path}`;
}

function FloralMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`floral-mark${small ? " floral-mark--small" : ""}`} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <i />
    </span>
  );
}

export default function MemoryExperience() {
  const [view, setView] = useState<View>("welcome");
  const [activeIndex, setActiveIndex] = useState(0);
  const [secretOpen, setSecretOpen] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [specialMode, setSpecialMode] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playingRef = useRef(false);

  const activeMemory = memories[activeIndex];
  const selectedSong = specialMode ? specialSong : activeMemory.song;
  const audioSource = asset(selectedSong.file);

  const syncFromHash = () => {
    const hash = window.location.hash;
    const match = hash.match(/^#memoria-(\d{1,2})$/);

    if (match) {
      const id = Number(match[1]);
      if (id >= 1 && id <= memories.length) {
        setActiveIndex(id - 1);
        setView("memory");
        setSecretOpen(false);
        return;
      }
    }

    if (hash === "#capitulos") {
      setView("hub");
      return;
    }

    if (hash === "#carta" || hash === "#obrigado") {
      setView("final");
      if (hash === "#obrigado") {
        setLetterOpen(true);
      }
      return;
    }

    setView("welcome");
  };

  useEffect(() => {
    const initialSync = window.requestAnimationFrame(syncFromHash);
    window.addEventListener("hashchange", syncFromHash);
    window.addEventListener("popstate", syncFromHash);

    return () => {
      window.cancelAnimationFrame(initialSync);
      window.removeEventListener("hashchange", syncFromHash);
      window.removeEventListener("popstate", syncFromHash);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const resume = playingRef.current;
    audio.pause();
    audio.src = audioSource;
    audio.load();

    if (resume) {
      audio.play().catch(() => {
        playingRef.current = false;
        setPlaying(false);
      });
    }
  }, [audioSource]);

  useEffect(() => {
    if (view === "memory" || view === "final") {
      document.title = `${activeMemory.id.toString().padStart(2, "0")} — ${activeMemory.title}`;
    } else {
      document.title = "20 memórias para Vitória";
    }
  }, [activeMemory, view]);

  const progress = useMemo(
    () => Math.round(((activeIndex + 1) / memories.length) * 100),
    [activeIndex],
  );

  function navigate(nextView: View, index = activeIndex) {
    setMenuOpen(false);
    setSecretOpen(false);

    if (nextView === "memory") {
      setActiveIndex(index);
      window.location.hash = `memoria-${index + 1}`;
    } else if (nextView === "hub") {
      window.location.hash = "capitulos";
    } else if (nextView === "final") {
      window.location.hash = "carta";
    } else {
      history.pushState(null, "", window.location.pathname);
      setView("welcome");
    }

    setView(nextView);
    requestAnimationFrame(() =>
      window.scrollTo({ top: 0, behavior: "smooth" }),
    );
  }

  function goForward() {
    if (activeIndex === memories.length - 1) {
      navigate("final");
      return;
    }
    navigate("memory", activeIndex + 1);
  }

  function goBack() {
    if (activeIndex === 0) {
      navigate("hub");
      return;
    }
    navigate("memory", activeIndex - 1);
  }

  async function toggleAudio() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (audio.paused) {
      try {
        await audio.play();
        playingRef.current = true;
        setPlaying(true);
      } catch {
        playingRef.current = false;
        setPlaying(false);
      }
    } else {
      audio.pause();
      playingRef.current = false;
      setPlaying(false);
    }
  }

  function toggleSpecialSong() {
    setSpecialMode((current) => !current);
    playingRef.current = true;
    setPlaying(true);
  }

  function saveMessageLocally(event: FormEvent<HTMLFormElement>) {
    if (feedbackEndpoint) {
      return;
    }

    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = String(form.get("Mensagem") ?? "").trim();
    if (!message) {
      return;
    }

    localStorage.setItem("mensagem-para-victor", message);
    setSavedMessage(true);
    event.currentTarget.reset();
  }

  return (
    <div className={`experience theme-${activeMemory.theme}`}>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>

      <audio
        ref={audioRef}
        preload="metadata"
        src={audioSource}
        onPlay={() => {
          playingRef.current = true;
          setPlaying(true);
        }}
        onPause={() => {
          playingRef.current = false;
          setPlaying(false);
        }}
        onEnded={() => {
          playingRef.current = false;
          setPlaying(false);
        }}
      />

      {view !== "welcome" && (
        <header className="topbar">
          <button
            className="brand-button"
            type="button"
            onClick={() => navigate("hub")}
            aria-label="Voltar à central de memórias"
          >
            <span className="brand-monogram">V♡V</span>
            <span>
              <strong>20 memórias</strong>
              <small>para Vitória</small>
            </span>
          </button>

          <div className="topbar-actions">
            <button
              className={`special-song${specialMode ? " is-active" : ""}`}
              type="button"
              onClick={toggleSpecialSong}
              aria-pressed={specialMode}
              title="Tocar a nossa música"
            >
              <span aria-hidden="true">♡</span>
              <span className="special-song-label">Nossa música</span>
            </button>
            <button
              className={`player-button${playing ? " is-playing" : ""}`}
              type="button"
              onClick={toggleAudio}
              aria-label={playing ? "Pausar música" : "Tocar música"}
            >
              <span className="player-icon" aria-hidden="true">
                {playing ? "Ⅱ" : "▶"}
              </span>
              <span className="player-copy">
                <small>{playing ? "tocando agora" : "trilha desta memória"}</small>
                <strong>{selectedSong.title}</strong>
              </span>
            </button>
          </div>
        </header>
      )}

      {view === "welcome" && (
        <main className="welcome" id="conteudo">
          <div className="welcome-orb welcome-orb--one" aria-hidden="true" />
          <div className="welcome-orb welcome-orb--two" aria-hidden="true" />

          <section className="welcome-copy" aria-labelledby="welcome-title">
            <div className="welcome-kicker">
              <FloralMark small />
              <span>10 de agosto de 2026</span>
            </div>
            <p className="welcome-for">Para a minha pessoa favorita</p>
            <h1 id="welcome-title">
              <span className="welcome-number">20</span>
              <span className="welcome-title-lines">
                <em>memórias</em>
                <strong>para você, Amor.</strong>
              </span>
            </h1>
            <p className="welcome-intro">
              Um passeio por vinte capítulos da nossa história — com flores,
              música e alguns segredos escondidos pelo caminho.
            </p>
            <button
              className="primary-button"
              type="button"
              onClick={() => navigate("hub")}
            >
              Abrir nosso álbum
              <span aria-hidden="true">→</span>
            </button>
            <p className="welcome-note">
              <span aria-hidden="true">♪</span>
              O som começa quando você escolher tocar.
            </p>
          </section>

          <div className="welcome-photo-stage" aria-hidden="true">
            <div className="photo-shadow photo-shadow--one" />
            <div className="photo-shadow photo-shadow--two" />
            <figure className="welcome-photo">
              <Image
                src={asset("/media/photos/memory-19-02.jpg")}
                alt=""
                fill
                priority
                sizes="(max-width: 720px) 78vw, 38vw"
                unoptimized
              />
              <figcaption>
                <span>V + V</span>
                <time>desde 2025</time>
              </figcaption>
            </figure>
            <span className="floating-note floating-note--one">amor</span>
            <span className="floating-note floating-note--two">20 capítulos</span>
            <FloralMark />
          </div>
        </main>
      )}

      {view === "hub" && (
        <main className="hub" id="conteudo">
          <section className="hub-hero">
            <div className="hub-hero-copy">
              <p className="eyebrow">Nosso arquivo de coisas bonitas</p>
              <h1>
                Vinte vezes em que a vida disse
                <em> “guarda isso.”</em>
              </h1>
              <p>
                Escolha qualquer capítulo ou siga desde o começo. Cada número
                abre uma fotografia, uma música e um pedacinho do que somos.
              </p>
              <button
                type="button"
                className="primary-button"
                onClick={() => navigate("memory", 0)}
              >
                Começar pela primeira
                <span aria-hidden="true">→</span>
              </button>
            </div>
            <figure className="hub-hero-photo">
              <Image
                src={asset("/media/photos/memory-11-01.jpg")}
                alt="Vitória e Victor juntos em frente ao mar"
                fill
                priority
                sizes="(max-width: 720px) 88vw, 38vw"
                unoptimized
              />
              <figcaption>capítulo favorito: todos</figcaption>
            </figure>
          </section>

          <section className="chapter-section" aria-labelledby="chapters-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Escolha uma lembrança</p>
                <h2 id="chapters-title">Os nossos 20 capítulos</h2>
              </div>
              <p>06.06.2025 — para sempre</p>
            </div>

            <ol className="chapter-grid">
              {memories.map((memory, index) => (
                <li key={memory.id}>
                  <button
                    type="button"
                    className={`chapter-card theme-${memory.theme}`}
                    onClick={() => navigate("memory", index)}
                  >
                    <span className="chapter-number">
                      {memory.id.toString().padStart(2, "0")}
                    </span>
                    <span className="chapter-thumb">
                      <Image
                        src={asset(memory.photos[0])}
                        alt=""
                        fill
                        priority={index < 4}
                        sizes="(max-width: 640px) 28vw, (max-width: 1100px) 14vw, 10vw"
                        unoptimized
                      />
                    </span>
                    <span className="chapter-card-copy">
                      <small>{memory.date}</small>
                      <strong>{memory.title}</strong>
                    </span>
                    <span className="chapter-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </section>

          <section className="hub-quote">
            <FloralMark />
            <p>
              “Este site termina na memória vinte. A nossa história, não.”
            </p>
            <span>feito com amor por Victor</span>
          </section>
        </main>
      )}

      {view === "memory" && (
        <main className="memory-page" id="conteudo">
          <button
            className="mobile-chapters-button"
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-controls="chapter-navigation"
          >
            <span>
              Capítulo {activeMemory.id.toString().padStart(2, "0")} de 20
            </span>
            <span aria-hidden="true">Todos os capítulos ☰</span>
          </button>

          <aside
            className={`chapter-rail${menuOpen ? " is-open" : ""}`}
            id="chapter-navigation"
            aria-label="Navegação pelos capítulos"
          >
            <div className="rail-heading">
              <span>Capítulos</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Fechar capítulos"
              >
                ×
              </button>
            </div>
            <nav>
              {memories.map((memory, index) => (
                <button
                  key={memory.id}
                  type="button"
                  className={index === activeIndex ? "is-active" : ""}
                  onClick={() => navigate("memory", index)}
                  aria-current={index === activeIndex ? "page" : undefined}
                  title={memory.title}
                >
                  {memory.id.toString().padStart(2, "0")}
                </button>
              ))}
            </nav>
            <button
              className="rail-home"
              type="button"
              onClick={() => navigate("hub")}
            >
              Ver a central
            </button>
          </aside>

          {menuOpen && (
            <button
              className="menu-backdrop"
              type="button"
              aria-label="Fechar menu"
              onClick={() => setMenuOpen(false)}
            />
          )}

          <article className="memory-article">
            <div className="memory-progress" aria-label={`Progresso: ${progress}%`}>
              <span style={{ width: `${progress}%` }} />
            </div>

            <header className="memory-heading">
              <div>
                <p className="eyebrow">
                  memória {activeMemory.id.toString().padStart(2, "0")} de 20
                </p>
                <h1>{activeMemory.title}</h1>
              </div>
              <time>{activeMemory.date}</time>
            </header>

            <div
              className={`photo-gallery photo-gallery--${Math.min(
                activeMemory.photos.length,
                5,
              )}`}
            >
              {activeMemory.photos.map((photo, index) => (
                <figure key={photo} className={`photo-item photo-item--${index + 1}`}>
                  <Image
                    src={asset(photo)}
                    alt={`${activeMemory.title}, registro ${index + 1}`}
                    fill
                    priority={index === 0}
                    sizes="(max-width: 760px) 88vw, 50vw"
                    unoptimized
                  />
                  <span aria-hidden="true">
                    {activeMemory.id.toString().padStart(2, "0")}.
                    {(index + 1).toString().padStart(2, "0")}
                  </span>
                </figure>
              ))}
            </div>

            <section className="memory-story" aria-labelledby="story-title">
              <div className="story-marker" aria-hidden="true">
                <span>{activeMemory.id.toString().padStart(2, "0")}</span>
                <FloralMark small />
              </div>
              <div className="story-copy">
                <p className="eyebrow">O que essa lembrança guarda</p>
                <h2 id="story-title">{activeMemory.preview}</h2>
                <p>{activeMemory.story}</p>
                <p className="story-pending">
                  Este capítulo ainda vai receber as palavras exatas do Victor.
                  Até lá, a fotografia e a música contam uma parte da história.
                </p>
              </div>
              <div className="song-card">
                <span className="song-disc" aria-hidden="true">
                  <i />
                </span>
                <div>
                  <small>trilha deste capítulo</small>
                  <strong>{activeMemory.song.title}</strong>
                  <span>{activeMemory.song.artist}</span>
                </div>
                <button type="button" onClick={toggleAudio}>
                  {playing && !specialMode ? "Pausar" : "Ouvir"}
                </button>
              </div>
            </section>

            <section className={`secret-card${secretOpen ? " is-open" : ""}`}>
              <div className="secret-front">
                <span aria-hidden="true">✦</span>
                <div>
                  <small>Tem uma mensagem escondida aqui</small>
                  <strong>Toque para revelar</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setSecretOpen((current) => !current)}
                  aria-expanded={secretOpen}
                >
                  {secretOpen ? "Guardar" : "Descobrir"}
                </button>
              </div>
              {secretOpen && (
                <p className="secret-message" role="status">
                  {activeMemory.secret}
                </p>
              )}
            </section>

            <nav className="memory-controls" aria-label="Navegar pelas memórias">
              <button type="button" onClick={goBack}>
                <span aria-hidden="true">←</span>
                <span>
                  <small>{activeIndex === 0 ? "voltar para" : "memória anterior"}</small>
                  <strong>
                    {activeIndex === 0
                      ? "Central"
                      : memories[activeIndex - 1].title}
                  </strong>
                </span>
              </button>
              <button type="button" onClick={goForward}>
                <span>
                  <small>
                    {activeIndex === memories.length - 1
                      ? "última surpresa"
                      : "próxima memória"}
                  </small>
                  <strong>
                    {activeIndex === memories.length - 1
                      ? "Abrir a carta"
                      : memories[activeIndex + 1].title}
                  </strong>
                </span>
                <span aria-hidden="true">→</span>
              </button>
            </nav>
          </article>
        </main>
      )}

      {view === "final" && (
        <main className="final-page" id="conteudo">
          <section className="final-intro">
            <p className="eyebrow">Você chegou até aqui</p>
            <h1>
              A memória vinte termina.
              <em>A nossa história continua.</em>
            </h1>
            <p>
              Ainda existe uma última coisa guardada para você — a mais
              importante de todas.
            </p>
          </section>

          <section className={`letter-stage${letterOpen ? " is-open" : ""}`}>
            <div className="letter-photo">
              <Image
                src={asset("/media/photos/memory-20-01.jpg")}
                alt="Vitória e Victor na lembrança mais recente do álbum"
                fill
                priority
                sizes="(max-width: 720px) 78vw, 34vw"
                unoptimized
              />
              <span>para sempre nós</span>
            </div>

            <div className="envelope-wrap">
              <div className="envelope" aria-hidden="true">
                <div className="envelope-back" />
                <div className="letter-sheet">
                  <span>Para Vitória,</span>
                  <i>com todo o meu amor.</i>
                </div>
                <div className="envelope-front" />
                <div className="envelope-flap" />
                <span className="wax-seal">V</span>
              </div>

              {!letterOpen ? (
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => setLetterOpen(true)}
                >
                  Abrir minha carta
                  <span aria-hidden="true">♡</span>
                </button>
              ) : (
                <article className="letter-content">
                  <p className="letter-greeting">Meu amor,</p>
                  <p>
                    Esta é a única parte do presente que ainda não poderia ser
                    escrita por outra voz. A carta definitiva será colocada
                    aqui pelo Victor, com cada palavra que ele escolheu para
                    você.
                  </p>
                  <p>
                    Por enquanto, fica esta certeza: cada detalhe deste lugar
                    foi feito para lembrar o quanto a sua existência tornou a
                    vida dele mais bonita.
                  </p>
                  <p className="letter-signature">
                    Com amor,
                    <strong>Victor</strong>
                  </p>
                </article>
              )}
            </div>
          </section>

          {letterOpen && (
            <section className="response-section" aria-labelledby="response-title">
              <div>
                <p className="eyebrow">Agora é a sua vez</p>
                <h2 id="response-title">O que você sentiu?</h2>
                <p>
                  Escreva uma mensagem para o Victor. Ela vai chegar guardada
                  até ele.
                </p>
              </div>

              <form
                action={feedbackEndpoint || undefined}
                method="POST"
                onSubmit={saveMessageLocally}
              >
                <input
                  type="hidden"
                  name="_subject"
                  value="Vitória respondeu ao presente de 20 memórias"
                />
                <input type="hidden" name="_template" value="table" />
                <input type="hidden" name="_next" value={`${siteUrl}#obrigado`} />
                <label htmlFor="final-message">Sua mensagem</label>
                <textarea
                  id="final-message"
                  name="Mensagem"
                  rows={6}
                  minLength={3}
                  maxLength={2000}
                  placeholder="Pode escrever tudo o que estiver sentindo..."
                  required
                />
                <div className="form-footer">
                  <small>Somente o Victor receberá esta mensagem.</small>
                  <button className="primary-button" type="submit">
                    Enviar para o Victor
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
                {savedMessage && (
                  <p className="form-success" role="status">
                    Mensagem guardada neste aparelho. A entrega por e-mail será
                    ativada antes do aniversário.
                  </p>
                )}
              </form>
            </section>
          )}

          <footer className="final-footer">
            <span>20 memórias</span>
            <FloralMark small />
            <span>um amor inteiro</span>
            <button type="button" onClick={() => navigate("hub")}>
              Recomeçar o passeio
            </button>
          </footer>
        </main>
      )}
    </div>
  );
}
