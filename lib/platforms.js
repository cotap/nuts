import _ from 'lodash';
import path from 'path';

const platforms = {
    LINUX: 'linux',
    LINUX_32: 'linux_32',
    LINUX_64: 'linux_64',
    OSX: 'osx',
    OSX_32: 'osx_32',
    OSX_64: 'osx_64',
    WINDOWS: 'windows',
    WINDOWS_32: 'windows_32',
    WINDOWS_64: 'windows_64',

    detect: detectPlatform
};

// Reduce a platfrom id to its type
function platformToType(platform) {
    return _.first(platform.split('_'));
}

// Detect and normalize the platform name
function detectPlatform(platform) {
    const name = platform.toLowerCase();
    let prefix = "", suffix = "";

    // Detect NuGet/Squirrel.Windows files
    if (name == 'releases' || path.extname(name) == '.nupkg') return platforms.WINDOWS_32;

    // Detect prefix: osx, widnows or linux
    if (_.includes(name, 'win')
        || path.extname(name) == '.exe') prefix = platforms.WINDOWS;

    if (_.includes(name, 'linux')
        || _.includes(name, 'ubuntu')
        || path.extname(name) == '.deb'
        || path.extname(name) == '.rpm') prefix = platforms.LINUX;

    if (_.includes(name, 'mac')
        || _.includes(name, 'osx')
        || name.indexOf('darwin')  >= 0) prefix = platforms.OSX;

    // Detect suffix: 32 or 64
    if (_.includes(name, '32')
        || _.includes(name, 'ia32')
        || _.includes(name, 'i386')) suffix = '32';
    if (_.includes(name, '64') || _.includes(name, 'x64') || _.includes(name, 'amd64')) suffix = '64';

    suffix = suffix || (prefix == platforms.OSX? '64' : '32');
    return _.compact([prefix, suffix]).join('_');
}

// Satisfies a platform
function satisfiesPlatform(platform, list) {
    if (_.includes(list, platform)) return true;

    // By default, user 32bits version
    if (_.includes(list+'_32', platform)) return true;

    return false;
}

// Resolve a platform for a version
function resolveForVersion(version, platformID, opts) {
    opts = _.defaults(opts || {}, {
        // Order for filetype
        filePreference: ['.exe', '.dmg', '.deb', '.rpm', '.zip', '.nupkg'],
        wanted: null
    });

    // Prepare file prefs
    if (opts.wanted) opts.filePreference = _.uniq([opts.wanted].concat(opts.filePreference));

    // Normalize platform id
    platformID = detectPlatform(platformID);

    return _.chain(version.platforms)
        .filter(function(pl) {
            return pl.type.indexOf(platformID) === 0;
        })
        .sort(function(p1, p2) {
            let result = 0;

            // Compare by arhcitecture ("osx_64" > "osx")
            if (p1.type.length > p2.type.length) result = -1;
            else if (p2.type.length > p1.type.length) result = 1;

            // Order by file type if samee architecture
            if (result == 0) {
                const ext1 = path.extname(p1.filename);
                const ext2 = path.extname(p2.filename);
                let pos1 = _.indexOf(opts.filePreference, ext1);
                let pos2 = _.indexOf(opts.filePreference, ext2);

                pos1 = pos1 == -1? opts.filePreference.length : pos1;
                pos2 = pos2 == -1? opts.filePreference.length : pos2;

                if (pos1 < pos2) result = -1;
                else if (pos2 < pos1) result = 1;
            }
            return result;
        })
        .first()
        .value()
}

const exported = platforms;
export default exported;
export { detectPlatform as detect, satisfiesPlatform as satisfies, platformToType as toType, resolveForVersion as resolve };
