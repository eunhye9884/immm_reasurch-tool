// immm 경쟁사 리서치 허브 — 불만 리뷰 AI 분석 (서버 함수, Vercel)
//
// 이 파일은 "서버 쪽"에서만 실행됩니다. 화면 코드(index.html)가 이 주소로
// 리뷰 텍스트를 보내면, 여기서 Claude API를 호출해 분석 결과를 돌려줍니다.
//
// ★ API 열쇠(ANTHROPIC_API_KEY)는 절대 화면 코드에 넣지 않습니다.
//   Vercel 프로젝트 설정 > Environment Variables 에 ANTHROPIC_API_KEY 를 등록하면
//   아래 process.env.ANTHROPIC_API_KEY 로 안전하게 읽어옵니다.
//
// ※ GitHub Pages(정적 호스팅)에서는 서버 함수를 돌릴 수 없어 동작하지 않습니다.
//   PRD 2단계 계획대로 Vercel로 이사한 뒤에 켜지는 기능입니다.

// 분석 결과가 항상 같은 형식(카테고리·키워드·요약)으로 오도록 강제하는 틀
const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    categories: {
      type: 'array',
      items: { type: 'string' },
      description: '주요 불만 카테고리 (예: 배송, 품질, 사이즈). 최대 6개.'
    },
    keywords: {
      type: 'array',
      items: { type: 'string' },
      description: '리뷰에서 반복되는 핵심 키워드. 최대 10개.'
    },
    summary: {
      type: 'string',
      description: '한국어 한줄 요약 (1~2문장).'
    }
  },
  required: ['categories', 'keywords', 'summary'],
  additionalProperties: false
};

function buildPrompt(reviews) {
  return [
    '당신은 패션 브랜드의 고객 불만 리뷰를 분석하는 전문가입니다.',
    '',
    '규칙:',
    '1) 아래 <리뷰> 태그 안의 내용만 근거로 분석하세요.',
    '2) 리뷰에 없는 내용은 절대 지어내지 마세요. 추측하지 마세요.',
    '3) 불만이나 부정적 언급이 없으면 categories 와 keywords 는 빈 배열([])로 두고,',
    '   summary 에는 "명확한 불만이 발견되지 않았습니다." 라고 쓰세요.',
    '4) 모든 출력은 한국어로 작성하세요.',
    '',
    '분석 항목:',
    '- categories: 주요 불만 카테고리 (최대 6개)',
    '- keywords: 반복되는 핵심 키워드 (최대 10개)',
    '- summary: 한줄 요약 (1~2문장)',
    '',
    '<리뷰>',
    reviews,
    '</리뷰>'
  ].join('\n');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST 요청만 지원합니다.' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: 'ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다. Vercel 프로젝트 설정에서 등록해 주세요.'
    });
    return;
  }

  // 요청 본문에서 리뷰 텍스트 꺼내기
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const reviews = body && body.reviews ? String(body.reviews).trim() : '';
  if (!reviews) {
    res.status(400).json({ error: '분석할 리뷰 텍스트가 없습니다.' });
    return;
  }

  try {
    const apiResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 1024,
        output_config: { format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
        messages: [{ role: 'user', content: buildPrompt(reviews) }]
      })
    });

    if (!apiResp.ok) {
      const detail = await apiResp.text().catch(() => '');
      res.status(502).json({ error: 'AI 분석 요청이 실패했습니다.', detail: detail.slice(0, 500) });
      return;
    }

    const data = await apiResp.json();

    // 안전상 요청이 거절된 경우
    if (data.stop_reason === 'refusal') {
      res.status(422).json({ error: 'AI가 이 리뷰는 분석할 수 없다고 응답했습니다.' });
      return;
    }

    const textBlock = (data.content || []).find(function (b) { return b.type === 'text'; });
    if (!textBlock) {
      res.status(502).json({ error: '분석 결과를 받지 못했습니다.' });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(textBlock.text);
    } catch (e) {
      res.status(502).json({ error: '분석 결과 형식이 올바르지 않습니다.' });
      return;
    }

    res.status(200).json({
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      summary: typeof parsed.summary === 'string' ? parsed.summary : ''
    });
  } catch (e) {
    res.status(500).json({ error: '서버에서 오류가 발생했습니다.', detail: String(e).slice(0, 300) });
  }
};
