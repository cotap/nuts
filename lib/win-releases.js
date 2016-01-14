var _ = require('lodash');
var semver = require('semver');
var stripBom = require('strip-bom');

// RELEASES parsing
var releaseRe = /^([0-9a-fA-F]{40})\s+(\S+)\s+(\d+)[\r]*$/;
var suffixRe = /(-full|-delta)?\.nupkg/;
var versionRe = /\d+(\.\d+){0,3}(-[a-z][0-9a-z-\.]*$)?$/;
var prereleaseRe = /-[a-z][0-9a-z-\.]*$/;

// Parse RELEASES file
// https://github.com/Squirrel/Squirrel.Windows/blob/2cc6bfe3c51d0cd0a56511deb8bdab8172aed409/src/Squirrel/ReleaseExtensions.cs#L13-L14
function parseRELEASES(content) {
    return _.chain(stripBom(content))
        .replace('\r\n', '\n')
        .split('\n')
        .map(function(line) {
            var parts = releaseRe.exec(line);
            if (!parts) return null;

            var filename = parts[2];
            var isDelta = filename.indexOf('-full.nupkg') == -1;
            var version = _.chain(
                        filename
                        .replace(suffixRe, '')
                        .match(versionRe)
                )
                .thru(function(matchResult) {
                    return matchResult ? matchResult[0] : '';
                })
                .replace(prereleaseRe, function(prerelease) {
                    // NuGet doesn't support dots in prereleases
                    // https://docs.nuget.org/create/versioning#user-content-prerelease-versions
                    return prerelease.replace(/\./g, '');
                })
                .value();

                if (!version) throw new Error('Release missing valid version: ' + filename);

            return {
                sha: parts[1],
                filename: filename,
                size: Number(parts[3]),
                isDelta: isDelta,
                version: version
            };
        })
        .compact()
        .value();
}

// Generate a RELEASES file
function generateRELEASES(entries) {
    return _.map(entries, function(entry) {
        var filename = entry.filename;

        if (!filename) {
            filename = [
                entry.app,
                entry.version,
                entry.isDelta? 'delta.nupkg' : 'full.nupkg'
            ].join('-');
        }

        return [
            entry.sha,
            filename,
            entry.size
        ].join(' ');
    })
    .join('\n');
}

module.exports = {
    parse: parseRELEASES,
    generate: generateRELEASES
};
