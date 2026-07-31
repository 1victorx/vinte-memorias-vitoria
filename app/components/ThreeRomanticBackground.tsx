"use client";

import { useEffect, useRef, useState } from "react";

type ThreeRomanticBackgroundProps = {
  active: boolean;
};

type FloatingObject = {
  mesh: import("three").Object3D;
  baseX: number;
  baseY: number;
  phase: number;
  speed: number;
  drift: number;
};

export default function ThreeRomanticBackground({ active }: ThreeRomanticBackgroundProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !active) return;

    let disposed = false;
    let animationFrame = 0;
    let cleanup = () => undefined;

    void import("three").then((THREE) => {
      if (disposed || !hostRef.current) return;

      const currentHost = hostRef.current;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 100);
      camera.position.z = 10;

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
      } catch {
        setAvailable(false);
        return;
      }

      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
      renderer.domElement.className = "three-romantic-canvas";
      renderer.domElement.setAttribute("aria-hidden", "true");
      currentHost.appendChild(renderer.domElement);

      const group = new THREE.Group();
      scene.add(group);
      const floating: FloatingObject[] = [];
      const pinks = [0xa93467, 0xd96d98, 0xed9db5, 0xc9a4dd, 0xf1c95f];

      const heartShape = new THREE.Shape();
      heartShape.moveTo(0, -0.25);
      heartShape.bezierCurveTo(-0.9, -0.95, -1.6, 0.05, -0.75, 0.72);
      heartShape.bezierCurveTo(-0.3, 1.08, 0, 0.72, 0, 0.42);
      heartShape.bezierCurveTo(0, 0.72, 0.3, 1.08, 0.75, 0.72);
      heartShape.bezierCurveTo(1.6, 0.05, 0.9, -0.95, 0, -0.25);
      const heartGeometry = new THREE.ShapeGeometry(heartShape, 2);

      for (let index = 0; index < 11; index += 1) {
        const material = new THREE.MeshBasicMaterial({
          color: pinks[index % pinks.length],
          transparent: true,
          opacity: 0.07 + (index % 3) * 0.025,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(heartGeometry, material);
        const scale = 0.14 + (index % 4) * 0.055;
        const baseX = -7.2 + ((index * 3.17) % 14.4);
        const baseY = -4.2 + ((index * 2.11) % 8.4);
        mesh.scale.set(scale, scale, scale);
        mesh.position.set(baseX, baseY, -1 - (index % 3));
        mesh.rotation.z = (index % 5) * 0.28;
        group.add(mesh);
        floating.push({ mesh, baseX, baseY, phase: index * 0.83, speed: 0.16 + (index % 4) * 0.035, drift: 0.12 + (index % 3) * 0.05 });
      }

      const petalGeometry = new THREE.CircleGeometry(0.2, 7);
      for (let flowerIndex = 0; flowerIndex < 5; flowerIndex += 1) {
        const flower = new THREE.Group();
        const baseX = -6.4 + flowerIndex * 3.25;
        const baseY = flowerIndex % 2 === 0 ? -3.35 : 3.25;
        for (let petalIndex = 0; petalIndex < 6; petalIndex += 1) {
          const angle = (Math.PI * 2 * petalIndex) / 6;
          const material = new THREE.MeshBasicMaterial({
            color: pinks[(flowerIndex + petalIndex) % 4],
            transparent: true,
            opacity: 0.09,
            depthWrite: false,
          });
          const petal = new THREE.Mesh(petalGeometry, material);
          petal.scale.set(0.75, 1.65, 1);
          petal.position.set(Math.cos(angle) * 0.33, Math.sin(angle) * 0.33, 0);
          petal.rotation.z = angle - Math.PI / 2;
          flower.add(petal);
        }
        const center = new THREE.Mesh(
          new THREE.CircleGeometry(0.11, 8),
          new THREE.MeshBasicMaterial({ color: 0xa45f58, transparent: true, opacity: 0.13, depthWrite: false }),
        );
        flower.add(center);
        flower.position.set(baseX, baseY, -2);
        flower.scale.setScalar(0.75 + (flowerIndex % 3) * 0.2);
        group.add(flower);
        floating.push({ mesh: flower, baseX, baseY, phase: flowerIndex * 1.31, speed: 0.08, drift: 0.08 });
      }

      const ringMaterial = new THREE.LineBasicMaterial({ color: 0xa93467, transparent: true, opacity: 0.08 });
      for (let index = 0; index < 3; index += 1) {
        const circle = new THREE.CircleGeometry(1.2 + index * 0.5, 32);
        const edges = new THREE.EdgesGeometry(circle);
        circle.dispose();
        const ring = new THREE.LineLoop(edges, ringMaterial.clone());
        ring.position.set(4.3 - index * 3.8, 1.5 - index * 1.2, -3);
        group.add(ring);
        floating.push({ mesh: ring, baseX: ring.position.x, baseY: ring.position.y, phase: index * 1.7, speed: 0.055, drift: 0.05 });
      }
      ringMaterial.dispose();

      const pointer = { x: 0, y: 0 };
      const onPointerMove = (event: PointerEvent) => {
        pointer.x = (event.clientX / window.innerWidth - 0.5) * 0.55;
        pointer.y = (event.clientY / window.innerHeight - 0.5) * -0.35;
      };

      const resize = () => {
        const width = Math.max(currentHost.clientWidth, 1);
        const height = Math.max(currentHost.clientHeight, 1);
        const vertical = 5;
        const horizontal = vertical * (width / height);
        camera.left = -horizontal;
        camera.right = horizontal;
        camera.top = vertical;
        camera.bottom = -vertical;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      };

      const start = performance.now();
      const render = (now: number) => {
        const elapsed = (now - start) / 1000;
        floating.forEach(({ mesh, baseX, baseY, phase, speed, drift }, index) => {
          mesh.position.x = baseX + Math.sin(elapsed * speed + phase) * drift;
          mesh.position.y = baseY + Math.cos(elapsed * speed * 1.25 + phase) * drift;
          mesh.rotation.z += index < 11 ? 0.00035 * (index % 2 === 0 ? 1 : -1) : 0.00012;
        });
        group.position.x += (pointer.x - group.position.x) * 0.018;
        group.position.y += (pointer.y - group.position.y) * 0.018;
        renderer.render(scene, camera);
        if (!reducedMotion) animationFrame = window.requestAnimationFrame(render);
      };

      resize();
      window.addEventListener("resize", resize);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      render(start);

      cleanup = () => {
        window.cancelAnimationFrame(animationFrame);
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", onPointerMove);
        const geometries = new Set<import("three").BufferGeometry>();
        const materials = new Set<import("three").Material>();
        scene.traverse((object) => {
          if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Line)) return;
          geometries.add(object.geometry);
          const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
          objectMaterials.forEach((material) => materials.add(material));
        });
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
        renderer.dispose();
        renderer.domElement.remove();
      };
    }).catch(() => { if (!disposed) setAvailable(false); });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      cleanup();
    };
  }, [active]);

  if (!available) return null;
  return <div ref={hostRef} className="three-romantic-background" aria-hidden="true" data-active={active} />;
}
