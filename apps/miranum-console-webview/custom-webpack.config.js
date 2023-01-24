// Helper for combining webpack config objects
const { merge } = require('webpack-merge');

module.exports = (config, context) => {
    config.resolve.fallback = {
        fs: false,
        path: false
    }

    return merge(config, {});
};
