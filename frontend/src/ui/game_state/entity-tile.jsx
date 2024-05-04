import { useCallback, useRef, useState } from "preact/hooks";
import "./entity-tile.css";
import { Popup } from "../generic/popup.jsx";
import { prettyifyName } from "../../../../common/state/utils.mjs";
import { takeAllMatches, takeFirstMatch } from "../../../../common/state/config/expressions.mjs";


function getStyleInfo(choices, entity) {
    if(!choices) return {};

    const info = takeFirstMatch(choices, entity.get.bind(entity));

    return {
        background: info.background,
        color: info.textColor,
    };
}


function EntityDetails({ entity }) {
    const title = prettyifyName(entity.player?.name || entity.type);
    const subTitle = prettyifyName(entity.type);

    return (
        <>
            <div className="entity-details-title-wrapper">
                <h2>{title}</h2>
                {title != subTitle ? <i className="entity-details-title-type">{subTitle}</i> : undefined}
            </div>
            <table>
                {Array.from(entity.resources).map(attribute => {
                    return (
                        <tr>
                            <td>{prettyifyName(attribute.name)}</td>
                            <td>{attribute.toString()}</td>
                        </tr>
                    );
                })}
            </table>
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


export function EntityTile({ entity, showPopupOnClick, config }) {
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
        <>
            <div className="board-space-entity" ref={cardRef} onClick={() => showPopupOnClick && setOpened(open => !open)} style={tileStyles}>
                {label}
                <div className={`board-space-centered board-space-resource-featured ${label ? "" : "board-space-no-label"}`}>
                    {featuredAttribute?.toString?.()}
                </div>
                {badges}
            </div>
            <Popup opened={opened} anchorRef={cardRef} onClose={close}>
                <EntityDetails entity={entity}></EntityDetails>
            </Popup>
        </>
    );
}
