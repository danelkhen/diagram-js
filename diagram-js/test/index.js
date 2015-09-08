"use strict";
var _diagram;
function main() {
    var data = {
        nodes: [
                { id: "a" },
                { id: "b" },
                { id: "c" },
                { id: "d" },
                { id: "e" },
                { id: "f" },
                { id: "g" },
                { id: "h" },
                { id: "i" },
                { id: "j" },
                { id: "k" },
        ],
        connectors: [
            { from: "a", to: "b" },
            { from: "a", to: "c" },
            { from: "a", to: "d" },
            { from: "a", to: "e" },
            { from: "b", to: "f" },
            { from: "b", to: "g" },
            { from: "b", to: "h" },
            { from: "b", to: "i" },
            { from: "b", to: "j" },
            { from: "b", to: "k" },


            //{ from: "b", to: "c" },
            //{ from: "c", to: "a" },
        ],
    };

    //var data = { a: [{ b: { c: {} } }, { b: { c: {} } }, { b: { c: {} } }] };
    var root = { children: [] };
    var node = root;
    Array.generateNumbers(0, 3).forEach(function (i) {
        node.children.push({ children: [] });
        node.children.forEach(function (node) {
            Array.generateNumbers(0, 50).forEach(function (i) {
                node.children.push({  });
            });
        });
    });

    $("body").getAppend("#diagram.Diagram");

    var graph = interpretGraph2(root);
    console.log("nodes", graph.nodes.length, "connectors", graph.connectors.length);
    //var graph = data;
    //console.log(graph);
    _diagram = new Diagram({
        el: "#diagram",
        nodes: graph.nodes,
        connectors: graph.connectors,
        renderNode: function (node) {
            var el = _diagram.getNodeElement(node);
            el.getAppend(".id").text(node.id);
            el.getAppend("button.Toggle").text("+").off().mousedown(function (e) { _diagram.toggleNode(node); });
        },
        animation: { enabled: true },
        tree: { enabled: true, tidy: { orientation: "horizontal" } },
        dragging: { enabled: true, preserveMaxDistance: true }
        //renderConnector: function (connector, el) {
        //    var from = _diagram.getNodeById(connector.from);
        //    el.getAppend("text").text(connector.from+"->"+connector.to).attr({x:from.pos.x, y:from.pos.y});
        //}
    });
    _diagram.render();

    var toolbar = $("body").getAppend(".Toolbar");
    toolbar.getAppend("button#render").text("render").click(function (e) { _diagram.render(); });
    toolbar.getAppend("button#vertical").text("vertical").click(function (e) { _diagram._options.tree.tidy.orientation = "vertical"; _diagram.render(); });
    toolbar.getAppend("button#horizontal").text("horizontal").click(function (e) { _diagram._options.tree.tidy.orientation = "horizontal"; _diagram.render(); });
    toolbar.getAppend("button#add").text("add").click(function (e) {
        _diagram._options.nodes.push({ id: "z" });
        _diagram.render();
    });
}



function interpretGraph(objInGraph) {
    var graph = { nodes: [], connectors: [] };
    var idIndex = 0;
    function process(obj) {
        if (typeof (obj) != "object")
            return;
        if (obj instanceof Array) {
            return obj.selectMany(process).exceptNulls();
        }
        if (obj.id == null)
            obj.id = (idIndex++).toString();
        var node = graph.nodes.firstEq("id", obj.id);
        if (node != null)
            return node;
        node = { id: obj.id };
        graph.nodes.push(node);
        var keys = Object.keys(obj);
        keys.forEach(function (key) {
            var value = obj[key];
            var nodes2 = process(value) || [];
            nodes2.forEach(function (node2) {
                if (node2 == null)
                    return;
                var connector = graph.connectors.first(function (t) { return (t.from == node.id && t.to == node2.id) || (t.from == node2.id && t.to == node.id); });
                if (connector == null)
                    graph.connectors.push({ from: node.id, to: node2.id });
            });
        });
        return [node];
    }

    process(objInGraph);
    return graph;
}

function interpretGraph2(objInGraph) {
    var graph = { nodes: [], connectors: [] };
    var idIndex = 0;

    function getNode(obj) {
        if (typeof (obj) != "object")
            return null;
        if (obj instanceof Array)
            return null;
        if (obj.id == null)
            obj.id = (idIndex++).toString();
        var node = graph.nodes.firstEq("id", obj.id);
        if (node != null)
            return node;
        node = { id: obj.id };
        graph.nodes.push(node);
        return node;
    }

    function connect(node1, node2) {
        if (node1 == null || node2 == null)
            return;
        //console.log("connecting", node1.id, node2.id);
        graph.connectors.push({ from: node1.id, to: node2.id });
    }

    ObjGraph.walkWithValues(objInGraph, function (values) {
        var obj1 = values[values.length - 2];
        var obj2 = values[values.length - 1];
        if(obj1 instanceof Array)
            obj1 = values[values.length - 3];
        connect(getNode(obj1), getNode(obj2));
    });

    return graph;
}

// { a : { b : "c", d:"e" } } -> [{path:["a","b"], value: "c"}, {path:["a","d"], value: "e" }]
function flattenGraph(root) {
    var flat = [];
    walkGraphWithPath(root, function (value, path) {
        var value2 = value == null ? null : value.valueOf();
        if (typeof (value2) == "object")
            return;
        flat.push({ path: path, value: value });
        return;
    });
    return flat;
}


function flattenGraph2(root) {
    var obj = {};
    flattenGraph(root).forEach(function (t) {
        obj[t.path.join(".")] = t.value;
    });
    return obj;
}






/*
    function drawLine2(p1, p2, el) {
        var pair = [p1, p2];
        var xs = pair.select("x");
        var ys = pair.select("y");

        var x1 = xs.min();
        var x2 = xs.max();
        var y1 = ys.min();
        var y2 = ys.max();

        var pp1 = { x: x1, y: y1 };
        var pp2 = { x: x2, y: y2 };

        el.css(createRect(pp1, pp2));

        var borderStyle = "solid solid solid solid";
        if (pointEquals(p1, pp1))
            borderStyle = "none none solid solid";
        else if (pointEquals(p1, pp2))
            borderStyle = "solid solid none none";
        else if (p1.x == pp1.x && p1.y == pp2.y)
            borderStyle = "solid none none solid";
        else if (p1.x == pp2.x && p1.y == pp1.y)
            borderStyle = "none solid solid none";
        el.css({ borderStyle: borderStyle });
    }
*/