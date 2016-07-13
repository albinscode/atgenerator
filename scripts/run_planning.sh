source common.sh
JSON='../test/resources/planning-example.json'

nodejs ../commands/activity.js planning -u $USER -p $PASSWORD -j $JSON
