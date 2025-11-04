// MIT License

// Copyright (c) 2025 Tigerbots

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE. 

const svgNS = "http://www.w3.org/2000/svg";

let commandList = [
    {
        name: 'Test', // name whatever
        value: 'LR', //max 2 characters, can be anything, used by the robot to determine what to do
    },
    // {
    //     name: '*command',
    //     value: '*value',
    // }, ... 

]

import { nt4Client } from "./ui.js"


function alongPath(angle, radius, xposLocal = 750, yposLocal = 750,) {
    //stolen from 3dNgyn.js from 3dsnake that i made
    angle -= 90
    var Y = yposLocal + ((Math.sin(angle * Math.PI / 180) * radius));
    var X = xposLocal + (Math.cos(angle * Math.PI / 180) * radius)
    // console.log(" " + X + "," + Y + " ")
    return {
        point: " " + X + "," + Y + " ",
        x: X,
        y: Y,
    }
}

multiSwitchButtonEvent()
function multiSwitchButtonEvent() {
    $(".multiSwitchButton").off()
    $(".multiSwitchButton").on("click", (event) => {
        let leftOffset = $(event.target).offset().left - $(event.target).parent().offset().left
        $(event.target).parent().find(".multiSliding").css("margin-left", leftOffset + "px")
        $(event.target).parent().attr("data-value", $(event.target).val())
    })
}


let $pbt = $(".poseBTN")
let currentTimeout = false
let currentDragFrom = ""
let currentDragTo = ""
let currentDragStarted
let startDragX = 0
let mouseIsDown = false
let initalLeft
let paths
populateCommands()
function populateCommands() {
    $(".commandHolder").empty()
    for (let i = 0; i < commandList.length; i++) {

        let newElem = $("<h2>").addClass("commandOptionNamed").text(commandList[i].name).appendTo('.commandHolder').on('click', () => {
            $(".poseSelectorTitle").text("Saved")

            let $cr = $("<div>").addClass("ordered").text(commandList[i].value).appendTo(".orderHolder").on("mousedown touchstart", (event) => {
                let $ct = event.currentTarget
                currentTimeout = setTimeout(() => {
                    currentDragFrom = $ct

                    if (event.pageX == null) {
                        startDragX = event.changedTouches[0].pageX
                    } else {
                        startDragX = event.pageX
                    }
                    initalLeft = $(currentDragFrom).offset().left
                    $($ct).addClass("orderedPhase").css("left", startDragX - ($($ct).width() / 2) + "px")
                    $($ct).next().addClass("orderedGap")
                    setTimeout(() => {
                        $(".ordered").addClass("orderedTransition")

                    }, 10);
                    $(".ordered").css("background-color", "#7300ff55")

                }, 200);
                currentDragStarted = false
                mouseIsDown = true

            }).on("mouseup touchend", (event) => {
                clearTimeout(currentTimeout)

                if (currentDragStarted) {

                    $(".ordered").removeClass("orderedTransition")

                    $(currentDragFrom).removeClass("orderedPhase")
                    $(".orderedGap").removeClass("orderedGap").removeClass("orderedGapLeft")
                    $(".orderedGapLeft").removeClass("orderedGap").removeClass("orderedGapLeft")

                    mouseIsDown = false

                    $(".ordered").css("left", "0px")

                    currentDragFrom = ""
                    currentDragTo = ""
                    $(".ordered").css("background-color", "rgb(12, 12, 12)")

                } else {
                    $(".ordered").removeClass("orderedTransition").css("left", "0px").removeClass("orderedGap").removeClass("orderedLeft").removeClass("orderedPhase")
                }
            }).on("click", (event) => {
                event.preventDefault()
                if (!currentDragStarted) {
                    $($cr).remove()
                }
            }).on("touchcancel", () => {
                clearTimeout(currentTimeout)
            })
            $(".orderHolder").scrollLeft($(".orderHolder")[0].scrollWidth)
            if ($(".multiSwitch").attr("data-value") == "Sync") {
                $cr.text(commandList[i].value + "+")
            }


        })

        if (!$(".commands").hasClass("commandName")) {
            newElem.text(commandList[i].value).removeClass("commandOptionNamed").addClass("commandOption")
        }
    }
}

$(".commandTitle").on("click", () => {
    $(".commands").toggleClass("commandName")
    populateCommands()
})


