var fs = require('fs');
var JSZip = require('jszip');
var log = require('./logbridge');

/**
 *  This class allows to load a template as an ODT file (libreoffice writer format).
 *  This ODT file is a zip with serveral xml and binaries.
 *  The content.xml is the file we are interested in (to replace some tokens).
 *  @see declarationfiller.js
 */
function TemplateProvider () {}

/**
 * Gets the odt template content as a plain string.
 * @param template the file name of the odt template to load.
 * @return a Promise with the content as an exploitable and parsable string.
 */
TemplateProvider.prototype.getFromOdt = function(template) {

    return new Promise(function (resolve, reject) {
        fs.readFile(template, function(err, content) {
            var zip = new JSZip();
            zip.loadAsync(content).then(function(zip) {
                zip.file('content.xml').async('string').then(function(dataContent) {
                    log.verbose('template provider', 'Content from template successfully fetched: ' + template);
                    zip.file('styles.xml').async('string').then(function(dataFooter) {
                        log.verbose('template provider', 'Footer from template successfully fetched: ' + template);
                        var result = new Object();
                        result.content = dataContent;
                        result.footer = dataFooter;
                        resolve(result);
                    });
                });
            });
        });
    });
}

/**
 * Updates the content of the template in a new file.
 * @param the template file name
 * @param the content to update
 * @param the footer to update
 * @return a Promise to perform after the file write.
 */
TemplateProvider.prototype.update = function(template, newfile, content, footer) {
    return new Promise(function (resolve, reject) {
        fs.readFile(template, function(err, zipContent) {
            var zip = new JSZip();
            zip.loadAsync(zipContent).then(function(zip) {
                zip.file('content.xml', content);
                zip.file('styles.xml', footer);
                // We need to write it to file system
                zip.generateNodeStream({type:'nodebuffer', streamFiles:true})
                    .pipe(fs.createWriteStream(newfile))
                    .on('finish', function () {
                        log.verbose('template provider', 'File %j created', newfile);
                        resolve();
                });
            });
        });
    });

}

module.exports = TemplateProvider;
