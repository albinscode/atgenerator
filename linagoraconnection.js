var request = require('request');

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


LinagoraConnection.prototype.getPage = function (month, year) {
    var self = this;


    console.log('On lance la requête sur la page avec année et mois : ' + year + ' ' + month );

    var pageUrl = this.appliUrl.replace('%year', year).replace('%month', month);


    function callback() {
        request(
                {
                    url: pageUrl,
            jar: true,
            headers: 
        {
            'User-Agent': 'request', 
            'Cookie': self.cookie,

        }
                }, 
                function (error, response, body) {
                    // Only for debug
                    console.log(response);
                    
                    var fs = require('fs');
                    //fs.writeFile('outputresponse.html', response);
                    fs.writeFile('outputbodyresponse.html', body);

                }

               );


    }

    // We get the cookie, then we fetch the page
    this.getCookie(pageUrl, callback);

}




/**
 * Enables to retrieve the cookie to access Linagora extranet applications.
 */
LinagoraConnection.prototype.getCookie = function (page, callback) {

    var self = this;

    // We already have a cookie
    if (this.cookie != null) return this.cookie;

    console.log('Page à accéder: ' + this.authUrl);
    
    // We need to fetch the cookie
    request(
            {
                url: page
            }, 
            function (error, response, body) {
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
                        var cookieLemonLdapServer = response.headers['set-cookie'][0];
                        var cookieLemonLdap = cookieLemonLdapServer.split(';')[0]; 
                        console.log(cookieLemonLdap);
                        self.cookie = cookieLemonLdap;

                        callback();

                    });
            });
}

module.exports = LinagoraConnection;
