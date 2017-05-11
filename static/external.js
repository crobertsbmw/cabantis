"use strict"

var STRING_FORMAT = (function() {
    // Adds Python-like string formatting.
    // Fx "My name is {0} {1}.".f("Jared", "Nielsen") -> "My name is Jared Nielsen."
    String.prototype.format = String.prototype.f = function() {
        var s = this,
            i = arguments.length;

        while (i--) {
            s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
        }
        return s;
    };
}());

var TIMER = (function() {
    // Times a function and logs the result in seconds to the console
    return {
        timeIt: function(name, func) {
            let start = new Date().getTime() / 1000;
            let result = func();
            let end = new Date().getTime() / 1000;
            let runtime = (end-start).toFixed(5);
            console.log("{0} executed in {1} seconds".f(name, runtime));
            return result;
        }
    };
}());

var TEST = (function() {
    // Use for testing promises functionality (could be useful in dynamic session loading)
    return {
        promises: function() {
            let p = new Promise((resolve, reject) => {
                // We call resolve() when the async action succeeds, or reject() when it fails.
                setTimeout(function() {
                    resolve('success');
                    //reject('error');
                }, 500);
            });

            p.then((successMessage) => {
                // successMessage is what we passed to resolve() in the method above.
                console.log('Yay! ' + successMessage);
            }, (error) => {
                console.log('Boo. ' + error);
            });
        },
        eventFire: function(el, etype) {
            if (el.fireEvent) {
                el.fireEvent('on' + etype);
            } else {
                var evObj = document.createEvent('Events');
                evObj.initEvent(etype, true, false);
                el.dispatchEvent(evObj);
            }
        }
    };
}());

/**
 * Contains all SVG drawing functions.
 * @constructor
 */
