import "./game-manual.css";
import { useState } from "preact/hooks";

export function GameManual({ manualPath }) {
    if(!manualPath) return;

    const [isManualOpen, setManualOpen] = useState(false);

    return (
        <>
            <button onClick={() => setManualOpen(true)}>Open Rules</button>
            {isManualOpen ? <div className="manual-popup">
                <div className="manual-popup-title">
                    <h3>Rules</h3>
                    <button onClick={() => setManualOpen(false)}>Close</button>
                </div>
                <iframe className="manual-popup-body" src={manualPath} sandbox="allow-scripts"></iframe>
            </div> : undefined}
        </>
    )
}