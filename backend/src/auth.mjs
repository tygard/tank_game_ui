import jwt from "jsonwebtoken";
import { getLogger } from "./logging.mjs";

const LONG_TIME = 365 * 24 * 60 * 60;  // 1 year in seconds

const logger = getLogger(import.meta.url);
const jwtSigningKey = process.env.JWT_SIGNING_KEY;

if(!jwtSigningKey) {
    logger.error("Environment variable JWT_SIGNING_KEY is required.  You can generate one with require('crypto').randomBytes(128).toString('hex').");
    process.exit(1);
}

export default function authMiddleware(req, res, next) {
    const token = req.query.token || req.cookies.token;

    // No token no access
    if(!token) {
        req.log.info("No token");
        res.writeHead(403);
        res.write("Not authorized");
        res.end();
        return;
    }

    jwt.verify(token, jwtSigningKey, (err, payload) => {
        // Bad token definitely no access
        if(err) {
            req.log.warn("Failed to verify token", { token, err });
            res.writeHead(403);
            res.write("Not authorized");
            res.end();
            return;
        }

        req.tokenData = payload;

        // Token came from the url make it a cookie
        if(req.query.token) {
            res.cookie("token", token, {
                httpOnly: true,
                maxAge: LONG_TIME
            });
        }

        next();
    });
};