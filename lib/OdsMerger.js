var log = require('./LogBridge');
var Promise = require('promise');
var cheerio = require('cheerio');

/*
 * TODO externalize this module and TemplateProvider to standalone modules
 * @param directory the full directory containing ods to merge.
 * @param filename the filename of the final generated file
 */
module.exports.merge = function(directory, filename) {

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
            $ = cheerio.load(contents[0].content, { xmlMode: true} );
            contents.forEach(function(value, key) {
                try {
                    // We do not process the first element another time as far as it is being used
                    // as base line for the future merged document
                    if (key !== 0) {
                        $2 = cheerio.load(value.content, { xmlMode: true });
                        $('office\\:spreadsheet').append($2('table\\:table'));
                    }
                } catch (e) {
                    log.error('ods merger', e);
                }
            });
            provider.update(mainFile, directory + '/' + filename, $.html());
            // We delete the first file
            fs.unlink(mainFile, function (err) {
                if (err) throw err;
            });

        });
    });
};
