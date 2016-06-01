var request = require('request');
var Promise = require('promise');

//require('request-debug')(request);

const APPLI_URL = 'https://extranet.linagora.com/time/time_index.php?action=viewmonth&date=%year-%month-01';
const AUTH_URL = 'https://auth.linagora.com';



function LinagoraConnection(user, password) {

    this.appliUrl = APPLI_URL; 
    this.authUrl = AUTH_URL; 
    this.user = user;
    this.password = password;
    this.cookie = null;
}

/**
 * Gets the page of the time management for the given month and year.
 * The page is stored in a file with given file name.
 * @param month
 * @param year
 * @param filename writes to the filename the content if provided.
 * @return a Promise
 */
LinagoraConnection.prototype.getPage = function (month, year, filename) {
    var self = this;

    console.log('On lance la requête sur la page avec année et mois : ' + year + ' ' + month );

    var pageUrl = this.appliUrl.replace('%year', year).replace('%month', month);

    // We get the cookie, then we fetch the page
    return new Promise(function (resolve, reject) { 
        self.getCookie(pageUrl).then(function() {
            request(
                    {
                        url: pageUrl,
                        jar: true,
                        headers: {
                            'User-Agent': 'request', 
                            'Cookie': self.cookie,
                        }
                    }, 
                    function (error, response, body) {
                        if (filename) { 
                            var fs = require('fs');
                            fs.writeFile(filename, body);
                            console.log('Content has been written to a file: ' + filename);
                            // the content is not be sent if written to a file
                            resolve(null)
                        } else {
                            console.log('Content is returned directly as a string');
                            var obj = {};
                            obj.htmlContent = body;
                            obj.month = month;
                            obj.year = year;
                            resolve(obj);
                        }
                    }
                   );


        });
    });

}




/**
 * Enables to retrieve the cookie to access Linagora extranet applications.
 * @return a Promise after the cookie has been successfully fetched.
 */
LinagoraConnection.prototype.getCookie = function (page) {

    if (typeof(page) === 'undefined') page = this.authUrl;
    var self = this;

    return new Promise(function (resolve, reject) {
        // We already have a cookie
        if (self.cookie != null) return resolve(self.cookie);

        console.log('Page à accéder: ' + self.authUrl);
        
        // We need to fetch the cookie
        request(
                {
                    url: page
                }, 
                function (error, response, body) {
                    console.log('Fetching page');
                    if (error) reject(error);
                    var urlToken = response.socket._httpMessage.path;
                    console.log('Token récupéré : ' + urlToken);
                    console.log('Page à accéder: ' + self.authUrl);
                    var urlAuth = self.authUrl + urlToken;
                    var urlClean = urlToken.substr(6);
                    console.log('On se connecte à ' + urlAuth);
                    console.log('Url propre ' + urlClean);

                    request.post(

                        {
                            url: urlAuth, 
                            form: { 
                                user: self.user, password: self.password, timezone: 2, url: urlClean 
                            },
                        }, 

                        function (error, response, body) {
                            if (error) reject(error);
                            var cookieLemonLdapServer = response.headers['set-cookie'][0];
                            var cookieLemonLdap = cookieLemonLdapServer.split(';')[0]; 
                            console.log(cookieLemonLdap);
                            self.cookie = cookieLemonLdap;
                            resolve(self.cookie);
                        });
                }
        );
    });
}

module.exports = LinagoraConnection;
