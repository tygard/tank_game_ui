import { useCallback, useEffect, useState } from "preact/hooks";

const DEBUG_MODE_SEQUENCE = [
    KeyEvent.DOM_VK_UP,
    KeyEvent.DOM_VK_UP,
    KeyEvent.DOM_VK_DOWN,
    KeyEvent.DOM_VK_DOWN,
    KeyEvent.DOM_VK_LEFT,
    KeyEvent.DOM_VK_RIGHT
];

const DEBUG_MODE_SEQUENCE_TIMEOUT = 1000; // 1 seconds in ms

export function useDebugMode() {
    const [debug, setDebug] = useState(false);
    const [debugSequenceIndex, setDebugSequenceIndex] = useState(0);

    const globalKeyHandler = useCallback(e => {
        // Check if the user typed the next key in the sequence
        if(e.keyCode === DEBUG_MODE_SEQUENCE[debugSequenceIndex]) {
            setDebugSequenceIndex(debugSequenceIndex + 1);

            // Scrolling while entering the debug sequence is annoying but we don't
            // want to block all arrow key scrolling. So if the key is in sequence
            // and not the first key code (so we don't block double up) prevent default.
            if(e.keyCode != DEBUG_MODE_SEQUENCE[0]) e.preventDefault();

            // Seqence completed enter debug mode
            if(debugSequenceIndex === DEBUG_MODE_SEQUENCE.length -1) {
                setDebug(true);
            }
        }
        // Wrong key
        else {
            setDebugSequenceIndex(0);
        }

        // Escape to exit debug mode
        if(e.keyCode === KeyEvent.DOM_VK_ESCAPE) {
            setDebug(false);
        }
    }, [setDebug, debugSequenceIndex, setDebugSequenceIndex]);

    useEffect(() => {
        // If the user takes too long to enter the sequence reset
        const handle = setTimeout(() => setDebugSequenceIndex(0), DEBUG_MODE_SEQUENCE_TIMEOUT);

        return () => clearTimeout(handle);
    }, [debugSequenceIndex, setDebugSequenceIndex]);

    useEffect(() => {
        addEventListener("keydown", globalKeyHandler);

        return () => removeEventListener("keydown", globalKeyHandler);
    }, [globalKeyHandler]);

    const exitDebugMode = useCallback(e => {
        e.preventDefault();
        setDebug(false);
    }, [setDebug]);

    const debugModeMessage = debug ? <div className="debug-mode-banner">
        You are currently in debug mode <a href="#" onClick={exitDebugMode}>exit</a>
    </div> : undefined;

    return [debug, debugModeMessage];
}
