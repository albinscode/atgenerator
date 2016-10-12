source "scripts/common.sh"
JSON="templates/planning-full.json"
nodejs commands/activity.js planning -u $USER -p $PASSWORD -j $JSON $@
