// workers/visit-counter.js - Simple KV increment for visitor count
export default {
  async fetch(request, env) {
    const countKey = 'visit_count';
    let count = parseInt(await env.PYTHIA_TOP50_KV.get(countKey) || '0');
    count++;
    await env.PYTHIA_TOP50_KV.put(countKey, count.toString());
    return new Response(JSON.stringify({ count }), { headers: { 'Content-Type': 'application/json' } });
  }
};
