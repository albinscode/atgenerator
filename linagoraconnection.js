var request = require('request');

require('request-debug')(request);


function LinagoraConnection() {

    this.appliUrl = 'https://extranet.linagora.com/time/time_index.php?action=viewmonth&date=%year-%month-01';
    this.authUrl = 'https://auth.linagora.com';
    this.cookie = null;
}


function LinagoraConnection.prototype.getPage(month, year) {


    console.log('On relance la requête sur la page avec année et mois : ' + year + ' ' + month );
    console.log(response);
    request.cookie(cookieLemonLdap);
    request(
            {
                url: this.appliUrl.replace('%year', year).replace('%month', month), 
        jar: true,
        headers: 
    {
        'User-Agent': 'request', 
        'Cookie': cookieLemonLdap,

    }
            }, 
            function (error, response, body) {
                var cookieObmServer = response.headers['set-cookie'][0];
                var cookieObm = cookieObmServer.split(';')[0]; 
                console.log(cookieObm);
            }

           );


}




/**
 * Enables to retrieve the cookie to access Linagora extranet applications.
 */
function LinagoraConnection.prototype.getCookie(page, callback) {

    // We already have a cookie
    if (cookie != null) return this.cookie;

    // We need to fetch the cookie
    request(
            {
                url: page
            }, 
            function callback(error, response, body) {
                var urlToken = response.socket._httpMessage.path;
                console.log('Token récupéré : ' + urlToken);
                var urlAuth = this.cookie + urlToken;
                var urlClean = urlToken.substr(6);
                console.log('On se connecte à ' + urlAuth);
                console.log('Url propre ' + urlClean);

                request.post(

                    {
                        url: urlAuth, 
                    form: { 
                        user: 'avigier', password: 'sabine2014', timezone: 2, url: urlClean 
                    },
                    }, 

                    function (error, response, body) {
                        var cookieLemonLdapServer = response.headers['set-cookie'][0];
                        var cookieLemonLdap = cookieLemonLdapServer.split(';')[0]; 
                        console.log(cookieLemonLdap);

                        callback();

                    });
            });







}
