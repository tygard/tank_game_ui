import { useCallback, useRef, useState } from "preact/hooks";
import "./entity-tile.css";
import { Popup } from "../generic/popup.jsx";
import { prettyifyName } from "../../utils.js";
import { AttributeList } from "./attribute-list.jsx";


function EntityDetails({ descriptor, entity, setSelectedUser, canSubmitAction, closePopup, versionConfig, gameState }) {
    const title = prettyifyName(descriptor.getName() || entity.type);

    const takeActionHandler = (player) => {
        setSelectedUser(player.name);
        closePopup();
    };

    const takeActionButtons = canSubmitAction ? entity.getPlayerRefs().map(playerRef => {
        const player = playerRef.getPlayer(gameState);

        const buttonMessage = entity.getPlayerRefs().length === 1 ?
            "Take Action" :
            `Take Action as ${player.name}`;

        return (
            <div className="entity-details-take-action centered" key={player.name}>
                <button onClick={takeActionHandler.bind(undefined, player)}>{buttonMessage}</button>
            </div>
        );
    }) : undefined;

    return (
        <>
            <div className="entity-details-title-wrapper">
                <h2>{title}</h2>
            </div>
            <AttributeList attributes={entity.attributes} versionConfig={versionConfig}></AttributeList>
            {takeActionButtons}
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

    return <div className="board-space-entity-badges">{leftBadge}<div className="separator"></div>{rightBadge}</div>;
}


export function EntityTile({ entity, showPopupOnClick, config, setSelectedUser, canSubmitAction, gameState }) {
    const cardRef = useRef();
    const [opened, setOpened] = useState(false);

    const close = useCallback(() => setOpened(false), [setOpened]);

    const descriptor = config && config.getEntityDescriptor(entity, gameState);
    if(!descriptor) return;

    const tileStyles = descriptor.getTileStyle().style;
    const badges = getBadgesForEntity(descriptor);

    const label = descriptor.getName() !== undefined ? (
        <div className="board-space-entity-title board-space-centered">
            <div className="board-space-entity-title-inner">{prettyifyName(descriptor.getName())}</div>
        </div>
    ) : (
        <div className="board-space-entity-title-placeholder"></div>
    );

    return (
        <div className="board-space-entity-wrapper">
            <div className="board-space-entity" ref={cardRef} onClick={() => showPopupOnClick && setOpened(open => !open)} style={tileStyles}>
                {label}
                <div className="board-space-centered board-space-attribute-featured">
                    {descriptor.getFeaturedAttribute()}
                </div>
                {badges}
            </div>
            <Popup opened={opened} anchorRef={cardRef} onClose={close}>
                <EntityDetails
                    versionConfig={config}
                    descriptor={descriptor}
                    entity={entity}
                    canSubmitAction={canSubmitAction}
                    setSelectedUser={setSelectedUser}
                    closePopup={() => setOpened(false)}
                    gameState={gameState}></EntityDetails>
            </Popup>
        </div>
    );
}
