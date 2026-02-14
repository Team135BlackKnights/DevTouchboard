// MIT License
// Copyright (c) 2025 Tigerbots

import { NT4_Client } from "../lib/nt4.js";
import { goToNextSong } from "./jukebox.js";

export let currentConnected = false;

function setConnTheme(state) {
    const root = document.documentElement;
    root.classList.remove("connected", "disconnected", "connecting");
    root.classList.add(state);
    root.setAttribute("data-conn", state);
}

// Default visual state before connection completes
setConnTheme(localStorage.getItem("connect") === "true" ? "connecting" : "disconnected");

// AutoBuilder persists its robot JSON here so UI can publish it on connect.
if (localStorage.getItem("currentPath") == null) {
    localStorage.setItem("currentPath", "");
}

$(".fullScreen").on("click", () => {
    document.querySelector("html")?.requestFullscreen?.();
});

// Close dropdown selects when clicking outside
$("html").on("click", (event) => {
    if (
        !$(event.target).hasClass("selectTitle") &&
        !$(event.target).hasClass("textInput") &&
        !$(event.target).hasClass("delete")
    ) {
        $(".select")
            .filter(function () { return $(this).find(".selectTitle").length > 0; })
            .removeClass("selectOpen")
            .scrollTop(0);
    }
});

// Tab switching
function showTab($tab) {
    const pageSel = $tab.attr("data-page");
    if (!pageSel) return;

    const $page = $(pageSel);
    if ($page.length === 0) {
        console.warn("Tab page not found:", pageSel);
        return;
    }

    // hide all pages
    $(".page, .pageF").hide();

    // tab styling
    $(".tab")
        .removeClass("currentTab")
        .css("background-color", "rgb(12, 12, 12)");

    $tab
        .addClass("currentTab")
        .css("background-color", "rgb(32, 32, 32)");

    // If the tab explicitly says how to show it, obey that.
    let disp = $tab.attr("data-displaytype");

    // Otherwise infer a sane default
    if (!disp) {
        if ($page.hasClass("jukeBox")) disp = "block";
        else if ($page.hasClass("autonomus")) disp = "grid";
        else disp = "grid";
    }

    $page.css("display", disp);
}

// Prefer click + pointer; don’t depend on mousedown/touchstart
$(document).on("click pointerup", ".tab", (event) => {
    event.preventDefault();
    showTab($(event.currentTarget));
});

// Dropdown open/close behavior — ONLY for classic dropdown selects
$(".select").on("touchdown mousedown", (event) => {
    if ($(event.currentTarget).find(".selectTitle").length === 0) return;
    if (!$(event.target).hasClass("textInput") && !$(event.target).hasClass("delete")) {
        $(event.currentTarget).toggleClass("selectOpen");
    }
});

function doNothing() { }

function handleNewData(topic, timestamp, value) {
    const topicSplit = topic.name.split("/");
    const topicName = topicSplit[topicSplit.length - 1];

    if (topicName === "musicIsFinished" && value === true) {
        goToNextSong();
        return;
    }

    const cls = "." + topic.name.replaceAll("/", "Sl-Sl-Sl-");
    if ($(cls).hasClass("basicSubscription")) {
        $(cls).children(".bSValue").text(JSON.stringify(value));
    }
}

