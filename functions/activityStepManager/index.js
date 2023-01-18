import { handleEvent } from './src/app/eventHandler.js';

const handler = async (event) => {
    console.log('event', event)
    return handleEvent(event);
};

export { handler };
