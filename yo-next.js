(function(fprot, inherit, override){
    fprot.derive = function(ctor, ext) {
        var derived = override(this, ctor);
        derived.prototype = inherit(this.prototype);
        if (ext) derived.define(ext);
        return derived;
    };
    fprot.extend = function(ctor, ext) {
        return this.derive(function yo(){
            return yo.next(), ctor.apply(this, arguments);
        }, ext);
    };
    fprot.around = acceptMap(function(name, impl) {
        var proto = this.prototype;
        proto[name] = override(seriously(proto, name) ? proto[name] : lookup(this, name), impl);
        return this;
    });
    fprot.define = acceptMap(function(name, impl) {
        var proto = this.prototype;
        proto[name] = typeof impl != "function" ? impl
            : override(proto.constructor === this ? null : lookup(proto.constructor, name), impl);
        return this;
    });
    fprot.before = acceptMap(function(name, impl) {
        return this.around(name, function yo(){
            return impl.apply(this, arguments), yo.next();
        });
    });
    fprot.after = acceptMap(function(name, impl) {
        return this.around(name, function yo(){
            return yo.next(), impl.apply(this, arguments);
        });
    });
    function lookup(ctor, name) {
        while (ctor && ctor !== ctor.prototype.constructor && !seriously(ctor.prototype, name)) {
            ctor = ctor.prototype.constructor;
        }
        return ctor ? function() {
            return ctor.prototype[name].apply(this, arguments);
        } : null;
    }
    function acceptMap(f) {
        return function(key, val) {
            if (arguments.length < 2) {
                for (var i in key) if (seriously(key, i))
                    val = f.call(this, i, key[i]);
                return val;
            }
            return f.call(this, key, val);
        };
    }
    function seriously(hash, key) {
        return Object.prototype.hasOwnProperty.call(hash, key);
    }
})(
    // fprot
    Function.prototype,

    // inherit
    Object.create || function(proto){
        var dummy = new Function();
        dummy.prototype = proto;
        return new dummy;
    },

    // override
    function(ol, yo) {
        return function() {
            var self = this, args = arguments;
            yo.next = function() {
                if (!ol) throw new Error("No next method");
                return ol.apply(self, arguments.length > 0 ? arguments : args);
            };
            return yo.apply(self, args);
        };
    }
);