startMovin()
function startMovin(initX, initY) {
    $("html").on("touchmove mousemove", (event) => {
        if (currentDragFrom !== "") {
            let x
            let y
            if (x == null) {
                if (event.pageX == null) {
                    y = event.changedTouches[0].pageY
                    x = event.changedTouches[0].pageX
                } else {
                    y = event.pageY
                    x = event.pageX
                }
            }
            let $cL = $(document.elementsFromPoint($(currentDragFrom).offset().left, $(currentDragFrom).offset().top))
            let $cR = $(document.elementsFromPoint($(currentDragFrom).offset().left + $(currentDragFrom).width(), $(currentDragFrom).offset().top))
            let $cG = $("eee")
            for (let i = 0; i < $cR.length; i++) {
                if ($cR.eq(i).hasClass("ordered") && !($cR.eq(i).hasClass("orderedPhase"))) {
                    $cG = $cR.eq(i)
                    break
                }
            }
            let $ce = $("eee")
            for (let i = 0; i < $cL.length; i++) {
                if ($cL.eq(i).hasClass("ordered") && !($cL.eq(i).hasClass("orderedPhase"))) {
                    $ce = $cL.eq(i)
                    break
                }
            }
            if (mouseIsDown) {
                $(".orderedPhase").css("left", x - ($(".orderedPhase").width() / 2) + "px")
            }
            if ($ce.hasClass("ordered") && currentDragFrom !== "") {
                currentDragStarted = true


                currentDragTo = $ce
                if (initalLeft < $(currentDragTo).offset().left) {

                    $(".orderedGap").removeClass("orderedGap")

                    $(currentDragFrom).insertAfter(currentDragTo)
                    if ($ce.next().hasClass("orderedPhase")) {
                        $ce.next().next().addClass("orderedGap")
                    } else {
                        $ce.next().addClass("orderedGap")
                    }
                    // $(currentDragFrom).css("background-color", "yellow")
                    // $(currentDragTo).css("background-color", "blue")
                    setTimeout(() => {
                        initalLeft = $(currentDragFrom).offset().left

                    }, 30);

                } else if (initalLeft > $(currentDragTo).offset().left && $(currentDragFrom).offset().left + $(currentDragFrom).width() < $(currentDragTo).offset().left + $(currentDragTo).width()) {

                    $(currentDragFrom).insertBefore(currentDragTo)

                    $(".orderedGap").removeClass("orderedGap")
                    $cG.addClass("orderedGap")
                    // $(currentDragFrom).css("background-color", "yellow")
                    // $(currentDragTo).css("background-color", "purple")
                    setTimeout(() => {
                        initalLeft = $(currentDragFrom).offset().left

                    }, 30);

                }
                // console.log($(currentDragTo).offset().left+ $(".ordered").width() + " > " + $(currentDragFrom).offset().left)

                // currentDragTo = ""
            }
        }
    })

}


for (let i = 0; i < $pbt.length; i++) {
    let eq$ = $pbt.eq(i)

    eq$.on("mousedown touchstart", (event) => {
        event.preventDefault()

        let $cr = $("<div>").addClass("ordered").text(eq$.attr("data-pose")).appendTo(".orderHolder").on("mousedown touchstart", (event) => {
            let $ct = event.currentTarget
            currentTimeout = setTimeout(() => {
                currentDragFrom = $ct

                if (event.pageX == null) {
                    startDragX = event.changedTouches[0].pageX
                } else {
                    startDragX = event.pageX
                }
                initalLeft = $(currentDragFrom).offset().left
                $($ct).addClass("orderedPhase").css("left", startDragX - ($($ct).width() / 2) + "px")
                $($ct).next().addClass("orderedGap")
                setTimeout(() => {
                    $(".ordered").addClass("orderedTransition")

                }, 10);
                $(".ordered").css("background-color", "#7300ff55")

            }, 200);
            currentDragStarted = false
            mouseIsDown = true

        }).on("mouseup touchend mouseleave", (event) => {
            clearTimeout(currentTimeout)

            if (currentDragStarted) {

                $(".ordered").removeClass("orderedTransition")

                $(currentDragFrom).removeClass("orderedPhase")
                $(".orderedGap").removeClass("orderedGap").removeClass("orderedGapLeft")
                $(".orderedGapLeft").removeClass("orderedGap").removeClass("orderedGapLeft")

                mouseIsDown = false

                $(".ordered").css("left", "0px")

                currentDragFrom = ""
                currentDragTo = ""
                $(".ordered").css("background-color", "rgb(12, 12, 12)")

            } else {
                $(".ordered").removeClass("orderedTransition").css("left", "0px").removeClass("orderedGap").removeClass("orderedLeft").removeClass("orderedPhase")
            }
        }).on("click", (event) => {
            event.preventDefault()
            if (!currentDragStarted) {
                $($cr).remove()
            }
        }).on("touchcancel", () => {
            clearTimeout(currentTimeout)
        })
        $(".orderHolder").scrollLeft($(".orderHolder")[0].scrollWidth)

        // if($(".multiSwitch").attr("data-value") == "Simultaneous"){
        //     $cr.text(eq$.attr("data-pose") + "S")
        // }

        eq$.css("fill", "#7300ff")
        eq$.offset()
        setTimeout(() => {
            eq$.css('fill', "#333333").css("transition", '500ms ease fill')
            setTimeout(() => {
                eq$.css("transition", '')
            }, 500);
        }, 10);
    })

}

