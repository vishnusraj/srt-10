"use client";

import { type MutableRefObject, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { vertexShader, fragmentShader } from "./heroShaders";

const PORTRAIT_SRC = "/images/sachin_without_gears.png";
const HELMET_SRC   = "/images/sachin_with_gears.png";

// Hover-driven radius range — larger for better helmet visibility
const BLOB_MIN = 110;
const BLOB_MAX = 310;
const VEL_NORM = 14;

// Auto-hint: plays once after the intro clears to demonstrate the hover effect.
const HINT_DELAY_S = 7.5;
const HINT_DUR_S   = 4.5;

// Approximate face centre in screen UV (Y=1 top, Y=0 bottom in shader)
const FACE_X = 0.5;
const FACE_Y = 0.64;

function makeFallback(topHex: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 4; c.height = 6;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 6);
  g.addColorStop(0, topHex); g.addColorStop(1, "#000000");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 6);
  return new THREE.CanvasTexture(c);
}

// ── Inner mesh ────────────────────────────────────────────────────────────────

interface HeroMeshProps {
  textures: [THREE.Texture, THREE.Texture];
  mouseX:   MutableRefObject<number>;
  mouseY:   MutableRefObject<number>;
  isHover:  MutableRefObject<boolean>;
  velocity: MutableRefObject<number>;
}

function HeroMesh({ textures: [t1, t2], mouseX, mouseY, isHover, velocity }: HeroMeshProps) {
  const matRef = useRef<THREE.ShaderMaterial | null>(null);

  const imageAspect = useMemo(() => {
    const img = t1.image as HTMLImageElement | HTMLCanvasElement | null;
    if (img && "naturalWidth" in img && img.naturalWidth)
      return img.naturalWidth / img.naturalHeight;
    if (img?.width && img.height) return img.width / img.height;
    return 0.75;
  }, [t1]);

  const uniforms = useMemo(() => ({
    uTexture1:    { value: t1 },
    uTexture2:    { value: t2 },
    uTime:        { value: 0.0 },
    uResolution:  { value: new THREE.Vector2(1, 1) },
    uImageAspect: { value: imageAspect },
    uBlobCenter:  { value: new THREE.Vector2(0.5, 0.5) },
    uBlobRadius:  { value: 0.0 },
    uTilt:        { value: new THREE.Vector2(0, 0) },
  }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [t1, t2, imageAspect]);

  useFrame(({ clock, size }) => {
    const mat = matRef.current;
    if (!mat) return;

    const elapsed = clock.getElapsedTime();
    mat.uniforms.uTime.value = elapsed;
    mat.uniforms.uResolution.value.set(size.width, size.height);

    if (isHover.current) {
      // ── User is hovering: velocity-driven radius ──────────────────────────
      mat.uniforms.uBlobCenter.value.set(mouseX.current, mouseY.current);

      const velFactor = Math.min(velocity.current / VEL_NORM, 1);
      const targetR   = BLOB_MIN + velFactor * (BLOB_MAX - BLOB_MIN);
      velocity.current *= 0.86;           // slower decay → blob stays open longer

      const cur = mat.uniforms.uBlobRadius.value as number;
      mat.uniforms.uBlobRadius.value = cur + (targetR - cur) * 0.08; // silky lerp

      // ── 3-D tilt: follow mouse normalised to –1..1 ───────────────────────
      const targetTiltX = (mouseX.current - 0.5) * 2.0;
      const targetTiltY = (mouseY.current - 0.5) * 2.0;
      const tilt = mat.uniforms.uTilt.value as THREE.Vector2;
      tilt.x += (targetTiltX - tilt.x) * 0.05;
      tilt.y += (targetTiltY - tilt.y) * 0.05;
      return;
    }

    // ── Auto-hint phase ───────────────────────────────────────────────────────
    const hintT = elapsed - HINT_DELAY_S;

    if (hintT >= 0 && hintT < HINT_DUR_S) {
      const growEnd   = 0.7;
      const fadeStart = HINT_DUR_S - 0.7;

      let hintR: number;
      if (hintT < growEnd) {
        hintR = (hintT / growEnd) * 210;
      } else if (hintT < fadeStart) {
        const phase = (hintT - growEnd) / (fadeStart - growEnd);
        hintR = 210 + Math.sin(phase * Math.PI * 3.5) * 28;
      } else {
        hintR = 210 * (1 - (hintT - fadeStart) / 0.7);
      }

      const cx = FACE_X + Math.sin(hintT * 0.7) * 0.08;
      const cy = FACE_Y + Math.cos(hintT * 0.5) * 0.04;
      mat.uniforms.uBlobCenter.value.set(cx, cy);
      mat.uniforms.uBlobRadius.value = Math.max(0, hintR);
      return;
    }

    // ── No hover, no hint: shrink to zero ────────────────────────────────────
    const cur = mat.uniforms.uBlobRadius.value as number;
    mat.uniforms.uBlobRadius.value = cur + (0 - cur) * 0.1;

    // ── 3-D tilt: lerp toward zero when idle ─────────────────────────────────
    const tilt = mat.uniforms.uTilt.value as THREE.Vector2;
    tilt.x += (0 - tilt.x) * 0.08;
    tilt.y += (0 - tilt.y) * 0.08;
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

// ── Scene root ────────────────────────────────────────────────────────────────

export interface HeroSceneProps {
  mouseX:   MutableRefObject<number>;
  mouseY:   MutableRefObject<number>;
  isHover:  MutableRefObject<boolean>;
  velocity: MutableRefObject<number>;
}

export function HeroScene({ mouseX, mouseY, isHover, velocity }: HeroSceneProps) {
  const [textures, setTextures] = useState<[THREE.Texture, THREE.Texture] | null>(null);

  useEffect(() => {
    const loader  = new THREE.TextureLoader();
    let cancelled = false;
    let loaded: [THREE.Texture, THREE.Texture] | null = null;

    Promise.all([
      loader.loadAsync(PORTRAIT_SRC).catch(() => makeFallback("#1a1410")),
      loader.loadAsync(HELMET_SRC).catch(()   => makeFallback("#0d1118")),
    ]).then(([t1, t2]) => {
      if (cancelled) { t1.dispose(); t2.dispose(); return; }
      [t1, t2].forEach((t) => {
        t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
        t.minFilter = t.magFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
        t.needsUpdate = true;
      });
      loaded = [t1, t2];
      setTextures(loaded);
    });

    return () => {
      cancelled = true;
      loaded?.[0].dispose();
      loaded?.[1].dispose();
    };
  }, []);

  if (!textures) return null;

  return (
    <HeroMesh
      textures={textures}
      mouseX={mouseX}
      mouseY={mouseY}
      isHover={isHover}
      velocity={velocity}
    />
  );
}
