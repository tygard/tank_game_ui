import fs from "node:fs";
import fsPromise from "node:fs/promises";
import crypto from "node:crypto";

export async function readJson(path) {
    return JSON.parse(await fsPromise.readFile(path, "utf-8"));
}

export async function writeJson(path, data) {
    return await fsPromise.writeFile(path, JSON.stringify(data, null, 4));
}

export function hashFile(filePath) {
    return new Promise((resolve) => {
        let hashStream = crypto.createHash("sha256");
        let fileStream = fs.createReadStream(filePath);

        fileStream.on("end", function() {
            hashStream.end();
            resolve(hashStream.read().toString("hex"));
        });

        fileStream.pipe(hashStream);
    });
}
