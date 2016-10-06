AT="/home/avigier/git/atgenerator"
source "$AT/scripts/common.sh"
JSON="$AT/templates/planning-full.json"
#JSON="$AT/planning-csv.json"
nodejs $AT/commands/activity.js planning $@
