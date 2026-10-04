import { getStore } from "@netlify/blobs";

const STORE_NAME = "supertrunfo-rooms";

export function store() {
  return getStore(STORE_NAME);
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I, evita confusao

export function genCode() {
  let code = "";
  for (let i = 0; i < 5; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

export function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