function onConnectCb() {
    currentConnected = true;

    setTimeout(() => {
        $(".tabConnection").removeClass("tabConnection");

        // Publish the pose plotter string topic and send whatever we currently have saved.
        nt4Client.publishTopic("/touchboard/posePlotterFinalString", "string");
        nt4Client.addSample("/touchboard/posePlotterFinalString", localStorage.getItem("currentPath") ?? "");

        // Jukebox ping topic
        nt4Client.publishTopic("/touchboard/musicIsFinished", "boolean");
        nt4Client.addSample("/touchboard/musicIsFinished", true);
        nt4Client.subscribe(["/touchboard/musicIsFinished"]);

        // Publish every UI element with data-topic
        let $uiElements = $(".page").children().add($(".btnHolder").children());

        for (let i = 0; i < $uiElements.length; i++) {
            const $el = $uiElements.eq(i);
            const topic = $el.attr("data-topic");
            const type = $el.attr("data-type");
            if (!topic || !type) continue;

            if ($el.hasClass("basicSubscription")) continue;

            nt4Client.publishTopic("/touchboard/" + topic, type);

            if ($el.attr("data-value") != null) {
                if (type === "string") {
                    nt4Client.addSample("/touchboard/" + topic, $el.attr("data-value"));
                } else if (type === "double") {
                    if ($el.attr("data-persist") === "true") {
                        const stored = localStorage.getItem(topic);
                        if (stored != null) nt4Client.addSample("/touchboard/" + topic, parseFloat(stored));
                    } else {
                        nt4Client.addSample("/touchboard/" + topic, parseFloat($el.attr("data-value")));
                    }
                } else {
                    nt4Client.addSample("/touchboard/" + topic, JSON.parse($el.attr("data-value")));
                }
            }
        }

        // Bind UI behaviors
        for (let i = 0; i < $uiElements.length; i++) {
            const $el = $uiElements.eq(i);
            const topic = $el.attr("data-topic");
            const type = $el.attr("data-type");
            if (!topic || !type) continue;

            if ($el.hasClass("actionButton")) {
                $el.on("touchstart mousedown", (event) => {
                    nt4Client.addSample("/touchboard/" + topic, true);
                    $el.attr("data-value", "true");
                    event.preventDefault();
                }).on("mouseup touchend mouseleave touchcancel", (event) => {
                    nt4Client.addSample("/touchboard/" + topic, false);
                    $el.attr("data-value", "false");
                    event.preventDefault();
                });
            } else if ($el.hasClass("toggleButton")) {
                $el.on("touchstart mousedown", (event) => {
                    const cur = JSON.parse($el.attr("data-value"));
                    const next = !cur;
                    nt4Client.addSample("/touchboard/" + topic, next);
                    $el.toggleClass("toggledOn");
                    $el.attr("data-value", JSON.stringify(next));
                    event.preventDefault();
                });
            } else if ($el.hasClass("oneShotButton")) {
                nt4Client.subscribe(["/touchboard/" + topic]);
                $el.on("touchstart mousedown", (event) => {
                    nt4Client.addSample("/touchboard/" + topic, true);
                    event.preventDefault();
                });
            } else if ($el.hasClass("numberComponent")) {
                if ($el.attr("data-persist") === "true") {
                    if (localStorage.getItem(topic) == null) {
                        localStorage.setItem(topic, $el.attr("data-value"));
                    } else {
                        const current = localStorage.getItem(topic);
                        $el.attr("data-value", current);
                        $el.children(".numberTextInput").val(current);
                    }
                }

                const roundToNearestX = (n, x) => x === 0 ? 0 : Math.round(n / x) * x;

                $el.children(".numberPlus").on("mousedown touchstart", (event) => {
                    event.preventDefault();
                    const max = parseFloat($el.attr("data-max"));
                    const step = parseFloat($el.attr("data-step"));
                    const $input = $el.children(".numberTextInput");
                    const v = roundToNearestX(parseFloat($input.val()) + step, step);
                    if (v <= max) {
                        $input.val(v);
                        $el.attr("data-value", v);
                        nt4Client.addSample("/touchboard/" + topic, v);
                        if ($el.attr("data-persist") === "true") localStorage.setItem(topic, String(v));
                    }
                });

                $el.children(".numberMinus").on("mousedown touchstart", (event) => {
                    event.preventDefault();
                    const min = parseFloat($el.attr("data-min"));
                    const step = parseFloat($el.attr("data-step"));
                    const $input = $el.children(".numberTextInput");
                    const v = roundToNearestX(parseFloat($input.val()) - step, step);
                    if (v >= min) {
                        $input.val(v);
                        $el.attr("data-value", v);
                        nt4Client.addSample("/touchboard/" + topic, v);
                        if ($el.attr("data-persist") === "true") localStorage.setItem(topic, String(v));
                    }
                });

                $el.children(".numberTextInput").on("blur", (event) => {
                    event.preventDefault();
                    const max = parseFloat($el.attr("data-max"));
                    const min = parseFloat($el.attr("data-min"));
                    const $input = $(event.currentTarget);
                    let v = parseFloat($input.val());
                    if (v > max) v = max;
                    if (v < min) v = min;
                    $input.val(v);
                    $el.attr("data-value", v);
                    nt4Client.addSample("/touchboard/" + topic, v);
                    if ($el.attr("data-persist") === "true") localStorage.setItem(topic, String(v));
                });
            } else if ($el.hasClass("select")) {
                $el.children(".selectOption").on("mousedown", (event) => {
                    const $opt = $(event.target);
                    $el.attr("data-value", $opt.attr("data-value"));
                    $el.children(".selectTitle").text($opt.text());
                    nt4Client.addSample("/touchboard/" + topic, $el.attr("data-value"));
                });
            } else if ($el.hasClass("axis") || $el.hasClass("verticalAxis")) {
                $el.attr("data-value", 0);
                $el.children(".axisKnob, .verticalAxisKnob").val(0);

                $el.children(".axisKnob, .verticalAxisKnob").on("input", (event) => {
                    const v = parseFloat($(event.target).val());
                    $el.attr("data-value", v);
                    nt4Client.addSample("/touchboard/" + topic, v);
                }).on("mouseup touchend", (event) => {
                    $el.attr("data-value", 0);
                    $(event.currentTarget).val(0);
                    nt4Client.addSample("/touchboard/" + topic, 0);
                });
            } else if ($el.hasClass("basicSubscription")) {
                nt4Client.subscribe([$el.attr("data-topic")]);
                $el.addClass($el.attr("data-topic").replaceAll("/", "Sl-Sl-Sl-"));
            }
        }

        $(".connectionText").text("Connected");
        setConnTheme("connected"); // <- this drives the blue theme

    }, 250);
}

