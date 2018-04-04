#!/usr/bin/env bash
[ ! -e ~/.envirius/nv ] && echo 'Error: envirius is not installed!' && exit 1
[ ! -e nodes_available.log ] && echo 'Error: no environments available!' && exit 1

export TERM="dumb"
source ~/.envirius/nv
node_versions=$(cat nodes_available.log)

# Run the tests on all available versions
for version in ${node_versions}; do
  echo "Testing node-${version}!";
  nv activate --same-shell "node-${version}"
  npm test >"test_node_${version}.log" 2>&1
  if [ $? -eq 0 ]; then
    echo "PASSED"
    echo ${version} >> nodes_passed.log
  else
    echo "FAILED"
  fi
  nv deactivate
done

# Determine failed versions and display the test-run
failed=$(comm -23 <(sort nodes_available.log) <(sort nodes_passed.log))
if [ -z "${failed}" ]; then
  echo "Build is compatible with all major node versions!"
  exit 0
fi

echo "Build is incompatible with the following node versions:"
echo "${failed}"
for version in ${failed}; do
  echo "***Started test-run for ${version}***";
  cat "test_node_${version}.log";
  echo "***Finished test-run for ${version}***";
done
exit 1
