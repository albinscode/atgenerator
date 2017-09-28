Followup report
===

Also known as "Déclaratif des temps" in french.

It allows to fill automatically your working hours and days from the time management application (aka "Gestion des temps" in french).

Disclaimer
===

This is only a tool. It helps you to fill your report but you have to check the generated file to ensure it is in line with your working hours.

Steps
===

Here are the detailed steps to generate your followup report.

Prerequisites
---

Node shall be installed and application shall be properly installed (see [[README file|readme.md]]).

Of course your time management shall be filled online!

1. Configure the followup.json
---

The json file contains all needed information to generate the report.

You shall have to initialize the followup.json with your personal values:

* startDate: shall be the monday of your starting report. E.g.: April, 3rd 2017
* endDate: shall be the friday of your starting report. E.g.: September, 29th 2017
* odtTemplate: the default libre office template that will be used. Feel free to adapt it with your signature for example.
* filepath: this will be the output directory that will be used. I'm using my trigram "avi", feel free to change it...
* companyReponsible: is your responsible that will sign the document
* companyConsultantFirstName: is your firstname
* companyConsultantLastName: is your lastname
* activityHalfDay: is the string that will be used to tell you worked half a day in the odt cell
* activityFullDay: is the string that will be used to tell you worked a full day in the odt cell
* activityMinutesPerDay: are the number of minutes worked in a day. This is mandatory because the sum is done by the application and not the odt.

The three last variables are dependent of your status so please adapt it to your status.

After initialization, you can see that you won't have to edit them each time you need a followup. Only the dates will change and perhaps your responsible.

2. Running the application

You can use the provided scripts or run it from the console manually like this:

    node commands/activity.js report -u yourlogin -j templates/followup.json -F

The followup report shall be generated (a message shall have been displayed to specify its location).

3. Checking the report and send it to signature

Given this report you can:

* double check it is in line with your activity in time management
* sign it on each page
* print it
* provide it to your responsible for signature

That's ok!
