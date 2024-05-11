import "./game-manual.css";
import { useState } from "preact/hooks";

export function GameManual({ manualPath }) {
    const [isManualOpen, setManualOpen] = useState(false);

    if(!manualPath) return;

    return (
        <>
            <button onClick={() => setManualOpen(true)}>Open Rules</button>
            {isManualOpen ? <div className="manual-popup">
                <div className="manual-popup-title">
                    <h3>Rules</h3>
                    <button onClick={() => setManualOpen(false)}>Close</button>
                </div>
                <iframe className="manual-popup-body" src={manualPath}></iframe>
            </div> : undefined}
        </>
    )
}