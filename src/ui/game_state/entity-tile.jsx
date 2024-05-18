import { useCallback, useRef, useState } from "preact/hooks";
import "./entity-tile.css";
import { Popup } from "../generic/popup.jsx";
import { prettyifyName } from "../../utils.js";
import { AttributeList } from "./attribute-list.jsx";


function EntityDetails({ entity, setSelectedUser, canSubmitAction, closePopup }) {
    const title = prettyifyName(entity.player?.name || entity.type);
    const subTitle = prettyifyName(entity.type);

    const takeActionHandler = () => {
        setSelectedUser(entity.player.name);
        closePopup();
    };

    return (
        <>
            <div className="entity-details-title-wrapper">
                <h2>{title}</h2>
                {title != subTitle ? <i className="entity-details-title-type">{subTitle}</i> : undefined}
            </div>
            <AttributeList attributes={entity.resources}></AttributeList>
            {entity.player && canSubmitAction ? (
                <div className="entity-details-take-action centered">
                    <button onClick={takeActionHandler}>Take Action</button>
                </div>
            ) : undefined}
        </>
    )
}


function getBadgesForEntity(descriptor) {
    const badgeAttribute = descriptor.getBadge();

    const rightBadge = badgeAttribute !== undefined ? (
        <div className="board-space-entity-badge right-badge" style={badgeAttribute.style}>
            {badgeAttribute.text}
        </div>
    ): undefined;

    const indicators = descriptor.getIndicators()
        .map(indicator => <span key={indicator.symbol} style={indicator.style}>{indicator.symbol}</span>);

    const leftBadge = indicators.length > 0 ? (
        <div className="board-space-entity-badge left-badge" style={{ background: descriptor.getIndicatorBackground() }}>
            {indicators}
        </div>
    ): undefined;

    return leftBadge || rightBadge ?
        <div className="board-space-entity-badges">{leftBadge}<div className="separator"></div>{rightBadge}</div> : undefined;
}


export function EntityTile({ entity, showPopupOnClick, config, setSelectedUser, canSubmitAction }) {
    const cardRef = useRef();
    const [opened, setOpened] = useState(false);

    const close = useCallback(() => setOpened(false), [setOpened]);

    const label = entity.player && (
        <div className="board-space-entity-title board-space-centered">
            <div className="board-space-entity-title-inner">{prettyifyName(entity.player?.name || "")}</div>
        </div>
    );

    const descriptor = config && config.getEntityDescriptor(entity);
    if(!descriptor) return;

    const tileStyles = descriptor.getTileStyle().style;
    const badges = getBadgesForEntity(descriptor);

    return (
        <div className="board-space-entity-wrapper">
            <div className="board-space-entity" ref={cardRef} onClick={() => showPopupOnClick && setOpened(open => !open)} style={tileStyles}>
                {label}
                <div className={`board-space-centered board-space-resource-featured ${label ? "" : "board-space-no-label"}`}>
                    {descriptor.getFeaturedAttribute()}
                </div>
                {badges}
            </div>
            <Popup opened={opened} anchorRef={cardRef} onClose={close}>
                <EntityDetails
                    entity={entity}
                    canSubmitAction={canSubmitAction}
                    setSelectedUser={setSelectedUser}
                    closePopup={() => setOpened(false)}></EntityDetails>
            </Popup>
        </div>
    );
}
