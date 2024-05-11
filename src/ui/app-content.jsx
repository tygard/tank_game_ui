/* globals APP_VERSION, BUILD_INFO, localStorage, location */
const MAX_RELOAD_FREQUENCY = 24 * 60 * 60 * 1000; // 1 day in ms


export function AppContent({ debugMode, withSidebar, toolbar, buildInfo, children }) {
    return (
        <div className={`app-wrapper ${withSidebar ? "with-sidebar" : ""}`}>
            {debugMode}
            {buildInfo !== undefined ? <AutoRestart buildInfo={buildInfo}></AutoRestart> : undefined}
            {toolbar}
            <div className="app-content">
                {children}
                <footer>
                    <i>{APP_VERSION}</i>
                </footer>
            </div>
        </div>
    );
}

function AutoRestart({ buildInfo }) {
    const isOutDated = buildInfo !== BUILD_INFO;

    if(isOutDated) {
        // Try autoreloading but don't get stuck in a reload loop
        const lastReload = localStorage.getItem("lastReload") || 0;
        if((Date.now() - lastReload) > MAX_RELOAD_FREQUENCY) {
            localStorage.setItem("lastReload", Date.now());
            location.reload();
        }
    }

    const reload = e => {
        e.preventDefault();
        location.reload();
    };

    if(isOutDated) {
        return (
            <div className="debug-mode-banner">
                You're version of tank game is out of date <a href="#" onClick={reload}>reload</a> to update.
            </div>
        );
    }
}