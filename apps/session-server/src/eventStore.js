// Event store append-only (doc, secao "Servidor e persistencia"). Cada
// evento e uma linha JSON imutavel; nada e reescrito ou apagado aqui.
// Snapshots de recuperacao NUNCA substituem esta trilha.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data', 'events');

export class EventStore {
  constructor(dataDir = DATA_DIR) {
    this.dataDir = dataDir;
    fs.mkdirSync(this.dataDir, { recursive: true });
  }

  append(sessionId, event) {
    const file = path.join(this.dataDir, `${sessionId}.jsonl`);
    fs.appendFileSync(file, JSON.stringify(event) + '\n', 'utf8');
    return event;
  }

  readAll(sessionId) {
    const file = path.join(this.dataDir, `${sessionId}.jsonl`);
    if (!fs.existsSync(file)) return [];
    return fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
}
