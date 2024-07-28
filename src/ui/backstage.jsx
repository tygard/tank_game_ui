/* global history */
import { useState } from "preact/hooks";
import { reloadAllGames, selectEngineForVersion, useAvilableEngines } from "../drivers/rest/fetcher.js";
import { AppContent } from "./app-content.jsx";

export function Backstage({ debug }) {
    const toolbar = (
        <>
            <button onClick={() => history.back()}>Back</button>
            <button onClick={reloadAllGames}>Reload All Games</button>
        </>
    );

    return (
        <AppContent debugMode={debug} toolbar={toolbar}>
            <div className="warning message">
                Beware these settings are designed for development and can break your games if used improperly
            </div>
            <h1>Engine used for game versions</h1>
            <EngineList></EngineList>
        </AppContent>
    );
}

function EngineList() {
    const [availableEngines, error] = useAvilableEngines();
    if(error !== undefined) {
        return <p>Error fetching engines: {error}</p>
    }

    if(availableEngines === undefined) return;

    return (
        <>
            {availableEngines.map(gameVersionInfo => {
                return (
                    <div key={gameVersionInfo.gameVersion}>
                        <h3>{gameVersionInfo.gameVersion}{gameVersionInfo.supportedByUI ? undefined : " (unsupported)"}</h3>
                        <EngineSelector gameVersionInfo={gameVersionInfo}></EngineSelector>
                    </div>
                );
            })}
        </>
    )
}

function EngineSelector({ gameVersionInfo }) {
    const [selectedEngine, setSelectedEngine] = useState(gameVersionInfo.engines.find(engine => engine.selected).engineId);

    const selectEngine = engineId => {
        setSelectedEngine(engineId);
        selectEngineForVersion(gameVersionInfo.gameVersion, engineId);
    };

    return (
        <form>
            {gameVersionInfo.engines.map(engine => (
                <div key={engine.version} value={engine.engineId} style={{ padding: "7px" }} onClick={() => selectEngine(engine.engineId)}>
                    <input type="radio" name={engine.version} checked={engine.engineId == selectedEngine}/>
                    <label>{engine.version}{engine.selected ? " (current)" : ""}</label>
                </div>
            ))}
        </form>
    );
}