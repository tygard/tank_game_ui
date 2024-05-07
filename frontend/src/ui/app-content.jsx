export function AppContent({ debugMode, withSidebar, toolbar, children }) {
    return (
        <div className={`app-wrapper ${withSidebar ? "with-sidebar" : ""}`}>
            {debugMode}
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