const $slider = $(".startPos");
const $thumb = $(".thumb");

let finishedPath = "";
let startRotation = 90;

// Update thumb position and rotation
function updateThumb() {
    const val = parseFloat($slider.val());
    $thumb.css({
        left: val - $thumb.width() + 15 + "px",
        transform: `rotate(${-(startRotation-180)}deg)`
    });
}

// Draw path and arrow
function drawPath() {
    const aPSVG = $(".autoMap");
    $(".currentPath").remove();
    $(".arrowHead").remove();
    //in the top left, add a little text showing the degrees

    const pathElm = $(document.createElementNS(svgNS, 'path')).appendTo(aPSVG).addClass("currentPath");
    pathElm.css({ stroke: '#ffffffee', fill: 'none', 'stroke-width': '30' });
    finishedPath = "";

    moveTo($slider.val(), 330);

    const $oH = document.getElementsByClassName("ordered");
    for (let i = 0; i < $oH.length; i++) {
        const $eq = $($oH[i]);
        const $po = $("#pose" + $eq.text());
        if ($po.attr("data-x")) {
            lineTo(parseFloat($po.attr("data-x")) + (179.749980769 / 2),
                parseFloat($po.attr("data-y")) + (179.749980769 / 2));
        }
    }

    pathElm.attr("d", finishedPath);

    // Arrow head at start position
    const arrowHead = $(document.createElementNS(svgNS, 'polygon')).appendTo(aPSVG).addClass("arrowHead");
    arrowHead.css("fill", '#d45656ff');
    const arrowSize = 20;
    const startX = parseFloat($slider.val()) - 15;
    const startY = 330;
    const arrowPoints = [
        `${startX},${startY}`,
        `${startX + arrowSize},${startY - arrowSize * 2}`,
        `${startX - arrowSize},${startY - arrowSize * 2}`
    ].join(" ");
    //rotate arrowHead
    const angle = -(startRotation-180) * (Math.PI / 180); // Convert degrees to radians
    const centerX = startX;
    const centerY = startY - arrowSize; // Center of rotation
    const rotatedPoints = arrowPoints.split(" ").map(point => {
        const [x, y] = point.split(",").map(Number);
        const newX = centerX + (x - centerX) * Math.cos(angle) - (y - centerY) * Math.sin(angle);
        const newY = centerY + (x - centerX) * Math.sin(angle) + (y - centerY) * Math.cos(angle);
        return `${newX},${newY}`;
    }).join(" ");
    arrowHead.attr("points", rotatedPoints);


}

// Slider input
$slider.on("input", () => {
    updateThumb();
    drawPath();
});

// Observe changes to ordered elements
const observer = new MutationObserver(drawPath);
observer.observe(document.getElementById("orderHolder"), { attributes: true, childList: true, subtree: true });

// Improved touch + mouse support for slider/rotation (pointer events when available)

let isDragging = false;
let dragMode = "";
let startMouseX = 0;
let startValue = 0;
let dragStartRotation = 0;
let lastTap = 0;

// helper to start move
function beginMove(clientX) {
    startMouseX = clientX;
    dragMode = "move";
    startValue = parseFloat($slider.val());
    isDragging = true;
}

