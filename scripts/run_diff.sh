source scripts/common.sh
JSON='templates/diff.json'

nodejs commands/activity.js diff -u $USER -p $PASSWORD -j $JSON $@
