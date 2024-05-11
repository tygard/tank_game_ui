/* globals window */
import { useCallback, useEffect, useState } from "preact/hooks";

// Key codes for key events
const UP = window.KeyEvent?.DOM_VK_UP || 38;
const DOWN = window.KeyEvent?.DOM_VK_DOWN || 40;
const LEFT = window.KeyEvent?.DOM_VK_LEFT || 37;
const RIGHT = window.KeyEvent?.DOM_VK_RIGHT || 39;
const ESCAPE = window.KeyEvent?.DOM_VK_ESCAPE || 27;

const DEBUG_MODE_SEQUENCE = [UP, UP, DOWN, DOWN, LEFT, RIGHT];
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
        if(e.keyCode === ESCAPE) {
            setDebug(false);
        }
    }, [setDebug, debugSequenceIndex, setDebugSequenceIndex]);

    useEffect(() => {
        // If the user takes too long to enter the sequence reset
        const handle = setTimeout(() => setDebugSequenceIndex(0), DEBUG_MODE_SEQUENCE_TIMEOUT);

        return () => clearTimeout(handle);
    }, [debugSequenceIndex, setDebugSequenceIndex]);

    useEffect(() => {
        window.addEventListener("keydown", globalKeyHandler);

        return () => window.removeEventListener("keydown", globalKeyHandler);
    }, [globalKeyHandler]);

    const exitDebugMode = useCallback(e => {
        e.preventDefault();
        setDebug(false);
    }, [setDebug]);

    const debugModeMessage = debug ? <div className="debug-mode-banner">
        You are currently in debug mode <a href="#" onClick={exitDebugMode}>exit</a>
    </div> : undefined;

    return debugModeMessage;
}
