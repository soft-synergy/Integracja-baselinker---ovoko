const fs = require('fs').promises;
const path = require('path');

const EVENTS_FILE = path.join(process.cwd(), 'events_queue.json');

async function readEventsFile() {
    try {
        const content = await fs.readFile(EVENTS_FILE, 'utf8');
        return JSON.parse(content);
    } catch (_) {
        return [];
    }
}

async function writeEventsFile(events) {
    await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8');
}

function generateEventId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function enqueueEvent(type, payload) {
    const events = await readEventsFile();
    const event = {
        id: generateEventId(),
        type,
        payload,
        status: 'pending',
        attempts: 0,
        created_at: new Date().toISOString()
    };
    events.push(event);
    await writeEventsFile(events);
    return event.id;
}

module.exports = { enqueueEvent };

