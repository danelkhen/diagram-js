

function main2() {
    var x = {};
    Object.defineProperties(x, {
        g: {
            get: function () {
                return this._g;
            },
            set: function (value) {
                var oldValue = this._g;
                this._g = value;
                ObjectObserver.notifyUpdate(this, "g", oldValue);
            }
        },
    });
    ObjectObserver.observe(x, function (changes) {
        console.log(changes);
    });
    x.g = "hello";
}



function ArrayMap() {
    var map = new Map();
    Object.keys(ArrayMap.prototype).forEach(function(key){
        map[key] = ArrayMap.prototype[key];
    });
    return map;
}

ArrayMap.prototype.getCreate = function (key) {
    var list = this.get(key);
    if (list == null) {
        list = [];
        this.set(key, list);
    }
    return list;
}
ArrayMap.prototype.addItem = function (key, item) {
    var list = this.get(key);
    if (list == null) {
        this.set(key, [item]);
        return;
    }
    list.push(item);
}
ArrayMap.prototype.removeItem = function (key, item) {
    var list = this.get(key);
    if (list == null)
        return;
    list.remove(item);
    if (list.length == 0) {
        this.delete(key);
    }
}

function ObjectObserver() {
    Function.addTo(ObjectObserver, [notifyUpdate, observe, unobserve]);
    var _watched = new ArrayMap();
    var _changes = new ArrayMap();


    var _timeout;

    function observe(obj, handler) {
        _watched.addItem(obj, handler, true);
    }

    function unobserve(obj, handler) {
        _watched.removeItem(obj, handler, true);
    }

    function notifyUpdate(obj, prop, oldValue) {
        var change = { object: obj, name: prop, type: "update", oldValue: oldValue };
        _changes.addItem(obj, change, true);
        scheduleNotify();
    }

    function scheduleNotify() {
        if (_timeout != null)
            return;
        _timeout = window.setTimeout(notifyChanges, 0);
    }
    function notifyChanges() {
        _timeout = null;
        var allChanges = _changes;
        _changes = new ArrayMap();

        allChanges.forEach(function (changes, obj) {
            var handlers = _watched.get(obj);
            if (handlers == null)
                return;
            handlers.forEach(function (handler) { handler(changes); });
        });
    }

}
ObjectObserver();



