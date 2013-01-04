define([
    'vendor/jquery',
    'vendor/underscore',
    'bedrock/class',
    './datetime'
], function($, _, Class, datetime) {
    var isArray = _.isArray, isNumber = _.isNumber, isString = _.isString,
        URLENCODED = 'application/x-www-form-urlencoded';

    var isPlainObject = function(obj) {
        return (obj && obj === Object(obj) && obj.constructor === Object);
    };

    var urlencodeMapping = function(mapping) {
        var tokens = [], name;
        for (name in mapping) {
            tokens.push(name + ':' + mapping[name]);
        }
        return '{' + tokens.join(',') + '}';
    };

    var urlencodeSequence = function(sequence) {
        return '[' + sequence.join(',') + ']';
    };

    // we want ValidationError's to behave like Error's, but still get the
    // benefits of Class.extend, so we'll have to munge them a bit here
    var token = 'validationerror', ValidationError = Class.extend();
    ValidationError.prototype = new Error(token);
    ValidationError.prototype.name = ValidationError.prototype.token = token;
    ValidationError.prototype.init = function(message, params) {
        this.message = message;
        $.extend(true, this, params);
    };
    ValidationError.extend = _.wrap(ValidationError.extend, function(extend) {
        var args = Array.prototype.slice.call(arguments, 1),
            ret = extend.apply(this, args);
        ret.prototype.name = ret.prototype.token;
        return ret;
    });

    var InvalidTypeError = ValidationError.extend({token: 'invalidtypeerror'});

    // on the client side we seem to use myField.required to denote required
    // fiedls, but scheme seems to use 'nonnull' -- try to match the backend
    // here
    var NonNullError = ValidationError.extend({token: 'nonnull'});

    // when we validate, we roll-up multiple errors into one CompoundError
    var CompoundError = ValidationError.extend({token: 'compounderror'});

    var Field = Class.extend({
        structural: false,

        init: function(params) {
            if (params != null) {
                _.extend(this, params);
            }
        },

        extract: function(subject) {
            throw new Error();
        },

        serialize: function(value, mimetype, normalized) {
            if (!normalized) {
                value = this._normalizeValue(value);
            }
            if (value == null) {
                return value;
            }
            this._validateType(value);
            return this._serializeValue(value, mimetype);
        },

        unserialize: function(value, mimetype) {
            if (value == null) {
                return value;
            }
            value = this._unserializeValue(value, mimetype);
            this._validateType(value);
            return value;
        },

        validate: function(value, mimetype) {
            value = this._normalizeValue(value);
            if (value == null) {
                if (this.nonnull) {
                    throw NonNullError('nonnull');
                } else {
                    return value;
                }
            }
            this._validateValue(value);
            this._validateType(value);
            if (mimetype) {
                value = this.serialize(value, mimetype, true);
            }
            return value;
        },

        _normalizeValue: function(value) {
            return value;
        },

        _serializeValue: function(value, mimetype) {
            return value;
        },

        _unserializeValue: function(value, mimetype) {
            return value;
        },

        _validateType: function(value) {},
        _validateValue: function(value) {}
    });

    var fields = {
        Field: Field,
        InvalidTypeError: InvalidTypeError,
        ValidationError: ValidationError,
        NonNullError: NonNullError,
        CompoundError: CompoundError
    };

    fields.BooleanField = Field.extend({
        _normalizeValue: function(value) {
            if (isString(value)) {
                value = value.toLowerCase();
                if (value === 'true') {
                    return true;
                } else if (value === 'false') {
                    return false;
                }
            }
            return value;
        },

        _serializeValue: function(value, mimetype) {
            if (mimetype === URLENCODED) {
                return (value ? 'true' : 'false');
            } else {
                return value;
            }
        },

        _validateType: function(value) {
            if (!_.isBoolean(value)) {
                throw InvalidTypeError();
            }
        }
    });

    fields.DateField = Field.extend({
        _serializeValue: function(value, mimetype) {
            return datetime.toISO8601(value);
        },

        _unserializeValue: function(value, mimetype) {
            if (!isString(value)) {
                throw InvalidTypeError();
            }
            return datetime.fromISO8601(value);
        },

        _validateType: function(value) {
            if (!_.isDate(value)) {
                throw InvalidTypeError();
            }
        }
    });

    fields.DateTimeField = Field.extend({
        _serializeValue: function(value, mimetype) {
            return datetime.toISO8601(value, true);
        },

        _unserializeValue: function(value, mimetype) {
            if (!isString(value)) {
                throw InvalidTypeError();
            }
            return datetime.fromISO8601(value);
        },

        _validateType: function(value) {
            if (!_.isDate(value)) {
                throw InvalidTypeError();
            }
        }
    });

    fields.EnumerationField = Field.extend({
        _normalizeValue: function(value) {
            return (value === '' ? null : value);
        },

        _serializeValue: function(value, mimetype) {
            if (_.isBoolean(value) && mimetype === URLENCODED) {
                return (value ? 'true' : 'false');
            } else {
                return value;
            }
        },

        _validateType: function(value) {
            if (_.indexOf(this.enumeration, value) < 0) {
                throw InvalidTypeError();
            }
        }
    });

    fields.IntegerField = Field.extend({
        _normalizeValue: function(value) {
            var number;
            if (isString(value) && value !== '') {
                number = Number(value);
                if (!_.isNaN(number)) {
                    return number;
                }
            }
            return value;
        },

        _validateType: function(value) {
            if (!isNumber(value) || Math.floor(value) !== value) {
                throw InvalidTypeError();
            }
        },

        _validateValue: function(value) {
            if (isNumber(this.minimum) && value < this.minimum) {
                throw ValidationError('invalid');
            }
            if (isNumber(this.maximum) && value > this.maximum) {
                throw ValidationError('invalid');
            }
        }
    });

    fields.FloatField = Field.extend({
        _normalizeValue: function(value) {
            var number;
            if (isString(value) && value !== '') {
                number = Number(value);
                if (!_.isNaN(number)) {
                    return number;
                }
            }
            return value;
        },

        _validateType: function(value) {
            if (!isNumber(value)) {
                throw InvalidTypeError();
            }
        },

        _validateValue: function(value) {
            if (isNumber(this.minimum) && value < this.minimum) {
                throw ValidationError('invalid');
            }
            if (isNumber(this.maximum) && value > this.maximum) {
                throw ValidationError('invalid');
            }
        }
    });

    fields.MapField = Field.extend({
        structural: true,

        extract: function(subject) {
            var value_field = this.value, extraction = {}, name, value;
            for (name in subject) {
                value = subject[name];
                if (value !== undefined) {
                    if (value_field.structural) {
                        if (value !== null) {
                            extraction[name] = value_field.extract(value);
                        }
                    } else {
                        extraction[name] = value;
                    }
                }
            }
            return extraction;
        },

        serialize: function(value, mimetype, outermost) {
            var value_field = this.value;
            if (value == null) {
                return value;
            } else if (!isPlainObject(value)) {
                throw InvalidTypeError();
            }
            for (name in value) {
                if (value_field.structural && value[name] == null) {
                    delete value[name];
                } else {
                    value[name] = value_field.serialize(value[name], mimetype);
                }
            }
            if (mimetype === URLENCODED && !outermost) {
                value = urlencodeMapping(value);
            }
            return value;
        },

        unserialize: function(value, mimetype) {
            var value_field = this.value, name;
            if (value == null) {
                return value;
            } else if (!isPlainObject(value)) {
                throw InvalidTypeError();
            }
            for (name in value) {
                value[name] = value_field.unserialize(value[name], mimetype);
            }
            return value;
        },

        validate: function(value, mimetype) {
            var error;

            this._super.apply(this, arguments);

            for (var k in value) {
                if (value.hasOwnProperty(k)) {
                    try {
                        this.value.validate(value[k]);
                    } catch (e) {
                        if (!error) {
                            error = CompoundError(null, {structure: {}});
                        }
                        error.structure[k] = [e];
                    }
                }
            }

            if (error) {
                throw error;
            }

            return this;
        }
    });

    fields.SequenceField = Field.extend({
        structural: true,

        extract: function(subject) {
            var item = this.item, extraction = [], value;
            for (var i = 0, l = subject.length; i < l; i++) {
                value = subject[i];
                if (item.structural && value !== null) {
                    value = item.extract(value);
                }
                extraction[i] = value;
            }
            return extraction;
        },

        serialize: function(value, mimetype) {
            var item = this.item;
            if (value == null) {
                return value;
            } else if (!isArray(value)) {
                throw InvalidTypeError();
            }
            for (var i = 0, l = value.length; i < l; i++) {
                value[i] = item.serialize(value[i], mimetype);
            }
            if (mimetype === URLENCODED) {
                value = urlencodeSequence(value);
            }
            return value;
        },

        unserialize: function(value, mimetype) {
            var item = this.item;
            if (value == null) {
                return value;
            } else if (!isArray(value)) {
                throw InvalidTypeError();
            }
            for (var i = 0, l = value.length; i < l; i++) {
                value[i] = item.unserialize(value[i], mimetype);
            }
            return value;
        },

        validate: function(value, mimetype) {
            var i, j, l, error, failed;

            this._super.apply(this, arguments);

            for (i = 0, l = value.length; i < l; i++) {
                failed = false;
                try {
                    this.item.validate(value[i]);
                } catch (e) {
                    if (! (e instanceof ValidationError)) {
                        throw e;
                    }
                    failed = true;
                    if (!error) {
                        error = CompoundError(null, {structure: []});
                        for (j = 0; j < i; j++) {
                            error.structure.push(null);
                        }
                    }
                    error.structure.push([e]);
                }
                if (!failed && error) {
                    error.structure.push(null);
                }
            }

            if (error) {
                throw error;
            }

            return this;
        }
    });

    fields.StructureField = Field.extend({
        structural: true,

        extract: function(subject) {
            var structure = this._get_structure(subject), extraction = {}, name, value, field;
            for (name in structure) {
                field = structure[name];
                if (field != null) {
                    value = subject[name];
                    if (value !== undefined) {
                        if (field.structural) {
                            if (value !== null) {
                                extraction[name] = field.extract(value);
                            }
                        } else {
                            extraction[name] = value;
                        }
                    }
                }
            }
            return extraction;
        },

        serialize: function(value, mimetype, outermost) {
            var structure, name, field, errors;
            if (value == null) {
                return value;
            } else if (!isPlainObject(value)) {
                throw InvalidTypeError();
            }

            structure = this._get_structure(value);
            for (name in value) {
                if (value.hasOwnProperty(name)) {
                    field = structure[name];
                    if (field == null) {
                        throw new fields.ValidationError('attempt to serialize unknown field "' + name + '"');
                    }
                    if (field.structural && value[name] == null) {
                        delete value[name];
                    } else {
                        try {
                            value[name] = field.serialize(value[name], mimetype);
                        } catch (e) {
                            (errors = errors || {})[name] = [e];
                        }
                    }
                }
            }

            for (name in structure) {
                if (structure.hasOwnProperty(name)) {
                    if (structure[name].required && typeof value[name] === 'undefined') {
                        (errors = errors || {})[name] =
                            [NonNullError('missing required field "' + name + '"')];
                    }
                }
            }

            if (errors) {
                throw ValidationError('there were errors in validation', {
                    errors: errors
                });
            }
            
            if (mimetype === URLENCODED && !outermost) {
                value = urlencodeMapping(value);
            }
            return value;
        },

        unserialize: function(value, mimetype) {
            var structure, name;
            if (value == null) {
                return value;
            } else if (!isPlainObject(value)) {
                throw InvalidTypeError();
            }

            structure = this._get_structure(value);
            for (name in value) {
                if (value.hasOwnProperty(name)) {
                    value[name] = structure[name].unserialize(value[name], mimetype);
                }
            }
            return value;
        },

        _get_structure: function(value) {
            var identity, structure;
            if (this.polymorphic_on != null) {
                identity = value[this.polymorphic_on.name];
                if (identity != null) {
                    structure = this.structure[identity];
                    if (structure != null) {
                        return structure;
                    } else {
                        throw new Error('invalid polymorphic identity');
                    }
                } else {
                    throw new Error('missing polymorphic identity');
                }
            } else {
                return this.structure;
            }
        },

        validate: function(value, mimetype) {
            var name, field, structure, error;

            this._super.apply(this, arguments);

            structure = this._get_structure(value);
            for (name in value) {
                if (value.hasOwnProperty(name)) {
                    field = structure[name];
                    if (field == null) {
                        throw new fields.ValidationError(
                                'attempt to validate unknown field "' +
                                name + '"');
                    }
                    try {
                        field.validate(value, mimetype);
                    } catch (e) {
                        error = error || CompoundError(null, {structure: {}});
                        error.structure[name] = [e];
                    }
                }
            }

            for (name in structure) {
                if (structure.hasOwnProperty(name)) {
                    if (structure[name].required && value[name] == null) {
                        error = error || CompoundError(null, {structure: {}});
                        error.structure[name] = 
                            [NonNullError('missing required field "' +
                                    name + '"')];
                    }
                }
            }

            if (error) {
                throw error;
            }

            return this;
        }
    });

    fields.TextField = Field.extend({
        _validateType: function(value) {
            if (!isString(value)) {
                throw InvalidTypeError();
            }
        }
    });

    fields.TimeField = Field.extend({
        _serializeValue: function(value, mimetype) {
            return value.toISOString();
        },

        _unserializeValue: function(value, mimetype) {
            if (!isString(value)) {
                throw InvalidTypeError();
            }
            return datetime.Time.fromISO8601(value);
        },

        _validateType: function(value) {
            if (!(value instanceof datetime.Time)) {
                throw InvalidTypeError();
            }
        }
    });

    fields.TokenField = Field.extend({
        _validateType: function(value) {
            if (!isString(value)) {
                throw InvalidTypeError();
            }
        }
    });

    fields.TupleField = Field.extend({
        structural: true,

        extract: function(subject) {
            var values = this.values, extraction = [], field, value;
            if (subject.length != values.length) {
                throw new Error();
            }
            for (var i = 0, l = subject.length; i < l; i++) {
                field = values[i];
                value = subject[i];
                if (field.structural && value != null) {
                    value = field.extract(value);
                }
                extraction[i] = value;
            }
            return extraction;
        },

        serialize: function(value, mimetype) {
            var values = this.values, field;
            if (value == null) {
                return value;
            } else if (!isArray(value)) {
                throw InvalidTypeError();
            }
            if (value.length != values.length) {
                throw ValidationError('invalid');
            }
            for (var i = 0, l = value.length; i < l; i++) {
                value[i] = values[i].serialize(value[i], mimetype);
            }
            if (mimetype === URLENCODED) {
                value = urlencodeSequence(value);
            }
            return value;
        },

        unserialize: function(value, mimetype) {
            var values = this.values, field;
            if (value == null) {
                return value;
            } else if (!isArray(value)) {
                throw InvalidTypeError();
            }
            if (value.length != values.length) {
                throw ValidationError('invalid');
            }
            for (var i = 0, l = value.length; i < l; i++) {
                value[i] = values[i].unserialize(value[i], mimetype);
            }
            return value;
        }
    });

    fields.UnionField = Field.extend({
        structural: true,

        serialize: function(value, mimetype) {
            var field;
            if (value == null) {
                return value;
            }
            for (var i = 0, l = this.fields.length; i < l; i++) {
                field = this.fields[i];
                try {
                    return field.serialize(value, mimetype);
                } catch (error) {
                    if (!(error instanceof InvalidTypeError)) {
                        throw error;
                    }
                }
            }
            throw InvalidTypeError();
        },

        unserialize: function(value, mimetype) {
            var field;
            if (value == null) {
                return value;
            }
            for (var i = 0, l = this.fields.length; i < l; i++) {
                field = this.fields[i];
                try {
                    return field.unserialize(value, mimetype);
                } catch (error) {
                    if (!(error instanceof InvalidTypeError)) {
                        throw error;
                    }
                }
            }
            throw InvalidTypeError();
        }
    });

    fields.UUIDField = Field.extend({
        _validateType: function(value) {
            if (!isString(value)) {
                throw InvalidTypeError();
            }
        }
    });

    // this is just a shell that allows the local models to not need to specify
    // a rigid schema.
    fields.FlexibleSchema = Class.extend({
        extract: function(subject) {
            return _.reduce(subject, function(memo, val, key) {
                if (key[0] !== '_' && key !== 'cid') {
                    memo[key] = val;
                }
                return memo;
            }, {});
        },
        structural: true // just so Request doesn't choke
    });

    return fields;
});
