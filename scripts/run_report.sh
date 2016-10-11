AT="/home/avigier/git/atgenerator"
source "$AT/scripts/common.sh"
JSON="$AT/templates/report-bl.json"

nodejs $AT/commands/activity.js report -u $USER -j $JSON $@
