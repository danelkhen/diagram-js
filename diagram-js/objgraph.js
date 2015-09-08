function ObjGraph() {
    Function.addTo(ObjGraph, [reduce, getValuePaths, walkWithPath, walkWithValuePath, walkWithValues])

    // walks an object graph, invoking an action for each value in the graph, providing the path from the root that originated this value
    // an action may return a value other than undefined, if so, it will be used to continue the iteration. returning explicit null will stop going deeper for that specific value
    function walkWithPath(root, action) {
        reduce(root, function (prev, value, key) {
            var path = prev.toArray();
            path.push(key);
            action(path);
            return path;
        }, []);
    }


    function getValuePaths(root) {
        var list = [];
        walkWithValuePath(root, function (path) { list.add(path); });
        return list;
    }

    // walks an object graph, invoking an action for each value in the graph, providing each key and value from the root that originated this value
    // an action may return a value other than undefined, if so, it will be used to continue the iteration. returning explicit null will stop going deeper for that specific value
    function walkWithValuePath(root, action) {
        reduce(root, function (prev, value, key) {
            var valuePath = prev.toArray();
            valuePath.push({ key: key, value: value });
            action(valuePath);
            return valuePath;
        }, []);

    }
    // walks an object graph, invoking an action for each value in the graph, providing each key and value from the root that originated this value
    // an action may return a value other than undefined, if so, it will be used to continue the iteration. returning explicit null will stop going deeper for that specific value
    function walkWithValues(root, action) {
        reduce(root, function (prev, value, key) {
            var values = prev.toArray();
            values.push(value);
            action(values);
            return values;
        }, []);

    }

    //Walks a graph with an aggregator
    // reduce(objRoot, function(prev, obj, key, recursion), [] )
    // recursion.skip() -> skips the current object and not recurse deeper
    // recursion.cancel() -> cancels the recursion entirely and exits
    function reduce(root, func, initial) {
        var visited = new Set();
        var cancel, skip;
        var walker = {
            cancel: function () {
                cancel = true;
            },
            skip: function () {
                skip = true;
            }
        };

        function process(prev, obj, key) {
            var prev2 = func(prev, obj, key, walker);
            if (cancel)
                return;
            if (skip) {
                skip = false;
                return;
            }
            if (obj == null)
                return;

            var obj2 = obj.valueOf();  //avoid fake objects like 'Date'

            if (typeof (obj2) != "object")
                return;

            if (visited.has(obj2))
                return;
            visited.add(obj2);

            if (obj2 instanceof Array) {
                var list = obj2;
                for (var i = 0; i < list.length; i++) {
                    var value = list[i];
                    process(prev2, value, i);
                    if (cancel)
                        return;
                }
                return;
            }
            var keys = Object.keys(obj2);
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var value = obj2[key];
                process(prev2, value, key);
                if (cancel)
                    return;
            }
        }
        process(initial, root, null);
    }


}
ObjGraph();

