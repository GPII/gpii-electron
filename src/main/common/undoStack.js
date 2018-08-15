/**
 * Undo stack component
 *
 * A component that represents a simple undo stack.
 * Copyright 2016 Steven Githens
 * Copyright 2016-2017 OCAD University
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 * The research leading to these results has received funding from the European Union's
 * Seventh Framework Programme (FP7/2007-2013) under grant agreement no. 289016.
 * You may obtain a copy of the License at
 * https://github.com/GPII/universal/blob/master/LICENSE.txt
 */
"use strict";

var fluid = require("infusion");
var gpii  = fluid.registerNamespace("gpii");


/**
 * A simple wrapper of an array to simulate an undo stack.
 */
fluid.defaults("gpii.app.undoStack", {
    gradeNames: "fluid.modelComponent",

    model: {
        undoStack: [],
        hasChanges: false
    },

    events: {
        onChangeUndone: null
    },

    modelRelay: {
        hasChanges: {
            target: "hasChanges",
            singleTransform: {
                type: "fluid.transforms.free",
                func: "gpii.app.undoStack.hasChanges",
                args: ["{that}.model.undoStack"]
            },
            forward: {
                // on the initial step the `undoStack` is still `undefined`
                excludeSource: "init"
            }
        }
    },

    // restrict the number of undo steps
    maxUndoEntries: 100,

    invokers: {
        undo: {
            funcName: "gpii.app.undoStack.undo",
            args: [
                "{that}",
                "{arguments}.0" // component
            ]
        },
        registerChange: {
            funcName: "gpii.app.undoStack.registerChange",
            args: [
                "{that}",
                "{arguments}.0", // oldValue
                "{arguments}.1"  // pathSegs
            ]
        },
        clear: {
            changePath: "undoStack",
            value: []
        }
    }
});


/**
 * Restore the previous state of a component's property. Changes that are made to the component's model
 * are with source "gpii.app.undoStack.undo" which could be used for exclusion.
 *
 * @param {Comopnent} that - The `gpii.app.undoStack`
 */
gpii.app.undoStack.undo = function (that) {
    var undoStack = fluid.copy(that.model.undoStack);

    // Is it even registered
    if (undoStack.length === 0) {
        fluid.log("UndoStack: undoStack is empty.");
        return;
    }

    var undoChange = undoStack.pop();

    that.applier.change("undoStack", undoStack);

    that.events.onChangeUndone.fire(undoChange);
};


/**
 * Register single change to the undo stack.
 *
 * @param {Component} that - The new state of the component's property
 * @param {Object} change - The new state of the component's property
 */
gpii.app.undoStack.registerChange = function (that, change) {
    var undoStack = fluid.copy(that.model.undoStack);

    // simply add the new state even if it hasn't changed
    undoStack.push(change);

    if (that.options.maxUndoEntries <= undoStack.length) {
        // get rid of the oldest change
        undoStack.shift();
    }

    that.applier.change("undoStack", undoStack);
};

gpii.app.undoStack.hasChanges = function (undoStack) {
    return undoStack.length > 0;
};