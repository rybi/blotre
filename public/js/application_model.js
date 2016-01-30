'use strict';

define(['./models', './stream_manager'], function (models, stream_manager) {
    "use-strict";

    /**
    */

    var AppViewModel = function AppViewModel(user, page) {
        var self = this;
        self.user = ko.observable(user);
        self.page = ko.observable(page);
        self.favorites = ko.observable(new models.Collection(user.userName()));

        self.manager = new stream_manager.StreamManager();

        self.addFavorite = function (child) {
            self.favorites().addChild(child);
        };

        self.removeFavorite = function (childUri) {
            return self.favorites().children.remove(function (x) {
                return x.uri() === childUri;
            });
        };

        // Subscribe to user status updates
        self.manager.subscribe(user.userName(), {
            'StatusUpdated': function StatusUpdated(msg) {
                self.user().status(new models.StatusModel(msg.status.color));
            }
        });

        if (!user || !user.rootStream()) return;

        $.ajax({
            type: "GET",
            url: jsRoutes.controllers.StreamApiController.apiGetChildren(user.rootStream()).url,
            headers: {
                accept: "application/json"
            },
            error: function error(e) {
                console.error(e);
            }
        }).done(function (result) {
            self.favorites().children((result || []).map(models.StreamModel.fromJson));
        });

        // Subscribe to user collection updates
        self.manager.subscribeCollection(user.userName(), {
            'StatusUpdated': function StatusUpdated(msg) {
                var existingChild = self.removeFavorite(msg.from);
                if (existingChild.length) {
                    existingChild[0].status(models.StatusModel.fromJson(msg.status));
                    self.addFavorite(existingChild[0]);
                }
            },
            'ChildAdded': function ChildAdded(msg) {
                self.addFavorite(models.StreamModel.fromJson(msg.child));
            },
            'ChildRemoved': function ChildRemoved(msg) {
                self.removeFavorite(msg.child);
            }
        });
    };

    var initialUser = function initialUser() {
        return models.UserModel.fromJson(window.initialUserData);
    };

    return {
        AppViewModel: AppViewModel,
        initialUser: initialUser
    };
});
//# sourceMappingURL=application_model.js.map
