"use strict";
function Diagram(_options) {
    if (this == null)
        return new Diagram(_options);
    var _this = this;
    Function.addTo(_this, [getNodeElement, render, toggleNode, getNodeById]);

    var _el, _svg, _nodeElsById;
    var _connectorsMap, _nodesMap;
    var _draggedNode;

    var _config_animation_enabled,
        _config_tree_enabled,
        _config_tree_enabled,
        _config_dragging_enabled,
        _config_dragging_preserveMaxDistance,
        _config_tree_tidy_orientation
    ;

    Object.defineProperties(_this, {
        _options: { get: function () { return _options; }, set: function (value) { _options = value; } },
    });

    function render() {
        _connectorsMap = new Map();
        _nodesMap = new Map();
        _nodeElsById = {};

        _options.nodes.forEach(function (t) { t.isCollapsed = false; t.isHidden = false; });
        _options.connectors.forEach(function (t) { t.maxDistance = null; });
        
        _el = $(_options.el);
        _svg = _el.getAppend("svg");

        _config_animation_enabled = Object.tryGet(_options, ["animation", "enabled"]);
        _config_tree_enabled = Object.tryGet(_options, ["tree", "enabled"]);
        _config_dragging_enabled = Object.tryGet(_options, ["dragging", "enabled"]);
        _config_dragging_preserveMaxDistance = Object.tryGet(_options, ["dragging", "preserveMaxDistance"]);
        _config_tree_tidy_orientation = Object.tryGet(_options, ["tree", "tidy", "orientation"]);

        if (_config_animation_enabled)
            renderElements();
        layout();
        if (_config_animation_enabled)
            animateNodes();
        else
            renderElements();
    }
    function renderElements() {
        renderNodes();
        renderConnectors();
    }
    function layout() {
        if (!_config_tree_enabled)
            return;
        layoutAsTree();
    }

    function renderNodes() {
        _el.getAppendRemoveForEach(".DiagramNode", _options.nodes, function (el, obj) {
            _nodeElsById[obj.id] = el;
            _nodesMap.set(obj, el);
            renderNode(obj);
        });
    }
    function renderConnectors() {
        _svg.getAppendRemoveForEach("g.DiagramConnector", _options.connectors, function (el, connector) {
            _connectorsMap.set(connector, el);
            renderConnector(connector);
        });
    }

    function verifyMaxDistances(node) {
        bfsConnectors(node, function (edge) {
            verifyMaxDistance(edge.connector, edge.to, edge.from);
        });
        renderElements();
    }

    function enableDragging(node) {
        var el = getNodeElement(node);
        el.draggable({
            start: function (e, ui) {
                _draggedNode = node;
            },
            drag: function (e, ui) {
                node.pos = { x: ui.position.left, y: ui.position.top };
                if (_config_dragging_preserveMaxDistance)
                    verifyMaxDistances(node);
                else {
                    var connectors = getNodeConnectors(node);
                    connectors.forEach(renderConnector);
                }
            },
            stop: function (e, ui) {
                node.pos = getPos(el);
                _draggedNode = null;
            },
            containment: "parent",
            //distance: 10,
            //helper:"clone",
        });
    }

    function renderNode(node) {
        var el = getNodeElement(node);
        var node2 = el.data("node");
        var init = node2 != node;
        var reset = init && node2 != null;

        if (reset) {
            el.draggable("destroy");
            el.off();
            el.data("node", null);
            //el[0].className = "DiagramNode";
        }
        if (init) {
            el.data("node", node);
            if (_config_dragging_enabled)
                enableDragging(node);
        }
        var classes = [
            "DiagramNode",
            node.isCollapsed ? "isCollapsed" : "isExpanded",
            node.isHidden ? "isCollapsed" : "isExpanded",
            getNodeConnectors(node).length ? "hasConnectors" : "hasNoConnectors",
            getNodeChildren(node).length ? "hasChildren" : "hasNoChildren",
        ];

        el.toggle(!node.isHidden);
        el[0].className = classes.join(" ");

        positionNode(node);
        if (_options.renderNode)
            _options.renderNode(node);

    }


    function createEdges(node) {
        var connectors = getNodeConnectors(node);
        var edges = connectors.select(function (connector) {
            var edge = { from: node, connector: connector, to: getOppositeNode(connector, node) };
            return edge;
        });
        return edges;
    }
    function bfsConnectors(root, action) {
        var set = new Set();
        var stack = [];
        stack.addRange(createEdges(root));
        while (stack.length > 0) {
            var edge = stack.pop();
            if (set.has(edge.connector))
                continue;
            set.add(edge.connector);
            action(edge);
            stack.addRange(createEdges(edge.to));
        }
    }
    function getConnectorNodes(connector) {
        return [getNodeById(connector.from), getNodeById(connector.to)];
    }
    function getOppositeNode(connector, node) {
        var nodes = getConnectorNodes(connector);
        if (nodes[0] == node)
            return nodes[1];
        else if (nodes[1] == node)
            return nodes[0];
        return null;
    }

    function verifyMaxDistance(connector, node1, node2) {
        var el = getConnectorElement(connector);
        if (node1 == node2)
            return;
        var el1 = getNodeElement(node1);
        var el2 = getNodeElement(node2);
        var points = getConnectionPoints(el1, el2);
        var p1 = points[0];
        var p2 = points[1];
        var distance = getDistance(points[0], points[1]);
        if (connector.maxDistance == null) {
            connector.maxDistance = distance;
            return;
        }
        if (distance <= connector.maxDistance)
            return;
        var v = getDirection(p1, p2);
        var d = distance - connector.maxDistance;
        var p3 = moveTowards(p1, p2, d);
        var centerOffset = getRectCenterOffset(elToRect(el1[0]));
        p3 = point_add(p3, point_multiply(centerOffset, -1));
        node1.pos = p3;
    }
    function point_toString(p) {
        return "(" + p.x + "," + p.y + ")";
    }


    //moves a point towards a target point in a certain distance
    function moveTowards(p1, p2, distance) {
        var v = getDirection(p1, p2);
        var d = point_multiply(v, distance);
        var p3 = point_add(p1, d);
        return p3;
    }

    function point_add(p, d) {
        return { x: p.x + d.x, y: p.y + d.y };
    }
    function point_multiply(p, d) {
        if (typeof (d) == "number")
            return { x: p.x * d, y: p.y * d };
        return { x: p.x * d.x, y: p.y * d.y };
    }


    //Answer 1: it is Vector(x2-x1,y2-y1)
    //Answer 2: Normalizing means to scale the vector so that its length is 1. It is a useful operation in many computations, 
    //for example, normal vectors should be specified normalized for lighting calculations in computer graphics. 
    //The normalized vector of v(x,y) is vn(x/Length(v), y/length(v)).
    function getDirection(p1, p2) {
        var dx = p2.x - p1.x;
        var dy = p2.y - p1.y;
        var v = { x: dx, y: dy };
        var d = getDistance(p1, p2);
        var vn = { x: v.x / d, y: v.y / d };
        return vn;
    }

    function renderConnector(connector) {
        var el = getConnectorElement(connector);
        var el1 = getNodeElementById(connector.from);
        var el2 = getNodeElementById(connector.to);
        var pathEl = el.getAppend("path");
        connect(el1, el2, pathEl);
        el.toggle(!connector.isHidden);
        if (_options.renderConnector)
            _options.renderConnector(connector, el);
    }

    function connect(el1, el2, connectorEl) {
        var pair = getConnectionPoints(el1, el2);
        drawLine(pair[0], pair[1], connectorEl);
    }
    function getConnectionPoints(el1, el2) {
        var els = [el1, el2].select(0);
        var rects = els.select(elToRect);
        return rects.select(getRectCenter);
    }

    function drawLine(p1, p2, el) {
        var dx = (p2.x - p1.x) / 2;
        var dy = p2.y - p1.y;

        var c1 = { x: p1.x + dx, y: p1.y };
        var c2 = { x: p1.x + dx, y: p1.y + dy };

        var curve = true;
        var path;
        if (!curve)
            path = "M" + pointToString(p1) + " L" + pointToString(c1) + " L" + pointToString(c2) + " L" + pointToString(p2);
        else
            path = "M" + pointToString(p1) + " C" + pointToString(c1) + " " + pointToString(c2) + " " + pointToString(p2);
        el.attr("d", path);
    }



    function getConnectorId(connector) {
        return connector.from + "-" + connector.to;
    }

    function getNodeById(id) {
        return _options.nodes.whereEq("id", id)[0];
    }

    function getNodeConnectors(node) {
        return _options.connectors.where(function (t) { return t.from == node.id || t.to == node.id });
    }
    function getNodeChildConnectors(node) {
        return _options.connectors.where(function (t) { return t.from == node.id });
    }


    function toggleNode(node) {
        node.isCollapsed = !node.isCollapsed;
        hideNodeDescendants(node, node.isCollapsed);
        renderNode(node);
    }
    function hideNodeDescendants(node, isHidden) {
        var children = getNodeChildren(node);
        children.forEach(function (t) { t.isHidden = isHidden; renderNode(t); });
        getNodeChildConnectors(node).forEach(function (t) { t.isHidden = isHidden; renderConnector(t); });
        children.forEach(function (t) {
            if (!t.isCollapsed)
                hideNodeDescendants(t, isHidden);
        });
    }

    function printTreeNode(node, depth) {
        if (depth == null)
            depth = "";
        console.log(depth, node.id);
        getNodeChildren(node).forEach(function (t) { printTreeNode(t, depth + "----"); });
    }
    function getRootNode() {
        return _options.nodes.where(function (t) { return getNodeParents(t).length == 0; }).orderByDescending(function (t) { return getNodeChildren(t).length; }).first();
    }
    function getNodeParents(node) {
        var ids = _options.connectors.whereEq("to", node.id).select("from");
        var list = _options.nodes.where(function (t) { return ids.contains(t.id); });
        return list;
    }
    function getNodeChildren(node) {
        var ids = _options.connectors.whereEq("from", node.id).select("to");
        var list = _options.nodes.where(function (t) { return ids.contains(t.id); });
        return list;
    }

    function animateNodes() {
        var promises = _options.nodes.select(function (node) {
            var el = getNodeElement(node);
            if (el == null || node.pos == null)
                return null;
            return el.animate({ top: node.pos.y, left: node.pos.x }, { progress: function () { getNodeConnectors(node).forEach(renderConnector); } }).promise();
        }).exceptNulls();
        return sync(promises);
    }

    function sync(deferreds) {
        return $.when.apply(null, deferreds);
    }

    function positionNode(node) {
        var el = getNodeElement(node);
        if (node.pos == null)
            return;
        return el.css({ top: node.pos.y, left: node.pos.x });
    }

    function getNodeDepth(node) {
        var depth = 0;
        var parent = getNodeParents(node)[0];
        while (parent != null) {
            depth++;
            parent = getNodeParents(node)[0];
        }
        return depth;
    }

    function createTreeNode(node) {
        var node2 = { Source: node, Children: getNodeChildren(node).select(createTreeNode) };
        return node2;
    }
    function createTree() {
        var root = getRootNode();
        var root2 = createTreeNode(root);
        return root2;
    }

    function getAllNodesFromTree(tree) {
        var list = [];
        addTreeNodes(tree, list);
        return list;
    }
    function addTreeNodes(node, list) {
        list.push(node);
        node.Children.forEach(function (t) {
            list.push(t);
            addTreeNodes(t, list);
        });
    }

    function flip(p) {
        return { x: p.y, y: p.x };
    }
    function layoutAsTree() {
        var tree = createTree();
        var bounds = new tidytree.TidyTree().layout(tree);

        var scale = { x: 7, y: 12 };
        if (_config_tree_tidy_orientation == "horizontal")
            scale = flip(scale);
        
        var transform = function (pos) {
            if (_config_tree_tidy_orientation == "horizontal") {
                pos = flip(pos);
            }
            pos = point_multiply(pos, scale);
            return pos;
        };

        var size = transform({ x: bounds.Width, y: bounds.Height });

        _el.css({ minWidth: size.x, minHeight: size.y });
        var nodes2 = getAllNodesFromTree(tree);
        var dx = 18;
        var dy = 7;
        nodes2.forEach(function (node2) {
            var node = node2.Source;
            var pos = { x: node2.Position.X, y: node2.Position.Y };
            node.pos = transform(pos);
        });
    }

    function getNodeElementById(id) {
        return _nodeElsById[id];
    }
    function getNodeElement(node) {
        return _nodesMap.get(node);// getNodeElementById(node.id);
    }
    function getConnectorElement(connector) {
        return _connectorsMap.get(connector);
    }


    function rectToPoints(rect) {
        var bottom = rect.top + rect.height;
        var right = rect.left + rect.width;
        return [
            { x: rect.left, y: rect.top },
            { x: right, y: rect.top },
            { x: rect.left, y: bottom },
            { x: right, y: bottom },
        ];
    }
    function getPos(el) {
        return { x: el[0].offsetLeft, y: el[0].offsetTop };
    }
    function comparePoints(p1, p2) {
        return { x: p1.x - p2.x, y: p1.y - p2.y };
    }
    function getDistance(p1, p2) {
        var xs = p2.x - p1.x;
        xs *= xs;
        var ys = p2.y - p1.y;
        ys *= ys;
        return Math.sqrt(xs + ys);
    }
    function pointToString(p) {
        return p.x + "," + p.y;
    }


    function createRect(p1, p2) {
        return { top: p1.y, left: p1.x, width: p2.x - p1.x, height: p2.y - p1.y };
    }

    function pointEquals(p1, p2) {
        var c = comparePoints(p1, p2);
        return c.x == 0 && c.y == 0;
    }

    function elToRect(el) {
        return { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight };
    }
    function getRectCenter(rect) {
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    //returns the center offset from the top left corner of the rectangle
    function getRectCenterOffset(rect) {
        return { x: rect.width / 2, y: rect.height / 2 };
    }


}
//el.mousedown(function (e) {
//    lastPos = { x: e.pageX, y: e.pageY };
//});
//el.click(function (e) {
//    if (e.pageX != lastPos.x || e.pageY != lastPos.y)
//        return;
//    toggleNode(node);
//})
//var points = rects.select(rectToPoints);
//var pairs = points[0].crossJoin(points[1]);
//var distances = pairs.select(function (t) { return getDistance(t[0], t[1]); });
//var minDistance = distances.min();
//var index = distances.indexOf(minDistance);
//var pair = pairs[index];
//return pair;
