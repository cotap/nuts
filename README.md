# Nuts

Nuts is a simple (and smart) application to serve desktop-application releases.

![Schema](./schema.png)

It uses GitHub as a backend to store assets, and it can easily be deployed to Heroku as a stateless service. It supports GitHub private repositories (useful to store releases of a closed-source application available on GitHub).

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

#### Features

- :sparkles: Store assets on GitHub releases
- :sparkles: Proxy releases from private repositories to your users
- :sparkles: Simple but powerful download urls
    - `/download/latest`
    - `/download/latest/:os`
    - `/download/:version`
    - `/download/:version/:os`
    - `/download/channel/:channel`
    - `/download/channel/:channel/:os`
- :sparkles: Support pre-release channels (`beta`, `alpha`, ...)
- :sparkles: Auto-updates with [Squirrel](https://github.com/Squirrel)
    - For Mac using `/update?version=<x.x.x>&platform=osx`
    - For Windows using Squirrel.Windows and Nugets packages
- :sparkles: Private API
- :sparkles: Use it as a middleware: add custom analytics, authentication
- :sparkles: Serve the perfect type of assets: `.zip` for Squirrel.Mac, `.nupkg` for Squirrel.Windows, `.dmg` for Mac users, ...
- :sparkles: Release notes endpoint
    - `/notes/:version`
- :sparkles: Up-to-date releases (GitHub webhooks)

#### Deploy it / Start it

Install dependencies using:

```
$ npm install
```

This service requires to be configured using environment variables:

```
# Set the port for the service (default is 5000)
$ export PORT=6000

# Set the host for the service (default is 0.0.0.0)
$ export HOST=127.0.0.1

# Set a base URL for the service (default is '/')
$ export BASE_URL=/release

# Access token for the GitHub API (requires permissions to access the repository)
# If the repository is public you do not need to provide an access token
# you can also use GITHUB_USERNAME and GITHUB_PASSWORD
$ export GITHUB_TOKEN=...

# ID for the GitHub repository
$ export GITHUB_REPO=Username/MyApp

# Secret for GitHub webhook (default is 'secret')
$ export GITHUB_WEBHOOK_SECRET=somethingsupersecret

# Authentication for the private API
$ export API_USERNAME=hello
$ export API_PASSWORD=world
```

Then start the application using:

```
$ npm start
```

#### Assets for releases

Nuts uses some filename/extension conventions to serve the correct asset to a specific request:

Platform will be detected from the filename:

- Windows: filename should contain `win`
- Mac/OS X: filename should contain `mac` or `osx`
- Linux: filename should contain `linux`

By default releases are tagged as 32-bits (except for OSX), but 64-bits will also be detected from filenames.

Filetype and usage will be detected from the extension:

- `.dmg` will be served in priority to Mac users
- `.nupkg` will only be served to Squirrel.Windows requests
- Otherwise, `.zip` are advised (Linux, Mac, Windows and Squirrel.Mac)

#### Download urls

Nuts provides urls to access releases assets. These assets are cached on the disk.

* Latest version for detected platform: `http://download.myapp.com/download/latest` or `http://download.myapp.com/download`
* Latest version for specific platform: `http://download.myapp.com/download/latest/osx` or ``http://download.myapp.com/download/osx`
* Specific version for detected platform: `http://download.myapp.com/download/1.1.0`
* Specific version for specific platform: `http://download.myapp.com/download/1.2.0/osx`
* Specific channel: `http://download.myapp.com/download/channel/beta`
* Specific channel for specific platform: `http://download.myapp.com/download/channel/beta/osx`

#### Platforms

Platforms can be detected from user-agent and are normalized to values: `osx`, `osx_32`, `osx_64`, `linux`, `linux_32`, `linux_64`, `windows`, `windows_32`, `windows_64`.

Non-prefixed platform will be resolve to 32 bits (except for OSX).

#### Auto-updater / Squirrel

This server provides an endpoint for [Squirrel auto-updater](https://github.com/atom/electron/blob/master/docs/api/auto-updater.md): `http://download.myapp.com/update/osx/:currentVersion`.

###### Squirrel.Mac

This url requires different parameters to return a correct version: `version` and `platform`.

For example with Electron's `auto-updater` module:

```js
var app = require('app');
var os = require('os');
var autoUpdater = require('auto-updater');

var platform = os.platform() + '_' + os.arch();
var version = app.getVersion();

autoUpdater.setFeedUrl('http://download.myapp.com/update/'+platform+'/'+version);
```

###### Squirrel.Windows

Nuts will serve NuGet packages on `http://download.myapp.com/update/win32/:version/RELEASES`.

Your application just need to configurer `Update.exe` or `Squirrel.Windows` to use `http://download.myapp.com/update/win32/:version` as a feed url (:warning: without query parameters).

You'll just need to upload as release assets: `RELEASES`, `*-delta.nupkg` and `-full.nupkg` (files generated by `Squirrel.Windows` releaser).

##### Channel Updates

Nuts lets you manage updates for non-stable release channels.

By default Nuts will only look for newer versions related to the same primary version as the current version which on the same or higher precedence channel. (Nuts uses the [node-semver module](https://github.com/npm/node-semver) to compare version tags.)

```
// Given versions 1.2.3-alpha.1, 1.2.3-beta.1
GET http://download.myapp.com/update/osx/1.2.3-alpha.1
// Returns download info for 1.2.3-beta.1

// Given versions 1.2.3-alpha.1, 1.2.3-beta.1, 1.2.3, 1.2.4-alpha.1
GET http://download.mayapp.com/update/osx/1.2.3-alpha.1
// Returns download info for 1.2.3
```

You can override this behavior and tell Nuts to check updates only on a given channel regardless of which primary version they are related to by appending a channel query parameter after the update URL.

```
// Given versions 1.2.3-alpha.1, 1.2.3-beta.1, 1.2.3, 1.2.4-alpha.1
GET http://download.mayapp.com/update/osx/1.2.3-alpha.1?channel=alpha
// Returns download info for 1.2.4-alpha.1
```

#### ChangeLog

Nuts provides a `/notes` endpoint that output release notes as text or json.

#### Private API

A private API is available to access more infos about releases and stats. This API can be protected by HTTP basic auth (username/password) using configuration `API_USERNAME` and `API_PASSWORD`.

List versions:

```
GET http://download.myapp.com/api/versions
```

Get details about specific version:

```
GET http://download.myapp.com/api/version/1.1.0
```

Resolve a version:

```
GET http://download.myapp.com/api/resolve?platform=osx&channel=alpha
```

List channels:

```
GET http://download.myapp.com/api/channels
```

Get stats about downloads:

```
GET http://download.myapp.com/api/stats
```

#### GitHub Webhook

Add `http://download.myapp.com/refresh` as a GitHub webhook to refresh versions cache everytime you update a release on GitHub.

The secret can be configured using `GITHUB_SECRET` (default value is `secret`).

#### Integrate it as a middleware

Nuts can be integrated into a Node.JS application as a middleware. Using the middleware, you can add custom authentication on downloads or analytics for downloads counts.

```js
var express = require('express');
var Nuts = require('nuts-serve');

var app = express();
var nuts = Nuts(
    // GitHub configuration
    repository: "Me/MyRepo",
    token: "my_api_token",

    // Timeout for releases cache (seconds)
    timeout: 60*60,

    // Folder to cache assets (by default: a temporary folder)
    cache: './assets',

    // Pre-fetch list of releases at startup
    preFetch: true,

    // Secret for refresh webhook
    refreshSecret: 'my-secret',

    // Middlewares
    onDownload: function(version, req, res, next) {
        console.log('download', download.version.tag, "on channel", download.version.channel, "for", download.platform.type);
        next();
    },
    onAPIAccess: function(req, res, next) {
        next();
    }
);

app.use('/myapp', nuts);
app.listen(4000);
```
