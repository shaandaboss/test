// Voice Service - Flexible architecture for multiple TTS providers
// Currently supports: OpenAI TTS, Browser Synthesis
// Future support: ElevenLabs, Google, Azure

class VoiceService {
  constructor() {
    this.provider = 'browser'; // default to browser
    this.openaiApiKey = null;
    this.elevenLabsApiKey = null;
    
    // Voice configuration
    this.config = {
      openai: {
        model: 'tts-1-hd', // Higher quality model for more human sound
        voice: 'nova', // nova is the warmest, most therapeutic voice
        speed: 1.15, // Faster conversational speed
        response_format: 'mp3'
      },
      elevenlabs: {
        voice_id: 'pNInz6obpgDQGcFmaJgB', // Adam (therapeutic male voice)
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.3,
          use_speaker_boost: true
        }
      },
      browser: {
        rate: 1.15, // Faster speed for browser voices too
        pitch: 0.95,
        volume: 0.9,
        preferredVoices: [
          'Samantha', 'Alex', 'Victoria', 'Allison', 'Ava', 'Susan',
          'Google US English', 'Microsoft Aria Online', 'Microsoft Jenny Online'
        ]
      }
    };
  }

  // Initialize the service with API keys
  initialize(config = {}) {
    if (config.openaiApiKey) {
      this.openaiApiKey = config.openaiApiKey;
      this.provider = 'openai';
      console.log('✅ OpenAI TTS initialized - Premium voice active');
    } else if (config.elevenLabsApiKey) {
      this.elevenLabsApiKey = config.elevenLabsApiKey;
      this.provider = 'elevenlabs';
      console.log('✅ ElevenLabs TTS initialized');
    } else {
      this.provider = 'browser';
      console.log('⚠️ Using Browser TTS (fallback) - Add OpenAI key for premium voice');
    }
  }

  // Main speak function - routes to appropriate provider
  async speak(text, onStart, onEnd, onError) {
    console.log(`🎯 Voice Service - Provider: ${this.provider}, Has OpenAI Key: ${!!this.openaiApiKey}`);
    
    try {
      switch (this.provider) {
        case 'openai':
          if (!this.openaiApiKey) {
            console.warn('⚠️ OpenAI provider selected but no API key - falling back to browser');
            return await this.speakBrowser(text, onStart, onEnd, onError);
          }
          return await this.speakOpenAI(text, onStart, onEnd, onError);
        case 'elevenlabs':
          return await this.speakElevenLabs(text, onStart, onEnd, onError);
        default:
          return await this.speakBrowser(text, onStart, onEnd, onError);
      }
    } catch (error) {
      console.error(`❌ ${this.provider} TTS failed, falling back to browser:`, error);
      return await this.speakBrowser(text, onStart, onEnd, onError);
    }
  }

  // OpenAI Text-to-Speech
  async speakOpenAI(text, onStart, onEnd, onError) {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not provided');
    }

    console.log('🎤 Using OpenAI TTS HD model with voice:', this.config.openai.voice);
    onStart?.();

    try {
      const requestBody = {
        model: this.config.openai.model,
        input: text,
        voice: this.config.openai.voice,
        speed: this.config.openai.speed,
        response_format: this.config.openai.response_format
      };
      
      console.log('📡 OpenAI TTS request:', requestBody);

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      console.log('🔊 Playing OpenAI generated audio');

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl); // Clean up
        console.log('✅ OpenAI audio playback completed');
        onEnd?.();
      };

      audio.onerror = (error) => {
        URL.revokeObjectURL(audioUrl);
        console.error('❌ Audio playback error:', error);
        onError?.(error);
      };

      await audio.play();
      return audio;

    } catch (error) {
      console.error('❌ OpenAI TTS failed:', error);
      onError?.(error);
      throw error;
    }
  }

  // ElevenLabs Text-to-Speech (ready for future use)
  async speakElevenLabs(text, onStart, onEnd, onError) {
    if (!this.elevenLabsApiKey) {
      throw new Error('ElevenLabs API key not provided');
    }

    onStart?.();

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.config.elevenlabs.voice_id}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsApiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: this.config.elevenlabs.model_id,
          voice_settings: this.config.elevenlabs.voice_settings
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        onEnd?.();
      };

      audio.onerror = (error) => {
        URL.revokeObjectURL(audioUrl);
        onError?.(error);
      };

      await audio.play();
      return audio;

    } catch (error) {
      onError?.(error);
      throw error;
    }
  }

  // Browser Text-to-Speech (fallback)
  async speakBrowser(text, onStart, onEnd, onError) {
    if (!window.speechSynthesis) {
      throw new Error('Browser speech synthesis not supported');
    }

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance();
      
      // Configure voice settings
      utterance.text = this.addNaturalPauses(text);
      utterance.rate = this.config.browser.rate;
      utterance.pitch = this.config.browser.pitch;
      utterance.volume = this.config.browser.volume;

      // Select best available voice
      const voices = speechSynthesis.getVoices();
      const selectedVoice = this.selectBestVoice(voices);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('Using voice:', selectedVoice.name);
      }

      utterance.onstart = () => {
        onStart?.();
      };

      utterance.onend = () => {
        onEnd?.();
        resolve(utterance);
      };

      utterance.onerror = (error) => {
        onError?.(error);
        resolve(utterance);
      };

      speechSynthesis.speak(utterance);
    });
  }

  // Helper: Select best browser voice
  selectBestVoice(voices) {
    for (const voiceName of this.config.browser.preferredVoices) {
      const voice = voices.find(v => 
        v.name.includes(voiceName) && v.lang.startsWith('en')
      );
      if (voice) return voice;
    }

    // Fallback to any English voice
    return voices.find(v => v.lang.startsWith('en')) || voices[0];
  }

  // Helper: Add natural pauses to text
  addNaturalPauses(text) {
    return text
      .replace(/\.\.\./g, '... ')
      .replace(/!/g, '! ')
      .replace(/\?/g, '? ')
      .replace(/:/g, ': ')
      .replace(/,/g, ', ');
  }

  // Stop current speech
  stop() {
    if (this.provider === 'browser' && window.speechSynthesis) {
      speechSynthesis.cancel();
    }
    // For API-based providers, we'd store the current audio element and stop it
  }

  // Switch provider (useful for settings or upgrades)
  switchProvider(provider, config = {}) {
    this.provider = provider;
    if (config.openaiApiKey) this.openaiApiKey = config.openaiApiKey;
    if (config.elevenLabsApiKey) this.elevenLabsApiKey = config.elevenLabsApiKey;
    console.log(`🔄 Switched to ${provider} TTS`);
  }

  // Get available OpenAI voices
  getOpenAIVoices() {
    return ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  }

  // Update voice configuration
  updateConfig(provider, newConfig) {
    this.config[provider] = { ...this.config[provider], ...newConfig };
    console.log(`🔧 Updated ${provider} config:`, this.config[provider]);
  }
}

// Export singleton instance
export const voiceService = new VoiceService();
export default voiceService;