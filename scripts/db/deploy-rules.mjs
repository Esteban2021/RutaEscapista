import { config } from "dotenv";
import admin from "firebase-admin";
import { readFileSync } from "fs";
import { resolve } from "path";

config({ path: ".env.local" });

const serviceAccount = JSON.parse(
  readFileSync(resolve("scripts/db/rutas-punt0defuga-firebase-adminsdk-fbsvc-b226d2d948.json"), "utf-8")
);
const credential = admin.credential.cert(serviceAccount);
const { access_token } = await credential.getAccessToken();
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const base = `https://firebaserules.googleapis.com/v1/projects/${projectId}`;
const headers = { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" };

async function deployRules(filePath, releaseName, label) {
  const content = readFileSync(resolve(filePath), "utf-8");

  // 1. Crear nuevo ruleset
  const createRes = await fetch(`${base}/rulesets`, {
    method: "POST",
    headers,
    body: JSON.stringify({ source: { files: [{ name: filePath, content }] } }),
  });
  const ruleset = await createRes.json();
  if (!ruleset.name) {
    console.error(`❌ ${label} — error al crear ruleset:`, JSON.stringify(ruleset, null, 2));
    return;
  }
  console.log(`✅ ${label} — ruleset creado: ${ruleset.name}`);

  // 2. Actualizar el release para apuntar al nuevo ruleset
  const patchRes = await fetch(`${base}/releases/${encodeURIComponent(releaseName)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ release: { name: `projects/${projectId}/releases/${releaseName}`, rulesetName: ruleset.name } }),
  });
  const release = await patchRes.json();
  if (release.name) {
    console.log(`✅ ${label} — release actualizado`);
  } else {
    console.error(`❌ ${label} — error al actualizar release:`, JSON.stringify(release, null, 2));
  }
}

await deployRules("firestore.rules", "cloud.firestore/punt0defuga", "Firestore");
await deployRules("storage.rules", "firebase.storage/rutas-punt0defuga.firebasestorage.app", "Storage");

console.log("\n🎉 Reglas publicadas");