var GRAPHICS = (function() {
    var my = {};
    var DARKRED = "#C2272C";
    var RED = "#ffcb05";
    var DARKGRAY = "#fff";
    var LIGHTGRAY = "#CCCCCC";

    /**
     * Returns an SVG element.
     * @function getNode
     * @memberof GRAPHICS
     * @inner
     * @param {string} n - element type
     * @param {object} v - element attributes
     * @returns {object} SVG element
     */
    function getNode(n, v) {
      n = document.createElementNS("http://www.w3.org/2000/svg", n);
      for (let p in v)
        n.setAttributeNS(null, p, v[p]);
      return n;
    }

    /**
     * Calculates a spiderchart sector percentage from a shot score.
     * @function transform
     * @memberof GRAPHICS
     * @param {number} score
     * @returns {decimal}
     */
    my.transform = function(score) {
        return (100-score) * .005;
    }
    /**
     * Draws a session column chart in the given SVG block.
     * The div should have a ViewBox 250x150.
     * The 'pivot' is the session id, fx (rect id='session32col')
     * @function drawSessionsColumn
     * @memberof GRAPHICS
     * @param {object[]} sessions - list of (pk, score) tuples
     * @param {object} options
     * @param {string} options.column_id
     * @param {string} options.spider_id
     * @param {number} options.spider_width
     * @param {string} options.line_id
     * @param {number} options.line_width
     * @param {string} options.trace_id
     * @param {number} options.trace_width
     * @param {string} options.url - Optional link on spiderchart click.
     */
    my.drawSessionsColumn = function(session_scores, sessions, user_pk, user_secret_key, options) {
        var designOptions = {
            width: 250,
            height: 150,
            scale: 1,
            backgroundColor: 'none',
            textColor: 'black',
            axisColor: '#CACACA',
            columnColor: DARKGRAY
        };
        var svg = document.getElementById(options.column_id);
        //svg.style['overflow'] = 'visible'; // display tooltips
        var background = getNode('rect', { 'x': 0, 'y': 0, 'width': designOptions.width*designOptions.scale, 'height': designOptions.height*designOptions.scale, 'fill': designOptions.backgroundColor});
        svg.appendChild(background);

        // Draw columns
        var columns = getNode('g', { 
            'class': 'session_score',
        });
        var columns_child = getNode('g', { 'class': 'session_score_child' });
        columns_child.appendChild(getNode('rect', { 'x': 0, 'y': 0, 'width': designOptions.width, 'height': designOptions.height, 'fill': 'white' }));
        session_scores.forEach(function(session, i, arr) {
            var svgIndex = columnDisplayIndex(i, arr.length);
            var score = Math.round(parseInt(session.average_score));
            options.thisColumnColor = (svgIndex == 0 ? RED : designOptions.columnColor);
            var date = "TODO";//MANAGER.prettyDate(session.date);
            var col = getColumn(score, options.thisColumnColor, date, '#282729', session.pk, svgIndex, i+1);
            col = addColumnClickHandler(col, sessions[session.pk], user_pk, user_secret_key, session.pk, options);
            columns_child.appendChild(col);
        })

        columns.appendChild(columns_child);
        svg.appendChild(columns);

        var yaxis = getColumnYAxis(designOptions);
        svg.appendChild(yaxis);

        var x_min = 40 * columnDisplayIndex(0, session_scores.length);
        my.addPanning('.session_score', '.session_score_child', x_min, 250);
    }

    /**
     * Returns an SVG <g> element containing the colored column and its index,
     * so they scroll smoothly together.
     * @function getColumn
     * @memberof GRAPHICS
     * @inner
     * @param {number} score
     * @param {string} colColor
     * @param {string} textColor
     * @param {number} session_pk
     * @param {number} svgIndex - fx [-3,-2,...,4], columnDisplayIndex(trueIndex)
     * @param {number} trueIndex - [0,1,...,7]
     * @returns {object} col
     */
    function getColumn(score, colColor, date, textColor, session_pk, svgIndex, trueIndex) {
        var x_begin = 60+40*svgIndex;
        var width = 30;
        var x_mid = x_begin + width/2;
        var y_tt_begin = 150;

        var col_g = getNode('g', {});
        var col = getNode('rect', {
            'x': x_begin,
            'y': 105-score,
            'width': 30,
            'height': score,
            'fill': colColor,
            'id': 'session'+session_pk+'col',
            'class': 'chart-column'
        });
        var label = getNode('text', { 
            'x': x_mid,
            'y': 130, 
            'fill': textColor, 
            'text-anchor': 'middle', 
            'alignment-baseline': 'central', 
            'font-size': 14, 
            'font-family': 'Montserrat', 
            'stroke-width': .1,
        });
        var label_border = getNode('circle', {
            'cx': x_mid,
            'cy': 130,
            'r': 17,
            'fill': 'transparent',
            'stroke-width': 1,
            'cursor': 'pointer'
        });
        var tooltip_g = getNode('g', {
            'id': 'session'+session_pk+'tooltip',
            'class': 'session-tooltip'
        });
        var tooltip_border_arrow = getNode('rect', {
            'x': x_begin+10,
            'y': y_tt_begin-5,
            'width': 10,
            'height': 10,
            //'transform': 'rotate(45deg)',
            'transform-origin': 'center',
            'fill': '#fff',
            'stroke': 'rgba(0, 0, 0, .15)',
            'stroke-dasharray': '10,20,10', // only get top sides
            'box-shadow': '0 0 5px rgba(0, 0, 0, .5)',
        });
        tooltip_border_arrow.style.transform = 'rotate(45deg)';

        var x_tt_begin = x_begin-5;
        var tt_width = 155;
        var tooltip_border = getNode('rect', {
            'x': x_tt_begin,
            'y': y_tt_begin,
            'width': tt_width,
            'height': 30,
            'rx': 15,
            'rx': 15,
            'stroke': 'rgba(0, 0, 0, .15)',
            'stroke-width': '1px',
            'box-shadow': '0 0 5px rgba(0, 0, 0, .5)',
            'color': DARKRED,
            'fill': '#fff'
        });
        var tooltip_text = getNode('text', { 
                'id': 'session{0}tooltip-text'.f(session_pk),
                'x': x_tt_begin + tt_width/2, 
                'y': y_tt_begin+15, 
                'fill': DARKRED, 
                'text-anchor': 'middle', 
                'alignment-baseline': 'central', 
                'font-size': 14, 
                'font-family': 'Montserrat', 
                'stroke-width': .1,
        });
        tooltip_text.textContent = 'fake';

        tooltip_g.appendChild(tooltip_border);
        tooltip_g.appendChild(tooltip_border_arrow);
        tooltip_g.appendChild(tooltip_text);
        label.textContent = trueIndex;
        addLabelHoverHandler(label, label_border, date);
        col_g.appendChild(col);
        col_g.appendChild(label);
        col_g.appendChild(label_border);
        //TODO: Add tooltip
        //col_g.appendChild(tooltip_g);
        return col_g;
    }

    function addLabelHoverHandler(label, label_border, text) {
        function hoverHandler() {
            return function() {
                console.log(text);
                label_border.setAttribute('stroke', DARKRED);
            }
        }
        function exitHandler() {
            return function() {
                label_border.setAttribute('stroke', 'none');
            }
        }
        label_border.addEventListener("mouseover", hoverHandler());
        label_border.addEventListener("mouseout", exitHandler());
        return label;
    }

    /**
     * Maps [0,1,2,3,4]->[0,1,2,3,4] and [0,1,2,3,4,5,6]->[-2,-1,0,1,2,3,4]
     * @function columnDisplayIndex
     * @memberof GRAPHICS
     * @inner
     * @param {number} i - initial array location, 0-indexed
     * @param {number} session_count - number of sessions
     * @returns {number} display index, 0-indexed, stops at 4
     */
    function columnDisplayIndex(i, session_count) {
        return i - Math.max(0, session_count-5);
    }

    // Draw y-axis numbers on top of white background (40x110 to left)
    /**
     * Draw y-axis numbers and vertical line on top of white background in box (0,0)->(40,110).
     * @function getColumnYAxis
     * @memberof GRAPHICS
     * @inner
     * @param {object} designOptions
     * @param {string} designOptions.textColor
     * @param {string} designOptions.axisColor
     * @returns {object} SVG node
     */
    function getColumnYAxis(designOptions) {
        var yaxis = getNode('g', {});
        var yaxis_background = getNode('rect', { 'x': 0, 'y': 0, 'width': 40, 'height': designOptions.height, 'fill': 'white' });
        yaxis.appendChild(yaxis_background);
        for(var i = 0; i < 6; i++) {
            var text = getNode('text', { 
                'x': 20, 
                'y': 20*i, 
                'stroke': designOptions.textColor, 
                'text-anchor': 'end', 
                'alignment-baseline': 'hanging', 
                'font-size': 10, 
                'font-family': 'Montserrat', 
                'stroke-width': .7,
            });
            text.textContent = 100 - 20*i;
            yaxis.appendChild(text);
        }
        // Draw y-axis
        var vertical_line = getNode('line', { 'x1': 40, 'y1': 5, 'x2': 40, 'y2': 105, 'stroke': designOptions.axisColor });
        yaxis.appendChild(vertical_line);
        return yaxis;
    }

    /**
     * When the column is clicked, it will either link to a new page or draw a spider target, 
     * depending on whether options.url or options.spider_id is set. 
     * If both are set, the link takes priority. If neither are set, nothing happens.
     * @function addColumnClickHandler
     * @memberof GRAPHICS
     * @inner
     * @param {object} col - SVG node
     * @param {object} session
     * @param {object} options
     * @param {string} options.url Link to redirect to.
     * @param {string} options.spider_id Div to redraw.
     * @returns {object} col - SVG node
     */
    function addColumnClickHandler(col, session, user_pk, user_secret_key, session_pk, options) {
    	function onSessionReceivedHandler(session) {
	        if(options.url) { options.url = MANAGER.getSessionLink(session.pk); }
            my.drawSpiderTarget(session.shots, session.average_score, options);
            my.highlightColumn(session, options.thisColumnColor, RED);
            $('#session-shot-count').text(session.shots.length);
            my.drawLineGraph(session.shots, options);
    	}
        // Closures and anonymous functions
        function clickHandler() {
            return function() {
                if(session) {
                	onSessionReceivedHandler(session);
                } else {
                	API.loadSession(options, session_pk, user_pk, user_secret_key, onSessionReceivedHandler);
                }
            }
        }
        col.addEventListener("click", clickHandler());
        return col;
    }

    /** 
     * On the column chart, return all columns to their default color and highlight the selected one.
     * Hides all tooltips except the highlighted column's tooltip.
     * @function highlightColumn
     * @memberof GRAPHICS
     * @param {object} session
     * @param {string} defaultColor - default DARKGRAY
     * @param {string} highlightColor - default RED
     */
    my.highlightColumn = function(session, defaultColor, highlightColor) {
        defaultColor = defaultColor || DARKGRAY;
        highlightColor = highlightColor || RED;
        // Highlight column
        var cols = document.getElementsByClassName('chart-column');
        for(let col of cols) {
            col.style.fill = defaultColor;
        }
        document.getElementById('session{0}col'.f(session.pk)).style.fill = highlightColor;
        // Display tooltip TODO
        // EFFECTS.hideSessionTooltips();
        // my.writeTooltip(session);
        // document.getElementById('session{0}tooltip'.f(session.pk)).style.display = 'inline';
        // my.writeTooltip(session);
    };

    /**
     * Populates and displays the tooltip with id 'session32index', where 32 is the session pk.
     * @function writeTooltip
     * @memberof GRAPHICS
     * @param {object} session
     */
    my.writeTooltip = function(session) {
        var date = MANAGER.prettyDate(session.date);

        var tooltip = document.getElementById('session{0}tooltip-text'.f(session.pk));
        tooltip.textContent = date;
        tooltip.style.display = 'inline';
        // tooltip.
        // var tooltip = $('#session{0}index'.f(session.pk)).siblings('.tooltip');
        // tooltip.show();
        // tooltip.children('.triangle-with-shadow.top').text(date);
        // tooltip.parents('a').attr('href', MANAGER.getSessionLink(session.pk));
    }

    /**
     * Draws a line graph in the given SVG div. ViewBox 200x100.
     * @function drawLineGraph
     * @memberof GRAPHICS
     * @param {object[]} shots
     * @param {object[]} options
     */
    my.drawLineGraph = function(shots, options) {
        var backgroundColor = options.backgroundColor || 'none';
        var strokeColor = options.strokeColor || '#494846';
        var pointColor = options.pointColor || RED;
        var average_score = shots.reduce((a, b) => a+parseFloat(b.score), 0)/shots.length;
        // var average_score = shots.reduce(function(a, b) {
        //     return a+parseFloat(b.score);
        // }, 0)/shots.length;

        $('#'+options.line_id).show().children().remove();
        var svg = document.getElementById(options.line_id);
        if(svg) {
            var x_min = 30*lineDisplayIndex(0, shots.length);

            var graphArea = getNode('g', { class: 'graph'});
            var graphArea_child = getNode('g', { class: 'graph_g' });
            var background = getBackground(backgroundColor);
            var rects = getShotRectangles(shots, options.trace_id, backgroundColor); // highlight on focus
            var dashed_average = getDashedAverage(average_score, strokeColor, 35+x_min);
            var lines = getLines(shots, '#fff', pointColor);
            var yAxis = getLineYAxis(strokeColor);
            var yAxisScores = getYAxisScores(shots, backgroundColor, strokeColor);

            graphArea_child.appendChild(rects);
            graphArea_child.appendChild(dashed_average);
            graphArea_child.appendChild(lines);
            graphArea.appendChild(graphArea_child);

            svg.appendChild(background);
            svg.appendChild(graphArea);
            svg.appendChild(yAxis);
            svg.appendChild(yAxisScores);

            my.addPanning('.graph', '.graph_g', x_min, 300);
        }
        else {
            console.log("Line chart not drawn to SVG {0}.".f(options.line_id));
        }
    }
    /**
     * Returns an SVG object background that will fill its parent.
     * @function getBackground
     * @memberof GRAPHICS
     * @inner
     * @param {string} backgroundColor
     * @returns {object} background (SVG object)
     */
    function getBackground(backgroundColor) {
        return getNode('rect', { width: '100%', height: '100%', fill: backgroundColor });
    }
    /**
     * Maps [0,1,2,3,4,5]->[0,1,2,3,4,5] and [0,1,2,3,4,5,6,7]->[-2,-1,0,1,2,3,4,5]
     * @function lineDisplayIndex
     * @memberof GRAPHICS
     * @inner
     * @param {number} i - 0-based index
     * @param {number} shot_count - number of shots
     * @returns {number} index with max value 5.
     */
    function lineDisplayIndex(i, shot_count) {
        return i - Math.max(0, shot_count-6);
    }
    /**
     * Draw the background onto the line graph, for detecting all clicks. All rectangles are drawn, but only the last six are visible.
     * @function getShotRectangles
     * @memberof GRAPHICS
     * @inner
     * @param shots {object[]}
     * @param trace_id {string}
     * @param backgroundColor {string}
     * @returns {object} rects (SVG object)
     */
    function getShotRectangles(shots, trace_id, backgroundColor) {
        var rects = getNode('g', {});
        shots.forEach(function(shot, i, arr) {
            var svgIndex = lineDisplayIndex(i, arr.length);
            var rect = getShotRectangle(25+30*(svgIndex), 0, 30, 100, 'transparent', 'rgba(150, 150, 150, .7)', shot, trace_id);
            rects.appendChild(rect); // Prompt to click on shot
        });
        return rects;
    }
    /**
     * Create the background click area for a single shot.
     * @function getShotRectangle
     * @memberof GRAPHICS
     * @inner
     * @param x {number}
     * @param y {number}
     * @param width {number}
     * @param height {number}
     * @param defaultColor {string}
     * @param focusColor {string}
     * @param shot {object}
     * @param trace_id {string}
     * @returns {object} rect (SVG object)
     */
    function getShotRectangle(x, y, width, height, defaultColor, focusColor, shot, trace_id) {
        var shotRect = getNode('rect', { x: x, y: y, width: width, height: height, fill: defaultColor });
        shotRect.addEventListener('mouseover', function() {
            this.style.fill = focusColor;
        });
        shotRect.addEventListener('mouseout', function() {
            return function() {
                this.style.fill = defaultColor;
            };
        }());
        let my_trace_id = trace_id;
        let my_shot = shot;
        shotRect.addEventListener("click", function() {
                var width = $('#'+trace_id).css('width');
                my.drawTraceview(trace_id, shot, {'trace_width': width});
                window.event.cancelBubble = true;
        });
        return shotRect;
    }

    /**
     * Returns a y-axis SVG object.
     * @function getLineYAxis
     * @memberof GRAPHICS
     * @inner
     * @param {string} strokeColor
     * @returns {object} yaxis (SVG object)
     */
    function getLineYAxis(strokeColor) {
        return getNode('line', { x1: 25, y1: 5, x2: 25, y2: 95, stroke: strokeColor, 'stroke-width': .7 });
    }

    /**
     * Returns a dashed line SVG object parallel to the x-axis, the average of all scores.
     * @function getDashedAverage
     * @memberof GRAPHICS
     * @inner
     * @param {number} average - [0,100]
     * @param {string} strokeColor
     * @param {number} x-min - Pixel location of leftmost (possibly hidden) shot rectangle.
     * @returns {object} dashed_average (SVG object)
     */
    function getDashedAverage(average, strokeColor, x_min) {
        return getNode('line', { 'stroke-dasharray': '3,3', x1: x_min, y1: 100-average, x2: 190, y2: 100-average, stroke: strokeColor });
    }

    /**
     * Returns an SVG object with "20-40-60-80-100" listed vertically.
     * @function getYAxisScores
     * @memberof GRAPHICS
     * @inner
     * @param {object[]} shots
     * @param {string} backgroundColor
     * @param {string} strokeColor
     * @returns {object} scores (SVG object)
     */
    function getYAxisScores(shots, backgroundColor, strokeColor) {
        var scores = getNode('g', { 'class': 'scores' });
        var background = getNode('rect', { x: 0, y: 0, width: 25, height: '100%', fill: backgroundColor });
        scores.appendChild(background);
        for(let i = 1; i <= 5; i++) { // numbers 20,40,60,80,100
            let text = getNode('text', { 
                x: 20, 
                y: 105-(20*i), 
                'text-anchor': 'end', 
                'alignment-baseline': 'hanging',
                'font-size': 8,
                'font-weight': 'bold',
                'font-family': 'Montserrat, Roboto, Arial',
                'fill': '#fff'
            });
            text.textContent = 20*i;
            scores.appendChild(text);
        }
        return scores;
    }

    /**
     * Returns a line graph SVG object connecting all the scores.
     * @function getLines
     * @memberof GRAPHICS
     * @inner
     * @param {object[]} shots
     * @param {string} strokeColor
     * @param {string} pointColor
     * @returns {object} lines (SVG object)
     */
    function getLines(shots, strokeColor, pointColor) {
        // Display index [0, 1, 2, 3, 4] with [...-3, -2, -1] hidden to the left
        var lines = getNode('g', { class: 'lines' });
        for(var i = 0; i < shots.length; i++) {
            var svgIndex = i - Math.max(0, shots.length-6);
            if(i != shots.length-1) {
                lines.appendChild(getNode('line', { x1: 10+30*(svgIndex+1), y1: 100-shots[i].score, x2: 10+30*(svgIndex+2), y2: 100-shots[i+1].score, stroke: strokeColor }));
            }
            lines.appendChild(getNode('circle', { cx: 10+30*(svgIndex+1), cy: 100-shots[i].score, r: 2.5, stroke: strokeColor, 'stroke-width': .5, fill: pointColor }));
        }
        return lines;
    }

    /**
     * Draws a spider target in the given div.
     * @function drawSpiderTarget
     * @memberof GRAPHICS
     * @param {string} svg_id
     * @param {object[]} sectors - in session.sectors
     * @param {number} score
     * @param {object[]} options
     */
    my.drawSpiderTarget = function(shots, score, options) {
        let great_shot_score = 95;
        let backgroundColor = options.backgroundColor || 'none';
        let innerCircleColor = options.innerCircleColor || 'none';
        let targetBackgroundColor = options.targetBackgroundColor || 'none';
        let strokeColor = options.strokeColor || DARKGRAY;
        let textColor = options.textColor || '#ffcb05';
        let svg = document.getElementById(options.spider_id);
        // Remove existing spiderchart, if it exists
         $('#'+options.spider_id).show().children().remove();
        if(svg) {
            let great_shot_count = shots.reduce(function(count, shot) {
                return count + (shot.score > great_shot_score ? 1 : 0);
            }, 0);
            let linear_gradient = get_linear_gradient();
            let inner_circle = getInnerCircle(strokeColor, innerCircleColor, textColor, score, great_shot_count);
            let octants = draw_spider_octants(options.spider_id, shots, options);

            svg.appendChild(linear_gradient);
            svg.appendChild(getNode('rect', { width: '100%', height: 200, fill: backgroundColor}));
            // svg.appendChild(getNode('circle', { cx: 100, cy: 100, r: 80, stroke: strokeColor, 'stroke-width': 1, fill: targetBackgroundColor }));
            svg.appendChild(inner_circle);
            svg.appendChild(octants);

            if(options.trace_id) {
                my.drawTraceview(options.trace_id, shots[0], options);
            }
        }
        else {
            console.log("SVG {0} not found.".f(options.spider_id));
        }

    }

    /**
     * Draws a blank spiderchart to the div.
     * @function drawBlankSpider
     * @memberof GRAPHICS
     * @param {object[]} options
     * @param {string} options.spider_id - Div id
     */
    my.drawBlankSpider = function(options) {
        console.log("Blank spider drawn to {0}".f(options.spider_id));
        my.drawSpiderTarget([], undefined, options);
    }

    // Requires Montserrat from Google Fonts API
    /**
     * Draws the center of the spiderchart, with thick gray border, and the score. Requires Montserrat from Google Fonts API.
     * @function getInnerCircle
     * @memberof GRAPHICS
     * @inner
     * @param {string} strokeColor
     * @param {string} backgroundColor
     * @param {string} textColor
     * @param {number} score
     * @returns {object} inner_circle (SVG object)
     */
    function getInnerCircle(strokeColor, backgroundColor, textColor, score, great_shot_count) {
        let inner_circle = getNode('g', { class: 'inner_circle' });
        let circle = getNode('circle', { cx: 100, cy: 100, r: 40, stroke: strokeColor, 'stroke-width': 1, fill: backgroundColor });
        let text = getNode('text', { x: 100, y: 100, 'text-anchor': 'middle', 'alignment-baseline': 'central', fill: textColor, 'font-size': 27, 'font-family': 'Montserrat, Roboto, Arial'});
        let great_shots = getNode('g', { class: 'great_shots' });
        
        let radius = 32;
        let increment = 2*Math.PI/24;
        let begin_angle = 3/2 * Math.PI - (great_shot_count-1)/2*increment;
        for(let i = 0; i < great_shot_count; i++) {
            let cx = 100 + radius*Math.cos(begin_angle + i*increment);
            let cy = 100 - radius*Math.sin(begin_angle + i*increment);
            let great_shot_circle = getNode('circle', {cx: cx, cy: cy, r: 3, fill: textColor });
            great_shots.appendChild(great_shot_circle);
        }

        //var great_shot_circle = getNode('circle', { cx: 100, cy: 100+30, r: 10, fill: 'black' });
        if(score) {
            text.textContent = parseFloat(score).toFixed(1);
        }
        else {
            text.textContent = '-';
        }
        inner_circle.appendChild(circle);
        inner_circle.appendChild(text);
        inner_circle.appendChild(great_shots);
        return inner_circle;
    }

    /**
     * Returns the color defintion for the SVG sectors.
     * @function get_linear_gradient
     * @memberof GRAPHICS
     * @inner
     * @returns {object} linear_gradient (SVG object)
     */
    function get_linear_gradient() {
        var defs = getNode('defs', {});
        var lg = getNode('linearGradient', { id: 'grad1', x1: '0%', y1: '0%', x2: '100%', y2: '0%' });
        var stop1 = getNode('stop', { offset: '0%', style: 'stop-color:rgb(219,6,31);stop-opacity:1' });
        var stop2 = getNode('stop', { offset: '100%', style: 'stop-color:rgb(219,6,31);stop-opacity:1' });
        lg.appendChild(stop1);
        lg.appendChild(stop2);
        defs.appendChild(lg);
        return defs;
    }

    /**
     * Returns the octants SVG object.
     * @function draw_spider_octants
     * @memberof GRAPHICS
     * @inner
     * @param {string} svg_id
     * @param {object[]} session
     * @param {object[]} options
     * @returns {object} octants (SVG object)
     */
    function draw_spider_octants(svg_id, shots, options) {
        let sectors = sectors_from_shots(shots);
        let octants = getNode('g', { class: 'spider-octants' });
        sectors.forEach(function(sector) {
            var fill_pct = 0;
            sector.shots.forEach(function(shot) {
                let increment = my.transform(parseFloat(shot.score));
                increment = Math.min(increment, (1-fill_pct));
                options.spider_id = svg_id;
                let octant = get_octant(sector.octant, fill_pct, increment, shot, options);
                octants.appendChild(octant);
                fill_pct += increment;
            })
        });
        return octants;
    }

    function sectors_from_shots(shots) {
        let sectors = [];
        for(let i = 0; i < 8; i++) {
            sectors[i] = {
                "octant": i,
                "problem": problem_string_from_octant(i),
                "shots": []
            };
        }
        shots.forEach(function(shot) {
            let octant = which_sector(parseFloat(shot.angle));
            sectors[octant]['shots'].push(shot);
        });
        return sectors;
    }

    /**
     * Maps an angle in degrees to an octant [0, 1, ..., 7]. Counterclockwise from east.
     * function which_sector
     * memberof GRAPHICS
     * @inner
     * @param {number} angle
     * @returns {number} octant
     */
    function which_sector(angle) {
        return Math.floor(((angle+22.5) % 360) / 45);
    }

    function problem_string_from_octant(octant) {
        switch(octant) {
            case 0:
                return "Too Much Trigger Finger";
            case 1:
                return "Anticipating Recoil";
            case 2:
                return "Breaking Wrist Up";
            case 3:
                return "Pushing";
            case 4:
                return "Too Little Trigger Finger";
            case 5:
                return "Slapping Trigger";
            case 6:
                return "Breaking Wrist Down";
            case 7:
                return "Tightening Grip";
            default:
                return "Great Shot";
        }
    }

    /**
     * Returns an octant SVG object.
     * @function get_octant
     * @memberof GRAPHICS
     * @inner
     * @param {number} octantnumber - (0,1,2,3,4,5,6,7) wrapping from 0 radians to 2pi radians.
     * @param {number} beginpct - between 0 and 1.
     * @param {number} incpct - between 0 and 1.
     * @param {object} shot
     * @param {object} options
     * @returns {object} path (SVG object)
     */
    function get_octant(octantnumber, beginpct, incpct, shot, options) {
        function point_to_string(point) {
            return point['x'] + " " + point['y'] + " ";
        }

        let radians = octantnumber * Math.PI/4 - Math.PI/8;
        let cx = 100; // Origin
        let cy = 100;
        let rs = 40 + 1 + 1; // Radius of inner circle plus border plus border of sector
        let rl = 80; //Radius of outer circle
        let rb = rs + (rl-rs)*beginpct; // Beginning radius of arc to paint
        let re = rb + (rl-rs)*incpct; //Ending radius of arc to paint
        let p1 = {'x': cx + re*Math.cos(radians), 'y': cy - re*Math.sin(radians)};
        let p2 = {'x': cx + rb*Math.cos(radians), 'y': cy - rb*Math.sin(radians)};
        let p3 = {'x': cx + rb*Math.cos(radians+Math.PI/4), 'y': cy - rb*Math.sin(radians+Math.PI/4)};
        let p4 = {'x': cx + re*Math.cos(radians+Math.PI/4), 'y': cy - re*Math.sin(radians+Math.PI/4)};
        let d = "M " + point_to_string(p1) + "L " + point_to_string(p2) + "A " + rb + " " + rb + " 0 0 0 " + point_to_string(p3) + "L " + point_to_string(p4) + "A " + re + " " + re + " 0 0 1 " + point_to_string(p1) + "Z";

        let path = getNode('path', { 'id': 'shot'+shot.pk, 'd': d, 'stroke': '#494846', 'stroke-width': '.5'})
        path.style.fill = '#ffcb05';
        path.classList.add("sector"+octantnumber);
        // Immediately Invoked Function Expression
        // because closures (functions inside a function) use variable reference, not variable value

        let id = options.spider_id;
        let pk = shot.pk;
        path.addEventListener("mouseover", (function(id, pk) {
            return () => highlight_octant(id, pk);
        }(options.spider_id, shot.pk))); 
        path.addEventListener("mouseout", (function(id, pk) { 
            return () => unhighlight_octant(id, pk);
        }(options.spider_id, shot.pk)));
        path.addEventListener("click", function(options, shot){
            return function() {
                if(options.url) {
                    document.location.href = options.url;
                }
                else if(options.trace_id) {
                    let width = $('#'+options.trace_id).css('width');
                    my.drawTraceview(options.trace_id, shot, {'trace_width': width});
                    window.event.cancelBubble = true;
                }

            };
        }(options, shot));
        return path;
    }

    // /**
    //  * Highlights all the octants in a given sector, replacing their white outlines with black.
    //  * @function highlight_sector
    //  * @memberof GRAPHICS
    //  * @inner
    //  * @param {string} spider_id
    //  * @param {number} sector_number
    //  */
    // function highlight_sector(spider_id, sector_number) {
    //     var chart = document.getElementById(spider_id);
    //     var shots = [].slice.call(chart.getElementsByClassName('sector'+sector_number));
    //     for(var i = 0; i < shots.length; i++) {
    //         console.log('shot id', shots[i].id);
    //         highlight_octant(chart_id, shots[i].id.substring(4));
    //     }
    // }

    // /**
    //  * Unhighlights all the octants in a given sector, replacing their black outlines with white.
    //  * @function unhighlight_sector
    //  * @memberof GRAPHICS
    //  * @inner
    //  * @param {string} spider_id
    //  * @param {number} sector_number
    //  */
    // function unhighlight_sector(spider_id, sector_number) {
    //     var chart = document.getElementById(spider_id);
    //     var shots = [].slice.call(chart.getElementsByClassName('sector'+sector_number));
    //     for(var i = 0; i < shots.length; i++) {
    //         console.log(shots[i].id);
    //         unhighlight_octant(chart_id, shots[i].id.substring(4));
    //     }    
    // }

    /**
     * Highlights a particular octant, replacing its white outline with black.
     * @function highlight_octant
     * @memberof GRAPHICS
     * @inner
     * @param {number} shot_pk
     */
    function highlight_octant(spider_id, shot_pk) {
        var chart = document.getElementById(spider_id);
        var arc = chart.getElementById('shot'+shot_pk);
        arc.style.stroke = "#fff";
        arc.parentElement.appendChild(arc);

        var sector = arc.className.baseVal;
        var octantText = chart.getElementById(sector+'text');
        if(octantText) {
            octantText.style.fill = "red";
        }
    }
    /**
     * Removes highlight from a particular octant, replacing its black outline with white.
     * @function unhighlight_octant
     * @memberof GRAPHICS
     * @inner
     * @param {string} spider_id
     * @param {number} shot_pk
     */
    function unhighlight_octant(spider_id, shot_pk) {
        var chart = document.getElementById(spider_id);
        var arc = chart.getElementById('shot'+shot_pk);
        arc.style.stroke = "#494846";
        arc.parentElement.appendChild(arc);

        var sector = arc.className.baseVal;
        var octantText = chart.getElementById(sector+'text');
        if(octantText) {
            octantText.style.fill = "white";
        }
    }

    /**
     * Draws a gray arc about 300 degrees, then covers it up with a larger red arc based on the percentage. ViewBox 100x100
     * @function draw_solid_progress_circle
     * @memberof GRAPHICS
     * @param {object} options
     * @param {string} options.circle_id
     * @param {number} options.pct
     */
    my.draw_solid_progress_circle = function(options) {
        var circle = getNode('g', { class: 'progress-circle'});
        var bkg = getNode('rect', { x: 0, y: 0, width: 100, height: 100, fill: 'transparent' });
        var beginAngle = -145; // Calculated from north
        var endAngle = beginAngle + (-2 * beginAngle * options.pct );
        var grayArc = getNode('path', { 'd': describeArc(50, 50, 48, beginAngle, -1*beginAngle), 'stroke': LIGHTGRAY, 'stroke-width': 1, 'fill': 'none' });
        var arc = getNode('path', { 'd': describeArc(50, 50, 48, beginAngle, endAngle), 'stroke': DARKRED, 'stroke-width': 1, 'fill': 'none' });

        circle.appendChild(bkg);
        circle.appendChild(grayArc);
        circle.appendChild(arc);
        
        document.getElementById(options.circle_id).appendChild(circle);
    }

    /**
     * Returns an SVG path corresponding to a portion of a circle arc.
     * @function describeArc
     * @memberof GRAPHICS
     * @inner
     * @param {number} x - x-coordinate of circle center
     * @param {number} y - y-coordinate of circle center
     * @param {number} radius - radius of arc
     * @param {number} startAngle - [0, 360]
     * @param {number} endAngle - [0, 360]
     * @returns {object} arc (SVG object)
     */
    function describeArc(x, y, radius, startAngle, endAngle) {
        var start = polarToCartesian(x, y, radius, endAngle);
        var end = polarToCartesian(x, y, radius, startAngle);
        var arcSweep = endAngle - startAngle <= 180 ? "0" : "1";

        var d = [
            "M", start.x, start.y, 
            "A", radius, radius, 0, arcSweep, 0, end.x, end.y
        ].join(" ");

        return d;       
    }

    /**
     * Converts a point in polar coordinates (r, theta) into a point in Cartesian coordinates (x, y).
     * @function polarToCartesian
     * @memberof GRAPHICS
     * @inner
     * @param {number} centerX - x-coordinate of circle center
     * @param {number} centerY - y-coordinate of circle center
     * @param {number} radius - radius of arc
     * @param {number} angleInDegrees - theta of arc, from y-axis spanning counter-clockwise
     * @returns {object} coords - fx {x: 2, y: 3}
     */
    function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
      var angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;

      return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
      };
    }

    /**
     * Draws dashed circle in the given div. ViewBox 100x100
     * @function drawDashedCircle
     * @memberof GRAPHICS
     * @param {string} div_id
     * @param {object} options
     * @param {number} options.pct - How much of the arc to fill with dashes, [0,1]. Default .7
     * @param {number} options.dashCount - How many dashes in a full arc. Default 60
     */

    my.drawDashedCircle = function(div_id, options) {
        if (typeof options.pct === 'undefined') { options.pct = .7; }
        if (typeof options.dashCount === 'undefined') { options.dashCount = 60; }
        options.pct = Math.min(options.pct, 1);
        var cx = 50;
        var cy = 50;
        var radius = 47;
        var svg = document.getElementById(div_id);
        var bkg = getNode('rect', { x: 0, y: 0, width: 100, height: 100, fill: 'transparent' });

        // Calculated in radians from east
        var degreeBreak = 50;
        var beginAngle = (270-degreeBreak/2)*(2*Math.PI/360);
        var endAngle = (-90+degreeBreak/2)*(2*Math.PI/360);
        var intermediateAngle = beginAngle + options.pct*(endAngle-beginAngle);
        for(var theta = intermediateAngle; theta < beginAngle; theta += Math.PI/options.dashCount) {
            var x = cx + radius*Math.cos(theta);
            var y = cy - radius*Math.sin(theta);
            var dash = getDash(x, y, 5, theta);
            svg.appendChild(dash);
        }

        // Convert intermediateAngle and endAngle into degrees from north
        var intermediateAngleDegrees = 90 - (360/(2*Math.PI))*intermediateAngle;
        var endAngleDegrees = 90 - (360/(2*Math.PI))*endAngle;
        var grayArc = getNode('path', { 'd': describeArc(cx, cy, radius, intermediateAngleDegrees, endAngleDegrees), 'stroke': LIGHTGRAY, 'stroke-width': 1, 'fill': 'none' });
        svg.appendChild(grayArc);
    }

    /**
     * Draws dash centered at (cx, cy) with given length and in the direction of theta [0, 2pi) in dark red.
     * @function getDash
     * @memberof GRAPHICS
     * @inner
     * @param {number} cx
     * @param {number} cy
     * @param {number} length
     * @param {number} theta
     * @returns {object} SVG objec
     */
    function getDash(cx, cy, length, theta) {
        var dx = (length/2) * Math.cos(theta);
        var dy = (length/2) * Math.sin(theta);
        return getNode('line', { x1: cx-dx, y1: cy+dy, x2: cx+dx, y2: cy-dy, 'stroke': DARKRED, 'stroke-width': .7 });
    }

    /**
     * Draw the three pie charts in the session module. Requires that the SVGs are named 'pie-chart-1', 'pie-chart-2', and 'pie-chart-3'.
     * @function populateAllSessionsModule
     * @memberof GRAPHICS
     * @inner
     * @param {number} session_count
     * @param {number} shot_count
     * @param {number} average_score
     */
    my.populateAllSessionsModule = function(session_count, shot_count, average_score) {
        var pie1Options = {
            'pct': (session_count/20)
        };
        my.drawDashedCircle('pie-chart-1', pie1Options);
        $('#pie-chart-1-center').text(session_count);

        var pie2Options = {
            'pct': (shot_count/100)
        };
        my.drawDashedCircle('pie-chart-2', pie2Options);
        $('#pie-chart-2-center').text(shot_count);

        var pie3Options = {
            'circle_id': 'pie-chart-3',
            'pct': (average_score/100)
        };
        my.draw_solid_progress_circle(pie3Options);
        $('#pie-chart-3-center').text(average_score.toFixed(1));
    };

    /**
     * Draw the traceview for a shot in the div. The div should be an SVG element.
     * @function drawTraceview
     * @memberof GRAPHICS
     * @param {string} div_id
     * @param {object} shot
     * @param {object} options
     */
    my.drawTraceview = function(div_id, shot, options) {
        if(shot) {
            if (typeof options.trace_width === 'undefined') { options.trace_width = '300px'; }
            var svg = document.getElementById(div_id);
            var g = getNode('g', { 'id': div_id+'_g' });
            $('#'+div_id).empty().css({ width: options.trace_width }).show();

            var center = getCenter(shot);
            g.appendChild(getTraceviewBackground(center.scale));
            g.appendChild(getTrace(shot, center, { 'onlyyellow': false }));
            svg.appendChild(g);
            my.addZooming(div_id);
        }
        else {
            console.log("ERROR: shot is null");
        }
    }

    /**
     * Returns an SVG object of concentric circles with decreasing intensity the larger they get.
     * @function getTraceviewBackground
     * @memberof GRAPHICS
     * @inner
     * @param {object} g
     * @param {number} scale - default is 1
     * @returns {object} - SVG object
     */
    function getTraceviewBackground(scale) {
        var g = getNode('g', {});
        for(var i = Math.round(8/scale)*10; i > 0; i -= 10) {
            g.appendChild(getNode('circle', { 'r': i*scale, 'cx': 50, 'cy': 50, 'stroke': '#fff', 'stroke-width': .5}));
        }
        return g;
    }

    /**
     * Returns an SVG object of the trace itself, but not any background.
     * @function getTrace
     * @memberof GRAPHICS
     * @inner
     * @param {object} shot
     * @param {object} center
     * @param {number} center.x
     * @param {number} center.y
     * @param {number} center.scale
     * @returns {object} trace (SVG object)
     */
    function getTrace(shot, center, options) {
        var g = getNode('g', {});
        if (typeof options.opacity === 'undefined') { options.opacity = 1; }
        if (typeof options.onlyyellow === 'undefined') { options.onlyyellow = false; }
        if (typeof options.showpoints === 'undefined') { options.showpoints = true; }
        if (typeof options.showtext === 'undefined') { options.showtext = true; }
        var pprevx = 50 + 100*center.scale*(shot.yaw[0]-center.x);
        var prevx = 50 + 100*center.scale*(shot.yaw[0]-center.x);
        var pprevy = 50 - 100*center.scale*(shot.pitch[0]-center.y);
        var prevy = 50 - 100*center.scale*(shot.pitch[0]-center.y);
        for(var i = 0; i < shot.yaw.length; i++) {
            // Map shot.yaw and shot.pitch from (-.5, .5) to (0, 100)
            var dx = shot.yaw[i] - center.x;
            var dy = shot.pitch[i] - center.y;
            var x = 50 + 100*center.scale*dx;
            var y = 50 - 100*center.scale*dy;

            var nextx = 50 + 100*center.scale*(shot.yaw[Math.min(i+1, shot.yaw.length-1)] - center.x);
            var nexty = 50 - 100*center.scale*(shot.pitch[Math.min(i+1, shot.pitch.length-1)] - center.y);
            var bezier_scale = (i < 75 ? .5 : .1);

            var p2 = { x: prevx + bezier_scale*(prevx-pprevx), y: prevy + bezier_scale*(prevy-pprevy) };
            var p3 = { x: x + bezier_scale*(x-nextx), y: y + bezier_scale*(y-nexty) };

            var d = 'M'+prevx+','+prevy+' '+'C'+p2.x+','+p2.y+" "+p3.x+','+p3.y+" "+x+","+y;
            if(i == shot.yaw.length-1) {
                d = 'M'+prevx+','+prevy+' '+'L'+x+','+y;
            }
            if(!options.onlyyellow || (50 <= i && i < 75)) {
                var fillcolor = (typeof options.color !== 'undefined' ? options.color : (i < 50 ? '#c5f1fe' : (i < 75 ? '#ffcb05' : '#fff')));
                if(options.showpoints) {
                    let circle = getNode('circle', { 'cx': x, 'cy': y, 'r': 1, 'stroke-width': 1, 'fill': fillcolor, 'opacity': options.opacity });
                    circle.addEventListener("mouseover", (e) => { e.target.setAttribute('r', 3); });
                    circle.addEventListener("mouseout", (e) => { e.target.setAttribute('r', 1); });
                    g.appendChild(circle);
                }
                var path = getNode('path', { 'd': d, 'stroke': fillcolor, 'fill': 'transparent', 'opacity': options.opacity });
                path.addEventListener("mouseover", (e) => { e.target.setAttribute('stroke-width', 1); });
                path.addEventListener("mouseout", e => { e.target.setAttribute('stroke-width', 1); });
                if(i != 0) {
                    g.appendChild(path);
                }
            }
            pprevx = prevx;
            pprevy = prevy;
            prevx = x;
            prevy = y;
        }
        if(options.showtext) {
            // var text = getNode('text', { 'x': 3, 'y': 10, 'fill': 'white', 'font-size': 7, 'font-weight': 'bold' });
            // text.textContent = shot.score;
            // g.appendChild(text);        
        }

        return g;
    }

    function getCenter(shot) {
        var yawsum = 0;
        var pitchsum = 0;
        var foo = shot.yaw;

        for(var i = 45; i < 55; i++) {
            yawsum += shot.yaw[i];
            pitchsum += shot.pitch[i];

        }
        var x = yawsum/10;
         var y = pitchsum/10;

        // Scale to fit terrible shots
        var xmax = Math.max(Math.max(...shot.yaw.slice(50, 75).map(function(num){ return Math.abs(num-x); })), .4);
        var ymax = Math.max(Math.max(...shot.pitch.slice(50, 75).map(function(num){ return Math.abs(num-y); })), .4);
        var max = Math.max(xmax, ymax);

        var scale = .5/(max+.1);
        return { scale: scale, x: x, y: y };   
    }



    my.addZooming = function(div_id) {
        return d3.select('#'+div_id).call(d3.zoom().on("zoom", function() { 
          d3.select('#'+div_id+'_g').attr("transform", "translate("+d3.event.transform.x+"," + d3.event.transform.y + ")"+" scale(" + d3.event.transform.k + ")");
        })).select('#'+div_id+'_g');
    }

    my.addPanning = function(parent_selector, child_selector, x_min=-Infinity, x_max=Infinity) {
        d3.select(parent_selector).call(
            d3.zoom()
                .translateExtent([[x_min,0],[x_max,0]])
                .on('zoom', function() {
                    d3.select(child_selector).attr("transform", "translate(" + d3.event.transform.x+")");
                })
                .on('end', function() {
                    var oElem = event.srcElement;
                    //console.log(oElem);
                    d3.select(oElem).dispatch('click');
                    TEST.eventFire(oElem, 'click');
                })
        )
        .on('wheel.zoom', null)
        .on('dblclick.zoom', null);
    }

    my.svgToPNG = function(div_id) {
        // Select the first svg element
        var svg = document.getElementById(div_id),
            img = new Image(),
            serializer = new XMLSerializer(),
            svgStr = serializer.serializeToString(svg);
        var w = svg.getBoundingClientRect().width, h = svg.getBoundingClientRect().height;

        img.src = 'data:image/svg+xml;base64,'+window.btoa(svgStr);

        // You could also use the actual string without base64 encoding it:
        //img.src = "data:image/svg+xml;utf8," + svgStr;

        var canvas = document.createElement("canvas");
        document.body.appendChild(canvas);
        canvas.width = w;
        canvas.height = h;
        var context = canvas.getContext("2d");
        context.drawImage(img,0,0,w,h);
        // Now save as png or whatever
        var d = canvas.toDataURL("image/png");
        canvas.parentNode.removeChild(canvas);
        return d;
    }

    return my;
}());

