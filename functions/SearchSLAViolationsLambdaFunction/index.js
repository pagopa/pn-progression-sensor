//import { eventHandler } from "./src/app/eventHandler.js";
const eventHandler = require("./src/app/eventHandler");

export async function handler(event) {
  console.log("event", event);
  return eventHandler(event);
}
