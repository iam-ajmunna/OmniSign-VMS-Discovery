import { EventEmitter } from 'events';

// Create a single global event emitter for the application session.
const eventBus = new EventEmitter();

// Increase max listeners default to handle multiple concurrent subscribers (loggers, managers, SSE managers)
eventBus.setMaxListeners(30);

export default eventBus;
