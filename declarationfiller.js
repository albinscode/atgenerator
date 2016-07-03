var replaceall = require("replaceall");

/**
 * This allows to fill a template that contains variables surrounded with $$.
 */
function DeclarationFiller() {

    var templateContent = null;
};

/**
 * @param data the object that contains all needed data to format.
 * @param content the content of the template to use for formatting.
 * @return the template content filled with values.
 */
DeclarationFiller.prototype.fill = function(data, content) {

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
                console.log(typeof(value));
            }
        });
    }


    // We fill all single values automatically
    Object.keys(data).forEach(function(key) {
        var value = data[key];
        //console.log(key + ": " + value + " type " + typeof(value));
        //console.log("la clé est " + key);
        //console.log("la valeur est " + value);

        // We only have string types to manage
        if (typeof(value) === 'string') {
            templateContent = replaceall('$$' + key + '$$', value, templateContent);
        } else if (typeof(value) === 'object' && typeof(value) !== undefined && value != null) {
            try {
                templateContent = self.fill(value, templateContent);
            } catch (e) {
                console.log(e);
            }
        }

    });


    return templateContent;
}

module.exports = DeclarationFiller;
