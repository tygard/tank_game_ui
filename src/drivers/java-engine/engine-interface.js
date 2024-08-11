/* globals process */
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import { logger } from "#platform/logging.js";
import * as boardStateMain from "./board-state-main.js";
import * as boardStateStable from "./board-state-stable.js";
import { JavaEngineSource } from "./possible-action-source.js";
import { JsonCommunicationChannel } from "../json-communication-channel.js";
import { convertLogEntry } from "./log-translator.js";

const TANK_GAME_TIMEOUT = 3; // seconds
const ENGINE_NAME_EXPR = /TankGame-(.+?).jar$/;

function determineEngineVersion(command) {
    const fileName = command
            .map(arg => ENGINE_NAME_EXPR.exec(arg))
            .filter(arg => arg);

    if(fileName.length !== 1) {
        throw new Error("Failed to detect engine version");
    }

    return fileName[0][1];
}

// Put ids on the engines so we can differentiate them in logs
let uniqueIdCounter = 0;

class TankGameEngine {
    constructor(command, timeout, engineVersion) {
        if(!Array.isArray(command) || command.length <= 0) {
            throw new Error(`Expected an array in the form ["command", ...args] but got ${command}`);
        }

        this._id = `java-${++uniqueIdCounter}`;
        this._comm = new JsonCommunicationChannel(command, timeout, this._id);

        // Hacky way to detect if we're using an engine from the main or stable branch
        this._isMainBranch = engineVersion != "0.0.2";
    }

    _runCommand(command, data) {
        if(!data) data = {};

        data["type"] = "command";
        data["command"] = command;

        return this._comm.sendRequestAndWait(data);
    }

    async shutdown() {
        try {
            await this._comm.sendRequestAndWait({
                "type": "command",
                "command": "exit",
            });

            logger.info({ msg: "Exited", id: this._id });
        }
        catch(err) {
            logger.warn({ msg: "Exit command failed", err, id: this._id });
            this._comm.kill();
        }
    }

    getGameStateFromEngineState(state) {
        if(this._isMainBranch) {
            return boardStateMain.gameStateFromRawState(state);
        }
        else {
            return boardStateStable.gameStateFromRawState(state);
        }
    }

    getEngineStateFromGameState(state, gameVersion) {
        if(this._isMainBranch) {
            return boardStateMain.gameStateToRawState(state, gameVersion);
        }
        else {
            return boardStateStable.gameStateToRawState(state);
        }
    }

    async getBoardState() {
        return await this._runCommand("display");
    }

    async getPossibleActions(player) {
        return (await this._comm.sendRequestAndWait({
            type: "possible_actions",
            player,
        })).actions;
    }

    setBoardState(state) {
        return this._comm.sendRequestAndWait({
            type: "state",
            ...state,
        });
    }

    async processAction(action) {
        await this._comm.sendRequestAndWait({
            type: "action",
            ...convertLogEntry(action, this._isMainBranch),
        });

        return this.getBoardState();
    }

    async setGameVersion(version) {
        // Support stable using versions like 3 instead of default-v3
        if(version.startsWith("default-v") && !this._isMainBranch) version = version.slice(9);

        await this._comm.sendRequestAndWait({
            type: "version",
            version,
        });
    }

    getEngineSpecificSource(opts) {
        return new JavaEngineSource(opts);
    }

    async getLineOfSightFor(player) {
        const actions = await this.getPossibleActions(player);
        const shootAction = actions.find(action => action.rule == "shoot");
        if(!shootAction) {
            throw new Error("Failed to find shoot action");
        }

        const targets = shootAction.fields.find(field => field.name == "target");
        if(!targets) {
            return [];
        }

        return targets.range;
    }
}

export function getAllEngineFactories() {
    const ENGINE_SEARCH_DIR = process.env.TANK_GAME_ENGINE_SEARCH_DIR || "engine";

    return fs.readdirSync(ENGINE_SEARCH_DIR)
        .filter(file => file.endsWith(".jar"))
        .map(jar => ["java", "-jar", path.join(ENGINE_SEARCH_DIR, jar)])
        .map(command => new EngineFactory(command));
}

class EngineFactory {
    constructor(engineCommand) {
        this._engineCommand = engineCommand;
        this._collectVersionInfo();
    }

    _collectVersionInfo() {
        try {
            const proc = spawnSync(this._engineCommand[0], this._engineCommand.slice(1).concat(["--version"]));
            this._versionInfo = JSON.parse(proc.stdout.toString());
        }
        catch(err) {
            logger.warn({ msg: "Failed to dynamically determine engine version", err });

            const version = determineEngineVersion(this._engineCommand);

            // Support legacy engines
            this._versionInfo = {
                version,
                pretty_version: `Engine ${version}`,
                // All versions that don't support --version support versions 3 and 4
                supported_rulesets: ["default-v3", "default-v4"],
            };
        }
    }

    createEngine() {
        return new TankGameEngine(this._engineCommand, TANK_GAME_TIMEOUT, this._versionInfo.version);
    }

    getEngineVersion() {
        return this._versionInfo.pretty_version;
    }

    getSupportedGameVersions() {
        return this._versionInfo.supported_rulesets;
    }
}