// helper to start rotate
function beginRotate(clientX) {
    startMouseX = clientX;
    dragMode = "rotate";
    dragStartRotation = startRotation;
    isDragging = true;
}

// pointer-based implementation (preferred)
if (window.PointerEvent) {
    $(".sliderWrapper").on("pointerdown", e => {
        // Only accept left mouse or touch/pen
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.preventDefault();

        if (e.pointerType === "touch") {
            const now = Date.now();
            if (now - lastTap < 300) {
                // double-tap rotate
                beginRotate(e.clientX);
                lastTap = 0;
            } else {
                // single-touch move
                beginMove(e.clientX);
                lastTap = now;
            }
        } else {
            beginMove(e.clientX);
        }
    });

    $(".sliderWrapper").on("dblclick", e => {
        e.preventDefault();
        beginRotate(e.clientX);
    });

    $(document).on("pointermove", e => {
        if (!isDragging) return;
        const deltaX = e.clientX - startMouseX;

        if (dragMode === "move") {
            let newVal = startValue + deltaX;
            newVal = Math.max(100, Math.min(1446.5998, newVal));
            $slider.val(newVal).trigger("input");
        } else if (dragMode === "rotate") {
            let rawRotation = dragStartRotation - deltaX * 0.5;
            startRotation = Math.round(rawRotation / 5) * 5;
            if (startRotation > 180) startRotation -= 360;
            else if (startRotation < -180) startRotation += 360;
            $(".rotationText").remove();

            const textElement = document.createElementNS(svgNS, "text");
            textElement.setAttribute("class", "rotationText");
            textElement.setAttribute("x", "20");
            textElement.setAttribute("y", "65");
            textElement.setAttribute("fill", "#ffffff");
            textElement.setAttribute("font-size", "60");
            textElement.setAttribute("font-family", "Arial, sans-serif");
            textElement.setAttribute("pointer-events", "all");
            textElement.setAttribute("cursor", "pointer");
            textElement.setAttribute("text-decoration", "underline");
            textElement.textContent = startRotation + "°";

            $(textElement).off("pointerdown").on("pointerdown", function(ev) {
                ev.stopPropagation();
                ev.preventDefault();
                const currentRotation = startRotation;
                const newRotation = prompt(`Enter rotation (current: ${currentRotation}°):`, currentRotation);
                if (newRotation !== null && !isNaN(newRotation)) {
                    const rotation = parseInt(newRotation);
                    const constrainedRotation = Math.max(-180, Math.min(180, rotation));
                    startRotation = Math.round(constrainedRotation);
                    textElement.textContent = startRotation + "°";
                    updateThumb();
                    drawPath();
                }
            });

            $(".autoMap")[0].appendChild(textElement);
            updateThumb();
            drawPath();
        }
    });

    $(document).on("pointerup pointercancel", () => {
        isDragging = false;
    });

} else {
    // Fallback for browsers without PointerEvent: use mouse + touch events

    // Touch: double-tap detection for rotate
    $(".sliderWrapper").on("touchstart", function(e) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        const now = Date.now();
        if (now - lastTap < 300) {
            beginRotate(touch.clientX);
            lastTap = 0;
        } else {
            beginMove(touch.clientX);
            lastTap = now;
        }
    });

    $(".sliderWrapper").on("mousedown", function(e) {
        e.preventDefault();
        if (e.button !== 0) return;
        beginMove(e.clientX);
    });

    $(".sliderWrapper").on("dblclick", function(e) {
        e.preventDefault();
        beginRotate(e.clientX);
    });

    $(document).on("touchmove", function(e) {
        if (!isDragging) return;
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - startMouseX;
        if (dragMode === "move") {
            let newVal = startValue + deltaX;
            newVal = Math.max(100, Math.min(1446.5998, newVal));
            $slider.val(newVal).trigger("input");
        } else if (dragMode === "rotate") {
            let rawRotation = dragStartRotation + deltaX * 0.5;
            startRotation = Math.round(rawRotation / 5) * 5;
            if (startRotation > 180) startRotation -= 360;
            else if (startRotation < -180) startRotation += 360;
            $(".rotationText").remove();

            const textElement = document.createElementNS(svgNS, "text");
            textElement.setAttribute("class", "rotationText");
            textElement.setAttribute("x", "20");
            textElement.setAttribute("y", "65");
            textElement.setAttribute("fill", "#ffffff");
            textElement.setAttribute("font-size", "60");
            textElement.setAttribute("font-family", "Arial, sans-serif");
            textElement.setAttribute("pointer-events", "all");
            textElement.setAttribute("cursor", "pointer");
            textElement.setAttribute("text-decoration", "underline");
            textElement.textContent = startRotation + "°";

            $(textElement).on("mousedown touchstart", function(ev) {
                ev.stopPropagation();
                ev.preventDefault();
                const currentRotation = startRotation;
                const newRotation = prompt(`Enter rotation (current: ${currentRotation}°):`, currentRotation);
                if (newRotation !== null && !isNaN(newRotation)) {
                    const rotation = parseInt(newRotation);
                    const constrainedRotation = Math.max(-180, Math.min(180, rotation));
                    startRotation = Math.round(constrainedRotation);
                    textElement.textContent = startRotation + "°";
                    updateThumb();
                    drawPath();
                }
            });

            $(".autoMap")[0].appendChild(textElement);
            updateThumb();
            drawPath();
        }
    });

    $(document).on("mousemove", function(e) {
        if (!isDragging) return;
        const deltaX = e.clientX - startMouseX;
        if (dragMode === "move") {
            let newVal = startValue + deltaX;
            newVal = Math.max(100, Math.min(1446.5998, newVal));
            $slider.val(newVal).trigger("input");
        }
    });

    $(document).on("touchend mouseup touchcancel", function() {
        isDragging = false;
    });
}

