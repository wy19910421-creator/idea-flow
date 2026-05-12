export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = "ark-0993de0b-bca2-4ee0-98cf-ca48da700eba-f8807";

    const response = await fetch(
      "https://ark.cn-beijing.volces.com/api/v3/images/generations",
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "doubao-image-v1",
          prompt: req.body.prompt,
          n: 1,
          size: "1024x1024",
          response_format: "b64_json"
        })
      }
    );

    const data = await response.json();
    return res.status(200).json({
      predictions: [{ bytesBase64Encoded: data.data[0].b64_json }]
    });
  } catch (error) {
    return res.status(200).json({
      predictions: [{ bytesBase64Encoded: "" }]
    });
  }
}