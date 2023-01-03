// Helper for combining webpack config objects
const webpack = require('webpack');
const { merge } = require('webpack-merge');

module.exports = (config, context) => {
    return merge(config, {
        plugins: [
            new webpack.BannerPlugin({ banner: "#!/usr/bin/env node", raw: true }),
        ]
    });
};
