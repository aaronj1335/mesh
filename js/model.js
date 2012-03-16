define([
    'vendor/underscore',
    'class'
], function(_, Class) {
    
    var Eventful = Class.extend({
        on: function(name, callback, context) {
            var events = this._eventCallbacks;
            if (!events) {
                events = this._eventCallbacks = {};
            }
            if (events[name]) {
                events[name].push([callback, context]);
            } else {
                events[name] = [[callback, context]];
            }
            return this;
        },

        trigger: function(name) {
            var events = this._eventCallbacks, both = 2, callbacks, callback;
            if (events) {
                while (both--) {
                    callbacks = events[both ? name : 'all'];
                    if (callbacks) {
                        for (var i = 0, l = callbacks.length; i < l; i++) {
                            callbacks = callbacks[i];
                            if (callback) {
                                if (callback[0].apply(callback[1] || this, arguments) === false) {
                                    callback = null;
                                }
                            }
                            if (!callback) {
                                callbacks.splice(i, 1);
                                i--;
                                l--;
                            }
                        }
                    }
                }
            }
            return this;
        },

        off: function(name, callback) {
            var events = this._eventCallbacks, callbacks;
            if (!name) {
                this._eventCallbacks = {};
            } else if (events) {
                if (callback) {
                    callbacks = events[name];
                    if (callbacks) {
                        for (var i = 0, l = callbacks.length; i < l; i++) {
                            if (callbacks[i] && callbacks[i][0] === callback) {
                                callbacks[i] = null;
                                break;
                            }
                        }
                    }
                } else {
                    events[name] = [];
                }
            }
            return this;
        }
    });

    var Manager = Eventful.extend({
        init: function(model) {
            this.cache = [];
            this.model = model;
            this.models = {};
        },

        associate: function(model) {
            var id = model.id || model.cid;
            if (this.models[id]) {
                if (this.models[id] !== model) {
                    var name = this.model.prototype.__name__;
                    throw new Error('attempt to associate duplicate ' + name + ', id = ' + id);
                }
            } else {
                this.models[id] = model;
            }
            return this;
        },

        clear: function() {
            this.cache = [];
            this.models = {};
            return this;
        },

        dissociate: function(model) {
            if (model.id) {
                delete this.models[model.id];
            }
            if (model.cid) {
                delete this.models[model.cid];
            }
            return this;
        },

        get: function(id) {
            var model = this.models[id];
            if (!model) {
                model = this.instantiate({id: id});
            }
            return model;
        },

        instantiate: function(model, loaded) {
            var instance;
            if (model.id) {
                instance = this.models[model.id];
                if (instance) {
                    instance.set(model);
                    if (loaded) {
                        instance._loaded = true;
                    }
                    return instance;
                }
            }
            return this.model(model, this, loaded);
        },

        load: function(id, params) {
            if (_.isNumber(id) || isString(id)) {
                return this.get(id).refresh(params, true);
            } else {
                return this.collection(id).load();
            }
        },

        notify: function(model, event) {
            if (model.id && this.models[model.id]) {
                this.trigger('change', this, model);
            }
        }
    });

    var Model = Eventful.extend({
        __new__: function(constructor, base, prototype) {
            constructor.manager = function() {
                return Manager(constructor);
            };
            constructor.models = prototype.__models__ = constructor.manager();
            constructor.collection = function(params, independent) {
                return constructor.models.collection(params, independent);
            };
        },

        __models__: null,
        __name__: null,
        __requests__: null,
        __schema__: null,

        init: function(attrs, manager, loaded) {
            this.cid = null;
            this.id = null;
            this._loaded = loaded;
            this._manager = manager || this.__models__;
            if (attrs != null) {
                this.set(attrs, true);
            }
            if (this.id == null) {
                this.cid = _.uniqueId('_');
            }
            this._manager.associate(this);
        },

        construct: function() {},

        destroy: function(params) {
            var self = this;
            if (self.id == null) {
                self._manager.dissociate(self);
                self.trigger('destroy', self);
                return $.Deferred().resolve();
            }
            return self._initiateRequest('delete', params).done(function(response) {
                self._manager.dissociate(self);
                self.trigger('destroy', self, response);
                return response;
            });
        },

        has: function(attr) {
            var value = this[attr];
            return (value !== undefined && value !== null);
        },

        html: function(attr, fallback) {
            var value = this[attr];
            if (value == null) {
                value = (fallback || '');
            }
            return _.escape('' + value);
        },

        save: function(params) {
            var self = this, creating = (this.id == null), request, data;
            request = self._getRequest(creating ? 'create' : 'update');

            data = request.extract(self);
            if (params != null) {
                $.extend(true, data, params);
            }

            return request.initiate(self.id, data).pipe(function(data) {
                if (creating) {
                    self._manager.associate(self);
                }
                self.set(data);
                self._loaded = true;
                return self;
            });
        },
    
        _getRequest: function(name) {
            return this.__requests__[name];
        },

        _initiateRequest: function(name, params) {
            return this._getRequest(name).initiate(this.id, params);
        }
    });

    return {
        Manager: Manager,
        Model: Model,
        Request: Request
    };
});
