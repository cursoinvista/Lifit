const MAX_LINES = 200;

export function createLogPanel(container) {
  const lines = [];
  return {
    append(text) {
      const time = new Date().toLocaleTimeString('pt-BR');
      lines.push(`[${time}] ${text}`);
      if (lines.length > MAX_LINES) lines.shift();
      container.textContent = lines.join('\n');
      container.scrollTop = container.scrollHeight;
    },
  };
}
