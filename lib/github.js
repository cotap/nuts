import _ from 'lodash';
import Q from 'q';
import destroy from 'destroy';
import { Octokit } from '@octokit/rest';
import request from 'got';
import { Buffer } from 'buffer';

export default function(opts) {
    // Create an API client
    let client, ghrepo, cacheInstance = 0;

    if (opts.token) {
        client = new Octokit({ auth: opts.token });
    } else if (opts.username && opts.password) {
        // Octokit does not support username/password directly; recommend using a personal access token.
        throw new Error('Octokit requires a personal access token for authentication.');
    } else {
        client = new Octokit();
    }

    // List releases
    function listReleases(page) {
        page = page || 1;

        console.log('list releases', page);

        return client.repos.listReleases({
            owner: opts.repository.split('/')[0],
            repo: opts.repository.split('/')[1],
            page: page,
            per_page: 100
        }).then(({ data, headers }) => {
            const hasNext = (headers.link || "").search('rel="next"') >= 0;
            if (!hasNext) return data;

            return listReleases(page + 1)
                .then(function(r) {
                    return data.concat(r);
                });
        });
    }

    const cacheListReleases = _.memoize(listReleases, function() {
        return cacheInstance+Math.ceil(Date.now()/opts.timeout)
    });

    function clearCache() {
        cacheInstance = cacheInstance + 1;
    }

    // Stream a download to res
    function streamAsset(uri) {
        const headers = {
            'User-Agent': "releaser-server",
            'Accept': "application/octet-stream"
        };
        let httpAuth = null;

        if (opts.token) {
          headers['Authorization'] = 'token '+opts.token;
        } else if (opts.username) {
          httpAuth = {
            user: opts.username,
            pass: opts.password,
            sendImmediately: true
          };
        }

        return request({
            uri: uri,
            method: 'get',
            headers: headers,
            auth: httpAuth
        });
    }

    // Read a asset
    function readAsset(uri) {
        const d = Q.defer();
        let output = Buffer([]);
        const res = streamAsset(uri);

        const cleanup = function() {
            destroy(res);
            res.removeAllListeners();
        };

        res
        .on('data', function(buf) {
            output = Buffer.concat([output, buf]);
        })
        .on('error', function(err) {
            cleanup();
            d.reject(err);
        })
        .on('end', function() {
            cleanup();
            d.resolve(output);
        });

        return d.promise
    }

    return {
        clearCache: clearCache,
        releases: cacheListReleases,
        streamAsset: streamAsset,
        readAsset: readAsset
    };
}