// Manipulating data between formats
var MANAGER = (function() {
    var my = {};

    //Helper method which reads cookies. Used in getting Django's csrf_token.
    my.getCookie = function(name) {
        var value = "; " + document.cookie;
        var parts = value.split("; " + name + "=");
        if (parts.length == 2) return parts.pop().split(";").shift();
    };

    my.toTitleCase = function(str) {
        return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    };

    my.filter = function(sessions, filter_function) {
        var filtered_sessions = [];
        sessions.forEach(function(session) {
            if(filter_function(session)) {
                filtered_sessions.push(session);
            }
        })
        return filtered_sessions;
    };

    my.prettyDate = function(uglyDate) {
        var year = uglyDate.substring(0, 4);
        var month = uglyDate.substring(5, 7);
        var day = uglyDate.substring(8, 10);
        var time = uglyDate.substring(11, 16);
        var prettyDate = month + "-" + day + "-" + year + " " + time;
        return prettyDate;
    };

    my.getSessionLink = function(session_pk) {
        return document.location.origin + '/session/' + session_pk;
    };

    // my.groupSpider = function(users) {
    //     // For each student
    //     // Push sessions onto group_session
    //     // Push sectors onto group_session
    //     var group_session = {
    //         'average_score': -1,
    //         'sectors': [],
    //         'shots': []
    //     };
    //     for(var i = 0; i < 8; i++) {
    //         group_session.sectors.push({
    //             'octant': -1,
    //             'problem': 'fake',
    //             'score': 0,
    //             'shots': []
    //         });
    //     }
    //     var scores = [];
    //     users.forEach(function(user) {
    //         let session = user.sessions[user.sessions.length-1];
    //         if(session) {
    //             session.sectors.forEach(function(sector, j) {
    //                 sector.shots.forEach(function(shot) {
    //                     group_session.sectors[j].octant = j;
    //                     group_session.sectors[j].problem = shot.problem;
    //                     group_session.sectors[j].score += GRAPHICS.transform(shot.score);
    //                     group_session.sectors[j].shots.push(shot);
    //                     scores.push(parseFloat(shot.score));
    //                     group_session.shots.push(shot);
    //                 });
    //             });
    //         }
    //     });

    //     group_session.average_score = Math.round(10*scores.reduce((a, b) => a+b, 0)/(scores.length))/10;
    //     return group_session
    // };

    return my;
}());

