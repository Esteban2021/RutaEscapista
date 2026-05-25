import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

export async function uploadSalaImage(
  salaId: string,
  type: "card" | "original",
  blob: Blob,
  ext: string
): Promise<string> {
  const filename = type === "card" ? `main.jpg` : `original.${ext}`;
  const storageRef = ref(storage, `salas/${salaId}/${filename}`);
  const snap = await uploadBytes(storageRef, blob, {
    contentType: type === "card" ? "image/jpeg" : blob.type || "image/jpeg",
  });
  return getDownloadURL(snap.ref);
}

export async function uploadAvatar(
  uid: string,
  type: "main" | "original",
  blob: Blob,
  ext: string
): Promise<string> {
  const filename = type === "main" ? `main.jpg` : `original.${ext}`;
  const storageRef = ref(storage, `avatars/${uid}/${filename}`);
  const snap = await uploadBytes(storageRef, blob, {
    contentType: type === "main" ? "image/jpeg" : blob.type || "image/jpeg",
  });
  return getDownloadURL(snap.ref);
}
