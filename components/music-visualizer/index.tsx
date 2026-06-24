/*
From https://github.com/samhirtarif/react-audio-visualize
 */

import {
  type CanvasHTMLAttributes,
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { calculateBarData, draw } from "./utils";
import { lerpColor } from "@/lib/color-extraction";

export interface Props extends CanvasHTMLAttributes<HTMLCanvasElement> {
  analyser: AnalyserNode;

  /**
   * Width of each individual bar in the visualization. Default: `2`
   */
  barWidth?: number;
  /**
   * Gap between each bar in the visualization. Default `1`
   */
  gap?: number;
  /**
   * BackgroundColor for the visualization: Default `transparent`
   */
  backgroundColor?: string;
  /**
   *  Color of the bars drawn in the visualization. Default: `"rgb(160, 198, 255)"`
   */
  barColor?: string;
  /**
   * An unsigned integer, representing the window size of the FFT, given in number of samples.
   * A higher value will result in more details in the frequency domain but fewer details in the amplitude domain.
   * For more details {@link https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/fftSize MDN AnalyserNode: fftSize property}
   * Default: `1024`
   */
  fftSize?:
    | 32
    | 64
    | 128
    | 256
    | 512
    | 1024
    | 2048
    | 4096
    | 8192
    | 16384
    | 32768;
  /**
   * A double, representing the maximum decibel value for scaling the FFT analysis data
   * For more details {@link https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/maxDecibels MDN AnalyserNode: maxDecibels property}
   * Default: `-10`
   */
  maxDecibels?: number;
  /**
   * A double, representing the minimum decibel value for scaling the FFT analysis data, where 0 dB is the loudest possible sound
   * For more details {@link https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/minDecibels MDN AnalyserNode: minDecibels property}
   * Default: `-90`
   */
  minDecibels?: number;
  /**
   * A double within the range 0 to 1 (0 meaning no time averaging).
   * If 0 is set, there is no averaging done, whereas a value of 1 means "overlap the previous and current buffer quite a lot while computing the value",
   * which essentially smooths the changes across
   * For more details {@link https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/smoothingTimeConstant MDN AnalyserNode: smoothingTimeConstant property}
   * Default: `0.4`
   */
  smoothingTimeConstant?: number;
}

const LERP_FRAMES = 90; // ~1.5s at 60fps

export const MusicVisualizer: (props: Props) => ReactElement = ({
  analyser,
  barWidth = 2,
  gap = 1,
  backgroundColor = "transparent",
  barColor = "rgb(160, 198, 255)",
  fftSize = 1024,
  maxDecibels = -10,
  minDecibels = -90,
  smoothingTimeConstant = 0.4,
  ...props
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Refs for smooth color lerping
  const currentColorRef = useRef<string>(barColor);
  const targetColorRef = useRef<string>(barColor);
  const lerpProgressRef = useRef<number>(1); // 1 = done, 0 = just started

  // Detect barColor prop changes and start a new lerp
  useEffect(() => {
    if (barColor !== targetColorRef.current) {
      // Start lerping from whatever the current interpolated color is
      currentColorRef.current = lerpProgressRef.current < 1
        ? lerpColor(currentColorRef.current, targetColorRef.current, lerpProgressRef.current)
        : targetColorRef.current;
      targetColorRef.current = barColor;
      lerpProgressRef.current = 0;
    }
  }, [barColor]);

  useEffect(() => {
    analyser.fftSize = fftSize;
    analyser.minDecibels = minDecibels;
    analyser.maxDecibels = maxDecibels;
    analyser.smoothingTimeConstant = smoothingTimeConstant;

    report();
  }, [analyser]);

  const report = useCallback(() => {
    if (analyser.context.state === "closed") return;

    const data = new Uint8Array(analyser.frequencyBinCount);

    if (analyser.context.state === "running") {
      analyser.getByteFrequencyData(data);
    }

    processFrequencyData(data);
    requestAnimationFrame(report);
  }, [analyser]);

  const processFrequencyData = (data: Uint8Array): void => {
    if (!canvasRef.current) return;

    // Advance lerp progress
    let resolvedColor: string;
    if (lerpProgressRef.current < 1) {
      lerpProgressRef.current = Math.min(1, lerpProgressRef.current + 1 / LERP_FRAMES);
      // Ease-out for smoother feel
      const easedT = 1 - Math.pow(1 - lerpProgressRef.current, 3);
      resolvedColor = lerpColor(currentColorRef.current, targetColorRef.current, easedT);
    } else {
      resolvedColor = targetColorRef.current;
    }

    const dataPoints = calculateBarData(
      data,
      canvasRef.current.width,
      barWidth,
      gap,
    );
    draw(
      dataPoints,
      canvasRef.current,
      barWidth,
      gap,
      backgroundColor,
      resolvedColor,
    );
  };

  return <canvas ref={canvasRef} {...props} />;
};
