// Which models play which part. Override in .env.
import { loadEnv } from './env';
loadEnv();
export const AGENT_MODEL = process.env['AGENT_MODEL'] ?? 'openai/gpt-oss-20b';
export const JUDGE_MODEL = process.env['JUDGE_MODEL'] ?? 'openai/gpt-oss-120b';
