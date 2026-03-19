// src/hooks/useLLM.ts
import { useEffect, useState } from 'react';
import { pipeline, type TextGenerationPipeline, type TextGenerationOutput } from '@xenova/transformers';

export function useLLM(): TextGenerationPipeline | null {
  const [generator, setGenerator] = useState<TextGenerationPipeline | null>(null);

  useEffect(() => {
    (async () => {
      const pipe = await pipeline('text-generation', 'Xenova/tiny-random-gpt2');
      setGenerator(pipe);
    })();
  }, []);

  return generator;
}
