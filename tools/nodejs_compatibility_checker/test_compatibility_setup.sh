#!/usr/bin/env bash
export TERM="dumb"

# Install envirius
git clone --depth 1 https://github.com/ekalinin/envirius.git && \
cd envirius && \
make install && \
cd .. && \
source ~/.envirius/nv

if [ $? -ne 0 ]; then
echo "Unable to install envirius!"
exit 1
fi

# Determine available node versions
node_versions=$(nv ls-versions --node-prebuilt | sed 's/\s/\n/g' | grep -E '^[4-9]')
if [ -z "${node_versions}" ]; then
  echo "Unable to determine node versions!"
  exit 1
fi

# Dump available versions to file
for version in ${node_versions}; do
echo ${version} >> nodes_available.log
done
