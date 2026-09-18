export function renderObjectives(container, objectives) {
  container.innerHTML = '';
  if (objectives.length === 0) {
    container.innerHTML = '<div class="obj-row">Nenhum bloco ativo (inicie o cronometro do modulo).</div>';
    return;
  }
  for (const obj of objectives) {
    const row = document.createElement('div');
    row.className = 'obj-row';
    row.textContent = `${obj.id} [${obj.domain}/${obj.level}] - ${obj.description}`;
    container.appendChild(row);
  }
}
