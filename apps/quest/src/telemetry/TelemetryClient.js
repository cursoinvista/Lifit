// Amostragem local com envio em lote (doc, tabela de sincronizacao:
// "5 a 10 Hz mais eventos" / "Buffer local e envio em lote").
export class TelemetryClient {
  constructor({ replicationClient, batchIntervalMs = 150 }) {
    this.replicationClient = replicationClient;
    this.batchIntervalMs = batchIntervalMs;
    this.buffer = [];
    this.lastFlushAt = 0;
  }

  record(sample) {
    this.buffer.push({ ...sample, t: Date.now() });
  }

  sampleIfDue(now, sample) {
    this.record(sample);
    if (now - this.lastFlushAt < this.batchIntervalMs) return;
    this.lastFlushAt = now;
    this.flush();
  }

  flush() {
    if (this.buffer.length === 0) return;
    const samples = this.buffer;
    this.buffer = [];
    this.replicationClient.sendTelemetryBatch(samples);
  }
}