// Initialize
updateThumb();
drawPath();


function moveTo(x, y) {
    finishedPath = finishedPath + ` M ${x} ${y} `
}
function lineTo(x, y) {
    finishedPath = finishedPath + ` L ${x} ${y} `

}
function cubicBezier(startControlX, startControlY, endControlX, endControlY, endX, endY) {
    finishedPath = finishedPath + ` C ${startControlX} ${startControlY}, ${endControlX} ${endControlY}, ${endX} ${endY}`
}
function cubicBezierContinued(endControlX, endControlY, endX, endY) {
    finishedPath = finishedPath + ` S ${endControlX} ${endControlY}, ${endX} ${endY}`

}
function quadBezier(controlX, controlY, endX, endY) {
    finishedPath = finishedPath + ` Q ${controlX} ${controlY}, ${endX} ${endY}`
}
function quadBezierContinued(endX, endY) {
    finishedPath = finishedPath + ` T ${endX} ${endY}`
}
function arc(endX, endY, rx, sweep) {
    finishedPath = finishedPath + ` A ${rx} ${rx} 0 0 ${sweep} ${endX} ${endY}`
}

$(".send").on("click", () => {
    let $oH = document.getElementsByClassName("ordered")
    let finalString = startRotation + "_" + ($slider.val() - 100) / 1370 + "_"
    // console.log($oH)
    for (let i = 0; i < $oH.length; i++) {
        let $eq = $($oH[i])
        finalString = finalString + $eq.text() + "-"
    }
    finalString = finalString.slice(0, -1)
    localStorage.setItem("currentPath", finalString)

    console.log(finalString)
    if ($("#connect")[0].checked) {
        nt4Client.publishTopic("/touchboard/posePlotterFinalString", "string")
        nt4Client.addSample("/touchboard/posePlotterFinalString", finalString);

        $(".connectionText").text("Sending Path!")

        setTimeout(() => {
            $(".connectionText").text("Connected")
        }, 3000);
    } else {
        $(".connectionText").text("Not Connected!")
        setTimeout(() => {
            $(".connectionText").text("Offline")
        }, 3000);
    }

})

// setFromString("3+-I-4S-0+-LM-T-3+-K-4S-0+-LB-T-3+-L-4S-0")

