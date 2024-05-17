#!/bin/sh

if [ "$1" == "sh" ]; then
    exec /bin/sh
fi

echo "Tank Game UI $BUILD_INFO"

chown node:node -R /data/
exec su-exec node /usr/local/bin/npm start
