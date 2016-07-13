source common.sh
JSON='../test/resources/report-example.json'

nodejs ../commands/activity.js report -u $USER -p $PASSWORD -j $JSON
