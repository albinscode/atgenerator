var replaceall = require("replaceall");
var log = require('./LogBridge');

/**
 * This allows to fill a template that contains variables surrounded with $$.
 */
function DeclarationFiller() {

    var templateContent = null;
}

/**
 * @param data the object that contains all needed data to format.
 * @param content the content of the template to use for formatting.
 * @return the template content filled with values.
 */
DeclarationFiller.prototype.fill = function(data, content, ifFooter) {

    var self = this;
    var templateContent = content;
    // We browse to inject variables in the footer and in the file name pattern only once (this function is recursive)
    if (data.documentFooter !== undefined) {
        Object.keys(data).forEach(function(key) {
            var value = data[key];
            if (typeof(value) === 'string') {
                data.documentFooter = replaceall('$$' + key + '$$', value, data.documentFooter);
                data.filenamePattern = replaceall('$$' + key + '$$', value, data.filenamePattern);
            } else {
                log.verbose('filler', typeof(value));
            }
        });
    }


    // We fill all single values automatically
    Object.keys(data).forEach(function(key) {
        var value = data[key];
        log.verbose('filler', 'key %j, value %j, type %j', key, value, typeof(value));

        // We only have string types to manage
        if (typeof(value) === 'string') {
            // To embed the style (TODO dirty trick to refactor)
            // We only process the following for AM/PM tags only on the Footer!
            // Otherwise, as far as these keys are LibreOffice fields, it ill be replaced by its Libreoffice value.
            if ((key.indexOf('AM') != -1 || key.indexOf('PM') != -1) && key.length == 3 && ifFooter) {
                log.verbose('filler', 'Replacing only in the footer the AM/PM values');
                templateContent = replaceall('$$' + key + '$$', value, templateContent);
            }
            // Nominal case
            else {
                templateContent = replaceall('$$' + key + '$$', value, templateContent);
            }
        } else if (typeof(value) === 'object' && typeof(value) !== undefined && value !== null) {
            try {
                templateContent = self.fill(value, templateContent, ifFooter);
            } catch (e) {
                log.error('filler', e);
            }
        }

    });


    return templateContent;
};

module.exports = DeclarationFiller;
