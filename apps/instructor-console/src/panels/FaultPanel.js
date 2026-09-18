import { FaultCatalog } from '@lifit/curriculum';

export function initFaultPanel({ container, clearButton, onArm, onClear }) {
  container.innerHTML = '';
  for (const fault of Object.values(FaultCatalog)) {
    const btn = document.createElement('button');
    btn.className = 'fault-btn';
    btn.textContent = `${fault.label} - ${fault.lockout}`;
    btn.title = `Sinal: ${fault.studentSignal}\nResposta esperada: ${fault.expectedResponse}`;
    btn.addEventListener('click', () => onArm(fault.id));
    container.appendChild(btn);
  }
  clearButton.addEventListener('click', onClear);
}
