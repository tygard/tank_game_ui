import "./attribute-list.css";
import { prettyifyName } from "../../utils.js";
import { useMemo } from "preact/hooks";


function getAttributeDescriptors(attributes, versionConfig, excludedAttributes) {
    const descriptors = Object.keys(attributes)
        .filter(attributeName => !excludedAttributes.has(attributeName))
        .map(attributeName => versionConfig.getAttributeDescriptor(attributeName, attributes[attributeName]));

    let categories = {};
    for(const descriptor of descriptors) {
        const category = descriptor.getCategory();
        if(categories[category] === undefined) {
            categories[category] = {};
        }

        const displayAs = descriptor.displayAs();
        if(displayAs == "hidden") continue;

        if(categories[category][displayAs] === undefined) {
            categories[category][displayAs] = [];
        }

        categories[category][displayAs].push(descriptor);
    }

    return categories;
}


export function AttributeCategory({ descriptors }) {
    const textDescriptors = descriptors.text === undefined ? undefined : (
        <table>
            {descriptors.text.map(descriptor => {
                return (
                    <tr key={descriptor.name}>
                        <td>{descriptor.getNameText()}</td>
                        <td>{descriptor.getValueText()}</td>
                    </tr>
                );
            })}
        </table>
    );

    const pills = descriptors.pill === undefined ? undefined : (
        descriptors.pill.map(descriptor => {
            const style = {
                background: descriptor.getBackground(),
                color: descriptor.getTextColor(),
            };

            const secondaryStyle = {
                background: descriptor.getSecondaryBackground(),
                color: descriptor.getSecondaryTextColor(),
            };

            const name = descriptor.getNameText();
            const valueText = descriptor.getValueText();

            return (
                <div className="pill" style={style} key={name}>
                    {name}
                    {valueText !== undefined ?
                        <span className="pill-secondary" style={secondaryStyle}>{valueText}</span> : undefined}
                </div>
            );
        })
    );

    return (
        <>
            {textDescriptors}
            {pills}
        </>
    );
}


export function AttributeList({ attributes, versionConfig, excludedAttributes = new Set() }) {
    const sortedDescriptors = useMemo(() => getAttributeDescriptors(attributes, versionConfig, excludedAttributes), [attributes, versionConfig, excludedAttributes]);

    return (
        <>
            {sortedDescriptors.attributes === undefined ? undefined :
                <AttributeCategory descriptors={sortedDescriptors.attributes}></AttributeCategory>}
            {Object.keys(sortedDescriptors).map(categoryName => {
                // Already displayed
                if(categoryName == "attributes") return;

                const descriptors = sortedDescriptors[categoryName];

                return (
                    <>
                        <h3>{prettyifyName(categoryName)}</h3>
                        <AttributeCategory descriptors={descriptors}></AttributeCategory>
                    </>
                )
            })}
        </>
    );
}