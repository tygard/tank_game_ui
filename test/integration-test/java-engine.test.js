import { createEngine, isEngineAvailable } from "../../src/drivers/java-engine/engine-interface.js";
import { defineTestsForEngine } from "./engine-tests.js";

describe("JavaEngine", () => {
    defineTestsForEngine(isEngineAvailable() ? createEngine : undefined);
});