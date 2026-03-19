import fetch from "node-fetch";

const BASE_URL = process.env.CRUD_DETECTOR_URL_BASE || "http://crud-detector-api:8089";

export async function detectCrud(prompt) {
  try {
    const resp = await fetch(`${BASE_URL}/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: prompt })
    });

    if (!resp.ok) throw new Error(`CRUD-DETECTOR /detect error ${resp.status}`);
    const data = await resp.json();
    
    return data.is_crud === true;
  } catch (err) {
    console.error("[CRUD-DETECTOR] detectCrud error:", err);
    return false;
  }
}

export async function classifyIntent(prompt) {
  try {
    const resp = await fetch(`${BASE_URL}/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: prompt })
    });

    if (!resp.ok) throw new Error(`CRUD-DETECTOR /classify error ${resp.status}`);
    const data = await resp.json();
    
    return data.intent?.toLowerCase() || "otro";
  } catch (err) {
    console.error("[CRUD-DETECTOR] classifyIntent error:", err);
    return "otro";
  }
}
