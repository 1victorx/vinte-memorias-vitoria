"use client";

import { useEffect, useRef } from "react";

type GsapRomanticBackgroundProps = {
  active: boolean;
};

const flowers = [
  { left: "7%", top: "12%", size: 112 },
  { left: "26%", top: "62%", size: 86 },
  { left: "72%", top: "10%", size: 126 },
  { left: "84%", top: "56%", size: 96 },
  { left: "48%", top: "34%", size: 72 },
  { left: "12%", top: "72%", size: 74 },
];

const hearts = [
  { left: "18%", top: "21%", size: 35 },
  { left: "38%", top: "13%", size: 25 },
  { left: "63%", top: "25%", size: 40 },
  { left: "91%", top: "22%", size: 29 },
  { left: "5%", top: "51%", size: 23 },
  { left: "34%", top: "77%", size: 37 },
  { left: "67%", top: "71%", size: 27 },
  { left: "91%", top: "78%", size: 42 },
];

const petals = [
  { left: "3%", top: "35%", rotate: -24 },
  { left: "15%", top: "43%", rotate: 18 },
  { left: "30%", top: "26%", rotate: -12 },
  { left: "44%", top: "69%", rotate: 29 },
  { left: "57%", top: "15%", rotate: -31 },
  { left: "71%", top: "47%", rotate: 16 },
  { left: "79%", top: "76%", rotate: -18 },
  { left: "94%", top: "42%", rotate: 26 },
  { left: "53%", top: "84%", rotate: -9 },
  { left: "23%", top: "87%", rotate: 35 },
];

export default function GsapRomanticBackground({ active }: GsapRomanticBackgroundProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !active) return;

    let disposed = false;
    let cleanup: () => void = () => undefined;

    void import("gsap").then(({ gsap }) => {
      if (disposed || !host.isConnected) return;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const context = gsap.context(() => {
        gsap.set(".gsap-flower, .gsap-heart, .gsap-petal, .gsap-sparkle", { force3D: true });
        if (reducedMotion) return;

        gsap.utils.toArray<HTMLElement>(".gsap-flower").forEach((flower, index) => {
          gsap.to(flower, {
            y: index % 2 === 0 ? -24 : 22,
            rotation: index % 2 === 0 ? 12 : -10,
            duration: 3.8 + index * 0.28,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: index * -0.7,
          });
        });

        gsap.utils.toArray<HTMLElement>(".gsap-heart").forEach((heart, index) => {
          gsap.to(heart, {
            y: -18 - (index % 3) * 8,
            rotation: index % 2 === 0 ? 9 : -11,
            scale: 1.12 + (index % 2) * 0.08,
            duration: 2.8 + index * 0.23,
            repeat: -1,
            yoyo: true,
            ease: "power1.inOut",
            delay: index * -0.45,
          });
        });

        gsap.utils.toArray<HTMLElement>(".gsap-petal").forEach((petal, index) => {
          gsap.to(petal, {
            x: index % 2 === 0 ? 34 : -30,
            y: 28 + (index % 4) * 10,
            rotation: `+=${index % 2 === 0 ? 65 : -55}`,
            duration: 4.4 + index * 0.31,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: index * -0.5,
          });
        });

        gsap.to(".gsap-sparkle", {
          opacity: 0.95,
          scale: 1.55,
          duration: 1.35,
          stagger: { each: 0.14, from: "random", repeat: -1, yoyo: true },
          ease: "sine.inOut",
        });
        gsap.to(".gsap-orbit--one", { rotation: 360, duration: 38, repeat: -1, ease: "none" });
        gsap.to(".gsap-orbit--two", { rotation: -360, duration: 46, repeat: -1, ease: "none" });
      }, host);

      let moveLayers: ((event: PointerEvent) => void) | undefined;
      let pointerFrame = 0;
      if (!reducedMotion) {
        const farLayer = host.querySelector<HTMLElement>(".gsap-layer--far");
        const nearLayer = host.querySelector<HTMLElement>(".gsap-layer--near");
        if (farLayer && nearLayer) {
          const farX = gsap.quickTo(farLayer, "x", { duration: 1.1, ease: "power2.out" });
          const farY = gsap.quickTo(farLayer, "y", { duration: 1.1, ease: "power2.out" });
          const nearX = gsap.quickTo(nearLayer, "x", { duration: 0.75, ease: "power2.out" });
          const nearY = gsap.quickTo(nearLayer, "y", { duration: 0.75, ease: "power2.out" });
          let latestX = window.innerWidth / 2;
          let latestY = window.innerHeight / 2;

          const paintLayers = () => {
            pointerFrame = 0;
            const horizontal = latestX / window.innerWidth - 0.5;
            const vertical = latestY / window.innerHeight - 0.5;
            farX(horizontal * -30);
            farY(vertical * -20);
            nearX(horizontal * 44);
            nearY(vertical * 30);
          };
          moveLayers = (event: PointerEvent) => {
            latestX = event.clientX;
            latestY = event.clientY;
            if (!pointerFrame) pointerFrame = window.requestAnimationFrame(paintLayers);
          };
          window.addEventListener("pointermove", moveLayers, { passive: true });
        }
      }

      host.dataset.motionReady = reducedMotion ? "reduced" : "true";
      cleanup = () => {
        if (moveLayers) window.removeEventListener("pointermove", moveLayers);
        if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
        context.revert();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [active]);

  if (!active) return null;

  return (
    <div ref={hostRef} className="gsap-romantic-background" aria-hidden="true" data-engine="gsap" data-active={active}>
      <div className="gsap-orbit gsap-orbit--one" />
      <div className="gsap-orbit gsap-orbit--two" />
      <div className="gsap-layer gsap-layer--far">
        {flowers.map((flower, index) => (
          <span
            className={`gsap-flower gsap-flower--${(index % 3) + 1}`}
            key={`${flower.left}-${flower.top}`}
            style={{ left: flower.left, top: flower.top, width: flower.size, height: flower.size }}
          >
            {Array.from({ length: 8 }, (_, petalIndex) => <i key={petalIndex} style={{ transform: `rotate(${petalIndex * 45}deg) translateY(-34%)` }} />)}
            <b />
          </span>
        ))}
      </div>
      <div className="gsap-layer gsap-layer--near">
        {hearts.map((heart) => (
          <span className="gsap-heart" key={`${heart.left}-${heart.top}`} style={{ left: heart.left, top: heart.top, fontSize: heart.size }}>♥</span>
        ))}
        {petals.map((petal) => (
          <span className="gsap-petal" key={`${petal.left}-${petal.top}`} style={{ left: petal.left, top: petal.top, rotate: `${petal.rotate}deg` }} />
        ))}
        {Array.from({ length: 24 }, (_, index) => (
          <span
            className="gsap-sparkle"
            key={index}
            style={{ left: `${4 + ((index * 17) % 92)}%`, top: `${7 + ((index * 29) % 84)}%` }}
          >✦</span>
        ))}
      </div>
    </div>
  );
}
