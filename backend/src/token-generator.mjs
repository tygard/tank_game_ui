import jwt from "jsonwebtoken";

const jwtSigningKey = process.env.JWT_SIGNING_KEY;
if(!jwtSigningKey) {
    console.log("Environment variable JWT_SIGNING_KEY is required.  You can generate one with require('crypto').randomBytes(128).toString('hex').");
    process.exit(1);
}

if(process.argv.length <= 2) {
    console.log("Usage: token-generator.mjs <user>");
    process.exit(1);
}

const username = process.argv[2];

const token = jwt.sign({ username }, jwtSigningKey);

console.log(`Token: ${token}`);

const baseUrl = process.env.BASE_URL;
if(baseUrl) {
    console.log(`Url: ${baseUrl}/?token=${token}`);
}