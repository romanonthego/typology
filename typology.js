/**
 * typology.js - A data validation library for Node.js and the browser,
 *
 * Version: 0.2.1
 * Sources: http://github.com/jacomyal/typology
 * Doc:     http://github.com/jacomyal/typology#readme
 *
 * License:
 * --------
 * Copyright © 2014 Alexis Jacomy (@jacomyal), Guillaume Plique (@Yomguithereal)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * The Software is provided "as is", without warranty of any kind, express or
 * implied, including but not limited to the warranties of merchantability,
 * fitness for a particular purpose and noninfringement. In no event shall the
 * authors or copyright holders be liable for any claim, damages or other
 * liability, whether in an action of contract, tort or otherwise, arising
 * from, out of or in connection with the software or the use or other dealings
 * in the Software.
 */
(function(global) {
  'use strict';

  var k,
      className,
      classes = [
        'Arguments',
        'Boolean',
        'Number',
        'String',
        'Function',
        'Array',
        'Date',
        'RegExp',
        'Object'
      ],
      class2type = {},
      nativeTypes = ['*'];

  // Fill types
  for (k in classes) {
    className = classes[k];
    nativeTypes.push(className.toLowerCase());
    class2type['[object ' + className + ']'] = className.toLowerCase();
  }

  /**
   * Main object
   */
  function Typology(defs) {
    // Privates
    var _self = this,
        _customTypes = {};

    // Validate the given data against the given type, but returns a more
    // specific object
    function _scan(obj, type) {
      var a,
          i,
          l,
          k,
          error,
          subError,
          hasStar,
          hasTypeOf,
          optional = false,
          exclusive = false,
          typeOf = _self.get(obj);

      if (_self.get(type) === 'string') {
        a = type.replace(/^[\?\!]/, '').split(/\|/);
        l = a.length;
        for (i = 0; i < l; i++)
          if (nativeTypes.indexOf(a[i]) < 0 && !(a[i] in _customTypes))
            throw new Error('Invalid type.');

        if (type.match(/^\?/))
          optional = true;

        if (type.replace(/^\?/, '').match(/^\!/))
          exclusive = true;

        if (exclusive && optional)
          throw new Error('Invalid type.');

        for (i in a)
          if (_customTypes[a[i]])
            if (
              (typeof _customTypes[a[i]].type === 'function') ?
                (_customTypes[a[i]].type.call(_self, obj) === true) :
                !_scan(obj, _customTypes[a[i]].type)
            ) {
              if (exclusive) {
                error = new Error();
                error.message = 'The type "' + a[i] + '" is not allowed';
                error.matched = a[i];
                error.type = type;
                error.value = obj;
                return error;
              } else
                return null;
            }

        if (obj === null || obj === undefined) {
          if (!exclusive && !optional) {
            error = new Error();
            error.message = 'The type "' + obj + '" is not allowed.';
            error.type = type;
            error.value = obj;
            return error;
          } else
            return null;

        } else {
          hasStar = ~a.indexOf('*');
          hasTypeOf = ~a.indexOf(typeOf);
          if (exclusive && (hasStar || hasTypeOf)) {
            error = new Error();
            error.message = 'The type "' + (hasTypeOf ? typeOf : '*') + '" ' +
                            'is not allowed.';
            error.matched = hasTypeOf ? typeOf : '*';
            error.type = type;
            error.value = obj;
            return error;

          } else if (!exclusive && !(hasStar || hasTypeOf)) {
            error = new Error();
            error.message = 'The type "' + typeOf + '" is not allowed.';
            error.type = type;
            error.value = obj;
            return error;
          } else
            return null;
        }

      } else if (_self.get(type) === 'object') {
        if (typeOf !== 'object') {
          error = new Error();
          error.message = 'An object is expected.';
          error.type = type;
          error.value = obj;
          return error;
        }

        for (k in type)
          if ((subError = _scan(obj[k], type[k]))) {
            error = new Error();
            error.message = 'A sub-object does not match the required type.';
            error.subError = subError;
            error.key = k;
            error.type = type;
            error.value = obj;
            return error;
          }

        for (k in obj)
          if (type[k] === undefined) {
            error = new Error();
            error.message = 'The key "' + k + '" is not expected.';
            error.type = type;
            error.value = obj;
            return error;
          }

        return null;

      } else if (_self.get(type) === 'array') {
        if (type.length !== 1)
          throw new Error('Invalid type.');

        if (typeOf !== 'array') {
          error = new Error();
          error.message = 'An array is expected.';
          error.type = type;
          error.value = obj;
          return error;
        }

        l = obj.length;
        for (i = 0; i < l; i++)
          if ((subError = _scan(obj[i], type[0]))) {
            error = new Error();
            error.message = 'The ' + i + '-th element of the array does not ' +
                            'match the required type.';
            error.subError = subError;
            error.key = i;
            error.type = type;
            error.value = obj;
            return error;
          }

        return null;
      } else
        throw new Error('Invalid type.');
    }

    /**
     * Methods
     */

    // Adding a custom type
    this.add = function(a1, a2) {
      var o,
          k,
          a,
          id,
          tmp,
          type;

      // Polymorphism:
      if (arguments.length === 1) {
        if (this.get(a1) === 'object') {
          o = a1;
          id = o.id;
          type = o.type;
        } else
          throw new Error('If types.add is called with one argument, ' +
                          'this one has to be an object.');
      } else if (arguments.length === 2) {
        if (typeof a1 !== 'string' || !a1)
          throw new Error('If types.add is called with more than one ' +
                          'argument, the first one must be the string id.');
        else
          id = a1;

        type = a2;
      } else
        throw new Error('types.add has to be called ' +
                        'with one or two arguments.');

      if (this.get(id) !== 'string' || id.length === 0)
        throw new Error('A type requires an string id.');

      if (_customTypes[id] !== undefined && _customTypes[id] !== 'proto')
        throw new Error('The type "' + id + '" already exists.');

      if (~nativeTypes.indexOf(id))
        throw new Error('"' + id + '" is a reserved type name.');

      _customTypes[id] = 1;

      // Check given prototypes:
      a = (o || {}).proto || [];
      a = Array.isArray(a) ? a : [a];
      tmp = {};
      for (k in a)
        if (_customTypes[a[k]] === undefined) {
          _customTypes[a[k]] = 1;
          tmp[a[k]] = 1;
        }

      if ((this.get(type) !== 'function') && !this.isValid(type))
        throw new Error('A type requires a valid definition. ' +
                        'This one can be a preexistant type or else ' +
                        'a function testing given objects.');

      // Effectively add the type:
      _customTypes[id] = (o === undefined) ?
        {
          id: id,
          type: type
        } :
        {};

      if (o !== undefined)
        for (k in o)
          _customTypes[id][k] = o[k];

      // Delete prototypes:
      for (k in tmp)
        if (k !== id)
          delete _customTypes[k];

      return this;
    };

    // Check whether this typology has the given type
    this.has = function(key) {
      return !!_customTypes[key];
    };

    // Get the native type of the given variable
    this.get = function(obj) {
      return (obj === null || obj === undefined) ?
        String(obj) :
        class2type[Object.prototype.toString.call(obj)] || 'object';
    };

    // Validate the given data against the given type
    this.check = function(obj, type) {
      return !_scan(obj, type);
    };

    // Is the given type valid?
    this.isValid = function(type) {
      var a,
          k,
          i;

      if (this.get(type) === 'string') {
        a = type.replace(/^[\?\!]/, '').split(/\|/);
        for (i in a)
          if (nativeTypes.indexOf(a[i]) < 0 && !(a[i] in _customTypes))
            return false;
        return true;

      } else if (this.get(type) === 'object') {
        for (k in type)
          if (!this.isValid(type[k]))
            return false;
        return true;

      } else if (this.get(type) === 'array')
        return type.length === 1 ?
          this.isValid(type[0]) :
          false;
      else
        return false;
    };

    /**
     * Instantiation routine
     */

    // Add a type "type" to shortcut the isValid method:
    this.add('type', (function(v) {
      return this.isValid(v);
    }).bind(this));

    // Add a type "primitive" to match every primitive types (including null):
    this.add('primitive', function(v) {
      return !v || !(v instanceof Object || typeof v === 'object');
    });

    // Adding custom types at instantiation
    defs = defs || {};
    if (this.get(defs) !== 'object')
      throw Error('Invalid argument.');

    for (var k in defs)
      this.add(k, defs[k]);
  }

  /**
   * Public interface
   */

  // Creating a "main" typology instance to export
  var types = Typology;
  Typology.call(types);

  // Version
  Object.defineProperty(types, 'version', {
    value: '0.2.1'
  });

  /**
   * Export
   */
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports)
      exports = module.exports = types;
    exports.types = types;
  } else if (typeof define === 'function' && define.amd)
    define('typology', [], function() {
      return types;
    });
  else
    this.types = types;
})(this);