export function setFromString(string) {
    $(".orderHolder").empty()
    if (string == null) {
        return

    } else if (string.length < 1) {
        return
    }
    //deal with Pose position
    let poseParts = string.split("_")
    startRotation = parseFloat(poseParts[0])
    let x = parseFloat(poseParts[1]) * 1370 + 100
    $slider.val(x).trigger("input")
    let actions = poseParts[poseParts.length - 1]
    let stringArr = actions.split("-")

    for (let i = 0; i < stringArr.length; i++) {

        let $cr = $("<div>").addClass("ordered").text(stringArr[i]).appendTo(".orderHolder").on("mousedown touchstart", (event) => {
            let $ct = event.currentTarget
            currentTimeout = setTimeout(() => {
                currentDragFrom = $ct

                if (event.pageX == null) {
                    startDragX = event.changedTouches[0].pageX
                } else {
                    startDragX = event.pageX
                }
                initalLeft = $(currentDragFrom).offset().left
                $($ct).addClass("orderedPhase").css("left", startDragX - ($($ct).width() / 2) + "px")
                $($ct).next().addClass("orderedGap")
                setTimeout(() => {
                    $(".ordered").addClass("orderedTransition")

                }, 10);
                $(".ordered").css("background-color", "#7300ff55")

            }, 200);
            currentDragStarted = false
            mouseIsDown = true

        }).on("mouseup touchend mouseleave", (event) => {
            clearTimeout(currentTimeout)

            if (currentDragStarted) {

                $(".ordered").removeClass("orderedTransition")

                $(currentDragFrom).removeClass("orderedPhase")
                $(".orderedGap").removeClass("orderedGap").removeClass("orderedGapLeft")
                $(".orderedGapLeft").removeClass("orderedGap").removeClass("orderedGapLeft")

                mouseIsDown = false

                $(".ordered").css("left", "0px")

                currentDragFrom = ""
                currentDragTo = ""
                $(".ordered").css("background-color", "rgb(12, 12, 12)")

            } else {
                $(".ordered").removeClass("orderedTransition").css("left", "0px").removeClass("orderedGap").removeClass("orderedLeft").removeClass("orderedPhase")
            }
        }).on("click", (event) => {
            event.preventDefault()
            if (!currentDragStarted) {
                $($cr).remove()
            }
        }).on("touchcancel", () => {
            clearTimeout(currentTimeout)
        })
        $(".orderHolder").scrollLeft($(".orderHolder")[0].scrollWidth)

        // if($(".multiSwitch").attr("data-value") == "Simultaneous"){
        //     $cr.text(eq$.attr("data-pose") + "S")
        // }

        $cr.css("fill", "#7300ff")
        $cr.offset()
        setTimeout(() => {
            $cr.css('fill', "#333333").css("transition", '500ms ease fill')
            setTimeout(() => {
                $cr.css("transition", '')
            }, 500);
        }, 10);
    }

}


$(".clear").on("click", () => {
    $(".orderHolder").empty()
    $(".poseSelectorTitle").text("Saved")

})

setFromString(localStorage.getItem("currentPath"))

$('.save').on("mousedown touchstart", () => {
    let saveName = $(".saveName").val()

    if (saveName !== null) {
        let $oH = document.getElementsByClassName("ordered")
        let finalString = startRotation + "_" + ($slider.val() - 100) / 1370 + "_"
        for (let i = 0; i < $oH.length; i++) {
            let $eq = $($oH[i])
            finalString = finalString + $eq.text() + "-"
        }
        finalString = finalString.slice(0, -1)

        paths = JSON.parse(localStorage.getItem("paths"))

        paths[saveName] = finalString;

        localStorage.setItem("paths", JSON.stringify(paths));

        $(".poseSelector").children('.selectOption').remove()


        for (let i in paths) {
            $("<div>").addClass("selectOption").insertBefore('.saveManager').text(i).val(paths[i]).on("mousedown touchstart", (event) => {
                setFromString($(event.currentTarget).val())
                $(".poseSelectorTitle").text(i)

            })
        }
    }
    $(".saveName").val("")
})

$(".delete").off().on("click", () => {
    $(".selectOption").off().on("mousedown touchstart", (event) => {
        paths = JSON.parse(localStorage.getItem("paths"))

        delete paths[$(event.currentTarget).text()]

        localStorage.setItem("paths", JSON.stringify(paths));

        $(".poseSelector").children('.selectOption').remove()


        for (let i in paths) {
            $("<div>").addClass("selectOption").insertBefore('.saveManager').text(i).val(paths[i]).on("mousedown touchstart", (event) => {
                setFromString($(event.currentTarget).val())
                $(".poseSelectorTitle").text(i)

            })
        }

        $(".select").removeClass("selectOpen").scrollTop(0)

    })
})