import { createContext } from "preact";
import { useContext, useState } from "preact/hooks";


const TabSelectionContext = createContext(0);


export function Tabs({ defaultTab, children }) {
    const [selectedTab, setSelectedTab] = useState(defaultTab);

    return (
        <TabSelectionContext.Provider value={{selectedTab, setSelectedTab}}>
            {children}
        </TabSelectionContext.Provider>
    );
}


export function Tab({ name, children }) {
    const {selectedTab, setSelectedTab} = useContext(TabSelectionContext);

    return (
        <button disabled={name == selectedTab} onClick={() => setSelectedTab(name)}>
            {children}
        </button>
    );
}


export function TabContent({ name, children }) {
    const {selectedTab} = useContext(TabSelectionContext);

    return name == selectedTab ? children : undefined;
}
