// Helper for combining webpack config objects
const webpack = require("webpack");
const { merge } = require("webpack-merge");
const { composePlugins, withNx } = require("@nx/webpack");

module.exports = composePlugins(withNx(), (config) => {
    return merge(config, {
        plugins: [
            new webpack.BannerPlugin({ banner: "#!/usr/bin/env node", raw: true }),
        ],
    });
});
