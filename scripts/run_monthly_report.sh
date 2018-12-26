#!/bin/sh
. "scripts/common.sh"
JSON="templates/report-bl-monthly.json"
node commands/activity.js report -u $USER -j $JSON $@ -M
