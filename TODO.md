Improvements
============

Feature additions
=================

1. Allow to provide a list of days (through a json file for example) that will fix parsed days.
For example, if the 25/05/2016 has been parsed as worked, it could be overriden as another day or only a morning or afternoon.
A more common example would be to rewrite am to pm or else because of the time management of linagora that cannot provide this information (and most of the time it has to be fixed with the customer).
2. enhance the cache system for activity generation and avoid the cookie fetching. To do that, ensure that all pages are already cache (create another class to manage this feature).
    * --> done
3. implement a language to provide human periods: current month, next month, days, weeks, etc... It will allow to be more flexible and useful
4. implement a functionnality to make statistics on project activities (planning or time management). This will allow to sum the total activity consumed with the customer.
5. improve the json object using a json set of rules. This will allow to avoid common problems while providing invalid json (like xml) or to gather management rules (like start of month if no start date is provided, etc...)
6. add a json configuration file to gather common set of data like project codes. It will allow to choose among this list and avoid typo problems.

Bugs
====
