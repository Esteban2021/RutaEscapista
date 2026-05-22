import { config } from "dotenv";
import admin from "firebase-admin";
import { readFileSync } from "fs";
import { resolve } from "path";

config({ path: ".env.local" });

const serviceAccount = JSON.parse(
  readFileSync(resolve("scripts/db/rutas-punt0defuga-firebase-adminsdk-fbsvc-b226d2d948.json"), "utf-8")
);

const credential = admin.credential.cert(serviceAccount);
const token = await credential.getAccessToken();

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// Obtener el release activo de Firestore
const releasesRes = await fetch(
  `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`,
  { headers: { Authorization: `Bearer ${token.access_token}` } }
);
const releases = await releasesRes.json();

console.log("Releases disponibles:", JSON.stringify(releases.releases?.map(r => ({ name: r.name, ruleset: r.rulesetName })), null, 2));

if (!releases.releases?.length) {
  console.log("No hay releases desplegados aún.");
  process.exit(0);
}

// Obtener ambos rulesets (Firestore + Storage)
for (const release of releases.releases) {
  const rsRes = await fetch(
    `https://firebaserules.googleapis.com/v1/${release.rulesetName}`,
    { headers: { Authorization: `Bearer ${token.access_token}` } }
  );
  const rs = await rsRes.json();
  console.log(`\n========== ${release.name} ==========`);
  for (const file of rs.source?.files ?? []) {
    console.log(file.content);
  }
}
process.exit(0);
const rulesetName = releases.releases[0].rulesetName;
console.log("Ruleset activo:", rulesetName, "\n");

// Obtener el contenido del ruleset
const rulesetRes = await fetch(
  `https://firebaserules.googleapis.com/v1/${rulesetName}`,
  { headers: { Authorization: `Bearer ${token.access_token}` } }
);
const ruleset = await rulesetRes.json();

for (const file of ruleset.source?.files ?? []) {
  console.log(`=== ${file.name} ===`);
  console.log(file.content);
}
