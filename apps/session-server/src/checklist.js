// Bookkeeping de sessao sobre o checklist digital (o conteudo dos itens
// vive em @lifit/curriculum, compartilhado com o cliente do aluno).
import { MANDATORY_CHECKLIST_ITEMS } from '@lifit/curriculum';

export { MANDATORY_CHECKLIST_ITEMS };

export class SessionChecklist {
  constructor(items = MANDATORY_CHECKLIST_ITEMS) {
    this.items = items;
    this.completed = new Set();
  }

  complete(itemId) {
    if (!this.items.includes(itemId)) throw new Error(`item de checklist desconhecido: ${itemId}`);
    this.completed.add(itemId);
    return this.isComplete();
  }

  isComplete() {
    return this.items.every((id) => this.completed.has(id));
  }

  status() {
    return this.items.map((id) => ({ id, done: this.completed.has(id) }));
  }
}