// jQuery hiding, showing
var EFFECTS = (function() {
    var my = {};

    var default_pic = "https://mantis-media.s3.amazonaws.com/static/mantisx/profile_default.jpg";
    my.populateSearchTerms = function(container_id, data) {
        var matches = data['matches'];
        var term = data['search_term'];
        my.hideSearchResults(container_id);
        console.log("Matches", matches);
        if(term.length > 0) {
            matches.forEach(function(match, i) {
                var person_row = $('#'+container_id+' li:eq('+i+')');
                person_row.show();
                person_row.find('.name').text(match.username);
                person_row.find('.session-count').text(match.session_count);
                person_row.find('.shot-count').text(match.shot_count);
                person_row.find('.average-score').text(match.average_score);
                var pic = match.profile_pic_url || default_pic;
                person_row.find('img').attr('src', pic);

                person_row.data('friendpk', match.pk);
                person_row.find('.tooltip').data('friendpk', match.pk);
                person_row.find('i').data('friendpk', match.pk);
            });        
        }

    };
    my.hideSearchResults = function(container_id) {
        $('#'+container_id).find('li').hide();
    };
    my.activateSearchBox = function(search_box_id) {
        $('#'+search_box_id).keyup(function() {
            var text = $(this).val();
            console.log("searching", text);
            API.search('search-results', text);
        });
    }
    my.setSearchClickCallback = function(search_results_id, callback) {
        $('#'+search_results_id+' i').click(function(event) {
            callback(this);
            event.preventDefault();
        });
    }

    my.setHeaderActiveLink = function(page_name) {
        switch(page_name) {
            case "dashboard":
                $('#nav__dashboard').addClass('active');
                break;
            case "groups":
                $('#nav__groups').addClass('active');
                break;
            case "friends":
                $('#nav__friends').addClass('active');
                break;
            case "challenges":
                $('#nav__challenges').addClass('active');
                break;
        }
    };

    // ID: session + PK + index, fx session32index
    my.setSessionIndices = function(sessions) {
        var count = sessions.length;
        // Iterate backwards to remove <li> inorder
        for(var i = 4; i >= 0; i--) {
            var sessionIndex = (count - 4) + i;
            if(sessionIndex > 0) {
                $('#sessions-svg-xaxis li:eq('+i+') .session-index').attr('id', 'session{0}index'.f(sessions[sessionIndex-1].pk)).text(sessionIndex);
            }
            else {
                $('#sessions-svg-xaxis li:eq('+i+')').remove();
            }
        }
    };

    my.hideSessionTooltips = function() {
        $('.bar-chart-holder .session-tooltip').hide();
    }

    my.activateChallengeButtons = function(user, user_secret_key) {
        $('.icon-bullets').click(function(event) {
            event.preventDefault();
            var friend_pk = $(this).data('friendpk');
            API.challengeFriend(user.pk, user_secret_key, friend_pk, 60);
        });
    }

    my.showChallengeTooltip = function(container_id, friend_pk) {
        $('#'+container_id).find('.tooltip[data-friendpk={0}]'.f(friend_pk)).show();
    }

    my.hideChallengeTooltips = function(container_id) {
        $('#'+container_id).find('.tooltip').hide();
    }

    my.addChallengeTooltipsOnHover = function(container_id) {
        $('#'+container_id).find('li').each(function() {
            var friend_pk = $(this).data('friendpk');
            var tooltip = $(this).find('.tooltip[data-friendpk={0}]'.f(friend_pk));
            $(this).hover(function() {
                my.showChallengeTooltip(container_id, friend_pk);
            }, function() {
                my.hideChallengeTooltips(container_id);
            });
        });
    }

    return my;
}());

