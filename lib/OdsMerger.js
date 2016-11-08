var log = require('./LogBridge');
var Promise = require('promise');
var cheerio = require('cheerio');

/*
 * @param directory the full directory containing ods to merge.
 */
module.exports.merge = function(directory) {

    var TemplateProvider = require('./TemplateProvider.js');
    var fs = require('fs');
    var provider = new TemplateProvider();
    // The main file that will be used for merging
    var mainFile = null;
    var promises = [];
    var contents = [];
    fs.readdir(directory, function (err, items) {

        // We iterate over ods files
        items.filter(function (value) { return value.indexOf('.ods') !== -1; }).forEach(function (value, key) {
            value = directory + '/' + value;
            log.verbose('ods merger', 'Browsing directory %s for ods files, found %s', directory, value);
            promises.push(provider.getFromOdt(value).then(function (content) {
                if (mainFile === null) {
                    mainFile = value;
                } else {
                    fs.unlink(value, function (err) {
                        if (err) throw err;
                    });
                }
                contents.push(content);
            }));
        });
        // We process the content of all files
        Promise.all(promises).then(function() {
            $ = cheerio.load(contents[0], { xmlMode: true} );
            contents.forEach(function(value, key) {
                try {
                    // TODO
                    //console.log("et un" + JSON.stringify(value.content));
                    $2 = cheerio.load(value.content, {xmlMode: true });
                    //$('office\\:spreadsheet').add($2('table\\:table'));
                    console.log($2('table\\:table').html());
                } catch (e) {
                    console.log (e);
                }
            });
        });
    });
};
