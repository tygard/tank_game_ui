const path = require("path");
const childProcess = require("child_process");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const packageJson = require("./package.json");
const { DefinePlugin } = require("webpack");

// Collect version info
const gitRevision = childProcess.spawnSync("git rev-parse --short HEAD", { shell: true })
    .stdout.toString("utf-8")
    .replace(/(\r|\n)/g, "");

const version = `TankGameUI v${packageJson.version} @ ${gitRevision}`;


module.exports = {
    mode: process.env.NODE_ENV ?? "development",
    devtool: "source-map",
    entry: "./src/index.jsx",
    output: {
        path: path.resolve(__dirname, "build"),
        filename: "tank-game.js",
    },
    plugins: [
        new DefinePlugin({
            "APP_VERSION": `"${version}"`,
        }),
        new HtmlWebpackPlugin({ title: "Tank Game" }),
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, "public"),
        },
        port: process.env["port"] ?? 3000,
        proxy: [
            {
                context: ["/api/"],
                target: "http://localhost:3333",
            }
        ]
    },
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: [
                            ["@babel/preset-env", { targets: "defaults" }]
                        ],
                        plugins: [
                            ["@babel/plugin-transform-react-jsx", {
                                "runtime": "automatic",
                                "importSource": "preact",
                            }]
                        ]
                    }
                }
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"],
            },
        ]
    },
    resolve: {
        alias: {
            "react": "preact/compat",
            "react-dom/test-utils": "preact/test-utils",
            "react-dom": "preact/compat",
            "react/jsx-runtime": "preact/jsx-runtime"
        },
    }
};
