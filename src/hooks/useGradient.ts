import { useState, useCallback, useEffect } from 'react';
import { 
  GradientConfig, 
  GradientSampler,
  createGradientStop 
} from '@/lib/color/gradients';
import { hexToRgb } from '@/lib/color/spaces';

export interface UseGradientReturn {
  config: GradientConfig;
  sampler: GradientSampler | null;
  updateConfig: (config: GradientConfig) => void;
  generateTexture: (width?: number) => Float32Array | null;
  resetToDefault: () => void;
}

const defaultConfig: GradientConfig = {
  stops: [
    createGradientStop('#FF6B35', 0),
    createGradientStop('#F7931E', 0.5),
    createGradientStop('#FFE15C', 1)
  ],
  interpolation: 'rgb',
  easing: 'linear',
  angle: 45
};

export function useGradient(initialConfig?: GradientConfig): UseGradientReturn {
  const [config, setConfig] = useState<GradientConfig>(initialConfig || defaultConfig);
  const [sampler, setSampler] = useState<GradientSampler | null>(null);

  // Update sampler when config changes
  useEffect(() => {
    setSampler(new GradientSampler(config));
  }, [config]);

  const updateConfig = useCallback((newConfig: GradientConfig) => {
    setConfig(newConfig);
  }, []);

  const generateTexture = useCallback((width: number = 256): Float32Array | null => {
    if (!sampler) return null;
    return sampler.generateTexture(width);
  }, [sampler]);

  const resetToDefault = useCallback(() => {
    setConfig(defaultConfig);
  }, []);

  return {
    config,
    sampler,
    updateConfig,
    generateTexture,
    resetToDefault
  };
}