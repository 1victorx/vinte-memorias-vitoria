"use client";

import { gsap } from "gsap";
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

    const moveLayers = (event: PointerEvent) => {
      if (reducedMotion) return;
      const horizontal = event.clientX / window.innerWidth - 0.5;
      const vertical = event.clientY / window.innerHeight - 0.5;
      gsap.to(host.querySelector(".gsap-layer--far"), { x: horizontal * -30, y: vertical * -20, duration: 1.1, ease: "power2.out", overwrite: "auto" });
      gsap.to(host.querySelector(".gsap-layer--near"), { x: horizontal * 44, y: vertical * 30, duration: 0.75, ease: "power2.out", overwrite: "auto" });
    };

    window.addEventListener("pointermove", moveLayers, { passive: true });
    return () => {
      window.removeEventListener("pointermove", moveLayers);
      context.revert();
    };
  }, [active]);

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
