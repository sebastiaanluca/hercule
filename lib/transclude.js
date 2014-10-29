// Generated by CoffeeScript 1.8.0
(function() {
  var FILE_GROUP, WHITESPACE_GROUP, async, detectDependencies, fs, parseParameters, path, substituteParameters, transclude,
    __slice = [].slice,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  async = require('async');

  fs = require('fs');

  path = require('path');

  WHITESPACE_GROUP = 1;

  FILE_GROUP = 2;

  substituteParameters = function(document, parameters, verbose) {
    var filename, parameterPlaceholder, placeholder;
    for (placeholder in parameters) {
      filename = parameters[placeholder];
      if (verbose) {
        console.error("Substituting " + placeholder + " with " + filename);
      }
      parameterPlaceholder = new RegExp("{{" + placeholder + "}}", "g");
      document = document.replace(parameterPlaceholder, "{{" + filename + "}}");
    }
    return document;
  };

  parseParameters = function(parameters, verbose) {
    var filename, p, parsedParameters, placeholder, _i, _len, _ref, _ref1;
    if (!parameters) {
      cb(null, null);
    }
    parsedParameters = {};
    _ref = (function() {
      var _j, _len, _results;
      _results = [];
      for (_j = 0, _len = parameters.length; _j < _len; _j++) {
        p = parameters[_j];
        _results.push(p.split(":"));
      }
      return _results;
    })();
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      _ref1 = _ref[_i], placeholder = _ref1[0], filename = _ref1[1];
      if (!filename) {
        console.error("Malformed parameter " + placeholder + ". Expected placeholder:filename");
      } else {
        parsedParameters[placeholder] = filename;
      }
    }
    return parsedParameters;
  };

  detectDependencies = function(document, verbose, cb) {
    var dependencies, dependency, detect, filename, parameters, placeholder, placeholders, whitespace;
    dependencies = {};
    detect = new RegExp(/([^|\n]{1}[\t ]*)?{{(.+?)}}/g);
    placeholders = (function() {
      var _ref, _results;
      _results = [];
      while ((dependency = detect.exec(document))) {
        placeholder = dependency[FILE_GROUP];
        whitespace = dependency[WHITESPACE_GROUP];
        _ref = placeholder.split(" "), filename = _ref[0], parameters = 2 <= _ref.length ? __slice.call(_ref, 1) : [];
        dependencies[placeholder] = {
          filename: filename,
          whitespace: whitespace,
          parameters: parseParameters(parameters, verbose)
        };
        _results.push(placeholder);
      }
      return _results;
    })();
    return cb(null, placeholders, dependencies);
  };

  transclude = function(documentPath, parents, parameters, verbose, cb) {
    if (parents == null) {
      parents = [];
    }
    if (verbose) {
      console.error("Transcluding " + documentPath);
    }
    if (__indexOf.call(parents, documentPath) >= 0) {
      cb("circular dependencies detected");
    }
    parents.push(documentPath);
    return fs.readFile(documentPath, function(err, document) {
      if (err) {
        if (err.type = 'ENOENT') {
          console.error("" + documentPath + " not found.");
          return cb(null, '');
        }
        return cb(err);
      }
      document = substituteParameters(document.toString(), parameters, verbose);
      return detectDependencies(document, verbose, function(err, placeholders, dependencies) {
        if (err) {
          return cb(err);
        }
        if (placeholders === []) {
          return cb(null, document);
        }
        return async.eachSeries(placeholders, function(placeholder, cb) {
          var dependency, dependencyPath;
          dependency = dependencies[placeholder];
          dependencyPath = path.join(path.dirname(documentPath), dependency.filename);
          return transclude(dependencyPath, parents.slice(0), dependency.parameters, verbose, function(err, output) {
            var insertionPoint;
            if (err) {
              return cb(err);
            }
            if (dependency.whitespace) {
              output = output.replace(/\n/g, "\n" + dependency.whitespace);
            }
            insertionPoint = new RegExp("{{" + placeholder + "}}", "g");
            document = document.replace(insertionPoint, output);
            return cb(null);
          });
        }, function(err) {
          return cb(null, document);
        });
      });
    });
  };

  module.exports = {
    transclude: transclude,
    detectDependencies: detectDependencies,
    parseParameters: parseParameters,
    substituteParameters: substituteParameters
  };

}).call(this);