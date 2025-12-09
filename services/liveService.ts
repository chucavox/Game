import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

// Helpers for Audio encoding/decoding
function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  
  let binary = '';
  const len = int16.buffer.byteLength;
  const bytes = new Uint8Array(int16.buffer);
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return {
    data: base64,
    mimeType: 'audio/pcm;rate=16000',
  };
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export class LiveService {
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private session: any = null; // Session type isn't fully exported in all SDK versions yet
  private stream: MediaStream | null = null;
  private isConnected = false;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  public async connect(onClose: () => void) {
    if (this.isConnected) return;

    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    // Resume contexts if they are suspended (browser policy)
    if (this.inputAudioContext.state === 'suspended') await this.inputAudioContext.resume();
    if (this.outputAudioContext.state === 'suspended') await this.outputAudioContext.resume();

    const outputNode = this.outputAudioContext.createGain();
    outputNode.connect(this.outputAudioContext.destination);

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const sessionPromise = this.ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => {
          console.log('Live Session Opened');
          this.isConnected = true;
          
          if (!this.inputAudioContext || !this.stream) return;

          const source = this.inputAudioContext.createMediaStreamSource(this.stream);
          const scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
          
          scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
             const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
             const pcmBlob = createBlob(inputData);
             sessionPromise.then((session: any) => {
               session.sendRealtimeInput({ media: pcmBlob });
             });
          };

          source.connect(scriptProcessor);
          scriptProcessor.connect(this.inputAudioContext.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
            const base64EncodedAudioString = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (base64EncodedAudioString && this.outputAudioContext) {
                this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
                
                const audioBuffer = await decodeAudioData(
                    decode(base64EncodedAudioString),
                    this.outputAudioContext,
                    24000,
                    1
                );
                
                const source = this.outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode);
                source.addEventListener('ended', () => {
                    this.sources.delete(source);
                });
                
                source.start(this.nextStartTime);
                this.nextStartTime += audioBuffer.duration;
                this.sources.add(source);
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
                this.sources.forEach(source => source.stop());
                this.sources.clear();
                this.nextStartTime = 0;
            }
        },
        onclose: () => {
            console.log("Live Session Closed");
            this.isConnected = false;
            onClose();
        },
        onerror: (e: any) => {
            console.error("Live Session Error", e);
            this.isConnected = false;
            onClose();
        }
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        },
        systemInstruction: `You are a professional, slightly sarcastic, British golf commentator named "Caddy". 
        You are watching the user play a game of mini-golf. 
        Offer tips on physics, comment on their performance, and celebrate birdies/eagles. 
        If they struggle, offer gentle mockery. Keep responses concise and punchy like a live sports broadcast.`,
      }
    });

    this.session = sessionPromise;
  }

  public async disconnect() {
    if (this.session) {
      // There isn't an explicit close on the promise wrapper in all versions, 
      // but usually we just stop the media tracks and audio contexts.
      // The session object itself might have a close method depending on the exact SDK version.
      try {
        const s = await this.session;
        if(s && typeof s.close === 'function') {
            s.close();
        }
      } catch (e) {
        console.warn("Error closing session", e);
      }
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    
    if (this.inputAudioContext) {
      await this.inputAudioContext.close();
    }
    
    if (this.outputAudioContext) {
      await this.outputAudioContext.close();
    }

    this.isConnected = false;
    this.session = null;
  }
}
