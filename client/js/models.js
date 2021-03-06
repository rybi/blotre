"use strict";
const slice = Function.prototype.call.bind(Array.prototype.slice);

export const DEFAULT_COLOR = "#777777";

/**
 */
export const normalizeUri = function(uri) {
    return decodeURI(uri)
        .trim()
        .toLowerCase()
        .replace(' ', '/');
};

/**
    Pretty prints a data.
*/
export const dateToDisplay = (function() {
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    var pad = function(min, input) {
        input += '';
        while (input.length < min)
            input = '0' + input;
        return input;
    };

    return function(date) {
        if (!date)
            return '-';

        return months[date.getMonth()] + ' ' + pad(2, date.getDate()) + ', ' + date.getFullYear() + ' ' +
            pad(2, date.getHours()) + ':' + pad(2, date.getMinutes()) + '.' +
            pad(2, date.getSeconds()) + pad(3, date.getMilliseconds());
    };
}());

/**
 */
export const StatusModel = function(color) {
    var self = this;
    self.color = ko.observable(color);
};

StatusModel.empty = function() {
    return new StatusModel(DEFAULT_COLOR);
};

StatusModel.fromJson = function(data) {
    return new StatusModel(data && data.color);
};

/**
 */
export const TagModel = function(value) {
    var self = this;
    self.value = ko.observable(value);

    self.url = ko.computed(function() {
        return jsRoutes.controllers.Stream.getTag(self.value()).url;
    });
};

/**
 */
const PathComponent = function(name, uri) {
    const self = this;
    self.name = ko.observable(name);
    self.uri = ko.observable('/s' + uri);
};

/**
 */
export const StreamModel = function(id, name, uri, status, updated, tags) {
    var self = this;
    self.id = ko.observable(id);
    self.name = ko.observable(name || '');
    self.uri = ko.observable(uri || '');
    self.status = ko.observable(status || StatusModel.empty());
    self.updated = ko.observable(updated);
    self.tags = ko.observableArray(tags || []);

    self.url = ko.computed(function() {
        return jsRoutes.controllers.Stream.getStream(self.uri()).url;
    });

    self.color = ko.computed(function() {
        var status = self.status();
        return (status ? status.color() : DEFAULT_COLOR);
    });

    self.setColor = function(color) {
        var status = self.status() || StatusModel.empty();
        status.color(color);
        self.status(status);
    };

    self.displayUpdated = ko.computed(function() {
        return dateToDisplay(self.updated());
    });

    self.isOwner = (user) => {
        isOwner(user, self.uri());
    };

    self.pathComponents = ko.computed(function() {
        const paths = [];
        self.uri().split('/').reduce((path, c) => {
            path += '/' + c;
            paths.push(new PathComponent(c, path));
            return path;
        }, '');
        return paths;
    });
};

StreamModel.fromJson = function(data) {
    return new StreamModel(
        data && data.id,
        data && data.name,
        data && data.uri,
        StatusModel.fromJson(data && data.status),
        new Date(data && data.updated), (data && data.tags || []).map(function(x) {
            return new TagModel(x.tag);
        }));
};

/**
 */
export const UserModel = function(userName, status, rootStream) {
    var self = this;
    self.userName = ko.observable(userName || '');
    self.status = ko.observable(status || StatusModel.empty());
    self.rootStream = ko.observable(rootStream);

    self.color = ko.computed(function() {
        var status = self.status();
        return (status ? status.color() : DEFAULT_COLOR);
    });
};

UserModel.fromJson = function(data) {
    return new UserModel(
        data && data.userName,
        StatusModel.fromJson(data && data.status),
        data && data.rootStream);
};

/**
 */
export const Collection = function(uri) {
    var self = this;
    self.uri = ko.observable(uri);
    self.children = ko.observableArray();

    self.addChild = function(child) {
        self.children.remove(function(x) {
            return x.uri() === child.uri();
        });
        self.children.unshift(child);
    };
};

/**
    Is `parentUri` the root of `uri`?
*/
export const isHierarchical = (parentUri, uri) => {
    parentUri = normalizeUri(parentUri);
    if (parentUri === uri)
        return true;

    const index = uri.lastIndexOf('/');
    return (index >= 0 && parentUri === uri.slice(0, index));
};

/**
    Is `uri` the uri of a root stream?
*/
export const isRootStream = uri => {
    return (uri.indexOf('/') === -1);
};

/**
    Simple check to see if `user` owns `streamUri`. Just used for UI stuff,
    not security.
*/
export const isOwner = (user, streamUri) => {
    if (!user || !user.userName())
        return false;

    const ownerUri = normalizeUri(user.userName());
    return (ownerUri === streamUri || streamUri.indexOf(ownerUri + '/') === 0);
};
