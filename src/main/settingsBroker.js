/*!
GPII Application
Copyright 2016 Steven Githens
Copyright 2016-2017 OCAD University

Licensed under the New BSD license. You may not use this file except in
compliance with this License.
The research leading to these results has received funding from the European Union's
Seventh Framework Programme (FP7/2007-2013) under grant agreement no. 289016.
You may obtain a copy of the License at
https://github.com/GPII/universal/blob/master/LICENSE.txt
*/
"use strict";

var fluid = require("infusion");
var gpii  = fluid.registerNamespace("gpii");

fluid.defaults("gpii.app.settingsBroker", {
    gradeNames: ["fluid.modelComponent"],
    model: {
        pendingChanges: [],
        solutionNames: []
    },
    modelRelay: {
        solutionNames: {
            target: "solutionNames",
            singleTransform: {
                type: "fluid.transforms.free",
                func: "gpii.app.settingsBroker.getSolutionsNames",
                args: ["{that}", "{that}.model.pendingChanges"]
            }
        }
    },
    modelListeners: {
        solutionNames: {
            this: "{that}.events.onRestartRequired",
            method: "fire",
            args: ["{change}.value"],
            excludeSource: ["init", "keyOut"]
        }
    },
    invokers: {
        enqueue: {
            funcName: "gpii.app.settingsBroker.enqueue",
            args: ["{that}", "{arguments}.0"]
        },
        applySetting: {
            this: "{that}.events.onSettingApplied",
            method: "fire",
            args: ["{arguments}.0"]
        },
        flushPendingChanges: {
            funcName: "gpii.app.settingsBroker.flushPendingChanges",
            args: ["{that}", "{that}.model.pendingChanges"]
        },
        clearPendingChanges: {
            funcName: "gpii.app.settingsBroker.clearPendingChanges",
            args: ["{that}"]
        },
        hasPendingChanges: {
            funcName: "gpii.app.settingsBroker.hasPendingChanges",
            args: ["{that}.model.pendingChanges"]
        }
    },
    events: {
        onSettingApplied: null,
        onRestartRequired: null
    },
    labels: {
        os: "Windows"
    }
});

gpii.app.settingsBroker.getSolutionsNames = function (settingsBroker, pendingChanges) {
    var isOSRestartNeeded = fluid.find(pendingChanges, function (pendingChange) {
        return pendingChange.liveness === "OSRestart";
    });

    if (isOSRestartNeeded) {
        return [settingsBroker.options.labels.os];
    }

    return fluid.accumulate(pendingChanges, function (pendingChange, solutionNames) {
        var solutionName = pendingChange.solutionName;
        if (fluid.isValue(solutionName) && solutionNames.indexOf(solutionName) < 0) {
            solutionNames.push(solutionName);
        }
        return solutionNames;
    }, []);
};

gpii.app.settingsBroker.enqueue = function (settingsBroker, setting) {
    if (setting.liveness === "live" || setting.liveness === "liveRestart") {
        settingsBroker.applySetting(setting);
        return;
    }

    var pendingChanges = fluid.copy(settingsBroker.model.pendingChanges),
        pendingChange = fluid.find_if(pendingChanges, function (change) {
            return change.path === setting.path;
        });

    if (pendingChange) {
        pendingChange.value = setting.value;
    } else {
        pendingChanges.push(setting);
    }

    settingsBroker.applier.change("pendingChanges", pendingChanges);
};

gpii.app.settingsBroker.clearPendingChanges = function (settingsBroker) {
    settingsBroker.applier.change("pendingChanges", []);
};

gpii.app.settingsBroker.flushPendingChanges = function (settingsBroker, pendingChanges) {
    fluid.each(pendingChanges, function (pendingChange) {
        settingsBroker.applySetting(pendingChange);
    });
    settingsBroker.clearPendingChanges();
};

gpii.app.settingsBroker.hasPendingChanges = function (pendingChanges) {
    return fluid.isArrayable(pendingChanges) && pendingChanges.length > 0;
};
