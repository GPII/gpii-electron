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

var fluid = require("infusion"),
    electron = require("electron"),
    ipcMain = electron.ipcMain,
    gpii = fluid.registerNamespace("gpii");

require("../dialog.js");

// XXX: Needed to circumvent the certificate error for the "umd.edu" domain.Should
// be removed before going to production.
require("electron").app.on("certificate-error", function (event, webContents, url, error, certificate, callback) {
    event.preventDefault();
    callback(true);
});

/**
 * A component which extends the base `gpii.app.dialog` by registering additional
 * listeners. As the html markup of the loaded page within the `BrowserWindow`
 * contains a webview tag, the component notifies the webview via the IPC mechanism
 * about the survey URL which is to be loaded. This can happen only after the html
 * file has been completely loaded (otherwise the IPC message will most probably be
 * lost as there will be noone to handle it). On the other hand, the component
 * can be notified by the webview if it needs to be closed. Once the `BrowserWindow`
 * is closed, it cannot be interacted with and thus the component itself will also
 * be destroyed.
 *
 * Please note that the communication between the Infusion component and the webview
 * is not direct. The `BrowserWindow` acts as an itermediary and is responsible for
 * forwarding the corresponding IPC messages.
 */
fluid.defaults("gpii.app.surveyDialog", {
    gradeNames: ["gpii.app.dialog"],
    config: {
        attrs: {
            show: false,
            skipTaskbar: false,
            frame: true,
            alwaysOnTop: false,
            transparent: false, // needs to be false to enable resizing and maximizing
            fullscreenable: true,
            movable: true,

            width: 800,
            height: 600,
            resizable: true,
            closable: true,
            minimizable: false,
            maximizable: false
        },
        fileSuffixPath: "survey/index.html"
    },
    listeners: {
        "onCreate.hideMenu": {
            this: "{that}.dialog",
            method: "setMenu",
            args: [null]
        },
        "onCreate.initReadyToShowListener": {
            listener: "gpii.app.surveyDialog.initReadyToShowListener",
            args: ["{that}", "{that}.options.config.surveyUrl"]
        },
        "onCreate.initClosedListener": {
            listener: "gpii.app.surveyDialog.initClosedListener",
            args: ["{that}"]
        },
        "onCreate.initSurveyWindowIPC": {
            listener: "gpii.app.surveyDialog.initSurveyWindowIPC",
            args: ["{that}"]
        }
    },
    invokers: {
        notifySurveyWindow: {
            funcName: "gpii.app.notifyWindow",
            args: ["{that}.dialog", "{arguments}.0", "{arguments}.1"]
        }
    }
});

/**
 * Initializes the `ready-to-show` listener for the `BrowserWindow`. Only after
 * the `BrowserWindow` has loaded the local html, can the webview be instructed
 * to load the given survey url. As the `surveyDialog` component will be recreated
 * once a new survey is to be shown, the `ready-to-show` listener should be
 * executed only once.
 * @param that {Component} The `gpii.app.surveyDialog` instance.
 * @param surveyUrl {String} The url of the survey to be opened.
 */
gpii.app.surveyDialog.initReadyToShowListener = function (that, surveyUrl) {
    that.dialog.once("ready-to-show", function () {
        that.notifySurveyWindow("openSurvey", surveyUrl);
        that.show();
    });
};

/**
 * Initializes the `closed` listener for the `BrowserWindow`. Whenever the window
 * is closed, the `surveyDialog` should be destroyed, as it can no longer be shown,
 * hidden or interacted with in any other way. Note that the `closed` event fires
 * both when it is closed programatically or via the close button in the upper
 * right corner.
 * @param that {Component} The `gpii.app.surveyDialog` instance.
 */
gpii.app.surveyDialog.initClosedListener = function (that) {
    that.dialog.on("closed", function () {
        that.destroy();
    });
};

/**
 * Initializes the IPC listeners needed for the communication with the `BrowserWindow`.
 * Currently the only supported channel for exchanging messages is `onSurveyClose`.
 * Messages via this channel are sent to the `surveyDialog` component whenever the
 * user clicks on the 'break out' link within the survey.
 * @param that {Component} The `gpii.app.surveyDialog` instance.
 */
gpii.app.surveyDialog.initSurveyWindowIPC = function (that) {
    ipcMain.on("onSurveyClose", function () {
        that.close();
    });
};

/**
 * A wrapper for the actual survey dialog. This component makes the instantiation
 * of the actual dialog more elegant - the survey dialog is automatically created
 * by the framework when the `onDialogCreate` event is fired. Also, Infusion takes
 * care of destroying any other instances of the survey dialog that may be present
 * before actually creating a new one.
 *
 * Being a wrapper for the survey dialog component, this component has the same
 * interface - it contains the `show`, `hide` and `close` invokers. The former is
 * responsible for firing the event for creating the wrapped component, whereas the
 * latter two simply delegate to the corresponding wrapped component's method (if
 * the component exists).
 */
fluid.defaults("gpii.app.survey", {
    gradeNames: "fluid.component",

    components: {
        surveyDialog: {
            type: "gpii.app.surveyDialog",
            createOnEvent: "onDialogCreate",
            options: {
                config: {
                    surveyUrl: "{arguments}.0",
                    attrs: "{arguments}.1"
                }
            }
        }
    },

    events: {
        onDialogCreate: null
    },

    invokers: {
        show: {
            funcName: "gpii.app.survey.show",
            args: ["{that}", "{arguments}.0"]
        },
        hide: {
            funcName: "gpii.app.survey.hide",
            args: ["{that}"]
        },
        close: {
            funcName: "gpii.app.survey.close",
            args: ["{that}"]
        }
    }
});

/**
 * Responsible for firing the `onDialogCreate` event which in turn creates the
 * wrapped `surveyDialog` component.
 * @param that {Component} The `gpii.app.survey` instance.
 * @param options {Object} An object containing the various properties for the
 * `surveyDialog` which is to be created.
 */
gpii.app.survey.show = function (that, options) {
    that.events.onDialogCreate.fire(options.url, options.window);
};

/**
 * Responsible for hiding the `surveyDialog` component if it exists.
 * @param that {Component} The `gpii.app.survey` instance.
 */
gpii.app.survey.hide = function (that) {
    if (that.surveyDialog) {
        that.surveyDialog.hide();
    }
};

/**
 * Responsible for closing the `surveyDialog` component if it exists.
 * @param that {Component} The `gpii.app.survey` instance.
 */
gpii.app.survey.close = function (that) {
    if (that.surveyDialog) {
        that.surveyDialog.close();
    }
};