function onDisconnectCb() {
    currentConnected = false;

    if ($("#connect").is(":checked")) {
        $(".connectionText").text("Retrying");
        setConnTheme("connecting");
        setTimeout(() => window.location.reload(), 750);
    } else {
        $(".connectionText").text("Offline");
        setConnTheme("disconnected");
    }
}

export var nt4Client = new NT4_Client(
    localStorage.getItem("teamNumber"),
    "Touchboard",
    doNothing,
    doNothing,
    handleNewData,
    onConnectCb,
    onDisconnectCb
);

// Connect toggle
if (localStorage.getItem("connect") === "true") {
    $("#connect")[0].checked = true;
    $(".connectionText").text("Retrying");
    $(".tabConnection").removeClass("tabConnection");
    setConnTheme("connecting");
    nt4Client.connect();
} else {
    nt4Client.disconnect();
}

// Toggle handler
$("#connect").on("click", () => {
    if (!$("#connect").is(":checked")) {
        $(".connectionText").text("Offline");
        setConnTheme("disconnected");
        localStorage.setItem("connect", "false");
        nt4Client.disconnect();
    } else {
        $(".connectionText").text("Connecting");
        setConnTheme("connecting");
        localStorage.setItem("connect", "true");
        nt4Client.disconnect();
        nt4Client.connect();
        $(".tabConnection").removeClass("tabConnection");
    }
});

// Team/IP overlay
if (localStorage.getItem("teamNumber") == null) {
    $(".connectionText").text("No Team");
    setConnTheme("disconnected");
    $(".setTeamNumberOrIp").toggleClass("showTeamSet");
    $("#connect")[0].checked = false;
}

$(".setTeam").on("click", () => {
    let t = $(".teamNumberInput").val().toString().replace(/\s/g, "");
    if (t.length > 0) {
        if (t.includes(".")) {
            localStorage.setItem("teamNumber", t);
        } else if (t.includes("localhost")) {
            localStorage.setItem("teamNumber", "localhost");
        } else if (t.length <= 5) {
            let ip = "10.";
            if (t.length == 5) ip = "10." + t.slice(0, 3) + "." + t.slice(3, 5) + ".2";
            else if (t.length == 4) ip = "10." + t.slice(0, 2) + "." + t.slice(2, 4) + ".2";
            else if (t.length == 3) ip = "10." + t.slice(0, 1) + "." + t.slice(1, 3) + ".2";
            else if (t.length == 2) ip = "10.0." + t.slice(0, 2) + ".2";
            else if (t.length == 1) ip = "10.0." + t.slice(0, 1) + ".2";
            localStorage.setItem("teamNumber", ip);
        }
    }
    window.location.reload();
});
