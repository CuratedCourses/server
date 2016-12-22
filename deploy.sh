#! /bin/bash
pushd "$(dirname "$(readlink "$BASH_SOURCE" || echo "$BASH_SOURCE")")"
git pull && npm install && bower install && gulp build && pm2 stop all && pm2 start ecosystem.config.js --env production
popd
