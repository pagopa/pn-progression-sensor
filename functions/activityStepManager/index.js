import { handleEvent } from './src/app/eventHandler.js';

const handler = async (event) => {
    return handleEvent(event);
};

export { handler };
