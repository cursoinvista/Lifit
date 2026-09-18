import { Room } from './room.js';

export class RoomManager {
  constructor({ eventStore }) {
    this.eventStore = eventStore;
    this.rooms = new Map();
  }

  getOrCreate(sessionId, profileId) {
    if (!this.rooms.has(sessionId)) {
      this.rooms.set(sessionId, new Room({ sessionId, profileId, eventStore: this.eventStore }));
    }
    return this.rooms.get(sessionId);
  }

  get(sessionId) {
    return this.rooms.get(sessionId) ?? null;
  }
}
