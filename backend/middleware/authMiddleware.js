import admin from "firebase-admin";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require("../firebase-service-account (1).json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  admin.auth().verifyIdToken(token)
    .then((decodedToken) => {
      req.user = { uid: decodedToken.uid };
      next();
    })
    .catch((error) => {
      console.error("❌ Token verification error:", error);
      res.status(401).json({ success: false, message: "Unauthorized token" });
    });
}
