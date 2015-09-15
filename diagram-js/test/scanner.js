

function scanner_main() {
    var scanner = new Scanner();
    var x = { a: "b", c: "d", e: "f" };
    scanner.save(x);
    x.c = "z";
    x.g = "h"
    delete x.a;
    console.log(scanner.getChanges(x));
}


function Scanner() {
    var _copies = new Map();
    Function.addTo(this, [save, getChanges, getCopy, setCopy, getChangesAndSave]);

    function save(obj) {
        setCopy(obj, shallowCopy(obj));
    }

    function getCopy(obj) {
        return _copies.get(obj);
    }
    function setCopy(obj, copy) {
        if (copy == null) {
            _copies.delete(obj);
            return;
        }
        _copies.set(obj, copy);
    }

    function getChangesAndSave(obj, prev) {
        var changes = getChanges(obj, prev);
        save(obj);
        return changes;
    }
    function getChanges(obj, prev) {
        if (prev === undefined)
            prev = _copies.get(obj);
        if (prev == null) {
            return { added: Object.keys(obj), removed: [], remained: [], updated: [] };
        }
        var keys, prevKeys;
        if (obj instanceof Array) {
            var list = obj;
            keys = Array.generateNumbers(0, list.length);
            prevKeys = Array.generateNumbers(0, prev.length);
        }
        else {
            keys = Object.keys(obj);
            prevKeys = Object.keys(prev);
        }
        var added = keys.where(function (key) { return !prevKeys.contains(key); });
        var removed = prevKeys.where(function (key) { return !keys.contains(key); });
        var existing = keys.where(function (key) { return prevKeys.contains(key); });
        var updated = existing.where(function (key) { return prev[key] != obj[key]; });
        var remained = existing.where(function (key) { return !updated.contains(key); });
        return { added: added, removed: removed, remained: remained, updated: updated };
    }

    function shallowCopy(obj) {
        if (obj instanceof Array)
            return obj.toArray();
        var copy = {};
        Object.keys(obj).forEach(function (key) {
            copy[key] = obj[key];
        });
        return copy;
    }

}
