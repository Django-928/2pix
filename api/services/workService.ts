import db from '../db/index.js';

export type WorkType = 'image' | 'video' | 'audio';
export type WorkStatus = 'pending' | 'complete' | 'failed';

export interface SaveWorkInput {
  id: string;
  userId: number;
  name: string;
  type: WorkType;
  status?: WorkStatus;
  inputParams: Record<string, unknown>;
  outputUrl?: string | null;
  provider?: string | null;
  model?: string | null;
}

export interface WorkRow {
  id: string;
  name: string;
  type: WorkType;
  status: WorkStatus;
  input_params: string;
  output_url: string | null;
  review_status?: string;
  created_at: string;
}

const safeName = (value: string, fallback: string) => {
  const normalized = String(value || '').trim();
  return (normalized || fallback).slice(0, 80);
};

export function saveWork(input: SaveWorkInput) {
  db.prepare(`
    INSERT INTO works (id, user_id, name, type, status, input_params, output_url, provider, model, review_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      status = excluded.status,
      input_params = excluded.input_params,
      output_url = excluded.output_url,
      provider = excluded.provider,
      model = excluded.model,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    input.id,
    input.userId,
    safeName(input.name, `${input.type} 作品`),
    input.type,
    input.status || 'complete',
    JSON.stringify(input.inputParams || {}),
    input.outputUrl || null,
    input.provider || null,
    input.model || null
  );
}

export function mapWork(row: WorkRow) {
  let inputParams: Record<string, unknown> = {};
  try {
    inputParams = JSON.parse(row.input_params || '{}') as Record<string, unknown>;
  } catch {
    inputParams = {};
  }

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    inputParams,
    outputUrl: row.output_url || undefined,
    reviewStatus: row.review_status || 'pending',
    createdAt: row.created_at,
  };
}
