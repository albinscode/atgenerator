source "scripts/common.sh"
JSON="templates/followup.json"
nodejs commands/activity.js report -u $USER -j $JSON $@
