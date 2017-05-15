"use strict"

let config = {
    IDs: {
        search_results: "search-results",
        user_search_box: "user-search-box",
        group_search_box: "group-search-box"
    },
    URLs: {
        groups: "/groups",
        session: "/session",
        user: "/user",
        search_groups: "/search-groups",
        search_friends: "/search-friends",
        get_session: "/get-session",
        dashboard: "/",
        verify: "/verify",
        verify_facebook: "/verify-facebook",
        verify_google: "/verify-google",
        create: "/create",
        add_to_group: "/add-to-group",
        delete_from_group: "/delete-from-group",
        join_group: "/join-group",
        leave_group: "/leave-group",
        create_group: "/create-group",
        set_group_privacy: "/set-group-privacy",
        set_group_name: "/set-group-name",
        delete_group: '/delete-group',
        add_friend: "/add-friend",
        add_challenge: "/add-challenge",
        accept_challenge: "/accept-challenge",
        post_comment: "/post-comment",
        default_pic: "https://mantis-media.s3.amazonaws.com/static/mantisx/profile_default.jpg"
    },
    graphics: {
        DARKRED: "#C2272C",
        RED: "#DB061F",
        WHITE: "#FFFFFF",
        DARKGRAY: "#C3C0B9",
        LIGHTGRAY: "rgba(0,0,0,0)",
        trace_point_radius: 1,
        trace_point_radius_focus: 3,
        trace_path_width: 3,
        trace_path_width_focus: 10,
        font_family: 'DINCond-Bold, Roboto, Arial'
    },
    cutoffs: {
        great_shot_score: 95
    }
};

function assert(condition, message) {
    if (!condition) {
        message = message || "Assertion failed!";
        EFFECTS.snackBar(message);
        throw message;
    }
}

