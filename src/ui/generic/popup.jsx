/* global window */
import "./popup.css";
import { useCallback, useEffect, useState } from "preact/hooks";


const POPUP_PADDING = 5;

function repositionPopup(ownSize, anchorRef, setPosition) {
    // Hide the element if we don't know it's size
    // This also means that the opacity transition will trigger when we render it
    if(ownSize.width === 0 && ownSize.height === 0) {
        setPosition({
            left: 0,
            top: 0,
            opacity: 0,
        });
        return;
    }

    const rect = anchorRef.current.getBoundingClientRect();
    const centerOfAnchor = window.scrollY + rect.y + (rect.width / 2);
    const leftOfAnchor = window.scrollX + rect.x;
    const rightOfAnchor = leftOfAnchor + rect.width;

    // Make sure there is enough space to the right to display the popup
    const displayOnRightSide = (rightOfAnchor + POPUP_PADDING + ownSize.width) <= window.innerWidth;

    const left = displayOnRightSide ?
        (rightOfAnchor + POPUP_PADDING) :
        (leftOfAnchor - ownSize.width - POPUP_PADDING);

    setPosition({
        left,
        top: Math.max(0, centerOfAnchor - (ownSize.height / 2)),
    });
}

export function Popup({ opened, anchorRef, children, onClose }) {
    const [position, setPosition] = useState();
    const [ownSize, setOwnSize] = useState({ width: 0, height: 0 });

    const onResize = useCallback(
        () => repositionPopup(ownSize, anchorRef, setPosition),
        [ownSize, anchorRef, setPosition]);

    useEffect(() => {
        // Either we're closed or we don't have an element to attach our self to
        if(!opened || !anchorRef.current) {
            setPosition(undefined);
            return;
        }

        repositionPopup(ownSize, anchorRef, setPosition);

        // Reposition the popup when the window gets resized
        window.addEventListener("resize", onResize);

        if(onClose) {
            // Close if anything else is clicked
            window.addEventListener("click", onClose);
        }

        return () => {
            window.removeEventListener("resize", onResize);

            if(onClose) window.removeEventListener("click", onClose);
        }
    }, [opened, anchorRef, onClose, ownSize, onResize]);

    // Once the popup has been rendered save it's size
    const updateOwnSize = useCallback(element => {
        // Reset the size when the popup is closed so we cando our animation again
        if(!element) {
            setOwnSize({ width: 0, height: 0 });
            return;
        }

        const rect = element.getBoundingClientRect();

        setOwnSize({
            width: rect.width,
            height: rect.height,
        });
    }, [setOwnSize]);

    // Popup closed or we haven't determined the position
    if(!position) return;

    return (
        <div style={position} className="popup" onClick={e => e.stopPropagation()} ref={updateOwnSize}>
            <div className="popup-body">
                {children}
            </div>
        </div>
    );
}