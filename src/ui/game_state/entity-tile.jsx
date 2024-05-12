import { useCallback, useRef, useState } from "preact/hooks";
import "./entity-tile.css";
import { Popup } from "../generic/popup.jsx";
import { prettyifyName } from "../../utils.mjs";
import { takeAllMatches, takeFirstMatch } from "../../config/expressions.mjs";
import { AttributeList } from "./attribute-list.jsx";


function getStyleInfo(choices, entity) {
    if(!choices) return {};

    const info = takeFirstMatch(choices, entity.get.bind(entity));

    return {
        background: info.background,
        color: info.textColor,
    };
}


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


function getBadgesForEntity(spec, entity) {
    const badgeAttribute = entity.get(spec.badgeAttribute);

    const rightBadge = badgeAttribute !== undefined ? (
        <div className="board-space-entity-badge right-badge" style={{ background: spec.badgeColor, color: spec.badgeTextColor }}>
            {badgeAttribute}
        </div>
    ): undefined;

    const indicators = takeAllMatches(spec.indicators || [], entity.get.bind(entity))
        .map(indicator => <span key={indicator.name} style={{ color: indicator.color }}>{indicator.symbol}</span>);

    const leftBadge = indicators.length > 0 ? (
        <div className="board-space-entity-badge left-badge" style={{ background: spec.indicatorBackground, color: spec.indicatorDefaultColor }}>
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

    const spec = (config && config.getEntityDescriptor(entity.type)) || { color: {} };
    const featuredAttribute = entity.get(spec.featuredAttribute);
    const tileStyles = getStyleInfo(spec.tileColor, entity);
    const badges = getBadgesForEntity(spec, entity);

    return (
        <div className="board-space-entity-wrapper">
            <div className="board-space-entity" ref={cardRef} onClick={() => showPopupOnClick && setOpened(open => !open)} style={tileStyles}>
                {label}
                <div className={`board-space-centered board-space-resource-featured ${label ? "" : "board-space-no-label"}`}>
                    {featuredAttribute?.toString?.()}
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