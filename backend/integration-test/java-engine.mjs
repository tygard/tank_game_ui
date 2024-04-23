import { createEngine, isEngineAvailable } from "../src/java-engine/engine-interface.mjs";
import { defineTestsForEngine } from "./engine-tests.mjs";

describe("JavaEngine", () => {
    defineTestsForEngine(isEngineAvailable() ? createEngine : undefined);
});