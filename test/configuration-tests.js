function ConfigurationTests() {}

ConfigurationTests.USER='changeme';
ConfigurationTests.PASSWORD='changeme';
ConfigurationTests.connectionProperties={ user:ConfigurationTests.USER, password:ConfigurationTests.PASSWORD } ;

module.exports = ConfigurationTests;
