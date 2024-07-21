/* global window */
import { useCallback, useEffect } from "preact/hooks";

// Key codes for key events
export const UP = window.KeyEvent?.DOM_VK_UP || 38;
export const DOWN = window.KeyEvent?.DOM_VK_DOWN || 40;
export const LEFT = window.KeyEvent?.DOM_VK_LEFT || 37;
export const RIGHT = window.KeyEvent?.DOM_VK_RIGHT || 39;
export const ESCAPE = window.KeyEvent?.DOM_VK_ESCAPE || 27;
export const DELETE = window.KeyEvent?.DOM_VK_DELETE || 46;
export const KEY_X = window.KeyEvent?.DOM_VK_X || 88;
export const KEY_C = window.KeyEvent?.DOM_VK_C || 67;
export const KEY_V = window.KeyEvent?.DOM_VK_V || 86;
export const KEY_S = window.KeyEvent?.DOM_VK_S || 83;
export const KEY_O = window.KeyEvent?.DOM_VK_O || 79;


export function useGlobalKeyHandler(globalKeyHandler, dependencies = []) {
    globalKeyHandler = useCallback(globalKeyHandler, [globalKeyHandler].concat(dependencies)); // eslint-disable-line

    useEffect(() => {
        window.addEventListener("keydown", globalKeyHandler);

        return () => window.removeEventListener("keydown", globalKeyHandler);
    }, [globalKeyHandler]);
}