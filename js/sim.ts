var data = undefined;
var div = undefined;
var divop1 = undefined;
var running = 0;
var skipping;
var state = {};
var then;
var memactive;
var divop1, divop2;
var speed;
var seenInstructions;
// Override alert so simulator will stop if an error is hit.
// https://stackoverflow.com/questions/1729501/javascript-overriding-alert
(function (proxied) {
    window.alert = function () {
        running = 0; // Stop the simulator
        console.log('stopping');
        return proxied.apply(this, arguments);
    };
})(window.alert);
// Catch exceptions
window.onerror = function err(errMsg, url, lineNumber) {
    alert(errMsg + ' at ' + url + ' ' + lineNumber);
};
$(document).ready(function () {
    var can = $("#can")[0];
    var ctx = (<HTMLCanvasElement> can).getContext('2d');
    var div = $("#div")[0];
    divop1 = $("#divop1")[0];
    divop2 = $("#divop2")[0];
    div.innerHTML = '---loading---';
    memactive = false;
    // Load data and then start up
    $.getJSON("data.json", function (indata) {
        data = indata;
        div.innerHTML = '';
        // Actions
        $("#mem").click(function (e) {
            mem();
        });
        $("#step").click(function (e) {
            stopAnimate();
            step();
        });
        $("#skip").click(function (e) {
            stopAnimate();
            skip();
        });
        $("#control").click(function (e) {
            if ($("#control").text() == 'Stop') {
                stopAnimate();
            }
            else {
                startAnimate();
            }
        });
        $("#addr").keypress(function (e) {
            if (e.which == 13) {
                step();
            }
        });
        init();
    }).fail(function () { alert('fail'); });
});
function mem() {
    memactive = true;
    var result = [];
    var line = [];
    for (var i = 0; i < 1024 + 64; i += 4) {
        if (i == 64) {
            result.push('');
            i = 1024;
        }
        if (line.length == 0) {
            line.push(fmt4(i) + ': ');
        }
        line.push(fmt4(state['MS'][i]));
        if ((line.length % 8) == 1) {
            result.push(line.join(' '));
            line = [];
        }
    }
    $('#divmem').html(result.join('\n'));
}
function init() {
    count = 0;
    speed = 500; // ms
    skipping = 0;
    stopAnimate();
    seenInstructions = {};
    state = createState();
    resetState(state);
    displayOp(getAddrFromField(), divop1);
    displayState(state);
}
function stopAnimate() {
    running = 0;
    skipping = 0;
    $("#control").text('Run');
}
function startAnimate() {
    $("#control").text('Stop');
    running = 1;
    then = 0;
    animate();
}
// Positioning dst xoff pixels right of src
function posx(src, dst, xoff) {
    $(dst).css("top", $(src).css("top"));
    $(dst).css("left", $(src).css("left"));
    $(dst).css("left", "+=" + xoff);
}
function posy(src, dst, xoff) {
    $(dst).css("top", $(src).css("top"));
    $(dst).css("top", "+=" + xoff);
}
function animate() {
    if (!running) {
        return;
    }
    requestAnimationFrame(animate);
    var now = Date.now();
    var elapsed = now - then;
    if (elapsed < speed) {
        return;
    }
    // Do the frame(s)
    then = now;
    var count = skipping ? 100 : 1;
    for (var i = 0; i < count && running; i++) {
        step();
        if (skipping) {
            var breakpoint_s = $("#breakpoint").val();
            if (typeof breakpoint_s === "string") {
              var breakpoint = parseInt(breakpoint_s, 10);
              if ((breakpoint && state['ROAR'] == breakpoint) ||
                  (!breakpoint && !(state['ROAR'] in seenInstructions))) {
                  skipping = 0;
                  speed = 500;
                  stopAnimate();
                  return;
              }
            }
        }
    }
}
// Return the addr in the addr UI field as a string. Also reformats field.
function getAddrFromField() {
    const addr = $("#addr").val();
    if (typeof addr === "string") {
        var iaddr = parseInt(addr, 16);
        var saddr = fmtAddress(iaddr);
        $("#addr").val(saddr);
        return saddr;
    } else {
      return "";
    }
}
// Gets a halfword from memory
function getHW(state, addr) {
    if (addr & 1) {
        alert('getHW: alignment');
    }
    else if (addr & 2) {
        return state['MS'][addr & ~0x3] & 0xffff;
    }
    else {
        return state['MS'][addr] >>> 16;
    }
}
// Perform a single microinstruction step
function step() {
    var saddr = getAddrFromField();
    var iaddr = parseInt(saddr, 16);
    state['ROAR'] = iaddr;
    count += 1;
    $("#count").text(count);
    seenInstructions[iaddr] = 1;
    displayOp(saddr, divop2);
    var msg1 = cycle(state, data[saddr]);
    var msg2 = doio(state, data[saddr]);
    // Update address
    saddr = fmtAddress(state['ROAR']);
    $("#addr").val(saddr);
    displayOp(saddr, divop1);
    displayState(state);
    $("#divmsg").html(msg1 || msg2 || '');
    if ([0x148, 0x149, 0x14a, 0x14c, 0x14e, 0x184, 0x185, 0x187, 0x188, 0x189, 0x19b].includes(state['ROAR'])) {
        // Lots of entries to instruction decoding.
        var iar = state['IAR'];
        $("#divinstr").html(disasm([getHW(state, iar), getHW(state, iar + 2), getHW(state, iar + 4)]));
        $;
    }
    if (memactive) {
        mem();
    }
}
// Run at high speed until a new instruction is encountered
function skip() {
    speed = 0;
    skipping = 1;
    startAnimate();
}
// Display micro-operation with given address; put into div
function displayOp(saddr, div) {
    var result = decode(saddr, data[saddr]);
    result.pop();
    div.innerHTML = result.join('\n');
    if (div == divop2) {
        console.log(div.innerHTML);
    }
}
function resetState(state) {
    // Initialize to state after memory reset loop for IPL, entering 0243
    state['S'] = [0, 0, 0, 1, 0, 0, 0, 0]; // For IPL
    state['MD'] = 3; // For IPL
    state['H'] = 0;
    state['ROAR'] = parseInt(getAddrFromField(), 16);
    state['SAR'] = 0x10000004; // Fake bump addr, used by 243
}
// Fmt d as PSW
function fmtPsw(d) {
    var psw0 = d[0];
    var psw1 = d[1];
    var smask = (psw0 >>> 24) & 0xff;
    var key = (psw0 >>> 20) & 0xf;
    var amwp = (psw0 >>> 16) & 0xf;
    var ilc = (psw1 >>> 30) & 0x3;
    var cc = (psw1 >>> 28) & 0x3;
    var pmask = (psw1 >>> 24) & 0xf;
    var ia = psw1 & 0xffffff;
    var psw = '[smask:' + smask.toString(16).padStart(2, '0') +
        ' key:' + key.toString(16) +
        ' amwp:' + amwp.toString(16) +
        ' ilc:' + ilc.toString(16) +
        ' cc:' + cc.toString(16) +
        ' pmask:' + pmask.toString(16) +
        ' ia:' + ia.toString(16) + ']';
    return psw;
}
var formatters = {
    'FN': fmtN,
    'J': fmtN,
    'LSAR': fmt1,
    'L': fmt4,
    'R': fmt4,
    'MD': fmtN,
    'F': fmtN,
    'Q': fmtN,
    'M': fmt4,
    'H': fmt4,
    'T': fmt4,
    'A': fmt4,
    'IAR': fmt4,
    'D': fmt4,
    'XG': fmt4,
    'Y': fmt4,
    'U': fmt1,
    'V': fmt1,
    'W': fmt1,
    'G1': fmtN,
    'G2': fmtN,
    'LB': fmtN,
    'MB': fmtN,
    'ROAR': fmt2,
    'SCANCTRL': fmt1,
    'PSS': fmt1,
    'SP': fmtN,
    'WL': fmtN,
    'WR': fmtN,
    'IBFULL': fmtB,
    'SCFS': fmtB,
    'SCPS': fmtB,
    'SAR': fmt4,
    'BS': fmtN,
    'WFN': fmtN,
    'CR': fmtN,
    'SDR': fmt4,
};
function displayState(state) {
    var keys = Object.keys(state);
    keys = keys.sort();
    var misc = [];
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (state[key] == undefined) {
            throw ('Undefined state ' + key);
        }
        if (typeof (state[key]) == 'number' && state[key] < 0) {
            throw ('Negative state ' + key);
        }
        if (key == 'MS') {
            // Main storage
        }
        else if (key == 'LS') {
            // Local storage
            for (var ls = 0; ls < 4; ls++) {
                var line = state['LS'].slice(ls * 16, (ls + 1) * 16).map(fmt4).join(' ');
                $("#LS" + ls).html(line);
            }
        }
        else if (key == 'S') {
            var line = state['S'].join(' ');
            $("#S").html(line);
        }
        else if (key in formatters) {
            if ($("#" + key).length) {
                $("#" + key).html(formatters[key](state[key]));
            }
            else {
                misc.push(key + ': ' + formatters[key](state[key]));
            }
        }
        else {
            // console.log("No formatter for " + key);
        }
    }
    $("#misc").html(misc.join(', '));
}
