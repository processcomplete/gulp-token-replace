'use strict';

var concat = require('concat-stream');
var through = require('through2');
var PluginError = require('plugin-error');

module.exports = function(options) {
  options = injectDefaultOptions(options);

console.log(options);

  return through.obj(function(file, encoding, callback) {
    try {
console.log("THROUGH");
      if (file.isNull()) {
console.log('null')
        return callback(null, file);
      } else if (file.isStream()) {
console.log('stream')
        file.contents.pipe(concat(function(data) {
          file.contents = Buffer.from(replace(String(data), options));
          return callback(null, file);
        }));
      } else if (file.isBuffer()) {
console.log('buffer')
        file.contents = Buffer.from(replace(String(file.contents), options));
        return callback(null, file);
      } else {
        return callback(new PluginError('gulp-token-replace', new Error('unknown type of file')));
      }
    } catch (e) {
      return callback(new PluginError('gulp-token-replace', e));
    }
  });
};

function injectDefaultOptions(options) {
  options = options || {};
  options.prefix = options.prefix || '{{';
  options.suffix = options.suffix || '}}';
  options.tokens = options.tokens || options.global || {};
  options.preserveUnknownTokens = options.preserveUnknownTokens || false;
  options.delimiter = options.delimiter || '.';
  return options;
}

function replace(text, options) {
  options = injectDefaultOptions(options);

  var includeRegExp = new RegExp(escapeRegExp(options.prefix) + "(.+?)" + escapeRegExp(options.suffix), "g");

  var retVal = text;
  var regExpResult;
  while (regExpResult = includeRegExp.exec(text)) {
    var arrayDetected = false;
    var arrayItemId = -1;
    var fullMatch = regExpResult[0];
    var tokenName = regExpResult[1];
    if (tokenName.indexOf('[') > 0) {
      arrayItemId = tokenName.toString().split('[')[1].split(']')[0];
      tokenName = tokenName.toString().split('[')[0];
    }
    var tokenValue = getTokenValue(options.tokens, tokenName, options.delimiter);
    if (tokenValue === null) {
      if (options.preserveUnknownTokens === "error") {
        throw new Error(`Undefined token: ${options.prefix}${tokenName}${options.suffix}`);
      }
      if (!options.preserveUnknownTokens) {
        tokenValue = '';
      }
    }
    if (tokenValue !== null) {
      if (typeof tokenValue == 'object') {
        if (Array.isArray(tokenValue)) {
          if (arrayItemId > -1) {
            tokenValue = tokenValue[arrayItemId];
          } else {
            tokenValue = JSON.stringify(tokenValue).split(',');
          }
        } else {
          tokenValue = JSON.stringify(tokenValue);
        }
      }
      retVal = retVal.replace(fullMatch, tokenValue);
    }
  }
  return retVal;
}

function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

function getTokenValue(tokens, tokenName, delimiter) {
  var tmpTokens = tokens;
  var tokenNameParts = tokenName.split(delimiter);
  for (var i = 0; i < tokenNameParts.length; i++) {
    if (tmpTokens.hasOwnProperty(tokenNameParts[i])) {
      tmpTokens = tmpTokens[tokenNameParts[i]];
    } else {
      return null;
    }
  }
  return tmpTokens;
}