// Async requests to the server
var API = (function() {
    let search_friends_url = document.location.origin + '/search-friends/'
    let load_session_url = document.location.origin + '/get-session/'
    let my = {};

    my.search = function(container_id, term) {
        $.post({
            url: search_friends_url,
            data: JSON.stringify({ 'search_term': term}),
            dataType: 'json',
            contentType: 'application/json',
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
        }).done(function(data) {
            let currentTerm = $('#friend-search-box').val();
            if(term === currentTerm) {
                EFFECTS.populateSearchTerms(container_id, data);
                console.log("Populating search results for", term);
            }
        });
    }

    my.loadSession = function(options, session_pk, user_pk, user_secret_key, callback) {
    	$.post({
    		url: load_session_url,
    		data: JSON.stringify({
    			'user_pk': user_pk,
    			'user_secret_key': user_secret_key,
    			'session_pks': [session_pk]
    		}),
    		dataType: 'json',
    		contentType: 'application/json',
    		headers: {'X-CSRFToken': MANAGER.getCookie('csrftoken')}
    	}).done(function(data) {
    		console.log(data);
    		callback(data.sessions[0]);
    	});
    }

    my.attachLoginFormHandler = function(form_id) {
        $('#'+form_id).submit(function(e) {
            let form = $('#'+form_id);
            form.find('input[name="username"]').focus();
            let username = form.find('input[name="username"]').val();
            let password = form.find('input[name="password"]').val();
            let next = form.find('input[name="next"]').val();
            let req = $.post({
                url: verify_url,
                data: JSON.stringify({'username': username, 'password': password}),
                dataType: 'json',
                contentType: 'application/json',
                headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
            }).done(function(data) {
                if(data.user_pk) {
                    window.location.href = next || graphs_url;
                }
                else {
                    window.location.reload();
                }
            });
            e.preventDefault();
        });
    }
    my.attachCreateFormHandler = function(form_id){
        $('#'+form_id).submit(function(e) {
            $.post({
                url: create_url,
                data: $('#'+form_id).serialize(),
                headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
            }).done(function(data) {
                if(data.user_pk) {
                    window.location.href = $('#'+form_id).find('input[name="next"]').val() || graphs_url;
                }
                else {
                    window.location.reload();
                }
            });
            e.preventDefault();        
        })
    }


    my.loadShotGraph = function(session_id, shot_id) {
        var shot = user.sessions[session_id].shots[shot_id];
        drawScatterChart(shot.pitch, shot.yaw, 'scatter_div', title=shot.score);
    }


    my.addUserToGroup = function(user_pk, user_key, group_pk, role, user_to_add_pk) {
        $.post({
            url: '/add-to-group',
            data: JSON.stringify({ 'user_pk': user_pk, 'user_secret_key': user_key, 'group_pk': group_pk, 'role': role, 'user_to_add_pk': user_to_add_pk }),
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
        }).done(function(data) {
            console.log(data);
            window.location.reload();
        });
    }
    my.joinGroup = function(user_pk, user_key, group_pk, role) {
        $.post({
            url: '/join-group',
            data: JSON.stringify({ 'user_pk': user_pk, 'user_secret_key': user_key, 'group_pk': group_pk, 'role': role }),
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
        }).done(function(data) {
            console.log(data);
            window.location.reload();
        });
    }
    my.leaveGroup = function(user_pk, user_key, group_pk) {
        $.post({
            url: '/leave-group',
            data: JSON.stringify({ 'user_pk': user_pk, 'user_secret_key': user_key, 'group_pk': group_pk }),
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
        }).done(function(data) {
            console.log(data);
            window.location.reload();
        });    
    }
    my.createGroup = function(group_name, is_private) {
        $.post({
            url: '/create-group',
            data: JSON.stringify({ 'name': group_name, 'private': is_private }),
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
        }).done(function(data) {
            console.log(data);
            window.location.reload();
        })
    }
    my.addFriend = function(user_pk, user_key, friend_pk) {
        $.post({
            url: '/add-friend',
            data: JSON.stringify({'user_pk': user_pk, 'user_secret_key': user_key, 'friend_pk': friend_pk}),
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
        }).done(function(data) {
            console.log(data);
            window.location.reload();
        });
    }
    my.challengeFriend = function(user_pk, user_key, friend_pk, minutes) {
        minutes = minutes | 5;
        $.post({
            url: '/add-challenge',
            data: JSON.stringify({'user_pk': user_pk, 'user_secret_key': user_key, 'friend_pk': friend_pk, 'minutes': minutes, 'accepted': false}),
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
        }).done(function(data) {
            console.log(data);
            // window.location.reload();
            $('.icon-bullets[data-friendpk='+friend_pk+']').css('background', 'green');            
        });
    }
    my.acceptChallenge = function(challenge_pk) {
        $.post({
            url: '/accept-challenge',
            data: JSON.stringify({'challenge_pk': challenge_pk}),
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
        }).done(function(data) {
            console.log(data);
            window.location.reload();
        })
    }

    /*my.populateDropdown = function(user_pk, user_key, session_pk, container_id) {
        $.post({
            url: "/mantisx/get-session", 
            data: JSON.stringify({"user_pk": user_pk, "user_secret_key": user_key, "session_pks": [session_pk]}), 
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
        }).done(function(data) {
            console.log(data);
            for(var i = 0; i < data.sessions[0].shots.length; i++) {
                shot = data.sessions[0].shots[i];
                // Create the div
                var chart_id = 'session'+session_pk+'shot'+i;
                var shotbox = $('<div class="shotsmall">'+'<span class="score">'+shot.score+'</span>, '+toTitleCase(shot.problem)+'<svg class="shotsmallchart" id="'+chart_id+'" viewBox="0 0 100 100"></svg></div>');
                $('#'+container_id).append(shotbox);
                // Draw chart in div
                console.log(chart_id);

                GRAPHICS.drawTraceview(chart_id, shot, { 'trace_width': '200px' });
            }
        });
    }*/

    //Called by statusChangeCallback() after FB Login button pressed. Verifies that account exists, then redirects to Graphs page.
    my.login_fb_user = function(accessToken) {
        FB.api('/me?fields=id,email', function(response) {
          $.post({
            url: verifyfacebook_url,
            data: { 'facebook_id_token': accessToken },
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
          }).done(function(data) {
            console.log(data);
            if(data.user_pk) {
                window.location.href = graphs_url;
            }
            else {
                my.create_fb_user(response, accessToken);
            }
          });
        });
        my.get_profile_picture(); 
    };

    // Called by login_fb_user() after FB account unregistered. Creates account and logs in.
    my.create_fb_user = function(response, accessToken) {
          $.post({
            url: create_url,
            data: { 'username': response.email, 'facebook_id_token': accessToken },
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
          }).done(function(data) {
            if(data.user_pk) {
                window.location.href = graphs_url;
            }
            else {
                console.log(data.error);
                window.location.reload();
            }
          });
    };

    // Currently not used
    my.logout_fb_user = function() {
        FB.getLoginStatus(function(response) {
            if(response.status === 'connected') {
                FB.logout(function(response) {
                    console.log('logged out of facebook');
                });
            }
            else {
                console.log('not logged into facebook');
            } 
        });
    };

    // Gets the logged-in Facebook user's profile picture
    my.get_profile_picture = function() {
        FB.api('/me/picture', (response) => { console.log(response.data.url); });
    };

    return my;
}());

// Facebook login
var SOCIAL_AUTH = (function() {
    var my = {};

    my.loadFacebook = function() {
        window.fbAsyncInit = function() {
            FB.init({
                // Use MantisX Test App if localhost
                appId: (window.location.href.includes('localhost') ? '1753474508210652' : '1745068419051261'),
                xfbml: true,
                version: 'v2.6'
            });
        };
        (function(d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) {
                return;
            }
            js = d.createElement(s);
            js.id = id;
            js.src = "//connect.facebook.net/en_US/sdk.js";
            fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));
    };

    my.checkLoginState = function() {
        FB.getLoginStatus(function(response) {
            my.statusChangeCallback(response);
        });        
    };

    my.statusChangeCallback = function(response) {
        console.log('statusChangeCallback');
        console.log(response);
        if (response.status === 'connected') {
            var accessToken = response.authResponse.accessToken;
            console.log("Access Token: " + accessToken);
            API.login_fb_user(accessToken);
        } else if (response.status === 'not_authorized') {
            console.log('Please log into this app.');
        } else {
            console.log('Please log into Facebook.');
        }
    };

    return my;
}());