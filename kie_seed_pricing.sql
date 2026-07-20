-- KIE Model Pricing Seed SQL
-- Auto-generated from kie_models.json
-- Total: 87 pricing records

CREATE TABLE IF NOT EXISTS model_pricing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id TEXT NOT NULL,
  credits_per_use INTEGER NOT NULL DEFAULT 10,
  currency TEXT NOT NULL DEFAULT 'credits',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(model_id)
);

INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('kimi-k3', 4, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('claude-fable-5', 10, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('claude-haiku-4-5', 3, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('claude-opus-4-5', 12, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('claude-opus-4-6', 12, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('claude-opus-4-7', 12, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('claude-opus-4-8', 12, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('claude-sonnet-4-5', 8, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('claude-sonnet-4-6', 8, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('claude-sonnet-5', 8, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('gemini-2.5-flash', 8, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('gemini-2.5-pro', 12, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('gemini-3-flash', 8, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('gemini-3-pro', 12, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('gemini-3-1-pro', 12, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('gemini-3-5-flash', 8, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('gpt-5-2', 10, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('gpt-5-4', 10, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('gpt-5-5', 10, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('gpt-5-6', 10, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('codex', 10, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('grok-4-3', 10, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('grok-4-5', 10, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('gpt-image-2', 30, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('flux-2', 20, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('flux-kontext-api', 20, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('seedream', 20, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('seedream-api', 20, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('seedream-4-5', 20, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('seedream5-0-lite', 20, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('seedream-5-0-pro', 35, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('google-imagen4', 30, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('nano-banana-2', 30, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('nano-banana-2-lite', 15, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('nano-banana-pro', 40, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('nano-banana', 30, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('ideogram-character', 20, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('ideogram-v3', 20, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('4o-image-api', 30, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('gpt-image-1.5', 30, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('qwen-image', 20, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('qwen-image-2', 20, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('qwen-image-edit', 20, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('z-image', 20, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('recraft-crisp-upscale', 20, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('recraft-remove-background', 20, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('topaz-image-upscale', 20, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('wan-2-7-image', 20, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('veo-3-1', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('kling-3-0', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('seedance-2-5', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('happyhorse-1-0', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('happyhorse-1-1', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('omnihuman-1-5', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('seedance-1-0-pro-fast', 150, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('seedance-1-5-pro', 400, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('seedance-2-0', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('seedance-2-0-mini', 150, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('bytedance-seedance-v1', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('volcengine-video-to-video-lip-sync', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('gemini-omni', 150, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('features-v3-api', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('kling-2-5', 150, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('kling-2-6', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('kling-2.6-motion-control', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('kling-3-motion-control', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('kling-3-0-turbo', 150, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('kling-ai-avatar', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('kling-v2-1', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('hailuo-api', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('hailuo-2-3', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('infinitalk', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('runway-api', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('topaz-video-upscaler', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('wan-speech-to-video-turbo', 150, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('wan-animate', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('wan-2-5', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('wan-2-6', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('wan-2-7-video', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('wan-v2-2', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('grok-imagine', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('grok-imagine-video-1.5', 250, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('elevenlabs-text-to-dialogue-v3', 10, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('elevenlabs-tts', 10, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('gemini-2.5-pro-preview-tts', 20, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('gemini-3.1-flash-tts', 10, 'credits', 1);
INSERT OR REPLACE INTO model_pricing (model_id, credits_per_use, currency, is_active) VALUES ('suno-api', 10, 'credits', 1);