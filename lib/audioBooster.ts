// Utilitário Web Audio API para amplificação de volume até 200% (Volume Boost)
let sharedAudioCtx: AudioContext | null = null;
const mediaNodes = new WeakMap<
  HTMLMediaElement,
  { source: MediaElementAudioSourceNode; gain: GainNode }
>();

export function applyMediaVolume(
  mediaEl: HTMLMediaElement | null,
  volume: number,
  isMuted: boolean = false,
) {
  if (!mediaEl) return;

  const clampedVolume = Math.max(0, Math.min(2.0, volume));
  mediaEl.muted = isMuted;

  // Se mutado ou volume zero
  if (isMuted || clampedVolume === 0) {
    mediaEl.volume = 0;
    const nodeData = mediaNodes.get(mediaEl);
    if (nodeData) {
      nodeData.gain.gain.value = 0;
    }
    return;
  }

  // Se o volume é até 100% e o amplificador ainda não foi inicializado neste elemento
  if (clampedVolume <= 1.0 && !mediaNodes.has(mediaEl)) {
    mediaEl.volume = clampedVolume;
    return;
  }

  // Se o volume ultrapassa 100% (ou o amplificador já foi acoplado anteriormente)
  try {
    if (!sharedAudioCtx) {
      const AudioCtxClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        sharedAudioCtx = new AudioCtxClass();
      }
    }

    if (sharedAudioCtx) {
      if (sharedAudioCtx.state === "suspended") {
        sharedAudioCtx.resume().catch(() => {});
      }

      let nodeData = mediaNodes.get(mediaEl);
      if (!nodeData) {
        const source = sharedAudioCtx.createMediaElementSource(mediaEl);
        const gain = sharedAudioCtx.createGain();
        source.connect(gain);
        gain.connect(sharedAudioCtx.destination);
        nodeData = { source, gain };
        mediaNodes.set(mediaEl, nodeData);
      }

      // Elemento nativo fica em 1.0 para sinal limpo entrar no GainNode
      mediaEl.volume = 1.0;
      nodeData.gain.gain.value = clampedVolume;
    } else {
      mediaEl.volume = Math.min(1.0, clampedVolume);
    }
  } catch {
    // Fallback gracioso caso a política do navegador restrinja Web Audio
    mediaEl.volume = Math.min(1.0, clampedVolume);
  }
}
