source common.sh
JSON='../templates/report-bl'

nodejs ../commands/activity.js report -u $USER -j $JSON
