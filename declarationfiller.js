var fs = require('fs');

function DeclarationFiller() {};

function replaceAll(find, replace, str) {
      //var find = find.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      return str.replace(find, replace, str);
        //return str.replace(new RegExp(find, 'g'), replace);
}

/**
 * @param data the object that contains all needed data to format.
 * @param template the file name of the template to use for formatting.
 * @return the template content
 */
DeclarationFiller.prototype.fill = function(data, template) {
    // Utf-8 specified to get a string object instead of a buffer
    var templateContent = fs.readFileSync(template, {"encoding": "utf-8"});

    // We browse to inject variables in the footer 
    Object.keys(data).forEach(function(key) {
        var value = data[key]; 
        data.documentFooter = replaceAll('$$' + key + '$$', value, data.documentFooter);
    });
    
    // We fill all single values automatically
    Object.keys(data).forEach(function(key) {
        var value = data[key]; 
        console.log(key + ": " + value + " type " + typeof(value));

        // We only have string types to manage
        if (typeof(value) === 'string') {
            templateContent = replaceAll('$$' + key + '$$', value, templateContent);
        }
    });

    // We display the computed footer
    console.log(data['documentFooter']);

    return templateContent;
}

module.exports = DeclarationFiller;
