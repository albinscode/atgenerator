var cp = require('cp');

require('node-zip');

function DeclarationFiller() {

    var templateContent = null;
};

function replaceAll(find, replace, str) {
      //var find = find.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      return str.replace(find, replace, str);
        //return str.replace(new RegExp(find, 'g'), replace);
}

/**
 * Gets the template content if already retrieved.
 * If not, will get the libreoffice doc as a zip and will fetch for the content.xml.
 */
DeclarationFiller.prototype.getTemplateContent = function (template) {

    if (this.templateContent == null) {
        console.log('We need to read the template once: ' + template);
        var self = this;

        var newfs= require('fs');
        newfs.stat('/home/avigier/atgenerator/' + template, function (err, stats) {
            if (err) throw new Error('Cannot open');
            console.log('oki !');
        });
        // read a zip file

/*
         // read a zip file
         fs.readFile(template, function(err, data) {
             console('coucou');
           if (err) throw err;
           console.log('on y arrive ?');
             var zip = new JSZip(data);
             console.log('YES !!!!!!!');
             });
*/
/*
        var data = fs.readFileSync(template);
        console.log(data.toString());

        var zip = new JSZip(data.toString());
        console.log("zip ok");
        if (zip.files['content.xml']) {
            this.templateContent = zip.file('content.xml').asText();
            console.log('mon contenu' + this.templateContent);
        } else {
            throw new Error('Template has not been found: ' + template);
        }

        console.log(content);
        */
        newfs.readFile(template, function(err, data) {
            console.log("premier coucou");
            if (err) throw err;
            console.log("coucou"); 
            var zip = new JSZip(data);
            console.log("zip ok");
            if (zip.files['content.xml']) {
                self.templateContent = zip.file('content.xml').asText();
                console.log('mon contenu' + self.templateContent);
            } else {
                throw new Error('Template has not been found: ' + template);
            }
        });
    } else {
        console.log('Template is already cached');
    }
}

/**
 * Updates the template (the zip) with parsed content.
 */
DeclarationFiller.prototype.updateTemplate = function(template) {

    var newTemplate = template + '.ext';
    // We duplicate the original zip file
    cp.sync(template, newTemplate);
    console.log("Copie ok"); 
    
    var fs = require('fs');

    fs.readFile(newTemplate, function(err, data) {
        if (err) throw err;
            
        var zip = new JSZip(data);

        zip.file('test.file', 'hello there');
        var zipContent = zip.generate({base64:false,compression:'DEFLATE'});
        fs.writeFileSync(newTemplate, zipContent);
        console.log("Ecriture OK");
    });
}

/**
 * @param data the object that contains all needed data to format.
 * @param template the file name of the template to use for formatting.
 * @return the template content
 */
DeclarationFiller.prototype.fill = function(data, template) {
    // Utf-8 specified to get a string object instead of a buffer
    //var templateContent = fs.readFileSync(template, {"encoding": "utf-8"});
    this.getTemplateContent(template);

    var content = this.templateContent;

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
            content = replaceAll('$$' + key + '$$', value, content);
        }
    });

    // We display the computed footer
    console.log(data['documentFooter']);

    // Update the zip with parsed content
    this.updateTemplate(template);


    return templateContent;
}

module.exports = DeclarationFiller;
