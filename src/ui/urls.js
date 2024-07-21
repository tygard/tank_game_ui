/* global location, history, window */

import { useCallback, useEffect, useState } from "preact/hooks";

function matchUrl(paths) {
    for(const path of paths) {
        let match = path.matcher.exec(location.pathname);
        if(!match) continue;

        if(path.matchNames) {
            let mappedMatch = {};

            for(let i = 0; i < path.matchNames.length; ++i) {
                mappedMatch[path.matchNames[i]] = match[i + 1];
            }

            match = mappedMatch;
        }

        return { name: path.name, params: match };
    }
}

export function useRouter(paths) {
    const [currentPage, setCurrentPage] = useState(matchUrl(paths));

    const setPageWrapper = useCallback((pathName, args) => {
        const toPath = paths.find(path => path.name == pathName);
        if(!toPath) {
            throw new Error(`${pathName} is not a valid path`);
        }

        setCurrentPage({
            name: pathName,
            params: args,
        });

        const newUrl = toPath.makeUrl(args);
        history.pushState(undefined, undefined, newUrl);
    }, [setCurrentPage, paths]);

    const popStateHandler = useCallback(() => {
        const match = matchUrl(paths);
        setPageWrapper(match?.name, match?.params);
    }, [setPageWrapper, paths]);

    useEffect(() => {
        window.addEventListener("popstate", popStateHandler);

        return () => window.removeEventListener("popstate", popStateHandler);
    }, [popStateHandler]);

    return [currentPage, setPageWrapper];
}