let STRING_FORMAT = (function() {
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

let TIMER = (function() {
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

let TEST = (function() {
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
let GRAPHICS = (function() {
    let my = {};

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
            width: options.column_width || 250,
            height: 150,
            scale: 1,
            backgroundColor: 'none',
            textColor: 'black',
            axisColor: '#CACACA',
            columnColor: config.graphics.WHITE
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
            options.thisColumnColor = (svgIndex == 0 ? config.graphics.RED : designOptions.columnColor);
            var col = getColumn(score, options.thisColumnColor, "placeholder", '#282729', session.pk, svgIndex, i+1);
            col = addColumnClickHandler(col, sessions[session.pk], user_pk, user_secret_key, session.pk, options);
            columns_child.appendChild(col);
        })

        columns.appendChild(columns_child);
        svg.appendChild(columns);

        var yaxis = getColumnYAxis(designOptions);
        svg.appendChild(yaxis);

        var x_min = 40 * columnDisplayIndex(0, session_scores.length);
        my.addPanning('.session_score', '.session_score_child', x_min, designOptions.width); //offsetWidth is likely 250
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
            'dominant-baseline': 'central',
            'font-size': 14, 
            'font-family': config.graphics.font_family,
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
            'color': config.graphics.DARKRED,
            'fill': '#fff'
        });
        var tooltip_text = getNode('text', { 
                'id': 'session{0}tooltip-text'.f(session_pk),
                'x': x_tt_begin + tt_width/2, 
                'y': y_tt_begin+15, 
                'fill': config.graphics.DARKRED, 
                'text-anchor': 'middle', 
                'alignment-baseline': 'central', 
                'dominant-baseline': 'central',
                'font-size': 14, 
                'font-family': config.graphics.font_family,
                'stroke-width': .1,
        });
        tooltip_text.textContent = 'fake';

        tooltip_g.appendChild(tooltip_border);
        tooltip_g.appendChild(tooltip_border_arrow);
        tooltip_g.appendChild(tooltip_text);
        // tooltip_g is never added due to issues rendering outside the SVG. possible fix later
        label.textContent = trueIndex;
        addLabelEventHandler(label, label_border, date, session_pk);
        col_g.appendChild(col);
        col_g.appendChild(label);
        col_g.appendChild(label_border);
        return col_g;
    }

    function addLabelEventHandler(label, label_border, text, session_pk) {
        function hoverHandler() {
            return function() {
                console.log("hover event recorded");
                label_border.setAttribute('stroke', config.graphics.DARKRED);
            }
        }
        function exitHandler() {
            return function() {
                label_border.setAttribute('stroke', 'none');
            }
        }
        function clickHandler() {
            return function() {
                console.log("click event recorded");
                location.href = config.URLs.session + "/" + session_pk;
            }
        }
        label_border.addEventListener("mouseover", hoverHandler());
        label_border.addEventListener("mouseout", exitHandler());
        label_border.addEventListener("click", clickHandler());
        label.addEventListener("click", clickHandler());
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
                'dominant-baseline': 'hanging',
                'font-size': 10, 
                'font-family': config.graphics.font_family,
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
            my.highlightColumn(session, options.thisColumnColor, config.graphics.RED);
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
     * @param {string} highlightColor - default config.graphics.RED
     */
    my.highlightColumn = function(session, defaultColor, highlightColor) {
        defaultColor = defaultColor || config.graphics.WHITE;
        highlightColor = highlightColor || config.graphics.RED;
        // Highlight column
        var cols = document.getElementsByClassName('chart-column');
        for(let col of cols) {
            col.style.fill = defaultColor;
        }
        document.getElementById('session{0}col'.f(session.pk)).style.fill = highlightColor;
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
    }

    /**
     * Draws a line graph in the given SVG div. ViewBox 200x100.
     * @function drawLineGraph
     * @memberof GRAPHICS
     * @param {object[]} shots
     * @param {object[]} options
     */
    my.drawLineGraph = function(shots, options) {
        let backgroundColor = options.backgroundColor || config.graphics.LIGHTGRAY;
        let strokeColor = options.strokeColor || '#494846';
        let pointColor = options.pointColor || '#ffcb05';
        let average_score = (shots.length > 0 ? shots.reduce((a, b) => a+parseFloat(b.score), 0)/shots.length : 85);
        // let average_score = shots.reduce(function(a, b) {
        //     return a+parseFloat(b.score);
        // }, 0)/shots.length;

        $('#'+options.line_id).show().children().remove();
        let svg = document.getElementById(options.line_id);
        if(svg) {
            let x_min = 30*lineDisplayIndex(0, shots.length);
            let zoom = shouldZoomIn(shots);

            let graphArea = getNode('g', { class: 'graph'});
            let graphArea_child = getNode('g', { class: 'graph_g' });
            let background = getBackground(backgroundColor);
            let rects = getShotRectangles(shots, options.trace_id, backgroundColor); // highlight on focus
            let dashed_average = getDashedAverage(average_score, strokeColor, 35+x_min, zoom);
            let lines = getLines(shots, '#ffffff', pointColor, zoom);
            let yAxis = getLineYAxis(strokeColor);
            let yAxisScores = getYAxisScores(shots, backgroundColor, strokeColor, zoom);

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
    function getDashedAverage(average, strokeColor, x_min, zoom) {
        let y = yFromScore(zoom ? stretchScore(average) : average);
        return getNode('line', { 'stroke-dasharray': '3,3', x1: x_min, y1: y, x2: 190, y2: y, stroke: strokeColor, 'pointer-events': 'none' });
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
    function getYAxisScores(shots, backgroundColor, strokeColor, zoom) {
        var scores = getNode('g', { 'class': 'scores' });
        var background = getNode('rect', { x: 0, y: 0, width: 25, height: '100%', fill: backgroundColor });
        scores.appendChild(background);
        let begin = zoom ? 70 : 0;
        let inc = zoom ? 10 : 20;
        for(let i = begin; i <= 100; i += inc) {
            let text = getNode('text', {
                x: 20,
                y: yFromScore(zoom ? stretchScore(i) : i),
                'text-anchor': 'end', 
                'alignment-baseline': 'middle',
                'dominant-baseline': 'middle', // support Firefox
                'font-size': 8,
                'font-weight': 'bold',
                'font-family': config.graphics.font_family,
                'fill': '#ffffff'
            });
            text.textContent = i;
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
    function getLines(shots, strokeColor, pointColor, zoom) {
        // Display index [0, 1, 2, 3, 4] with [...-3, -2, -1] hidden to the left
        var lines = getNode('g', { class: 'lines' });
        for(var i = 0; i < shots.length; i++) {
            var svgIndex = i - Math.max(0, shots.length-6);
            let shot1y = yFromScore(zoom ? stretchScore(shots[i].score) : shots[i].score);
            if(i != shots.length-1) {
                let shot2y = yFromScore(zoom ? stretchScore(shots[i+1].score) : shots[i+1].score);
                lines.appendChild(getNode('line', { x1: 10+30*(svgIndex+1), y1: shot1y, x2: 10+30*(svgIndex+2), y2: shot2y, stroke: strokeColor, 'pointer-events': 'none' }));
            }
            lines.appendChild(getNode('circle', { cx: 10+30*(svgIndex+1), cy: shot1y, r: 2.5, stroke: strokeColor, 'stroke-width': .5, fill: pointColor, 'pointer-events': 'none' }));
        }
        return lines;
    }

    /**
     * Converts a score in the range [0, 100] to a y-value for the line graph in the range [5, 95]. A score of 100 returns 5,
     * since SVGs are calculated from the top left.
     */
    function yFromScore(score) {
        return 5+(9/10)*(100 - score);
    }

    /**
     * Converts a score in the range [70, 100] into a score in the range [0, 100]. Used before calling yToScore on a zoomed-in
     * range.
     */
    function stretchScore(score) {
        return (10/3)*(score-70);
    }

    /**
     * Returns true if the lowest score is greater than 70
     */
    function shouldZoomIn(shots) {
        if(shots.length == 0) {
          return true;
        }
        return shots.filter(a => (parseFloat(a.score) <= 70)).length == 0;
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
        let backgroundColor = options.backgroundColor || '#1b1b19';
        let innerCircleColor = options.innerCircleColor || backgroundColor;
        let targetBackgroundColor = options.targetBackgroundColor || config.graphics.LIGHTGRAY;
        let strokeColor = options.strokeColor || config.graphics.WHITE;
        let textColor = options.textColor || '#ffcb05';
        let svg = document.getElementById(options.spider_id);
        // Remove existing spiderchart, if it exists
         $('#'+options.spider_id).show().children().remove();
        if(svg) {
            let great_shot_count = shots.reduce(function(count, shot) {
                return count + (shot.score > config.cutoffs.great_shot_score ? 1 : 0);
            }, 0);
            let linear_gradient = get_linear_gradient();
            let inner_circle = getInnerCircle(strokeColor, innerCircleColor, textColor, score, great_shot_count, options.show_score_label, backgroundColor);
            let octants = draw_spider_octants(options.spider_id, shots, options);

            svg.appendChild(linear_gradient);
            svg.appendChild(getNode('rect', { width: '100%', height: 200, fill: backgroundColor}));
            // svg.appendChild(getNode('circle', { cx: 100, cy: 100, r: 80, stroke: strokeColor, 'stroke-width': 3, fill: targetBackgroundColor }));
            // Transparent inner circle
            svg.appendChild(getNode('circle', { cx: 100, cy: 100, r: 60, stroke: targetBackgroundColor, 'stroke-width': 40, fill: 'none'}));
            svg.appendChild(getNode('circle', { cx: 100, cy: 100, r: 80, stroke: strokeColor, 'stroke-width': 1, fill: 'none'}))
            svg.appendChild(inner_circle);
            svg.appendChild(octants);

            if(shots.length > 0) {
                $('.score-link').attr('href', config.URLs.session+"/"+shots[0].session_pk);
                $('#session-shot-count').text(shots.length);
            }
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
    function getInnerCircle(strokeColor, backgroundColor, textColor, score, great_shot_count, show_score_label=false) {
        let inner_circle = getNode('g', { class: 'inner_circle' });
        let circle = getNode('circle', { cx: 100, cy: 100, r: 40, stroke: strokeColor, 'stroke-width': 1, fill: "#1b1b19" });
        let score_label = getNode('text', { x: 100, y: 85, 'text-anchor': 'middle', 'alignment-baseline': 'central', 'dominant-baseline': 'central', fill: "#ffffff", 'font-size': 8, 'font-family': config.graphics.font_family })
        let text = getNode('text', { x: 100, y: 100, 'text-anchor': 'middle', 'alignment-baseline': 'central', 'dominant-baseline': 'central', fill: textColor, 'font-size': 27, 'font-family': config.graphics.font_family });
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
        score_label.textContent = "SCORE";
        if(score) {
            text.textContent = MANAGER.round(score);
        }
        else {
            text.textContent = '-';
        }
        inner_circle.appendChild(circle);
        if(show_score_label) {
          inner_circle.appendChild(score_label);
          text.setAttribute('y', 105);
        }
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
        
        // Scale to contain all shots
        let max_value = 100;
        sectors.forEach(function(sector) {
            let sector_sum = sector.shots.reduce((sum, shot, i) => {
                if(parseFloat(shot.score) >= config.cutoffs.great_shot_score) {
                    return sum;
                } else {
                    let size = 100 - shot.score;
                    return sum + size;
                }
            }, 0);
            max_value = Math.max(max_value, sector_sum);
        });
        // Draw sectors
        sectors.forEach(function(sector) {
            var fill_pct = 0;
            sector.shots.forEach(function(shot) {
                if(parseFloat(shot.score) < config.cutoffs.great_shot_score) {
                    let increment_pct = (100-parseFloat(shot.score))/max_value;
                    options.spider_id = svg_id;
                    let octant = get_octant(sector.octant, fill_pct, increment_pct, shot, options);
                    octants.appendChild(octant);
                    fill_pct += increment_pct;
                }
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
        path.style.fill = '#ffcb05'; //(pk === 1 ? 'red' : 'url(#grad1)');
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
     * @param {string} spider_id
     * @param {number} shot_pk
     */
    function highlight_octant(spider_id, shot_pk) {
        var chart = document.getElementById(spider_id);
        var arc = chart.getElementById('shot'+shot_pk);
        arc.style.stroke = "#ffffff";
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
        var grayArc = getNode('path', { 'd': describeArc(50, 50, 48, beginAngle, -1*beginAngle), 'stroke': config.graphics.LIGHTGRAY, 'stroke-width': 1, 'fill': 'none' });
        var arc = getNode('path', { 'd': describeArc(50, 50, 48, beginAngle, endAngle), 'stroke': config.graphics.DARKRED, 'stroke-width': 3, 'fill': 'none' });

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
        var grayArc = getNode('path', { 'd': describeArc(cx, cy, radius, intermediateAngleDegrees, endAngleDegrees), 'stroke': config.graphics.LIGHTGRAY, 'stroke-width': 1, 'fill': 'none' });
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
        return getNode('line', { x1: cx-dx, y1: cy+dy, x2: cx+dx, y2: cy-dy, 'stroke': config.graphics.DARKRED, 'stroke-width': .7 });
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
            if(svg) {
              my.resetZoom(div_id);
                var g = getNode('g', { 'id': div_id+'_g' });
                $('#'+div_id)
                    .empty()
                    .css({ 
                        'background-color': 'none',
                        'width': options.trace_width
                    })
                    .show();


                var center = getCenter(shot);
                g.appendChild(getTraceviewBackground(center.scale));
                g.appendChild(getTrace(shot, center, {}));
                svg.appendChild(g);
                my.addZooming(div_id);
            }
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
        function axisLine(x1, y1, x2, y2) {
            return getNode('line', {
                'x1': x1,
                'y1': y1,
                'x2': x2,
                'y2': y2,
                'stroke-width': .5,
                'vector-effect': 'non-scaling-stroke',
                'stroke': '#494846'
            });
        }

        var g = getNode('g', {});
        g.appendChild(axisLine(50, -100, 50, 200));
        g.appendChild(axisLine(-100, 50, 200, 50));
        let begin = 5;
        let inc = 13;
        // for(let i = begin; i <= begin + 10*inc; i += inc) {
        for(let i = 0; i < 10; i++) {
        // for(let i = 105; i > 0; i -= 10) {
            g.appendChild(getNode('circle', { 
                'r': (begin+i*inc)*scale, 
                'cx': 50, 
                'cy': 50, 
                'stroke': config.graphics.WHITE, 
                'stroke-width': 1, 
                'vector-effect': 'non-scaling-stroke', 
                // 'stroke-opacity': .1*(10-i),
                'fill': 'none'
            }));
        }

        return g;
    }

    /**
     * Returns an SVG object of the trace itself, but not any background.
     * This algorithm uses bezier curves. 
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
        if (typeof options.showpoints === 'undefined') { options.showpoints = true; }
        if (typeof options.showtext === 'undefined') { options.showtext = false; }

        let pointa = mapPitchAndYawToPoint(shot, center, 0);
        let point0 = mapPitchAndYawToPoint(shot, center, 0);
        for(var i = 0; i < shot.yaw.length; i++) {
            // Map shot.yaw and shot.pitch from (-.5, .5) to (0, 100)
            let point1 = mapPitchAndYawToPoint(shot, center, i);
            let next_i = Math.min(i+1, shot.yaw.length-1);
            let point2 = mapPitchAndYawToPoint(shot, center, next_i);

            var bezier_scale = (i < 50 ? .5 :
                                i < 65 ? .3 :
                                i < 70 ? .2 :
                                i < 75 ? .1 : .1);

            var d = bezier_curve(pointa, point0, point1, point2, bezier_scale);

            var fillcolor = (typeof options.color !== 'undefined' ? options.color : (i < shot.pull_index ? '#c5f1fe' : (i < shot.shot_index ? '#ffcb05' : '#ffffff')));
            if(options.showpoints) {
                let circle = getNode('circle', { 'class': 'traceview__point', 'cx': point1.x, 'cy': point1.y, 'r': config.graphics.trace_point_radius, 'fill': fillcolor, 'opacity': options.opacity });
                g.appendChild(circle);
            }
            var path = getNode('path', { 'd': d, 'stroke': fillcolor, 'stroke-width': config.graphics.trace_path_width, 'vector-effect': 'non-scaling-stroke', 'fill': 'transparent', 'opacity': options.opacity });
            // path.addEventListener("mouseover", (e) => { e.target.setAttribute('stroke-width', config.graphics.trace_path_width_focus); });
            // path.addEventListener("mouseout", e => { e.target.setAttribute('stroke-width', config.graphics.trace_path_width); });
            if(i != 0) {
                g.appendChild(path);
            }

            pointa = point0;
            point0 = point1;
        }
        if(options.showtext) {
            var text = getNode('text', { 'x': 3, 'y': 10, 'fill': 'white', 'font-size': 7, 'font-weight': 'bold' });
            text.textContent = MANAGER.round(shot.score);
            g.appendChild(text);        
        }

        return g;
    }

    /**
     * Returns a list of points connecting p1 and p2.
     * p0 is the point before p1; p3 is the point after p2.
     */
    function bezier_curve(p0, p1, p2, p3, scale) {
        // var i2 = { x: p1.x + scale*(p1.x-p0.x), y: p1.y + scale*(p1.y-p0.y) };
        // var i3 = { x: p2.x + scale*(p2.x-p3.x), y: p2.y + scale*(p2.y-p3.y) };

        // var d = 'M'+p1.x+','+p1.y+' '+'C'+i2.x+','+i2.y+" "+i3.x+','+i3.y+" "+p2.x+","+p2.y;

        let d = 'M ';

        // Chase's algorithm via StackOverflow
        let a1 = p2.x-p0.x;
        let a2 = (2*p0.x-5*p1.x+4*p2.x-p3.x);
        let a3 = (3*p1.x-p0.x-3*p2.x+p3.x);
        let b1 = (p2.y-p0.y);
        let b2 = (2*p0.y-5*p1.y+4*p2.y-p3.y);
        let b3 = (3*p1.y-p0.y-3*p2.y+p3.y);
        let g = 16;
        let one_over_g = 1/g;
        for (let i = 0; i < g; i++){
            let t  = i * one_over_g;
            let tt = t*t;
            let ttt = tt * t;

            let x = 0.5 * (2*p1.x+ a1*t + a2*tt + a3*ttt);
            let y = 0.5 * (2*p1.y+ b1*t + b2*tt + b3*ttt);
            d += x+' '+y+' ';
        }
        d += p2.x+' '+p2.y+' ';

        return d;
    }

    /**
     * Maps dx, dy (-.5, .5) to x, y (0, 100)
     */
    function mapPitchAndYawToPoint(shot, center, i) {
        var dx = shot.yaw[i] - center.x;
        var dy = shot.pitch[i] - center.y;
        var x = 50 + 100*center.scale*dx;
        var y = 50 - 100*center.scale*dy;
        return {
            x: x,
            y: y
        };
    }

    function getCenter(shot) {
        var yawsum = 0;
        var pitchsum = 0;
        var foo = shot.yaw;

        if(shot.shot_index == 0) {
            shot.pull_index = 60;
            shot.shot_index = 75;
        }

        for(var i = shot.shot_index-20; i < shot.shot_index-10; i++) {
            yawsum += shot.yaw[i];
            pitchsum += shot.pitch[i];

        }
        var x = yawsum/10;
        var y = pitchsum/10;

        // Scale to fit terrible shots
        var xmax = Math.max(Math.max(...shot.yaw.slice(shot.pull_index, shot.shot_index).map(function(num){ return Math.abs(num-x); })), .4);
        var ymax = Math.max(Math.max(...shot.pitch.slice(shot.pull_index, shot.shot_index).map(function(num){ return Math.abs(num-y); })), .4);
        var max = Math.max(xmax, ymax);

        var scale = .5/(max+.1);
        return { scale: scale, x: x, y: y };   
    }



    my.addZooming = function(div_id) {
        // zoomListener is a function which takes a selection as input and returns a bunch of SVG elements
        // let zoomListener = d3.zoom().on("zoom", function() { 
        //   d3.select('#'+div_id+'_g')
        //     .attr("transform", "translate("+d3.event.transform.x+"," + d3.event.transform.y + ")"+" scale(" + d3.event.transform.k + ")");
        // });
        let zoomListener = d3.zoom().on("zoom", (d, i, nodes) => {
            d3.select('#'+div_id+'_g')
                .attr("transform", "translate({0},{1}) scale({2})".f(d3.event.transform.x, d3.event.transform.y, d3.event.transform.k));
            let point_radius = config.graphics.trace_point_radius/d3.event.transform.k;
            d3.selectAll('.traceview__point')
                .attr("r", point_radius);
        });
        d3.select('#'+div_id).call(zoomListener).on('click', function() {
            EFFECTS.snackBar('clicked');
            d3.event.transform.scaleBy(2);
        });
    }

    my.resetZoom = function(div_id) {
      let div = d3.select('#'+div_id).node();
      let t = d3.zoomTransform(div);
      t.k = 1;
      t.x = 0;
      t.y = 0;
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
        
        // d3.select(child_selector).call(
        //     d3.zoom()
        //         .transform("translate(100)")
        // );
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
let MANAGER = (function() {
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

    my.round = function(num) {
        let precision = 10; // one decimal place
        let rounded = Math.round(num * precision) / precision;
        return rounded.toFixed(1); // for pesky 99.0 shots
    };

    return my;
}());

// jQuery hiding, showing
let EFFECTS = (function() {
    var my = {};

    my.populateLeaderboard = function(session, i) {
        if(i == 0) {
            $('.leaderboard__row').not('#lr-prototype').remove();
        }
        let $lr = $('#lr-prototype').clone();
        let date = new Date(session.date);
        let dateOptions = {
            weekday: 'short',
            year: undefined,
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        };

        $lr.find('a').attr('href', config.URLs.session+"/"+session.pk);
        if(session.profile_pic_url) {
            $lr.find('.profile_thumbnail:first').attr('src', session.profile_pic_url);
        }
        $lr.find('.name').text(session.username);
        $lr.find('.name').click(() => {
            location.href = config.URLs.user+"/"+session.username;
        });
        $lr.find('.session-li__text-date').text(date.toLocaleString('en-US', dateOptions));
        $lr.find('.session-li__text-row').text("{0} shots, {1}".f(session.shots.length, session.fire_type_display));

        $lr.find('svg').attr('id', 'spider-target-leaderboard-session-{0}'.f(session.pk));
        $lr.find('svg g').attr('id', 'spider-target-session-{0}_g'.f(session.pk));
        $lr.removeAttr('id').insertAfter('.leaderboard__row:last').hide().removeClass('hide').fadeIn();
    };

    my.addPatchTooltipHover = function() {
      $('.patch__item').hover(function(event) {
          let $item = $(this);
          $item.find('.patch__tooltip').toggle();
        });
    };

    my.snackBar = function(text) {
        let x = document.createElement("div");
        x.id = "snackbar";
        x.innerHTML = text;
        document.body.appendChild(x);
        x.className = "show";
        setTimeout(function() { 
            x.className = x.className.replace("show", "");
            x.remove();
        }, 3000);
    }

    my.redirect = function(data, url) {
        console.log(data);
        if('success' in data) {
            if(url) {
                window.location.href = url;
            } else {
                window.location.reload();
            }
        } else {
            my.snackBar(data['error']);
        }
    }

    let populateSearchTerms = function(container_id, data, item_callback) {
        let matches = data['matches'];
        let term = data['search_term'];
        my.hideSearchResults(container_id);
        console.log("Matches", matches);
        if(term.length > 0) {
            matches.forEach(item_callback);       
        }
    }
    my.populateUserSearchTerms = function(container_id, data) {
        populateSearchTerms(container_id, data, function(match, i) {
            var person_row = $('#'+container_id+' li:eq('+i+')');
            person_row.show();
            person_row.find('.name').text(match.username);
            person_row.find('.session-count').text(match.session_count);
            person_row.find('.shot-count').text(match.shot_count);
            person_row.find('.average-score').text(match.average_score);
            var pic = match.profile_pic_url || config.URLs.default_pic;
            person_row.find('img').attr('src', pic);

            person_row.data('pk', match.pk);
            person_row.find('.tooltip').data('pk', match.pk);
            person_row.find('i').data('pk', match.pk);
        });
    };
    my.populateGroupSearchTerms = function(container_id, data) {
        populateSearchTerms(container_id, data, function(match, i) {
            let group_row = $('#'+container_id+' li:eq('+i+')');
            group_row.show();
            group_row.find('.name').text(match.name);

            group_row.data('pk', match.pk).data('privacy', match.privacy);
            group_row.find('.tooltip').data('pk', match.pk).data('privacy', match.privacy);
            group_row.find('i').data('pk', match.pk).data('privacy', match.privacy);
        });        
    }
    my.hideSearchResults = function(container_id) {
        $('#'+container_id).find('li').hide();
        my.hideChallengeTooltips(container_id);
        my.addChallengeTooltipsOnHover(container_id);
    };
    my.activateSearchBox = function(search_box_id, type) {
        $('#'+search_box_id).keyup(function() {
            var text = $(this).val();
            console.log("searching", text);
            switch(type) {
                case "users":
                    API.searchUsers(config.IDs.search_results);
                    break;
                case "groups":
                    API.searchGroups(config.IDs.search_results);
                    break;
                default:
                    console.log("search type {0}".f(type));
                    throw "SearchTypeError: Incorrect search type";
            }        
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
            case "patches":
                $('#nav__patches').addClass('active');
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
            var friend_pk = $(this).data('pk');
            API.challengeFriend(user.pk, user_secret_key, friend_pk, 60);
        });
    }

    my.showChallengeTooltip = function(container_id, friend_pk) {
        $('#'+container_id).find('.tooltip[data-pk={0}]'.f(friend_pk)).show();
    }

    my.hideChallengeTooltips = function(container_id) {
        $('#'+container_id).find('.tooltip').hide();
    }

    my.addChallengeTooltipsOnHover = function(container_id) {
        $('#'+container_id).find('li').each(function() {
            var friend_pk = $(this).data('pk');
            var tooltip = $(this).find('.tooltip[data-pk={0}]'.f(friend_pk));
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
let API = (function() {
    let my = {};

    let search = function(search_results_id, search_box_id, url, populateCallback) {
        assert(search_results_id !== undefined && search_box_id !== undefined, "Undefined search div");
        let term = $('#'+search_box_id).val();
        $.post({
            url: url,
            data: JSON.stringify({ 'search_term': term}),
            dataType: 'json',
            contentType: 'application/json',
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
        }).done(function(data) {
            console.log(data);
            let currentTerm = $('#'+search_box_id).val();
            if(term === currentTerm) {
                console.log("Populating search results for", term);
                populateCallback(search_results_id, data);
            }
        });
    };

    my.searchUsers = function(container_id, term) {
        search(container_id, config.IDs.user_search_box, config.URLs.search_friends, EFFECTS.populateUserSearchTerms);
    };

    my.searchGroups = function(container_id, term) {
        search(container_id, config.IDs.group_search_box, config.URLs.search_groups, EFFECTS.populateGroupSearchTerms);
    };

    my.postComment = function(user_pk, user_secret_key, session_pk, comment) {
        $.post({
            url: config.URLs.post_comment,
            data: JSON.stringify({
                'user_pk': user_pk,
                'user_secret_key': user_secret_key,
                'session_pk': session_pk,
                'comment': comment
            }),
            dataType: 'json',
            contentType: 'application/json',
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
        }).done(function(data) {
            EFFECTS.redirect(data);
        });
    };

    my.loadSession = function(options, session_pk, user_pk, user_secret_key, callback) {
      $.post({
        url: config.URLs.get_session,
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
    };

    my.attachLoginFormHandler = function(form_id) {
        $('#'+form_id).submit(function(e) {
            let form = $('#'+form_id);
            form.find('input[name="username"]').focus();
            let username = form.find('input[name="username"]').val();
            let password = form.find('input[name="password"]').val();
            let next = form.find('input[name="next"]').val();
            let req = $.post({
                url: config.URLs.verify,
                data: JSON.stringify({'username': username, 'password': password}),
                dataType: 'json',
                contentType: 'application/json',
                headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
            }).done(function(data) {
                if(data.user_pk) {
                    window.location.href = next || config.URLs.dashboard;
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
                url: config.URLs.create,
                data: $('#'+form_id).serialize(),
                headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
            }).done(function(data) {
                if(data.user_pk) {
                    window.location.href = $('#'+form_id).find('input[name="next"]').val() || config.URLs.dashboard;
                }
                else {
                    window.location.reload();
                }
            });
            e.preventDefault();        
        })
    }


    /**
     * Call with admin=False to add a user or demote an admin.
     * Call with admin=True to make an existing user an admin.
     */
    my.addUserToGroup = function(user_pk, user_secret_key, group_pk, admin, user_to_add_pk) {
        $.post({
            url: config.URLs.add_to_group,
            data: JSON.stringify({ 'user_pk': user_pk, 'user_secret_key': user_secret_key, 'group_pk': group_pk, 'admin': admin, 'user_to_add_pk': user_to_add_pk }),
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
        }).done(data => {
            EFFECTS.redirect(data);
        });
    };
    my.deleteUserFromGroup = function(user_pk, user_secret_key, group_pk, user_to_delete_pk) {
        $.post({
            url: config.URLs.delete_from_group,
            data: JSON.stringify({ 'user_pk': user_pk, 'user_secret_key': user_secret_key, 'group_pk': group_pk, 'user_to_delete_pk': user_to_delete_pk }),
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
        }).done(data => { 
            if(user_pk == user_to_delete_pk) {
                EFFECTS.redirect(data, config.URLs.groups);
            }
            else {
                EFFECTS.redirect(data); 
            }
        });
    };
    my.joinGroup = function(user_pk, user_secret_key, group_pk) {
        $.post({
            url: config.URLs.join_group,
            data: JSON.stringify({ 'user_pk': user_pk, 'user_secret_key': user_secret_key, 'group_pk': group_pk }),
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
        }).done(function(data) {
            if('success' in data) {
                if(data['success'] == 'pending') {
                    EFFECTS.snackBar("Request for closed group is pending...");
                }
            }
            console.log(data);
            window.location.reload();
        });
    };
    my.leaveGroup = function(user_pk, user_secret_key, group_pk) {
        $.post({
            url: config.URLs.leave_group,
            data: JSON.stringify({ 'user_pk': user_pk, 'user_secret_key': user_secret_key, 'group_pk': group_pk }),
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
        }).done(data => {
            EFFECTS.redirect(data);
        });
    };
    my.createGroup = function(user_pk, user_secret_key, group_name, privacy) {
        $.post({
            url: config.URLs.create_group,
            data: JSON.stringify({ 'user_pk': user_pk, 'user_secret_key': user_secret_key, 'name': group_name, 'privacy': privacy }),
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
        }).done(data => {
            EFFECTS.redirect(data);
        });
    };
    my.setGroupPrivacy = function(user_pk, user_secret_key, group_pk, privacy) {
        $.post({
            url: config.URLs.set_group_privacy,
            data: JSON.stringify({ 'user_pk': user_pk, 'user_secret_key': user_secret_key, 'group_pk': group_pk, 'privacy': privacy }),
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
        }).done(data => {
            console.log(data);
            if('error' in data) {
                EFFECTS.snackBar(data['error'])
            }
        });
    };
    my.setGroupName = function(user_pk, user_secret_key, group_pk, name) {
        $.post({
            url: config.URLs.set_group_name,
            data: JSON.stringify({ 'user_pk': user_pk, 'user_secret_key': user_secret_key, 'group_pk': group_pk, 'name': name }),
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
        }).done(data => {
            console.log(data);
            if('error' in data) {
                EFFECTS.snackBar(data['error'])
            }
        });
    };
    my.deleteGroup = function(user_pk, user_secret_key, group_pk) {
        $.post({
            url: config.URLs.delete_group,
            data: JSON.stringify({ 'user_pk': user_pk, 'user_secret_key': user_secret_key, 'group_pk': group_pk }),
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
        }).done(data => {
            EFFECTS.redirect(data, config.URLs.groups);
        });
    }
    my.addFriend = function(user_pk, user_secret_key, friend_pk) {
        $.post({
            url: config.URLs.add_friend,
            data: JSON.stringify({'user_pk': user_pk, 'user_secret_key': user_secret_key, 'friend_pk': friend_pk}),
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
        }).done(data => {
            EFFECTS.redirect(data);
        });
    };
    my.challengeFriend = function(user_pk, user_secret_key, friend_pk, minutes) {
        minutes = minutes | 5;
        $.post({
            url: config.URLs.add_challenge,
            data: JSON.stringify({'user_pk': user_pk, 'user_secret_key': user_secret_key, 'friend_pk': friend_pk, 'minutes': minutes, 'accepted': false}),
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
        }).done(function(data) {
            console.log(data);
            // window.location.reload();
            $('.icon-bullets[data-pk='+friend_pk+']').css('background', 'green');            
        });
    };
    my.acceptChallenge = function(challenge_pk) {
        $.post({
            url: config.URLs.accept_challenge,
            data: JSON.stringify({'challenge_pk': challenge_pk}),
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
        }).done(data => {
            EFFECTS.redirect(data);
        });
    };

    //Called by statusChangeCallback() after FB Login button pressed. Verifies that account exists, then redirects to Graphs page.
    my.login_fb_user = function(accessToken) {
        FB.api('/me?fields=id,email', function(response) {
          $.post({
            url: config.URLs.verify_facebook,
            data: { 'facebook_id_token': accessToken },
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
          }).done(function(data) {
            console.log(data);
            if(data.user_pk) {
                window.location.href = config.URLs.dashboard;
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
            url: config.URLs.create,
            data: { 'username': response.email, 'facebook_id_token': accessToken },
            headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
          }).done(function(data) {
            if(data.user_pk) {
                window.location.href = config.URLs.dashboard;
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
let SOCIAL_AUTH = (function() {
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