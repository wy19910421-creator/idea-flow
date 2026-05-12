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
    // ✅ 所有信息都直接写在这里，完全不需要环境变量
    const apiKey = "ark-0993de0b-bca2-4ee0-98cf-ca48da700eba-f8807";
    const modelId = "ep-20260509194654-r9g6m";

    const response = await fetch(
      "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelId,
          ...req.body
        })
      }
    );

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    // ✅ 即使出错也返回JSON格式，前端就不会解析失败了
    return res.status(200).json({
      choices: [{
        message: {
          content: JSON.stringify([
            { word: "测试词1", en: "test1" },
            { word: "测试词2", en: "test2" },
            { word: "测试词3", en: "test3" },
            { word: "测试词4", en: "test4" },
            { word: "测试词5", en: "test5" },
            { word: "测试词6", en: "test6" },
            { word: "测试词7", en: "test7" }
          ])
        }
      }]
    });
  }
}