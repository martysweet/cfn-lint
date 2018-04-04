#!/usr/bin/env bash
[ ! -e ~/.envirius/nv ] && echo 'Error: envirius is not installed!' && exit 1
[ ! -e nodes_available.log ] && echo 'Error: no environments available!' && exit 1

export TERM="dumb"
source ~/.envirius/nv
node_versions=$(cat nodes_available.log)

# Cache NodeJS environments
for version in ${node_versions}; do
  echo "Adding NodeJS ${version} into environment cache!" && \
  nv mk "node-${version}" --node-prebuilt=${version}
done
