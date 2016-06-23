Improvements
============

* The main.js is reserved for the developper. We have to provide arguments through command line arguments and not through parameters in functions.

Feature additions 
=================

* Allow to provide a list of days (through a json file for example) that will fix parsed days.
For example, if the 25/05/2016 has been parsed as worked, it could be overriden as another day or only a morning or afternoon.
A more common example would be to rewrite am to pm or else because of the time management of linagora that cannot provide this information (and most of the time it has to be fixed with the customer).
