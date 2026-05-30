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
const databaseId = "punt0defuga";
const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}`;
const headers = { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" };

const { fieldOverrides } = JSON.parse(readFileSync(resolve("firestore.indexes.json"), "utf-8"));

for (const { collectionGroup, fieldPath, indexes } of fieldOverrides) {
  const url = `${base}/collectionGroups/${collectionGroup}/fields/${fieldPath}?updateMask=indexConfig`;

  const body = {
    indexConfig: {
      indexes: indexes.map(({ queryScope, arrayConfig, order }) => ({
        queryScope,
        fields: [
          {
            fieldPath,
            ...(arrayConfig ? { arrayConfig } : { order }),
          },
        ],
      })),
    },
  };

  const res = await fetch(url, { method: "PATCH", headers, body: JSON.stringify(body) });
  const data = await res.json();

  if (data.name) {
    console.log(`✅ ${collectionGroup}.${fieldPath} — configurado`);
  } else {
    console.error(`❌ ${collectionGroup}.${fieldPath} — error:`, JSON.stringify(data, null, 2));
  }
}

console.log("\nLos cambios de índice tardan ~1 min en estar disponibles.");
