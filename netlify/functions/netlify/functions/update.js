exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY, SHORTCUT_SECRET } = process.env;

  const incoming = event.headers['x-api-key'] || event.headers['X-Api-Key'];
  if (SHORTCUT_SECRET && incoming !== SHORTCUT_SECRET) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { device_id, name, device_type, model, level, charging } = body;
  if (!device_id || level === undefined) {
    return { statusCode: 422, body: JSON.stringify({ error: 'device_id and level are required' }) };
  }

  const payload = {
    device_id,
    name:        name        ?? device_id,
    device_type: device_type ?? 'other',
    model:       model       ?? '',
    level:       Math.min(100, Math.max(0, parseInt(level, 10))),
    charging:    Boolean(charging),
    updated_at:  new Date().toISOString(),
  };

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/devices`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return { statusCode: res.status, body: text };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, device_id, level: payload.level }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
