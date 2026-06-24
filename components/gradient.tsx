import { GradientCanvas, Gradient as ShaderGradient } from "shadergradient";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { ColorPalette, DEFAULT_PALETTE, lerpColor } from "@/lib/color-extraction";

const TRANSITION_DURATION = 2000; // 2 seconds

export function Gradient({ colors }: { colors: ColorPalette }) {
  const [rendered, setRendered] = useState(colors);
  const currentRef = useRef(colors);
  const targetRef = useRef(colors);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  const animate = useCallback(() => {
    if (startTimeRef.current === null) return;

    const elapsed = performance.now() - startTimeRef.current;
    const rawT = Math.min(1, elapsed / TRANSITION_DURATION);
    // Cubic ease-out for smooth deceleration
    const t = 1 - Math.pow(1 - rawT, 3);

    const current = currentRef.current;
    const target = targetRef.current;

    setRendered({
      primary: lerpColor(current.primary, target.primary, t),
      secondary: lerpColor(current.secondary, target.secondary, t),
      accent: lerpColor(current.accent, target.accent, t),
    });

    if (rawT < 1) {
      rafRef.current = requestAnimationFrame(animate);
    } else {
      // Transition complete — snapshot for next transition
      currentRef.current = target;
      startTimeRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Snapshot the current interpolated state as the new start
    currentRef.current = { ...rendered };
    targetRef.current = colors;
    startTimeRef.current = performance.now();

    // Cancel any existing animation
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafRef.current);
  }, [colors.primary, colors.secondary, colors.accent]);

  return (
    <GradientCanvas>
      <ShaderGradient
        animate="on"
        brightness={1}
        cAzimuthAngle={180}
        cDistance={2.8}
        cPolarAngle={80}
        cameraZoom={9.1}
        color1={rendered.primary}
        color2={rendered.secondary}
        color3={rendered.accent}
        envPreset="city"
        frameRate={10}
        grain="on"
        lightType="3d"
        positionX={0}
        positionY={0}
        positionZ={0}
        range="disabled"
        rangeEnd={40}
        rangeStart={0}
        reflection={0.1}
        rotationX={50}
        rotationY={0}
        rotationZ={-60}
        shader="defaults"
        type="waterPlane"
        uAmplitude={0}
        uDensity={1.5}
        uFrequency={0}
        uSpeed={0.3}
        uStrength={1.7}
        uTime={8}
        wireframe={false}
        zoomOut={false}
      />
    </GradientCanvas>
  );
}
