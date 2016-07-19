Improvements
============

Feature additions
=================

* Allow to provide a list of days (through a json file for example) that will fix parsed days.
For example, if the 25/05/2016 has been parsed as worked, it could be overriden as another day or only a morning or afternoon.
A more common example would be to rewrite am to pm or else because of the time management of linagora that cannot provide this information (and most of the time it has to be fixed with the customer).
* enhance the cache system for activity generation and avoid the cookie fetching. To do that, ensure that all pages are already cache (create another class to manage this feature).

Bugs
====
