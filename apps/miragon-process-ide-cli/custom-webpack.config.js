// Helper for combining webpack config objects
const {merge} = require("webpack-merge");

module.exports = (config, context) => {
    return merge(config, {
        // overwrite values here
        devtool: 'inline-source-map',
        resolve: {
            extensions: ['.js', '.jsx', '.ts', '.tsx']
        },
        optimization: {
            minimize: true
        }
    });
};
