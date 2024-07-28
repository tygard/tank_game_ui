import { getAllEngineFactories } from "../../src/drivers/java-engine/engine-interface.js";
import { defineTestsForEngine } from "./engine-tests.js";

describe("JavaEngine", () => {
    for(const engineFactory of getAllEngineFactories()) {
        defineTestsForEngine(engineFactory);
    }
});