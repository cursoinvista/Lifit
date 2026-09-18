// Formulario digital do Annex 1 (doc, secao 7). O SISTEMA REGISTRA; O
// INSTRUTOR DECIDE: nenhuma nota e enviada sem clique explicito, e o
// resultado so e gravado via finalize (confirmacao humana), nunca
// automaticamente a partir do total calculado.
import { AnnexOneCriteria, commentRequired } from '@lifit/curriculum';

export function initAnnexOnePanel({ formContainer, totalLabel, finalizeButton, onScore, onFinalize }) {
  formContainer.innerHTML = '';
  const rows = new Map();

  for (const criterion of AnnexOneCriteria) {
    const row = document.createElement('div');
    row.className = 'annex-row';

    const label = document.createElement('span');
    label.textContent = criterion.label;

    const select = document.createElement('select');
    for (const v of [0, 1, 2, 3]) {
      const opt = document.createElement('option');
      opt.value = String(v);
      opt.textContent = String(v);
      select.appendChild(opt);
    }
    select.value = '';

    const comment = document.createElement('input');
    comment.type = 'text';
    comment.placeholder = 'Comentario (obrigatorio para notas 2 e 3)';

    const commit = () => {
      const score = Number(select.value);
      if (Number.isNaN(score)) return;
      if (commentRequired(score) && !comment.value.trim()) {
        comment.style.borderColor = '#d94a4a';
        return;
      }
      comment.style.borderColor = '#2c3a4a';
      onScore(criterion.id, score, comment.value.trim());
    };
    select.addEventListener('change', commit);
    comment.addEventListener('blur', commit);

    row.appendChild(label);
    row.appendChild(select);
    row.appendChild(comment);
    formContainer.appendChild(row);
    rows.set(criterion.id, { select, comment });
  }

  finalizeButton.addEventListener('click', () => {
    const result = window.prompt('Confirmar resultado final: digite "pass" ou "fail"');
    if (result === 'pass' || result === 'fail') onFinalize(result);
  });

  return {
    updateTotal(total, suggestion) {
      totalLabel.textContent = `Total: ${total} | Sugestao do sistema (nao vinculante): ${suggestion ?? '-'}`;
    },
  };
}
